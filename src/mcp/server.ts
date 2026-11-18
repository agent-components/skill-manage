import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpToolId } from "@/lib/mcp-tools";
import { registerAllTools } from "@/mcp/tools";

export function createSkillMcpServer(allowedTools?: readonly McpToolId[]) {
  const server = new McpServer(
    {
      name: "skill-hub",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: [
        "本服务管理技能集里的技能。",
        "消费：list → read → download 到本地后再使用。",
        "维护：upload 发布；uninstall 从当前技能集卸下（不删实体）。",
        "连接已绑定唯一技能集，无需传 skillSetId。",
      ].join("\n"),
    },
  );

  registerAllTools(server, allowedTools);
  return server;
}
