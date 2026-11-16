import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  jsonError,
  jsonOk,
  rejectSkillOutsideProject,
  requireAuth,
} from "@/lib/api";
import { parseSkillZip } from "@/lib/skill-package";
import {
  deleteObjects,
  packageFileKey,
  packageZipKey,
  putObject,
} from "@/lib/storage";
import { createId } from "@paralleldrive/cuid2";
import type { Prisma } from "@prisma/client";
import { friendlyUploadError } from "@/lib/upload-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("请使用 multipart 上传");
  }

  const file = form.get("file") || form.get("zip");
  if (!(file instanceof File)) {
    return jsonError("请上传 zip 文件");
  }

  const fallbackVersion =
    (typeof form.get("version") === "string" &&
      (form.get("version") as string)) ||
    undefined;

  const projectIdsRaw = form.getAll("projectIds");
  let projectIds = projectIdsRaw
    .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
    .map((s) => s.trim())
    .filter(Boolean);

  if (auth.projectId) {
    if (projectIds.length === 0) {
      projectIds = [auth.projectId];
    } else if (projectIds.length !== 1 || projectIds[0] !== auth.projectId) {
      return jsonError("令牌只能上传到绑定项目", 403);
    }
  }

  const skillIdOverride =
    typeof form.get("skillId") === "string"
      ? (form.get("skillId") as string).trim()
      : "";

  const zipBuffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseSkillZip(zipBuffer, {
      fallbackVersion,
      filename: file.name,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "解析技能包失败");
  }

  if (!parsed.version) {
    return jsonError(
      "缺少 version：请使用如 agent-browser-0.1.0.zip 的文件名，或在 SKILL.md / 表单中指定",
    );
  }

  if (projectIds.length > 0) {
    const owned = await prisma.project.count({
      where: { ownerId: auth.user.id, id: { in: projectIds } },
    });
    if (owned !== projectIds.length) {
      return jsonError("存在无权使用的项目", 403);
    }
  }

  let skill = skillIdOverride
    ? await prisma.skill.findFirst({
        where: { id: skillIdOverride, ownerId: auth.user.id },
      })
    : await prisma.skill.findUnique({
        where: {
          ownerId_slug: { ownerId: auth.user.id, slug: parsed.slug },
        },
      });

  if (skillIdOverride && !skill) {
    return jsonError("技能不存在", 404);
  }

  if (skill) {
    const denied = await rejectSkillOutsideProject(auth, skill.id);
    if (denied) return denied;

    const existVer = await prisma.skillVersion.findUnique({
      where: {
        skillId_version: { skillId: skill.id, version: parsed.version },
      },
    });
    if (existVer) {
      return jsonError(`版本 ${parsed.version} 已存在`, 409);
    }
  }

  const skillId = skill?.id || createId();
  const versionId = createId();
  const zipKey = packageZipKey(auth.user.id, skillId, parsed.version);
  const uploadedKeys: string[] = [zipKey];

  try {
    await putObject(zipKey, zipBuffer, "application/zip");

    for (const f of parsed.files) {
      const key = packageFileKey(
        auth.user.id,
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
            ownerId: auth.user.id,
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
                auth.user.id,
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

      if (projectIds.length > 0) {
        await tx.projectSkill.createMany({
          data: projectIds.map((projectId) => ({
            projectId,
            skillId: skill!.id,
          })),
          skipDuplicates: true,
        });
      }

      return { skill, version };
    });

    return jsonOk(
      {
        id: result.skill.id,
        slug: result.skill.slug,
        displayName: result.skill.displayName,
        summary: result.skill.summary,
        tags: result.skill.tags,
        version: result.version.version,
        versionId: result.version.id,
        fileCount: result.version.fileCount,
        metadata: result.version.metadata,
      },
      { status: 201 },
    );
  } catch (e) {
    try {
      await deleteObjects(uploadedKeys);
    } catch {
      // ignore cleanup errors
    }
    console.error("upload skill failed", e);
    return jsonError(...friendlyUploadError(e));
  }
}
