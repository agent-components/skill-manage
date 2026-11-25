import type { FastifyInstance } from "fastify";
import { registerHarnessRoutes } from "../harness.routes.js";
import { CORS_HEADERS } from "./helpers.js";
import { registerSkillRoutes } from "./skills.routes.js";
import { registerSkillSetRoutes } from "./skill-sets.routes.js";
import { registerSkillSquareRoutes } from "./skill-square.routes.js";

/**
 * REST 兼容层：Harness Admin 宿主仍按 REST 调用。
 *
 * Web 应用自身只走 tRPC（/trpc），这里的接口是对外的稳定契约。
 */
export function registerOpenApiRoutes(app: FastifyInstance) {
  registerHarnessRoutes(app);
  registerSkillSetRoutes(app);
  registerSkillRoutes(app);
  registerSkillSquareRoutes(app);

  // ---- 预检 ----
  app.options("/api/openapi/*", async (_req, reply) =>
    reply.code(204).headers(CORS_HEADERS).send()
  );
  app.options("/api/harness/*", async (_req, reply) =>
    reply.code(204).headers(CORS_HEADERS).send()
  );
}
