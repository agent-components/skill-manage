import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { hashApiKey, isApiKey } from "@/lib/api-key";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import { prisma } from "@/lib/db";

export { AUTH_TOKEN_KEY };

/** Token 有效期：30 天 */
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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

/** 从 Authorization: Bearer <token> 提取 token */
export function extractBearerToken(
  authorization: string | null | undefined,
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

function extractApiKeyHeader(value: string | null | undefined): string | null {
  const key = value?.trim();
  return key || null;
}

export async function getTokenFromRequest(req?: Request) {
  const read = (get: (name: string) => string | null) =>
    extractBearerToken(get("authorization")) ||
    extractApiKeyHeader(get("x-api-key"));

  if (req) return read((name) => req.headers.get(name));
  const h = await headers();
  return read((name) => h.get(name));
}

/** 令牌鉴权：摘要匹配，且所属账号为启用状态（令牌永不过期） */
export async function findUserByApiKey(raw: string): Promise<{
  user: AuthUser;
  projectId: string;
} | null> {
  if (!isApiKey(raw)) return null;
  const now = new Date();
  const record = await prisma.apiKey.findFirst({
    where: { keyHash: hashApiKey(raw) },
    include: { project: { select: { id: true, ownerId: true } } },
  });
  if (!record?.project || record.project.ownerId !== record.userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: record.userId, status: "ACTIVE" },
  });
  if (!user) return null;

  const staleBefore = new Date(now.getTime() - 60_000);
  if (!record.lastUsedAt || record.lastUsedAt < staleBefore) {
    try {
      await prisma.apiKey.updateMany({
        where: {
          id: record.id,
          OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: staleBefore } }],
        },
        data: { lastUsedAt: now },
      });
    } catch {
      // 最近使用时间写失败不影响本次鉴权
    }
  }

  return { user: toAuthUser(user), projectId: record.projectId };
}

export type AuthVia = "session" | "api_key";

export async function getAuthContext(req?: Request): Promise<{
  user: AuthUser;
  via: AuthVia;
  projectId: string | null;
} | null> {
  const token = await getTokenFromRequest(req);
  if (!token) return null;

  if (isApiKey(token)) {
    const matched = await findUserByApiKey(token);
    return matched
      ? { user: matched.user, via: "api_key", projectId: matched.projectId }
      : null;
  }

  const user = await findUserByToken(token);
  return user
    ? { user: toAuthUser(user), via: "session", projectId: null }
    : null;
}

export async function getCurrentUser(req?: Request) {
  const ctx = await getAuthContext(req);
  return ctx?.user ?? null;
}

export async function requireUser(req?: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return { user: null as AuthUser | null, error: Response.json({ message: "未登录" }, { status: 401 }) };
  }
  return { user, error: null as Response | null };
}
