import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notImplemented } from "@/mcp/stub";

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
    async () => notImplemented("uninstall"),
  );
}
