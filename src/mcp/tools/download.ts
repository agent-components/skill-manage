import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSkillDownloadLink,
  downloadLinkTtlMs,
} from "@/lib/download-link";
import { getMcpContext } from "@/mcp/context";

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function registerDownloadTool(server: McpServer) {
  server.registerTool(
    "download",
    {
      title: "Download skill",
      description:
        "生成技能最新版本压缩包的下载短链（过期自动失效）。调用方 HTTP GET 该链接即可下载 zip，无需再带 ApiKey。",
      inputSchema: {
        slug: z.string().describe("技能 slug"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ slug }) => {
      const { user, projectId, baseUrl } = getMcpContext();
      const skillSlug = slug.trim();
      if (!skillSlug) return toolError("缺少 slug");

      const skill = await prisma.skill.findFirst({
        where: {
          ownerId: user.id,
          slug: skillSlug,
          projects: { some: { projectId } },
        },
        include: {
          latestVersion: {
            select: { id: true, version: true },
          },
        },
      });
      if (!skill) {
        return toolError(`技能不存在或不在当前项目: ${skillSlug}`);
      }

      const ver = skill.latestVersion;
      if (!ver) {
        return toolError(`技能尚无版本: ${skillSlug}`);
      }

      const link = await createSkillDownloadLink({
        versionId: ver.id,
        createdBy: user.id,
      });

      const filename = `${skill.slug}-${ver.version}.zip`;
      const url = `${baseUrl}/api/d/${link.token}`;
      const ttlSeconds = Math.round(downloadLinkTtlMs() / 1000);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                slug: skill.slug,
                version: ver.version,
                filename,
                mimeType: "application/zip",
                url,
                method: "GET",
                expiresAt: link.expiresAt.toISOString(),
                ttlSeconds,
                note: "短链无需鉴权；过期后自动失效。请自行下载并解压。",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
