import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  requireOpenApiUser,
} from "@/lib/openapi";
import { readSkillVersionFile } from "@/lib/skill-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    const file = await readSkillVersionFile(
      auth.user.id,
      id,
      req.nextUrl.searchParams.get("path"),
    );
    return openApiJson(file);
  } catch (error) {
    return fromApiError(error);
  }
}
