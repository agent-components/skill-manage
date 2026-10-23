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
