import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiError,
  openApiJson,
  openApiOptions,
  requireOpenApiUser,
} from "@/lib/openapi";
import { SkillHubError, listSquareCategories } from "@/lib/skillhub";

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  try {
    const data = await listSquareCategories(auth.user.id);
    return openApiJson(data);
  } catch (error) {
    if (error instanceof SkillHubError) return openApiError(error.message, error.status);
    return fromApiError(error);
  }
}
