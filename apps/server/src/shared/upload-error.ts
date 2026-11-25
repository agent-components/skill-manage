import { Prisma } from "@skill-manage/prisma";

/** 把上传过程中的数据库等内部错误转成可读文案，避免把 Prisma 原文返回给调用方。 */
export function friendlyUploadError(e: unknown): [string, number] {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = Array.isArray(e.meta?.target)
        ? e.meta.target.join(",")
        : String(e.meta?.target ?? "");
      if (target.includes("slug")) return ["同名技能已存在", 409];
      if (target.includes("version")) return ["该版本已存在", 409];
      return ["记录已存在，请勿重复上传", 409];
    }
    return ["保存技能失败，请稍后重试", 500];
  }
  if (
    e instanceof Prisma.PrismaClientValidationError ||
    e instanceof Prisma.PrismaClientUnknownRequestError ||
    e instanceof Prisma.PrismaClientInitializationError ||
    e instanceof Prisma.PrismaClientRustPanicError
  ) {
    return ["保存技能失败，请稍后重试", 500];
  }
  return ["上传失败，请稍后重试", 500];
}
