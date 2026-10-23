import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createId } from "@paralleldrive/cuid2";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseSkillZip } from "@/lib/skill-package";
import {
  parseSkillArchiveFilename,
  skillArchiveFilenameError,
} from "@/lib/skill-version";
import {
  deleteObjects,
  packageFileKey,
  packageZipKey,
  putObject,
} from "@/lib/storage";
import { getMcpContext } from "@/mcp/context";

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

function decodeZipBase64(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const base64 = trimmed.includes(",")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export function registerUploadTool(server: McpServer) {
  server.registerTool(
    "upload",
    {
      title: "Upload skill",
      description:
        "上传技能 zip 到当前项目。文件名必须为 {slug}-{version}.zip。" +
        "项目内已有同 slug → 发新版本（更新）；否则新建。" +
        "同 slug+同 version 已存在则拒绝。",
      inputSchema: {
        zip_base64: z
          .string()
          .describe("技能包 zip 的 base64（可带 data URL 前缀）"),
        filename: z
          .string()
          .describe("压缩包文件名，必须为 {slug}-{version}.zip"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ zip_base64, filename }) => {
      const { user, projectId } = getMcpContext();

      const nameErr = skillArchiveFilenameError(filename);
      if (nameErr) return toolError(nameErr);

      const fromName = parseSkillArchiveFilename(filename)!;

      const zipBuffer = decodeZipBase64(zip_base64);
      if (!zipBuffer) return toolError("无效的 zip_base64");

      let parsed;
      try {
        parsed = await parseSkillZip(zipBuffer, {
          fallbackVersion: fromName.version,
          filename: filename.trim(),
        });
      } catch (e) {
        return toolError(e instanceof Error ? e.message : "解析技能包失败");
      }

      if (parsed.slug !== fromName.slug) {
        return toolError(
          `文件名 slug「${fromName.slug}」与 SKILL.md name/slug「${parsed.slug}」不一致`,
        );
      }

      if (!parsed.version) {
        return toolError("缺少 version");
      }

      if (parsed.version !== fromName.version) {
        return toolError(
          `文件名版本「${fromName.version}」与包内版本「${parsed.version}」不一致`,
        );
      }

      // 项目内同 slug → 更新；否则新建
      const linked = await prisma.projectSkill.findFirst({
        where: {
          projectId,
          skill: { ownerId: user.id, slug: parsed.slug },
        },
        include: { skill: true },
      });

      let skill = linked?.skill ?? null;

      if (!skill) {
        // 用户已有同 slug 技能但未挂本项目 → 拒绝，避免串项目
        const owned = await prisma.skill.findUnique({
          where: {
            ownerId_slug: { ownerId: user.id, slug: parsed.slug },
          },
          select: { id: true },
        });
        if (owned) {
          return toolError(
            `技能 ${parsed.slug} 已存在但未关联当前项目，无法用此令牌上传`,
          );
        }
      }

      if (skill) {
        const existVer = await prisma.skillVersion.findUnique({
          where: {
            skillId_version: {
              skillId: skill.id,
              version: parsed.version,
            },
          },
        });
        if (existVer) {
          return toolError(
            `版本冲突：${parsed.slug}@${parsed.version} 已存在，请升高版本号后重传`,
          );
        }
      }

      const isUpdate = Boolean(skill);
      const skillId = skill?.id || createId();
      const versionId = createId();
      const zipKey = packageZipKey(user.id, skillId, parsed.version);
      const uploadedKeys: string[] = [zipKey];

      try {
        await putObject(zipKey, zipBuffer, "application/zip");

        for (const f of parsed.files) {
          const key = packageFileKey(
            user.id,
            skillId,
            parsed.version,
            f.filePath,
          );
          await putObject(key, f.content, f.contentType || undefined);
          uploadedKeys.push(key);
        }

        const result = await prisma.$transaction(async (tx) => {
          if (!skill) {
            skill = await tx.skill.create({
              data: {
                id: skillId,
                ownerId: user.id,
                slug: parsed.slug,
                displayName: parsed.displayName,
                summary: parsed.summary,
                tags: parsed.tags,
              },
            });
          } else {
            skill = await tx.skill.update({
              where: { id: skill.id },
              data: {
                displayName: parsed.displayName,
                summary: parsed.summary,
                tags: parsed.tags,
              },
            });
          }

          const version = await tx.skillVersion.create({
            data: {
              id: versionId,
              skillId: skill.id,
              version: parsed.version!,
              storageKey: zipKey,
              fileCount: parsed.files.length,
              totalSize: BigInt(parsed.totalSize),
              metadata: parsed.metadata as Prisma.InputJsonValue,
              files: {
                create: parsed.files.map((f) => ({
                  filePath: f.filePath,
                  storageKey: packageFileKey(
                    user.id,
                    skillId,
                    parsed.version!,
                    f.filePath,
                  ),
                  sha256: f.sha256,
                  fileSize: BigInt(f.fileSize),
                  contentType: f.contentType,
                })),
              },
            },
          });

          await tx.skill.update({
            where: { id: skill.id },
            data: { latestVersionId: version.id },
          });

          await tx.projectSkill.createMany({
            data: [{ projectId, skillId: skill.id }],
            skipDuplicates: true,
          });

          return { skill, version };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ok: true,
                  action: isUpdate ? "update" : "create",
                  slug: result.skill.slug,
                  displayName: result.skill.displayName,
                  summary: result.skill.summary,
                  tags: result.skill.tags,
                  version: result.version.version,
                  fileCount: result.version.fileCount,
                  projectId,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        try {
          await deleteObjects(uploadedKeys);
        } catch {
          // ignore cleanup errors
        }
        console.error("mcp upload skill failed", e);
        return toolError(e instanceof Error ? e.message : "上传失败");
      }
    },
  );
}
