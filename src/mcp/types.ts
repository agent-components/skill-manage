import type { AuthUser, AuthVia } from "@/lib/auth";
import type { McpToolId } from "@/lib/mcp-tools";

/** 单次 MCP 请求的鉴权上下文（由 ApiKey 绑定技能集） */
export type McpRequestContext = {
  user: AuthUser;
  via: AuthVia;
  skillSetId: string;
  /** 该令牌允许注册的 MCP 工具 */
  tools: McpToolId[];
  /** 用于拼绝对下载链接，如 https://example.com */
  baseUrl: string;
};
