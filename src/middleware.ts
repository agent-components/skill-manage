import { NextRequest, NextResponse } from "next/server";

function extractCredential(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    const bearer = match?.[1]?.trim();
    if (bearer) return bearer;
  }
  return req.headers.get("x-api-key")?.trim() || null;
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

  // 下载短链：凭 token 访问，无需登录
  if (pathname.startsWith("/api/d/")) {
    return NextResponse.next();
  }

  // 宿主拉取组件菜单和工具：公开接口，不要登录态
  if (pathname === "/api/harness/menus" || pathname === "/api/harness/tools") {
    return NextResponse.next();
  }

  // 其余 API 要求登录会话或令牌（Authorization: Bearer，或 X-Api-Key）
  const token = extractCredential(req);
  if (!token) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
