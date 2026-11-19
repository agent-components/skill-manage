import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { deleteSkill, readSkillFile, updateSkill } from "@/lib/skill-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    const file = await readSkillFile(auth.user.id, id, req.nextUrl.searchParams.get("path"));
    return openApiJson(file);
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
    const skill = await updateSkill(auth.user.id, id, parsed.body);
    return openApiJson(skill);
  } catch (error) {
    return fromApiError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    await deleteSkill(auth.user.id, id);
    return openApiJson({ ok: true });
  } catch (error) {
    return fromApiError(error);
  }
}
