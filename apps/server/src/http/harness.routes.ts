import type { FastifyInstance } from "fastify";
import { HARNESS_MENUS } from "../modules/harness/menus.js";
import { HARNESS_TOOLS } from "../modules/harness/tools.js";

/**
 * 宿主拉取的公开元信息：菜单与工具清单。
 * 这些接口不需要登录态。
 */
export function registerHarnessRoutes(app: FastifyInstance) {
  app.get("/api/harness/menus", async (_req, reply) =>
    reply.send({ menus: HARNESS_MENUS }),
  );

  app.get("/api/harness/tools", async (_req, reply) =>
    reply.send({ tools: HARNESS_TOOLS }),
  );
}
