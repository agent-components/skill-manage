"use client";

import { AUTH_TOKEN_KEY } from "@/lib/constants";

export type ClientUser = {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
  email: string | null;
};

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

/** 带 Bearer Token 的 fetch */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = getClientToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function fetchCurrentUser(): Promise<ClientUser | null> {
  const token = getClientToken();
  if (!token) return null;
  const res = await authFetch("/api/auth/me");
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as ClientUser;
}

const ssoInflight = new Map<
  string,
  Promise<{ token: string; user: ClientUser }>
>();

/** 父页面来源。服务端已配置 HARNESS_ORIGIN 时会忽略这里。 */
export function detectHarnessOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_HARNESS_ORIGIN?.trim();
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

/** 用一次性 harness_sso 向本应用换短期会话。同一 code 只发一次请求。 */
export function exchangeHarnessSso(code: string) {
  const existing = ssoInflight.get(code);
  if (existing) return existing;

  const pending = (async () => {
    const res = await fetch("/api/auth/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        harnessOrigin: detectHarnessOrigin(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token || !data.user) {
      throw new Error(data.message || "请从 Harness Admin 打开");
    }
    saveClientToken(data.token);
    return data as { token: string; user: ClientUser };
  })();

  ssoInflight.set(code, pending);
  return pending;
}

export async function loginRequest(account: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "登录失败");
  }
  if (data.token) saveClientToken(data.token);
  return data as { token: string; user: ClientUser };
}

export async function logoutRequest() {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearClientToken();
  }
}
