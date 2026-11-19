import { NextRequest } from "next/server";
import { openApiJson, openApiOptions, requireOpenApiUser } from "@/lib/openapi";
import { listSkillSetIcons } from "@/lib/skill-set-api";

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;

  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",");
  const list = await listSkillSetIcons(auth.user.id, ids);
  return openApiJson({ list });
}
