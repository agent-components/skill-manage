import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";
import {
  loginWithPassword,
  logoutSession,
} from "../../modules/auth/auth.service.js";
import {
  establishHarnessSession,
  exchangeHarnessCode,
  resolveHarnessOrigin,
} from "../../modules/auth/sso.service.js";

export const authRouter = router({
  /** 账号密码登录 */
  login: publicProcedure
    .input(
      z.object({
        account: z.string().trim().min(1, "请输入账号和密码"),
        password: z.string().min(1, "请输入账号和密码"),
      })
    )
    .mutation(({ input }) => loginWithPassword(input.account, input.password)),

  /** 当前登录用户 */
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  /** 退出登录，清除会话 token */
  logout: protectedProcedure.mutation(({ ctx }) => logoutSession(ctx.headers)),

  /** 用宿主一次性 harness_sso 换本地短期会话 */
  sso: publicProcedure
    .input(
      z.object({
        code: z.string().trim().min(1),
        harnessOrigin: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const origin = resolveHarnessOrigin(input.harnessOrigin);
      if (!origin) {
        throw new Error("请从 Harness Admin 打开");
      }

      const harnessUser = await exchangeHarnessCode(origin, input.code);
      if (!harnessUser) {
        throw new Error("请从 Harness Admin 打开");
      }

      try {
        return await establishHarnessSession(harnessUser);
      } catch (error) {
        console.error("harness sso session failed", error);
        throw new Error("请从 Harness Admin 打开");
      }
    }),
});
