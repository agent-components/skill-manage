import { NextResponse } from "next/server";
import {
  extractBearerToken,
  findUserByToken,
  toAuthUser,
  type AuthUser,
} from "@/lib/auth";
import { SkillError } from "@/lib/skill-api";
import { SkillSetError } from "@/lib/skill-set-api";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, PUT, PATCH, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type, Accept, x-skill-set-id",
};

export function openApiJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function openApiError(message: string, status = 400) {
  return openApiJson({ message }, status);
}

export function openApiOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function openApiFile(body: Buffer, headers: Record<string, string>) {
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: { ...CORS_HEADERS, ...headers },
  });
}

export async function requireOpenApiUser(req: Request): Promise<
  | { user: AuthUser; error?: undefined }
  | { user?: undefined; error: NextResponse }
> {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return { error: openApiError("未登录", 401) };
  const user = await findUserByToken(token);
  if (!user) return { error: openApiError("登录已失效", 401) };
  return { user: toAuthUser(user) };
}

export async function readJsonBody(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: openApiError("请求格式错误") };
    }
    return { body: body as Record<string, unknown> };
  } catch {
    return { error: openApiError("请求格式错误") };
  }
}

export function fromApiError(error: unknown) {
  if (error instanceof SkillSetError || error instanceof SkillError) {
    return openApiError(error.message, error.status);
  }
  throw error;
}
