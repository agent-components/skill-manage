import { NextResponse } from "next/server";

/** 公开工具列表。宿主服务端直接 GET，不要要求登录。具体工具稍后再定义。 */
export function GET() {
  return NextResponse.json({ tools: [] });
}
