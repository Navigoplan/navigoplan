// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts, type MergedPort } from "@/lib/portsMerged";

export const runtime = "nodejs";

type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

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
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s)) return false;
  return true;
}

function guessCategory(m: MergedPort): PortCategory {
  const n = String(m.category || m.name || "").toLowerCase();
  if (/\bmarina\b/.test(n) || /μαρίν/.test(n)) return "marina";
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n) || /διώρυγ/.test(n)) return "spot";
  return "harbor";
}

export async function GET() {
  try {
    const merged = await buildMergedPorts();

    const list: ApiPort[] = merged
      .map((p, idx) => {
        const name = String(p.name ?? "").trim();
        if (!name) return null;

        const lat = typeof p.lat === "number" ? p.lat : undefined;
        const lon = typeof p.lon === "number" ? p.lon : undefined;

        const aliases = (Array.isArray(p.aliases) ? p.aliases : [])
          .filter((a) => isNameLike(String(a || "")));

        // id: κράτα ό,τι υπάρχει, αλλιώς safe fallback
        const id =
          String((p as any).id ?? `merged-${idx}-${name.toLowerCase().replace(/\s+/g, "-")}`)
            .slice(0, 96);

        const out: ApiPort = {
          id,
          name,
          lat,
          lon,
          category: guessCategory(p),
          region: String(p.region ?? ""),
          aliases,
        };
        return out;
      })
      .filter(Boolean) as ApiPort[];

    // Κρατάμε μόνο όσα έχουν όνομα & region (coords μπορεί να λείπουν για facts-only)
    const safe = list.filter((p) => p.name && p.region);

    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "failed" },
      { status: 500 }
    );
  }
}
