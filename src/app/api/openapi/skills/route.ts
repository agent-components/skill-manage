import { NextRequest } from "next/server";
import {
  fromApiError,
  openApiError,
  openApiJson,
  openApiOptions,
  readJsonBody,
  requireOpenApiUser,
} from "@/lib/openapi";
import { SkillError, listSkills, uploadSkillPackage, zipBufferFromBase64 } from "@/lib/skill-api";

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;

  const data = await listSkills(
    auth.user.id,
    req.nextUrl.searchParams,
    req.headers.get("x-skill-set-id"),
  );
  return openApiJson(data);
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

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return openApiError("请使用 multipart 上传");
      }
      const file = form.get("file") || form.get("zip");
      if (!(file instanceof File)) return openApiError("请上传 zip 文件");
      const fallbackVersion =
        typeof form.get("version") === "string" ? (form.get("version") as string) : undefined;
      const skillId =
        typeof form.get("skillId") === "string" ? (form.get("skillId") as string).trim() : "";
      const skillSetIds = form
        .getAll("skillSetIds")
        .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
        .map((item) => item.trim())
        .filter(Boolean);
      const created = await uploadSkillPackage(auth.user.id, {
        zipBuffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        fallbackVersion,
        skillId,
        skillSetIds,
      });
      return openApiJson(created, 201);
    }

    const parsed = await readJsonBody(req);
    if (parsed.error) return parsed.error;
    const zipBuffer = zipBufferFromBase64(parsed.body.zipBase64 ?? parsed.body.zip_base64);
    if (!zipBuffer) return openApiError("无效的 zipBase64");
    const filename = typeof parsed.body.filename === "string" ? parsed.body.filename : "";
    const skillSetIds = skillSetIdsFrom(parsed.body.skillSetIds);
    const created = await uploadSkillPackage(auth.user.id, {
      zipBuffer,
      filename,
      skillSetIds,
      matchFilename: true,
    });
    return openApiJson(created, 201);
  } catch (error) {
    return fromApiError(error);
  }
}
