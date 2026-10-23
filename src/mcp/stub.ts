import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** 工具函数体未实现时的统一返回（后续逐步替换） */
export function notImplemented(toolName: string): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Tool "${toolName}" is not implemented yet.`,
      },
    ],
  };
}
