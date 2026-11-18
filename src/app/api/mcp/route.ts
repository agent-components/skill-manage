import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { requireAuth } from "@/lib/api";
import { runWithMcpContext } from "@/mcp/context";
import { createSkillMcpServer } from "@/mcp/server";

export const runtime = "nodejs";

/**
 * Streamable HTTP MCP 入口（无状态：每个请求新建 server + transport）。
 * 鉴权：Authorization: Bearer sk_… 或 X-Api-Key（须绑定技能集）。
 */
async function handleMcp(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  if (!auth.skillSetId) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP 需要绑定技能集的 ApiKey（sk_），请勿使用登录会话",
        },
        id: null,
      },
      { status: 403 },
    );
  }

  const baseUrl = (
    process.env.APP_BASE_URL?.trim() || new URL(req.url).origin
  ).replace(/\/$/, "");

  const tools = auth.tools ?? [];
  const ctx = {
    user: auth.user,
    via: auth.via,
    skillSetId: auth.skillSetId,
    tools,
    baseUrl,
  };

  return runWithMcpContext(ctx, async () => {
    const server = createSkillMcpServer(tools);
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
