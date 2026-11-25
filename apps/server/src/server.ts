import "dotenv/config";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { config, isTest } from "./config/env.js";
import { registerOpenApiRoutes } from "./http/openapi/index.js";
import { registerMcpRoutes } from "./mcp/routes.js";
import { appRouter, createContext } from "./trpc/router.js";

/**
 * 前端构建产物目录。镜像里由 apps/web/dist 提供；
 * 本地开发时该目录不存在，页面交给 Vite dev server，这里直接跳过。
 */
const webDistDir =
  process.env.WEB_DIST_DIR?.trim() ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");

const API_PREFIXES = ["/trpc", "/api", "/mcp"];


/** 组装 Fastify 实例：挂载 tRPC、REST 兼容层，以及可选 MCP 端点。 */
export async function buildServer() {
  const app = Fastify({
    logger: !isTest,
    bodyLimit: 60 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "Accept",
      "trpc-accept",
      "mcp-protocol-version",
      "mcp-session-id",
      "last-event-id",
    ],
    exposedHeaders: ["Mcp-Session-Id"],
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

  if (config.mcpEnabled) {
    await registerMcpRoutes(app);
  }

  // 生产部署由本服务同时提供前端静态文件；SPA 路由回退到 index.html。
  if (existsSync(webDistDir)) {
    await app.register(fastifyStatic, { root: webDistDir });
    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url ?? "";
      if (API_PREFIXES.some((prefix) => url.startsWith(prefix))) {
        return reply.code(404).send({ error: "Not Found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}
