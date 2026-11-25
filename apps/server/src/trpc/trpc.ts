import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { AuthUser } from "@skill-manage/shared";
import { getCurrentUser } from "../modules/auth/auth.service.js";

/**
 * 上下文只依赖标准 headers，不绑定具体 HTTP 框架，
 * 这样 web 端可以直接 import 类型而不把服务端依赖打进产物。
 */
export type Context = {
  headers: Record<string, string | string[] | undefined>;
  user: AuthUser | null;
};

export function createContext(opts: {
  headers: Record<string, string | string[] | undefined>;
}): Context {
  return {
    headers: opts.headers,
    user: null,
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/** 需要登录态的接口 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const user = ctx.user ?? (await getCurrentUser({ headers: ctx.headers }));
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "未登录" });
  }
  return next({ ctx: { ...ctx, user } });
});

export const TRPC = t;
