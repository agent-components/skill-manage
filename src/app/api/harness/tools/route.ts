import { NextResponse } from "next/server";
import { HARNESS_TOOLS } from "@/lib/harness-tools";

/** 公开工具列表。宿主服务端直接 GET，不要要求登录。 */
export function GET() {
  return NextResponse.json({ tools: HARNESS_TOOLS });
}
