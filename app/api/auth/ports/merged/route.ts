// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts } from "@/lib/portsMerged";

export const runtime = "nodejs";

type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export async function GET() {
  try {
    const merged = buildMergedPorts();

    // Μίνιμαλ schema που περιμένει το usePorts(): id, name, lat, lon, category, region, aliases
    const list = merged
      .map((p) => {
        const name = String(p.name ?? "").trim();
        const id =
          String((p as any).id ?? name)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\-]/g, "");
        const lat = typeof p.lat === "number" ? p.lat : undefined;
        const lon = typeof p.lon === "number" ? p.lon : undefined;
        const region = String(p.region ?? "Greece").trim();
        const aliases: string[] = Array.isArray((p as any).aliases)
          ? ((p as any).aliases as string[]).map((x) => String(x || "").trim()).filter(Boolean)
          : [];
        const category: PortCategory = ((): PortCategory => {
          const c = String((p as any).category ?? "").toLowerCase();
          if (c === "marina" || c === "anchorage" || c === "spot" || c === "harbor") return c as PortCategory;
          return "harbor";
        })();

        return { id, name, lat, lon, category, region, aliases };
      })
      // κρατάμε μόνο όσα έχουν όνομα & region (coords μπορεί να λείπουν για facts-only)
      .filter((p) => p.name && p.region);

    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
