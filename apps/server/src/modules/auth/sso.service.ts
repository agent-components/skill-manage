import { type AuthUser } from "@skill-manage/shared";
import { config } from "../../config/env.js";
import { prisma } from "../../infra/prisma.js";
import {
  SSO_SESSION_TTL_MS,
  createAccessToken,
  sessionExpiry,
  toAuthUser,
} from "./auth.service.js";

/** 宿主 SSO 首次落库时的初始密码 */
export const HARNESS_BOOTSTRAP_PASSWORD = "123456";

type HarnessUser = {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
};

export function harnessOrigin(): string | null {
  const configured = config.harnessOrigin;
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function resolveHarnessOrigin(requested?: unknown): string | null {
  const configured = harnessOrigin();
  if (configured) return configured;
  if (typeof requested !== "string" || !requested.trim()) return null;
  try {
    const url = new URL(requested.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function asHarnessUser(value: unknown): HarnessUser | null {
  if (!value || typeof value !== "object") return null;
  const user = value as Record<string, unknown>;
  const id = typeof user.id === "string" ? user.id.trim() : "";
  const account = typeof user.account === "string" ? user.account.trim() : "";
  const displayName = typeof user.displayName === "string" ? user.displayName.trim() : "";
  if (!id || !account) return null;
  return {
    id,
    account,
    displayName: displayName || account,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  };
}

export async function exchangeHarnessCode(
  origin: string,
  code: string
): Promise<HarnessUser | null> {
  let response: Response;
  try {
    response = await fetch(`${origin}/api/sso/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("harness sso exchange failed", error);
    return null;
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) return null;
  const user = (body as { user?: unknown } | null)?.user;
  return asHarnessUser(user);
}

async function issueSession(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("用户不存在");

  const resetAt = sessionExpiry(SSO_SESSION_TTL_MS);
  // 还没到期，且剩余时间多于 8 小时：保持原 token 和过期时间。
  if (
    existing.token &&
    existing.tokenExpiredAt &&
    existing.tokenExpiredAt.getTime() > resetAt.getTime()
  ) {
    return { token: existing.token, user: toAuthUser(existing) };
  }

  const token = existing.token || createAccessToken();
  const user = await prisma.user.update({
    where: { id: userId },
    data: { token, tokenExpiredAt: resetAt, updatedAt: new Date() },
  });
  return { token, user: toAuthUser(user) };
}

/** 按宿主用户建立本地账号。新建时密码为 123456，已有账号只同步显示名和角色。 */
export async function establishHarnessSession(harnessUser: HarnessUser): Promise<{
  token: string;
  user: AuthUser;
}> {
  const profile = {
    displayName: harnessUser.displayName,
    role: harnessUser.role,
    status: "ACTIVE" as const,
    updatedAt: new Date(),
  };

  const byId = await prisma.user.findUnique({ where: { id: harnessUser.id } });
  if (byId) {
    try {
      await prisma.user.update({
        where: { id: byId.id },
        data: {
          ...profile,
          ...(byId.account === harnessUser.account ? {} : { account: harnessUser.account }),
        },
      });
    } catch {
      await prisma.user.update({
        where: { id: byId.id },
        data: profile,
      });
    }
    return issueSession(byId.id);
  }

  const byAccount = await prisma.user.findUnique({
    where: { account: harnessUser.account },
  });
  if (byAccount) {
    await prisma.user.update({
      where: { id: byAccount.id },
      data: profile,
    });
    return issueSession(byAccount.id);
  }

  await prisma.user.create({
    data: {
      id: harnessUser.id,
      account: harnessUser.account,
      password: HARNESS_BOOTSTRAP_PASSWORD,
      displayName: harnessUser.displayName,
      role: harnessUser.role,
      status: "ACTIVE",
      updatedAt: new Date(),
    },
  });
  return issueSession(harnessUser.id);
}
