import { NextResponse } from "next/server";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export async function requireAuth(req: Request): Promise<
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: NextResponse }
> {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      error: NextResponse.json({ message: "未登录" }, { status: 401 }),
    };
  }
  return { user };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}
