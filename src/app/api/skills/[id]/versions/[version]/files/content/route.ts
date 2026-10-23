import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";
import {
  PREVIEW_MAX_BYTES,
  isProbablyText,
} from "@/lib/skill-package";
import { getObjectBuffer } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string; version: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id, version } = await ctx.params;
  const path = req.nextUrl.searchParams.get("path")?.trim();
  if (!path) return jsonError("缺少 path 参数");

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
  });
  if (!skill) return jsonError("技能不存在", 404);

  const ver = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId: id, version } },
  });
  if (!ver) return jsonError("版本不存在", 404);

  const file = await prisma.skillFile.findUnique({
    where: {
      versionId_filePath: { versionId: ver.id, filePath: path },
    },
  });
  if (!file) return jsonError("文件不存在", 404);

  const size = Number(file.fileSize);
  const textLike = isProbablyText(file.filePath, file.contentType);

  if (!textLike) {
    return jsonOk({
      path: file.filePath,
      contentType: file.contentType,
      fileSize: file.fileSize.toString(),
      binary: true,
      tooLarge: false,
      content: null,
    });
  }

  if (size > PREVIEW_MAX_BYTES) {
    return jsonOk({
      path: file.filePath,
      contentType: file.contentType,
      fileSize: file.fileSize.toString(),
      binary: false,
      tooLarge: true,
      content: null,
    });
  }

  const buf = await getObjectBuffer(file.storageKey);
  return jsonOk({
    path: file.filePath,
    contentType: file.contentType,
    fileSize: file.fileSize.toString(),
    binary: false,
    tooLarge: false,
    content: buf.toString("utf8"),
  });
}
