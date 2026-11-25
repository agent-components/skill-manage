import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSkillTools, type McpRequestContext } from "./tools.js";

/** 为单次 MCP 请求创建一个无状态服务实例。 */
export function createMcpServer(ctx: McpRequestContext) {
  const server = new McpServer(
    { name: "skill-manage", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions: [
        "本服务管理当前账号的技能库。",
        "先用 list_skills 找到技能，再用 read_skill 读取 SKILL.md。",
        "需要包内其他文件时，用 list_skill_files 列出路径，再用 read_skill 指定 path 读取。",
        "需要整包时，用 download_skill 取得临时下载链接并自行下载解压。",
      ].join("\n"),
    }
  );

  registerSkillTools(server, ctx);
  return server;
}
