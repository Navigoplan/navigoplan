// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts, type MergedPort } from "@/lib/portsMerged";

export const runtime = "nodejs";

type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

type ApiPort = {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  category?: PortCategory;
  region?: string;
  aliases?: string[];
};

function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["Άφιξη","Αφιξη","Είσοδος","Έξοδος","Arrival","Entrance","Depth","Notes","Better","Call"];
  const low = s.toLowerCase();
  if (bad.some((w) => low.startsWith(w.toLowerCase()))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s);
}

export async function GET() {
  try {
    const merged: MergedPort[] = await buildMergedPorts();

    const list: ApiPort[] = merged
      .map((p: MergedPort, i: number): ApiPort => {
        const id = String(p.id ?? `p-${i}`);
        const name = String(p.name ?? "").trim();
        const lat = typeof p.lat === "number" ? p.lat : undefined;
        const lon = typeof p.lon === "number" ? p.lon : undefined;
        const region = String(p.region ?? "").trim();
        const category = (p.category as PortCategory) ?? "harbor";
        const aliases = (Array.isArray(p.aliases) ? p.aliases : []).filter(isNameLike);
        return { id, name, lat, lon, region, category, aliases };
      })
      // Θέλουμε όσα έχουν name+region+coords για να είναι χρήσιμα στο AI/Map
      .filter((p: ApiPort) => !!p.name && !!p.region && typeof p.lat === "number" && typeof p.lon === "number");

    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
