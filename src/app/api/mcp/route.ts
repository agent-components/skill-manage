import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireAuth } from "@/lib/api";
import { runWithMcpContext } from "@/mcp/context";
import { createSkillMcpServer } from "@/mcp/server";

export const runtime = "nodejs";

/**
 * Streamable HTTP MCP 入口（无状态：每个请求新建 server + transport）。
 * 鉴权：Authorization: Bearer sk_… 或 X-Api-Key（须绑定项目）。
 */
async function handleMcp(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  if (!auth.projectId) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP 需要项目 ApiKey（sk_），请勿使用登录会话",
        },
        id: null,
      },
      { status: 403 },
    );
  }

  const ctx = {
    user: auth.user,
    via: auth.via,
    projectId: auth.projectId,
  };

  return runWithMcpContext(ctx, async () => {
    const server = createSkillMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(req);
  });
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
