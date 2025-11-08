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

/* ===== Helper για έλεγχο ονόματος ===== */
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["Άφιξη","Αφιξη","Είσοδος","Έξοδος","Arrival","Entrance","Depth","Notes","Better","Call"];
  const low = s.toLowerCase();
  if (bad.some(w => low.startsWith(w.toLowerCase()))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s);
}

/* ===== GET endpoint ===== */
export async function GET() {
  try {
    const merged: MergedPort[] = await buildMergedPorts();

    // Χτίζουμε canonical λίστα
    const list: ApiPort[] = merged
      .map((p, i): ApiPort => ({
        id: String(p.id ?? `p-${i}`),
        name: String(p.name ?? "").trim(),
        lat: typeof p.lat === "number" ? p.lat : undefined,
        lon: typeof p.lon === "number" ? p.lon : undefined,
        region: String(p.region ?? "").trim(),
        category: (p.category as PortCategory) ?? "harbor",
        aliases: (Array.isArray(p.aliases) ? p.aliases : []).filter(isNameLike),
      }))
      // Χρειαζόμαστε όνομα + region + συντεταγμένες
      .filter(p => !!p.name && !!p.region && typeof p.lat === "number" && typeof p.lon === "number");

    // ===== Διαγνωστικά headers =====
    const res = NextResponse.json(list, { status: 200 });

    try {
      const sgCount = (merged as any[]).filter(p => p?.__source === "seaguide").length;
      res.headers.set("x-merged-source", "ports+seaguide");
      res.headers.set("x-merged-count", String(list.length));
      res.headers.set("x-merged-seaguide", String(sgCount));
    } catch {
      res.headers.set("x-merged-source", "ports-only");
    }

    return res;

  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
