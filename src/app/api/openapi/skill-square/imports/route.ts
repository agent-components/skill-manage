import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { SkillError } from "@/lib/skill-api";
import { SkillHubError, importSquareSkill } from "@/lib/skillhub";

export function OPTIONS() {
  return openApiOptions();
}

function skillSetIdsFrom(value: unknown) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === "string")) {
      throw new SkillError("技能集参数无效");
    }
    return value;
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  throw new SkillError("技能集参数无效");
}

export async function POST(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const parsed = await readJsonBody(req);
  if (parsed.error) return parsed.error;
  const slug = typeof parsed.body.slug === "string" ? parsed.body.slug.trim() : "";
  if (!slug) return openApiError("请选择要导入的技能");
  try {
    const created = await importSquareSkill(
      auth.user.id,
      slug,
      skillSetIdsFrom(parsed.body.skillSetIds),
    );
    return openApiJson(created, 201);
  } catch (error) {
    if (error instanceof SkillHubError) return openApiError(error.message, error.status);
    return fromApiError(error);
  }
}
