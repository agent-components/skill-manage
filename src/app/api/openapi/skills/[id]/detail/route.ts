import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  requireOpenApiUser,
} from "@/lib/openapi";
import { getSkillDetail } from "@/lib/skill-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    return openApiJson(await getSkillDetail(auth.user.id, id));
  } catch (error) {
    return fromApiError(error);
  }
}
