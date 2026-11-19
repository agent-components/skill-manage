import { NextRequest } from "next/server";
import { fromApiError, openApiFile, openApiOptions, requireOpenApiUser } from "@/lib/openapi";
import { downloadSkillVersion } from "@/lib/skill-api";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return openApiOptions();
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireOpenApiUser(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  try {
    const file = await downloadSkillVersion(
      auth.user.id,
      id,
      req.nextUrl.searchParams.get("version"),
    );
    return openApiFile(file.buffer, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(file.buffer.length),
    });
  } catch (error) {
    return fromApiError(error);
  }
}
