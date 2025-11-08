// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts } from "@/lib/portsMerged";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ports = buildMergedPorts();
    return NextResponse.json({ ok: true, ports }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
