import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notImplemented } from "@/mcp/stub";

export function registerListTool(server: McpServer) {
  server.registerTool(
    "list",
    {
      title: "List skills",
      description:
        "列出当前项目下的技能；可选 query 按关键词过滤（名称 / 摘要 / 标签）。",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("可选关键词，过滤技能列表"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => notImplemented("list"),
  );
}
