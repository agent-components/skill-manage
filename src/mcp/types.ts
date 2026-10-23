import type { AuthUser, AuthVia } from "@/lib/auth";

/** 单次 MCP 请求的鉴权上下文（由 ApiKey 绑定项目） */
export type McpRequestContext = {
  user: AuthUser;
  via: AuthVia;
  projectId: string;
};
