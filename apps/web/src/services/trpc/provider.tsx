import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@skill-manage/server/router";
import { trpcClient } from "./client";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export { trpcClient };
