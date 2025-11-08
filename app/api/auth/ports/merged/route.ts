// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts, type MergedPort } from "@/lib/portsMerged";

export const runtime = "nodejs";

type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

type ApiPort = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: string;
  aliases: string[];
};

function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 60) return false;
  if (s.split(/\s+/).length > 8) return false;
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
        const aliases = (Array.isArray(p.aliases) ? p.aliases : []).filter(isNameLike);
        return {
          id: String(p.id ?? `p-${i}`),
          name: String(p.name ?? "").trim(),
          lat: Number(p.lat),
          lon: Number(p.lon),
          region: String(p.region ?? "").trim(),
          category: (p.category as PortCategory) ?? "harbor",
          aliases,
        };
      })
      // Χρειαζόμαστε name+region+coords
      .filter((p) => !!p.name && !!p.region && Number.isFinite(p.lat) && Number.isFinite(p.lon));

    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
