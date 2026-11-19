import { NextRequest, NextResponse } from "next/server";

function extractBearer(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
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

  // 登录与宿主 SSO 兑换放行
  if (pathname === "/api/auth/login" || pathname === "/api/auth/sso") {
    return NextResponse.next();
  }

  // 宿主拉取组件菜单和工具：公开接口，不要登录态
  if (pathname === "/api/harness/menus" || pathname === "/api/harness/tools") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/openapi/")) {
    if (req.method === "OPTIONS") {
      return openApiCors(new NextResponse(null, { status: 204 }));
    }
    const token = extractBearer(req);
    if (!token) {
      return openApiCors(NextResponse.json({ message: "未登录" }, { status: 401 }));
    }
    return openApiCors(NextResponse.next());
  }

  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  return NextResponse.next();
}

function openApiCors(res: NextResponse) {
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set(
    "access-control-allow-methods",
    "GET, PUT, PATCH, POST, DELETE, OPTIONS",
  );
  res.headers.set(
    "access-control-allow-headers",
    "Authorization, Content-Type, Accept, x-skill-set-id",
  );
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
