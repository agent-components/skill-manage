import { NextRequest, NextResponse } from "next/server";
import {
  establishHarnessSession,
  exchangeHarnessCode,
  resolveHarnessOrigin,
} from "@/lib/harness-sso";

const OPEN_FROM_HARNESS = "请从 Harness Admin 打开";

export async function POST(req: NextRequest) {
  let body: { code?: unknown; harnessOrigin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: OPEN_FROM_HARNESS }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const origin = resolveHarnessOrigin(body.harnessOrigin);
  if (!code || !origin) {
    return NextResponse.json({ message: OPEN_FROM_HARNESS }, { status: 400 });
  }

  const harnessUser = await exchangeHarnessCode(origin, code);
  if (!harnessUser) {
    return NextResponse.json({ message: OPEN_FROM_HARNESS }, { status: 401 });
  }

  try {
    const session = await establishHarnessSession(harnessUser);
    return NextResponse.json(session);
  } catch (error) {
    console.error("harness sso session failed", error);
    return NextResponse.json({ message: OPEN_FROM_HARNESS }, { status: 401 });
  }
}
