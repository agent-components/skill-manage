import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  PREVIEW_MAX_BYTES,
  isProbablyText,
} from "@/lib/skill-package";
import { getObjectBuffer } from "@/lib/storage";
import { getMcpContext } from "@/mcp/context";

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

async function findFileInVersion(
  versionId: string,
  requestedPath: string,
) {
  const exact = await prisma.skillFile.findUnique({
    where: {
      versionId_filePath: { versionId, filePath: requestedPath },
    },
  });
  if (exact) return exact;

  // 默认路径兼容 skill.md / SKILL.md
  if (requestedPath.toLowerCase() === "skill.md") {
    const files = await prisma.skillFile.findMany({
      where: { versionId },
      select: {
        id: true,
        filePath: true,
        storageKey: true,
        sha256: true,
        fileSize: true,
        contentType: true,
      },
    });
    return (
      files.find((f) => f.filePath.toLowerCase() === "skill.md") ?? null
    );
  }

  return null;
}

export function registerReadTool(server: McpServer) {
  server.registerTool(
    "read",
    {
      title: "Read skill file",
      description:
        "获取技能信息；默认返回 SKILL.md 内容，可通过 path 读取包内其他文件。",
      inputSchema: {
        slug: z.string().describe("技能 slug（与 SKILL.md name 一致）"),
        path: z
          .string()
          .optional()
          .describe("包内相对路径，默认 SKILL.md"),
        version: z
          .string()
          .optional()
          .describe("版本号，默认 latest"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ slug, path: filePath, version: versionInput }) => {
      const { user, skillSetId } = getMcpContext();
      const skillSlug = slug.trim();
      if (!skillSlug) return toolError("缺少 slug");

      const requestedPath = (filePath?.trim() || "SKILL.md").replace(
        /^\/+/,
        "",
      );
      if (requestedPath.includes("..")) {
        return toolError("非法路径");
      }

      const skill = await prisma.skill.findFirst({
        where: {
          ownerId: user.id,
          slug: skillSlug,
          projects: { some: { projectId: skillSetId } },
        },
        include: {
          latestVersion: { select: { id: true, version: true } },
        },
      });
      if (!skill) return toolError(`技能不存在或不在当前技能集: ${skillSlug}`);

      let versionRow:
        | { id: string; version: string }
        | null
        | undefined = null;

      const pinned = versionInput?.trim();
      if (pinned) {
        versionRow = await prisma.skillVersion.findUnique({
          where: {
            skillId_version: { skillId: skill.id, version: pinned },
          },
          select: { id: true, version: true },
        });
        if (!versionRow) {
          return toolError(`版本不存在: ${skillSlug}@${pinned}`);
        }
      } else {
        versionRow = skill.latestVersion;
        if (!versionRow) {
          return toolError(`技能尚无版本: ${skillSlug}`);
        }
      }

      const file = await findFileInVersion(versionRow.id, requestedPath);
      if (!file) {
        return toolError(
          `文件不存在: ${skillSlug}@${versionRow.version}/${requestedPath}`,
        );
      }

      const size = Number(file.fileSize);
      const textLike = isProbablyText(file.filePath, file.contentType);

      if (!textLike) {
        return toolError(
          `文件为二进制，无法以文本返回（${file.filePath}，${size} bytes）。请使用 download 拉取完整包。`,
        );
      }

      if (size > PREVIEW_MAX_BYTES) {
        return toolError(
          `文件过大（${size} bytes，上限 ${PREVIEW_MAX_BYTES}）。请使用 download 拉取完整包。`,
        );
      }

      const buf = await getObjectBuffer(file.storageKey);

      return {
        content: [
          {
            type: "text" as const,
            text: buf.toString("utf8"),
          },
        ],
      };
    },
  );
}
