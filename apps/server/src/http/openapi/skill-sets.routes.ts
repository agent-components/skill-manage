import type { FastifyInstance } from "fastify";
import {
  changeSkillSetSkills,
  createSkillSet,
  deleteSkillSet,
  getSkillSetDetail,
  listSkillSetIcons,
  listSkillSets,
  updateSkillSet,
} from "../../modules/skill-sets/skill-set.service.js";
import {
  CORS_HEADERS,
  paramsOf,
  queryOf,
  replyWithError,
  requireOpenApiUser,
} from "./helpers.js";
/** 技能集相关的 REST 兼容接口，供 Harness Admin 调用。 */
export function registerSkillSetRoutes(app: FastifyInstance) {
  app.get("/api/openapi/skill-sets", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const q = queryOf(req);
    const data = await listSkillSets(user.id, {
      current: Number(q.current ?? 1),
      pageSize: Number(q.pageSize ?? 20),
      name: q.name,
    });
    return reply.headers(CORS_HEADERS).send(data);
  });

  app.post("/api/openapi/skill-sets", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const created = await createSkillSet(user.id, body);
      return reply.code(201).headers(CORS_HEADERS).send(created);
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skill-sets/icons", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const q = queryOf(req);
    const list = await listSkillSetIcons(user.id, (q.ids ?? "").split(","));
    return reply.headers(CORS_HEADERS).send({ list });
  });

  app.get("/api/openapi/skill-sets/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      return reply
        .headers(CORS_HEADERS)
        .send(await getSkillSetDetail(user.id, id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.put("/api/openapi/skill-sets/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      return reply
        .headers(CORS_HEADERS)
        .send(await updateSkillSet(user.id, id, body));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.delete("/api/openapi/skill-sets/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      await deleteSkillSet(user.id, id);
      return reply.headers(CORS_HEADERS).send({ ok: true });
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.patch("/api/openapi/skill-sets/:id/skills", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      const body = (req.body ?? {}) as { add?: unknown; remove?: unknown };
      return reply
        .headers(CORS_HEADERS)
        .send(await changeSkillSetSkills(user.id, id, body));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

}
