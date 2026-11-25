import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
  isNonJsonSerializable,
} from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@skill-manage/server/router";
import { getClientToken } from "./token";

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
