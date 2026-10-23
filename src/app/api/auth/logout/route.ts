import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (token) {
    await prisma.user.updateMany({
      where: { token },
      data: { token: null, tokenExpiredAt: null, updatedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
