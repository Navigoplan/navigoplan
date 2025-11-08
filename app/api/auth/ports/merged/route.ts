// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPortsAPI, type PortCategory } from "@/lib/portsMerged";

export const runtime = "nodejs";

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
  if (s.length > 64) return false;
  if (s.split(/\s+/).length > 8) return false;
  const bad = [
    "Άφιξη","Αφιξη","Είσοδος","Έξοδος","Exodos","Βάθη",
    "Better","Notes","Call","Arrival","Entrance","Depth"
  ];
  const low = s.toLowerCase();
  if (bad.some((w) => low.startsWith(w.toLowerCase()))) return false;
  // Αγγλικά + Ελληνικά + βασικά σύμβολα
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s)) return false;
  return true;
}

export async function GET() {
  try {
    // Ενιαία λίστα από ports.v1.json + SeaGuide + PortFacts (με GEO overrides όπου χρειάζεται)
    const merged = buildMergedPortsAPI();

    const list: ApiPort[] = merged.map((p) => {
      // dedupe aliases και κράτα μόνο "καθαρά" labels για autocomplete
      const aliasClean = Array.from(
        new Set([...(p.aliases ?? [])].filter(isNameLike))
      );

      return {
        id: String(p.id || p.name),
        name: String(p.name),
        lat: Number(p.lat),
        lon: Number(p.lon),
        category: (p.category as PortCategory) ?? "harbor",
        region: String(p.region || ""),
        aliases: aliasClean,
      };
    });

    // Ασφάλεια: κράτα μόνο όσα έχουν coords & όνομα/region
    const out = list.filter(
      (r) =>
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lon) &&
        r.name &&
        r.region
    );

    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "failed" },
      { status: 500 }
    );
  }
}
