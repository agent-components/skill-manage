import { AsyncLocalStorage } from "async_hooks";
import type { McpRequestContext } from "@/mcp/types";

const store = new AsyncLocalStorage<McpRequestContext>();

export function runWithMcpContext<T>(
  ctx: McpRequestContext,
  fn: () => T,
): T {
  return store.run(ctx, fn);
}

export function getMcpContext(): McpRequestContext {
  const ctx = store.getStore();
  if (!ctx) {
    throw new Error("MCP 请求上下文缺失");
  }
  return ctx;
}
