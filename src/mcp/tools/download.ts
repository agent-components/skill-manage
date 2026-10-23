import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notImplemented } from "@/mcp/stub";

export function registerDownloadTool(server: McpServer) {
  server.registerTool(
    "download",
    {
      title: "Download skill",
      description: "将技能下载到本地目录，供本地 AI 按文件使用。",
      inputSchema: {
        slug: z.string().describe("技能 slug"),
        version: z
          .string()
          .optional()
          .describe("版本号，默认 latest"),
        target_dir: z
          .string()
          .optional()
          .describe("本地目标目录（实现阶段再定约定）"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => notImplemented("download"),
  );
}
