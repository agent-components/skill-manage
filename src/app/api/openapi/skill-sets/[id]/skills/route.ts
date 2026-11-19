import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { changeSkillSetSkills } from "@/lib/skill-set-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const parsed = await readJsonBody(req);
  if (parsed.error) return parsed.error;

  try {
    const result = await changeSkillSetSkills(auth.user.id, id, parsed.body);
    return openApiJson(result);
  } catch (error) {
    return fromApiError(error);
  }
}
