import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { isTest } from "./config/env.js";
import { registerOpenApiRoutes } from "./http/openapi/index.js";
import { appRouter, createContext } from "./trpc/router.js";

/** 组装 Fastify 实例：挂载 tRPC 与 REST 兼容层。 */
export async function buildServer() {
  const app = Fastify({
    logger: !isTest,
    bodyLimit: 60 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "x-skill-set-id", "trpc-accept"],
  });

  await app.register(multipart, {
    limits: { fileSize: 60 * 1024 * 1024, files: 5 },
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: CreateFastifyContextOptions) =>
        createContext({ headers: req.headers }),
      onError({ error, path }: { error: { code: string }; path?: string }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
        }
      },
    },
  });

  await registerOpenApiRoutes(app);

  return app;
}
