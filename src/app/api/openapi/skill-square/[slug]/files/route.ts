import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiError,
  openApiJson,
  openApiOptions,
  requireOpenApiUser,
} from "@/lib/openapi";
import { listSquareFiles, SkillHubError } from "@/lib/skillhub";

type Ctx = { params: Promise<{ slug: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { slug } = await ctx.params;
  try {
    return openApiJson(await listSquareFiles(decodeURIComponent(slug), auth.user.id));
  } catch (error) {
    if (error instanceof SkillHubError) return openApiError(error.message, error.status);
    return fromApiError(error);
  }
}
