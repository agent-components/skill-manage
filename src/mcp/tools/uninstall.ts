import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getMcpContext } from "@/mcp/context";

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function registerUninstallTool(server: McpServer) {
  server.registerTool(
    "uninstall",
    {
      title: "Uninstall skill",
      description: "从当前项目卸下技能（不删除仓库中的技能实体）。",
      inputSchema: {
        slug: z.string().describe("要卸下的技能 slug"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ slug }) => {
      const { user, projectId } = getMcpContext();
      const skillSlug = slug.trim();
      if (!skillSlug) return toolError("缺少 slug");

      const skill = await prisma.skill.findFirst({
        where: { ownerId: user.id, slug: skillSlug },
        select: { id: true, slug: true, displayName: true },
      });
      if (!skill) {
        return toolError(`技能不存在: ${skillSlug}`);
      }

      const result = await prisma.projectSkill.deleteMany({
        where: { projectId, skillId: skill.id },
      });

      const alreadyUnlinked = result.count === 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ok: true,
                slug: skill.slug,
                displayName: skill.displayName,
                projectId,
                unlinked: !alreadyUnlinked,
                message: alreadyUnlinked
                  ? "技能未关联到当前项目（无需操作）"
                  : "已从当前项目卸下技能",
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
