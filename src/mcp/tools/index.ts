import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ALL_MCP_TOOL_IDS,
  normalizeMcpTools,
  type McpToolId,
} from "@/lib/mcp-tools";
import { registerDownloadTool } from "@/mcp/tools/download";
import { registerListTool } from "@/mcp/tools/list";
import { registerReadTool } from "@/mcp/tools/read";
import { registerUninstallTool } from "@/mcp/tools/uninstall";
import { registerUploadTool } from "@/mcp/tools/upload";

const registrars: Record<McpToolId, (server: McpServer) => void> = {
  list: registerListTool,
  read: registerReadTool,
  download: registerDownloadTool,
  upload: registerUploadTool,
  uninstall: registerUninstallTool,
};

export function registerAllTools(
  server: McpServer,
  allowedTools?: readonly string[],
) {
  const allowed = new Set(normalizeMcpTools(allowedTools ?? ALL_MCP_TOOL_IDS));
  for (const id of ALL_MCP_TOOL_IDS) {
    if (allowed.has(id)) registrars[id](server);
  }
}
