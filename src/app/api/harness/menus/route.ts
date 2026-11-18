import { NextResponse } from "next/server";
import { HARNESS_MENUS } from "@/lib/harness-menus";

/** 公开菜单。宿主服务端直接 GET，不要要求登录。 */
export function GET() {
  return NextResponse.json({ menus: HARNESS_MENUS });
}
