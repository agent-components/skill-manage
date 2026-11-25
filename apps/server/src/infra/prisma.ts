import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@skill-manage/prisma";
import { isProduction } from "../config/env.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the Prisma client");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: isProduction ? ["error"] : ["error", "warn"],
  });
}

/**
 * Prisma 7 的 client 必须带 driver adapter，这里用 Proxy 做惰性初始化：
 * 只有真正访问 client 时才读取 DATABASE_URL，避免仅 import 就因为缺少环境变量而崩溃。
 */
function createLazyPrismaClient(): PrismaClient {
  let instance: PrismaClient | undefined;
  const resolve = () => (instance ??= createPrismaClient());
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const value = Reflect.get(resolve(), prop, receiver);
      return typeof value === "function" ? value.bind(resolve()) : value;
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createLazyPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
