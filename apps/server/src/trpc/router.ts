import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { skillRouter } from "./routers/skill.js";
import { skillSetRouter } from "./routers/skill-set.js";
import { skillSquareRouter } from "./routers/skill-square.js";

export { createContext } from "./trpc.js";

/**
 * 应用根路由。Web 端通过 `@skill-manage/server/router` 引用这里的 `AppRouter` 类型。
 */
export const appRouter = router({
  auth: authRouter,
  skill: skillRouter,
  skillSet: skillSetRouter,
  skillSquare: skillSquareRouter,
});

export type AppRouter = typeof appRouter;
