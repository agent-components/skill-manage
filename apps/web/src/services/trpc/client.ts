import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
  isNonJsonSerializable,
} from "@trpc/client";
import superjson from "superjson";
import { AUTH_TOKEN_KEY } from "@skill-manage/shared";
import type { AppRouter } from "@skill-manage/server/router";

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

function authHeaders() {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 二进制 / FormData 请求走 httpLink（不能被 batch 合并），其余走 httpBatchLink。 */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => isNonJsonSerializable(op.context?.input),
      true: httpLink({
        url: "/trpc",
        headers: authHeaders,
        transformer: superjson,
      }),
      false: httpBatchLink({
        url: "/trpc",
        headers: authHeaders,
        transformer: superjson,
      }),
    }),
  ],
});

export { superjson };
