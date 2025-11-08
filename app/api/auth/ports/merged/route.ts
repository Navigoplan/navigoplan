// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { buildMergedPorts } from "@/lib/portsMerged";

// ίδιο category schema με τον client
type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

function classifyCategory(name: string): PortCategory {
  const n = (name || "").toLowerCase();
  if (n.includes("marina")) return "marina";
  if (n.includes("bay") || n.includes("cove") || n.includes("anchorage")) return "anchorage";
  if (n.includes("canal")) return "spot";
  return "harbor";
}

export async function GET() {
  try {
    const merged = buildMergedPorts();

    // Δίνουμε μόνο όσα έχουν συντεταγμένες (για AI/Map)
    const ports = merged
      .filter(p => typeof p.lat === "number" && typeof p.lon === "number")
      .map(p => ({
        id: (p.name || "").toLowerCase().replace(/\s+/g, "-"),
        name: p.name,
        lat: p.lat as number,
        lon: p.lon as number,
        category: classifyCategory(p.name),
        region: p.region || "Greece",
        aliases: [] as string[],
      }));

    return NextResponse.json(ports, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "merge failed" }, { status: 500 });
  }
}
