import { AUTH_TOKEN_KEY } from "@skill-manage/shared";
import type { AuthUser } from "@skill-manage/shared";
import { trpcClient } from "@/lib/trpc-client";

export type ClientUser = AuthUser;

export function getClientToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function saveClientToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearClientToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** 父页面来源。服务端已配置 HARNESS_ORIGIN 时会忽略这里。 */
export function detectHarnessOrigin(): string {
  const configured = import.meta.env.VITE_HARNESS_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return "";
    }
  }
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

const ssoInflight = new Map<
  string,
  Promise<{ token: string; user: ClientUser }>
>();

/** 用一次性 harness_sso 向本应用换短期会话。同一 code 只发一次请求。 */
export async function exchangeHarnessSso(code: string) {
  const existing = ssoInflight.get(code);
  if (existing) return existing;

  const pending = (async () => {
    const result = await trpcClient.auth.sso.mutate({
      code,
      harnessOrigin: detectHarnessOrigin(),
    });
    saveClientToken(result.token);
    return result;
  })();

  ssoInflight.set(code, pending);
  return pending;
}

export async function loginRequest(account: string, password: string) {
  const result = await trpcClient.auth.login.mutate({ account, password });
  saveClientToken(result.token);
  return result;
}

export async function logoutRequest() {
  try {
    await trpcClient.auth.logout.mutate();
  } finally {
    clearClientToken();
  }
}

export async function fetchCurrentUser(): Promise<ClientUser | null> {
  if (!getClientToken()) return null;
  try {
    return await trpcClient.auth.me.query();
  } catch {
    return null;
  }
}
