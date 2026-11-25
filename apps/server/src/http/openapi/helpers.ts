import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "@skill-manage/shared";
import { getCurrentUser } from "../../modules/auth/auth.service.js";
import { isAppError, SkillError } from "../../shared/errors.js";

/** 宿主调用的接口对外开放 CORS。 */
export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type, Accept",
};

/** 统一错误响应体。 */
export function openApiError(reply: FastifyReply, message: string, status = 400) {
  return reply
    .code(status as 400)
    .headers(CORS_HEADERS)
    .send({ message });
}

/** 解析当前登录用户，未登录时直接回 401 并返回 null。 */
export async function requireOpenApiUser(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<AuthUser | null> {
  const user = await getCurrentUser({ headers: req.headers });
  if (!user) {
    openApiError(reply, "未登录", 401);
    return null;
  }
  return user;
}

/** 把业务错误转成 { message } + 状态码；未知错误继续向上抛。 */
export function replyWithError(reply: FastifyReply, error: unknown) {
  if (isAppError(error)) {
    return openApiError(reply, error.message, error.status);
  }
  throw error;
}

/** 技能集 ID 列表：支持数组或逗号分隔字符串。 */
export function skillSetIdsFrom(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === "string")) {
      throw new SkillError("技能集参数无效");
    }
    return (value as string[]).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  throw new SkillError("技能集参数无效");
}

/** 读取 query 参数。 */
export function queryOf(req: FastifyRequest) {
  return req.query as Record<string, string | undefined>;
}

/** 读取 path 参数。 */
export function paramsOf<T>(req: FastifyRequest): T {
  return req.params as T;
}
