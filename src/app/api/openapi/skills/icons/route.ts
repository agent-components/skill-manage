import { NextRequest } from "next/server";
import { openApiJson, openApiOptions, requireOpenApiUser } from "@/lib/openapi";
import { listSkillIcons } from "@/lib/skill-api";

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;

  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",");
  const list = await listSkillIcons(auth.user.id, ids);
  return openApiJson({ list });
}
