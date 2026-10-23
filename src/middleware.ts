import { NextRequest, NextResponse } from "next/server";

function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 页面路由由客户端守卫处理（middleware 读不到 localStorage）
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 登录接口放行
  if (pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  // 其余 API 要求 Bearer Token
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
