// app/api/auth/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts, type PortCategory } from "@/lib/portsMerged";

export const runtime = "nodejs";

type ApiPort = {
  id: string;
  name: string;
  lat: number | undefined;
  lon: number | undefined;
  category: PortCategory;
  region: string;
  aliases: string[];
};

function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["Άφιξη","Αφιξη","Είσοδος","Έξοδος","Exodos","Βάθη","Better","Notes","Call","Arrival","Entrance","Depth"];
  const low = s.toLowerCase();
  if (bad.some(w => low.startsWith(w.toLowerCase()))) return false;
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s)) return false;
  return true;
}

export async function GET() {
  try {
    const merged = buildMergedPorts();

    const list: ApiPort[] = merged.map((p) => {
      const name = String(p.name ?? "").trim();
      const id = String(p.id ?? name).trim();

      const lat = typeof p.lat === "number" ? p.lat : undefined;
      const lon = typeof p.lon === "number" ? p.lon : undefined;

      const aliases = (p.aliases ?? []).filter(isNameLike);

      // Map σε canonical σχήμα που περιμένει το usePorts()
      const out: ApiPort = {
        id,
        name,
        lat,
        lon,
        category: (p.category as PortCategory) ?? "harbor",
        region: String(p.region ?? ""),
        aliases
      };
      return out;
    })
    // Κρατάμε μόνο όσα έχουν όνομα & region (coords μπορεί να λείπουν για facts-only)
    .filter((p) => p.name && p.region);

    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
