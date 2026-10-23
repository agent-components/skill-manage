import { NextRequest } from "next/server";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** 复制用：返回完整令牌 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: auth.user.id },
    select: { token: true },
  });
  if (!existing) return jsonError("令牌不存在", 404);

  return jsonOk({ token: existing.token });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return jsonError("令牌不存在", 404);

  await prisma.apiKey.delete({ where: { id } });
  return jsonOk({ ok: true });
}
