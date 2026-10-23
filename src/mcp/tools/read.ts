import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notImplemented } from "@/mcp/stub";

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
    async () => notImplemented("read"),
  );
}
