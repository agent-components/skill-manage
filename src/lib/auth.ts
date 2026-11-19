import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import { prisma } from "@/lib/db";

export { AUTH_TOKEN_KEY };

/** 密码登录会话。再次登录从当前时间重新计算，剩余时间不会超过 7 天。 */
export const PASSWORD_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 宿主兑换得到的组件会话。再次兑换重置为 8 小时；当前过期时间更晚则保持不变。 */
export const SSO_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function sessionExpiry(ttlMs: number, now = Date.now()) {
  return new Date(now + ttlMs);
}

export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
  email: string | null;
};

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
  authorization: string | null | undefined,
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

export async function getTokenFromRequest(req?: Request) {
  if (req) return extractBearerToken(req.headers.get("authorization"));
  const h = await headers();
  return extractBearerToken(h.get("authorization"));
}

export async function getCurrentUser(req?: Request) {
  const token = await getTokenFromRequest(req);
  if (!token) return null;
  const user = await findUserByToken(token);
  return user ? toAuthUser(user) : null;
}

export async function requireUser(req?: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return { user: null as AuthUser | null, error: Response.json({ message: "未登录" }, { status: 401 }) };
  }
  return { user, error: null as Response | null };
}
