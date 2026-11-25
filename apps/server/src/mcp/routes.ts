import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "../config/env.js";
import { getCurrentUser } from "../modules/auth/auth.service.js";
import { createMcpServer } from "./server.js";

/** 下载短链拼接用的对外根地址：优先 APP_BASE_URL，否则按请求推导。 */
function resolveBaseUrl(req: FastifyRequest) {
  const configured = config.appBaseUrl.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim() : "") ||
    req.protocol;
  const host = req.headers.host ?? `localhost:${config.port}`;
  return `${proto}://${host}`;
}

function jsonRpcError(reply: FastifyReply, status: number, message: string) {
  return reply
    .code(status)
    .header("content-type", "application/json")
    .send({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });
}

/**
 * Streamable HTTP MCP 端点：无状态，每个请求新建 server + transport。
 * 鉴权沿用登录会话：Authorization: Bearer <token>。
 */
export function registerMcpRoutes(app: FastifyInstance) {
  app.post("/mcp", async (req, reply) => {
    const user = await getCurrentUser({ headers: req.headers });
    if (!user) return jsonRpcError(reply, 401, "未登录，请携带 Authorization: Bearer <token>");

    const server = createMcpServer({ user, baseUrl: resolveBaseUrl(req) });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    reply.hijack();
    try {
      await server.connect(transport);
      await transport.handleRequest(req.raw, reply.raw, req.body);
    } catch (error) {
      app.log.error(error);
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "content-type": "application/json" });
        reply.raw.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "MCP 请求处理失败" },
            id: null,
          })
        );
      } else {
        reply.raw.end();
      }
    } finally {
      await server.close().catch(() => undefined);
    }
  });

  // 无状态 JSON 模式不提供 SSE / 会话删除。
  for (const method of ["get", "delete"] as const) {
    app[method]("/mcp", async (_req, reply) =>
      jsonRpcError(reply, 405, "该 MCP 端点仅支持 POST")
    );
  }
}
