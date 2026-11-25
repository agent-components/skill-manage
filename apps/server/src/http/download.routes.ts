import type { FastifyInstance } from "fastify";
import { getObjectBuffer } from "../infra/storage.js";
import { resolveSkillDownloadLink } from "../modules/skills/download-link.service.js";
import { CORS_HEADERS, openApiError, paramsOf } from "./openapi/helpers.js";

/** 匿名下载短链：凭一次性 token 拉取技能 zip，过期自动失效。 */
export function registerDownloadRoutes(app: FastifyInstance) {
  app.get("/api/d/:token", async (req, reply) => {
    const { token } = paramsOf<{ token: string }>(req);
    const { error, link } = await resolveSkillDownloadLink(token?.trim() ?? "");
    if (!link) return openApiError(reply, error ?? "无效链接", 410);

    const buffer = await getObjectBuffer(link.version.storageKey);
    const filename = `${link.version.skill.slug}-${link.version.version}.zip`;

    return reply
      .headers(CORS_HEADERS)
      .header("Content-Type", "application/zip")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .header("Content-Length", String(buffer.length))
      .header("Cache-Control", "private, no-store")
      .send(buffer);
  });

  app.options("/api/d/*", async (_req, reply) => reply.code(204).headers(CORS_HEADERS).send());
}
