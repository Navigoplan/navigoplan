import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSession();
  const base = process.env.APP_URL ?? "https://navigoplan.com";
  // 303 = See Other -> ο browser θα ζητήσει /login με GET
  return NextResponse.redirect(new URL("/login", base), 303);
}
