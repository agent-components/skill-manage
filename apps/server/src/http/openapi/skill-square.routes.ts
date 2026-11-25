import type { FastifyInstance } from "fastify";
import {
  getSquareSkill,
  importSquareSkill,
  listSquareCategories,
  listSquareFiles,
  listSquareSkills,
  readSquareFile,
} from "../../modules/skill-square/skill-square.service.js";
import {
  CORS_HEADERS,
  openApiError,
  paramsOf,
  queryOf,
  replyWithError,
  requireOpenApiUser,
  skillSetIdsFrom,
} from "./helpers.js";

/** 技能广场相关的 REST 兼容接口，供 Harness Admin 调用。 */
export function registerSkillSquareRoutes(app: FastifyInstance) {
  app.get("/api/openapi/skill-square", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const q = queryOf(req);
    try {
      const data = await listSquareSkills(
        {
          current: Number(q.current ?? 1),
          pageSize: Number(q.pageSize ?? 20),
          name: q.name,
          category: q.category,
          sortBy: q.sortBy,
        },
        user.id
      );
      return reply.headers(CORS_HEADERS).send(data);
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skill-square/categories", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    try {
      return reply.headers(CORS_HEADERS).send(await listSquareCategories(user.id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.post("/api/openapi/skill-square/imports", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const slug = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!slug) return openApiError(reply, "请选择要导入的技能");
      const created = await importSquareSkill(user.id, slug, skillSetIdsFrom(body.skillSetIds));
      return reply.code(201).headers(CORS_HEADERS).send(created);
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skill-square/:slug", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { slug } = paramsOf<{ slug: string }>(req);
    try {
      return reply
        .headers(CORS_HEADERS)
        .send(await getSquareSkill(decodeURIComponent(slug), user.id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skill-square/:slug/files", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { slug } = paramsOf<{ slug: string }>(req);
    try {
      return reply
        .headers(CORS_HEADERS)
        .send(await listSquareFiles(decodeURIComponent(slug), user.id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skill-square/:slug/files/content", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { slug } = paramsOf<{ slug: string }>(req);
    const q = queryOf(req);
    try {
      return reply
        .headers(CORS_HEADERS)
        .send(await readSquareFile(decodeURIComponent(slug), q.path ?? null, user.id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });
}
