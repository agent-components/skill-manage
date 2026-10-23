import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getObjectBuffer } from "@/lib/storage";
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
        "下载技能最新版本的压缩包（application/zip）。调用方自行解压到本地；不在服务端解压。",
      inputSchema: {
        slug: z.string().describe("技能 slug"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ slug }) => {
      const { user, projectId } = getMcpContext();
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
            select: { id: true, version: true, storageKey: true },
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

      const buf = await getObjectBuffer(ver.storageKey);
      const filename = `${skill.slug}-${ver.version}.zip`;
      const blob = buf.toString("base64");

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
                size: buf.length,
                note: "压缩包见下方 resource.blob（base64）；请自行解压",
              },
              null,
              2,
            ),
          },
          {
            type: "resource" as const,
            resource: {
              uri: `skill-archive://${skill.slug}/${ver.version}/${filename}`,
              mimeType: "application/zip",
              blob,
            },
          },
        ],
      };
    },
  );
}
