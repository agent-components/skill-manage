import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { deleteSkillSet, getSkillSetDetail, updateSkillSet } from "@/lib/skill-set-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    return openApiJson(await getSkillSetDetail(auth.user.id, id));
  } catch (error) {
    return fromApiError(error);
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const parsed = await readJsonBody(req);
  if (parsed.error) return parsed.error;

  try {
    const skillSet = await updateSkillSet(auth.user.id, id, parsed.body);
    return openApiJson(skillSet);
  } catch (error) {
    return fromApiError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    await deleteSkillSet(auth.user.id, id);
    return openApiJson({ ok: true });
  } catch (error) {
    return fromApiError(error);
  }
}
