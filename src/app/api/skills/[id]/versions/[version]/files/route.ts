import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; version: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id, version } = await ctx.params;

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
  });
  if (!skill) return jsonError("技能不存在", 404);

  const ver = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId: id, version } },
    include: { files: { orderBy: { filePath: "asc" } } },
  });
  if (!ver) return jsonError("版本不存在", 404);

  return jsonOk({
    version: ver.version,
    files: ver.files.map((f) => ({
      id: f.id,
      filePath: f.filePath,
      fileSize: f.fileSize.toString(),
      contentType: f.contentType,
      sha256: f.sha256,
    })),
  });
}
