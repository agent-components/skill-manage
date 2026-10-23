import { NextRequest, NextResponse } from "next/server";
import { resolveSkillDownloadLink } from "@/lib/download-link";
import { getObjectBuffer } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

/** 匿名短链下载：凭唯一 token，过期自动失效 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const trimmed = token?.trim();
  if (!trimmed) {
    return NextResponse.json({ message: "无效链接" }, { status: 400 });
  }

  const { error, link } = await resolveSkillDownloadLink(trimmed);
  if (error || !link) {
    return NextResponse.json({ message: error || "无效链接" }, { status: 410 });
  }

  const { version } = link;
  const filename = `${version.skill.slug}-${version.version}.zip`;
  const buf = await getObjectBuffer(version.storageKey);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-store",
    },
  });
}
