import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { notImplemented } from "@/mcp/stub";

export function registerUploadTool(server: McpServer) {
  server.registerTool(
    "upload",
    {
      title: "Upload skill",
      description: "上传/发布技能到仓库（新建或新版本）。入参形态实现阶段再定。",
      inputSchema: {
        slug: z
          .string()
          .optional()
          .describe("目标技能 slug；新建时可从 SKILL.md 推断"),
        version: z.string().optional().describe("版本号"),
        // 占位：后续支持 zip_base64 / files[] 等
        package: z
          .string()
          .optional()
          .describe("技能包内容占位（实现时再换成 zip 或 files）"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async () => notImplemented("upload"),
  );
}
