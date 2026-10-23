import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, requireAuth } from "@/lib/api";
import { getObjectBuffer } from "@/lib/storage";

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
  });
  if (!ver) return jsonError("版本不存在", 404);

  const buf = await getObjectBuffer(ver.storageKey);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${skill.slug}-${version}.zip"`,
      "Content-Length": String(buf.length),
    },
  });
}
