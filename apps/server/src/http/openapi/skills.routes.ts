import type { FastifyInstance } from "fastify";
import {
  deleteSkill,
  downloadSkillVersion,
  getSkillDetail,
  listSkillIcons,
  listSkillVersionFiles,
  listSkills,
  readSkillFile,
  readSkillVersionFile,
  updateSkill,
  uploadSkillPackage,
  zipBufferFromBase64,
} from "../../modules/skills/skill.service.js";
import {
  CORS_HEADERS,
  openApiError,
  paramsOf,
  queryOf,
  replyWithError,
  requireOpenApiUser,
  skillSetIdsFrom,
} from "./helpers.js";

/** 技能相关的 REST 兼容接口，供 Harness Admin 调用。 */
export function registerSkillRoutes(app: FastifyInstance) {
  app.get("/api/openapi/skills", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const q = queryOf(req);
    const skillSetHeader = req.headers["x-skill-set-id"];
    const slugs =
      typeof skillSetHeader === "string"
        ? skillSetHeader
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const data = await listSkills(
      user.id,
      {
        current: Number(q.current ?? 1),
        pageSize: Number(q.pageSize ?? 20),
        name: q.name,
      },
      slugs
    );
    return reply.headers(CORS_HEADERS).send(data);
  });

  app.get("/api/openapi/skills/icons", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const q = queryOf(req);
    const list = await listSkillIcons(user.id, (q.ids ?? "").split(","));
    return reply.headers(CORS_HEADERS).send({ list });
  });

  app.post("/api/openapi/skills", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;

    try {
      const contentType = req.headers["content-type"] ?? "";

      if (contentType.includes("multipart/form-data")) {
        const parts = req.parts();
        let fileBuffer: Buffer | null = null;
        let filename = "";
        let fallbackVersion: string | undefined;
        let skillId = "";
        const skillSetIds: string[] = [];

        for await (const part of parts) {
          if (part.type === "file") {
            if (part.fieldname !== "file" && part.fieldname !== "zip") continue;
            fileBuffer = await part.toBuffer();
            filename = part.filename ?? "";
          } else {
            const value = String(part.value ?? "");
            if (part.fieldname === "version") fallbackVersion = value;
            else if (part.fieldname === "skillId") skillId = value.trim();
            else if (part.fieldname === "skillSetIds") {
              skillSetIds.push(
                ...value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              );
            }
          }
        }

        if (!fileBuffer) return openApiError(reply, "请上传 zip 文件");

        const created = await uploadSkillPackage(user.id, {
          zipBuffer: fileBuffer,
          filename,
          fallbackVersion,
          skillId,
          skillSetIds,
        });
        return reply.code(201).headers(CORS_HEADERS).send(created);
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const zipBuffer = zipBufferFromBase64(body.zipBase64 ?? body.zip_base64);
      if (!zipBuffer) return openApiError(reply, "无效的 zipBase64");
      const filename = typeof body.filename === "string" ? body.filename : "";
      const skillSetIds = skillSetIdsFrom(body.skillSetIds);
      const created = await uploadSkillPackage(user.id, {
        zipBuffer,
        filename,
        skillSetIds,
        matchFilename: true,
      });
      return reply.code(201).headers(CORS_HEADERS).send(created);
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skills/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    const q = queryOf(req);
    try {
      return reply.headers(CORS_HEADERS).send(await readSkillFile(user.id, id, q.path ?? null));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.put("/api/openapi/skills/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      return reply.headers(CORS_HEADERS).send(await updateSkill(user.id, id, body));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.delete("/api/openapi/skills/:id", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      await deleteSkill(user.id, id);
      return reply.headers(CORS_HEADERS).send({ ok: true });
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skills/:id/detail", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      return reply.headers(CORS_HEADERS).send(await getSkillDetail(user.id, id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skills/:id/versions/files", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    try {
      return reply.headers(CORS_HEADERS).send(await listSkillVersionFiles(user.id, id));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skills/:id/versions/files/content", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    const q = queryOf(req);
    try {
      return reply
        .headers(CORS_HEADERS)
        .send(await readSkillVersionFile(user.id, id, q.path ?? null));
    } catch (error) {
      return replyWithError(reply, error);
    }
  });

  app.get("/api/openapi/skills/:id/versions/download", async (req, reply) => {
    const user = await requireOpenApiUser(req, reply);
    if (!user) return reply;
    const { id } = paramsOf<{ id: string }>(req);
    const q = queryOf(req);
    try {
      const file = await downloadSkillVersion(user.id, id, q.version ?? null);
      return reply
        .headers(CORS_HEADERS)
        .header("Content-Type", "application/zip")
        .header("Content-Disposition", `attachment; filename="${file.filename}"`)
        .header("Content-Length", String(file.buffer.length))
        .send(file.buffer);
    } catch (error) {
      return replyWithError(reply, error);
    }
  });
}
