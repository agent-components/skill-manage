import { NextRequest, NextResponse } from "next/server";
import {
  PASSWORD_SESSION_TTL_MS,
  createAccessToken,
  sessionExpiry,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  let body: { account?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "请求格式错误" }, { status: 400 });
  }

  const account = body.account?.trim();
  const password = body.password ?? "";
  if (!account || !password) {
    return NextResponse.json(
      { message: "请输入账号和密码" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { account } });
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ message: "账号已停用" }, { status: 403 });
  }

  const token = user.token || createAccessToken();
  const tokenExpiredAt = sessionExpiry(PASSWORD_SESSION_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: { token, tokenExpiredAt, updatedAt: new Date() },
  });

  return NextResponse.json({
    token,
    user: toAuthUser(user),
  });
}
