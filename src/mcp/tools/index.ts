import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDownloadTool } from "@/mcp/tools/download";
import { registerListTool } from "@/mcp/tools/list";
import { registerReadTool } from "@/mcp/tools/read";
import { registerUninstallTool } from "@/mcp/tools/uninstall";
import { registerUploadTool } from "@/mcp/tools/upload";

export function registerAllTools(server: McpServer) {
  registerListTool(server);
  registerReadTool(server);
  registerDownloadTool(server);
  registerUploadTool(server);
  registerUninstallTool(server);
}
