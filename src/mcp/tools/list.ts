import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMcpContext } from "@/mcp/context";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "List skills",
      description:
        "列出当前项目下的技能；可选 query 按关键词过滤名称（displayName）与描述（summary）。",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("可选关键词，匹配技能名称与描述"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }) => {
      const { user, projectId } = getMcpContext();
      const keyword = query?.trim();

      const skills = await prisma.skill.findMany({
        where: {
          ownerId: user.id,
          projects: { some: { projectId } },
          ...(keyword
            ? {
                OR: [
                  {
                    displayName: {
                      contains: keyword,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    summary: {
                      contains: keyword,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          latestVersion: { select: { version: true } },
        },
      });

      const list = skills.map((s) => ({
        slug: s.slug,
        displayName: s.displayName,
        summary: s.summary,
        tags: s.tags,
        latestVersion: s.latestVersion?.version ?? null,
        updatedAt: s.updatedAt.toISOString(),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ total: list.length, list }, null, 2),
          },
        ],
      };
    },
  );
}
