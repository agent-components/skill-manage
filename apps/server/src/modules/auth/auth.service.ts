import { createHash, randomBytes } from "crypto";
import { AUTH_TOKEN_KEY, type AuthUser } from "@skill-manage/shared";
import { prisma } from "../../infra/prisma.js";

export { AUTH_TOKEN_KEY };

/** 密码登录会话。再次登录从当前时间重新计算，剩余时间不会超过 7 天。 */
export const PASSWORD_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 宿主兑换得到的组件会话。再次兑换重置为 8 小时；当前过期时间更晚则保持不变。 */
export const SSO_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function sessionExpiry(ttlMs: number, now = Date.now()) {
  return new Date(now + ttlMs);
}

export function createAccessToken() {
  return randomBytes(32).toString("hex");
}

/** 与现有账号兼容：库内多为明文；若已是 sha256 则按摘要比对 */
export function verifyPassword(raw: string, stored: string) {
  if (stored === raw) return true;
  const hashed = createHash("sha256").update(raw).digest("hex");
  return stored === hashed;
}

export function toAuthUser(user: {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
  email: string | null;
}): AuthUser {
  return {
    id: user.id,
    account: user.account,
    displayName: user.displayName,
    role: user.role,
    email: user.email,
  };
}

export async function findUserByToken(token: string) {
  if (!token) return null;
  const user = await prisma.user.findFirst({
    where: {
      token,
      status: "ACTIVE",
      OR: [{ tokenExpiredAt: null }, { tokenExpiredAt: { gt: new Date() } }],
    },
  });
  return user;
}

/** 从 Authorization: Bearer <token> 提取登录会话 */
export function extractBearerToken(
  authorization: string | null | undefined
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

export type HeaderSource = {
  headers: Record<string, string | string[] | undefined>;
};

function readAuthorization(headers: HeaderSource["headers"]) {
  const raw = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return extractBearerToken(value);
}

export async function getCurrentUser(req: HeaderSource) {
  const token = readAuthorization(req.headers);
  if (!token) return null;
  const user = await findUserByToken(token);
  return user ? toAuthUser(user) : null;
}

/** 账号密码登录，成功后签发会话 token。 */
export async function loginWithPassword(account: string, password: string) {
  const user = await prisma.user.findUnique({ where: { account } });
  if (!user || !verifyPassword(password, user.password)) {
    throw new Error("账号或密码错误");
  }
  if (user.status !== "ACTIVE") {
    throw new Error("账号已停用");
  }

  const token = user.token || createAccessToken();
  const tokenExpiredAt = sessionExpiry(PASSWORD_SESSION_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: { token, tokenExpiredAt, updatedAt: new Date() },
  });

  return { token, user: toAuthUser(user) };
}

/** 清除当前会话 token（退出登录）。 */
export async function logoutSession(headers: HeaderSource["headers"]) {
  const raw = headers.authorization ?? headers.Authorization;
  const token = (Array.isArray(raw) ? raw[0] : raw)
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return { ok: true };

  await prisma.user.updateMany({
    where: { token },
    data: { token: null, tokenExpiredAt: null, updatedAt: new Date() },
  });
  return { ok: true };
}
