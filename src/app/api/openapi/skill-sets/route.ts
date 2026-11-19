import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { createSkillSet, listSkillSets } from "@/lib/skill-set-api";

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;

  const data = await listSkillSets(auth.user.id, req.nextUrl.searchParams);
  return openApiJson(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;

  const parsed = await readJsonBody(req);
  if (parsed.error) return parsed.error;

  try {
    const skillSet = await createSkillSet(auth.user.id, parsed.body);
    return openApiJson(skillSet, 201);
  } catch (error) {
    return fromApiError(error);
  }
}
