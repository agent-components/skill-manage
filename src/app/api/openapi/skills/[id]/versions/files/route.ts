import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  requireOpenApiUser,
} from "@/lib/openapi";
import { listSkillVersionFiles } from "@/lib/skill-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(_req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    return openApiJson(
      await listSkillVersionFiles(auth.user.id, id),
    );
  } catch (error) {
    return fromApiError(error);
  }
}
