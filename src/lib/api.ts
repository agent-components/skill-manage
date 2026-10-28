import { NextResponse } from "next/server";
import { getAuthContext, type AuthUser, type AuthVia } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { McpToolId } from "@/lib/mcp-tools";

export type RequestAuth = {
  user: AuthUser;
  via: AuthVia;
  /** 令牌鉴权时为绑定项目；登录会话为 null */
  projectId: string | null;
  /** 令牌鉴权时为允许的 MCP 工具；登录会话为 null */
  tools: McpToolId[] | null;
};

export async function requireAuth(req: Request): Promise<
  | (RequestAuth & { error?: undefined })
  | {
      user?: undefined;
      via?: undefined;
      projectId?: undefined;
      tools?: undefined;
      error: NextResponse;
    }
> {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return {
      error: NextResponse.json({ message: "未登录" }, { status: 401 }),
    };
  }
  return {
    user: ctx.user,
    via: ctx.via,
    projectId: ctx.projectId,
    tools: ctx.tools,
  };
}

/** 签发与撤销令牌只允许登录会话，避免令牌本身再签发新令牌 */
export async function requireSession(req: Request): Promise<
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: NextResponse }
> {
  const ctx = await getAuthContext(req);
  if (!ctx) {
    return {
      error: NextResponse.json({ message: "未登录" }, { status: 401 }),
    };
  }
  if (ctx.via !== "session") {
    return {
      error: NextResponse.json(
        { message: "请使用登录会话管理令牌" },
        { status: 403 },
      ),
    };
  }
  return { user: ctx.user };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/** 令牌只能访问其绑定项目 */
export function rejectOutsideProject(
  auth: Pick<RequestAuth, "projectId">,
  projectId: string,
) {
  if (auth.projectId && auth.projectId !== projectId) {
    return jsonError("令牌无权访问该项目", 403);
  }
  return null;
}

/** 令牌只能访问已关联到绑定项目的技能 */
export async function rejectSkillOutsideProject(
  auth: Pick<RequestAuth, "projectId">,
  skillId: string,
) {
  if (!auth.projectId) return null;
  const linked = await prisma.projectSkill.findFirst({
    where: { skillId, projectId: auth.projectId },
    select: { id: true },
  });
  if (!linked) return jsonError("令牌无权访问该技能", 403);
  return null;
}
