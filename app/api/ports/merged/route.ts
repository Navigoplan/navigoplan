// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts, type MergedPort } from "@/lib/portsMerged";
import { promises as fs } from "fs";
import path from "path";

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
  if (bad.some(w => low.startsWith(w.toLowerCase()))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s);
}

const DATA_DIR = path.join(process.cwd(), "public", "data");
const FILE_CANON = "ports.v1.json";
const FILE_SG    = "sea_guide_vol3_master.json";
const FILE_FACTS = "port-facts.v1.json";

async function fileStatOrNull(fp: string) {
  try {
    const st = await fs.stat(fp);
    return { exists: true, size: st.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const merged: MergedPort[] = await buildMergedPorts();

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
      .filter(p => !!p.name && !!p.region && typeof p.lat === "number" && typeof p.lon === "number");

    // Σε debug mode επιστρέφουμε diagnostics
    if (debug) {
      const sgCountMerged = merged.filter(m => (m as any).__source === "seaguide").length;
      const sgCountList   = list.filter(m => (m as any).__source === "seaguide").length; // μπορεί να είναι 0 αν δεν είχαν coords

      const canonPath = path.join(DATA_DIR, FILE_CANON);
      const sgPath    = path.join(DATA_DIR, FILE_SG);
      const factsPath = path.join(DATA_DIR, FILE_FACTS);

      const [canonStat, sgStat, factsStat] = await Promise.all([
        fileStatOrNull(canonPath),
        fileStatOrNull(sgPath),
        fileStatOrNull(factsPath),
      ]);

      const sgFirst3 = merged
        .filter(m => (m as any).__source === "seaguide")
        .slice(0, 3)
        .map(m => ({
          id: m.id, name: m.name, region: m.region, lat: m.lat, lon: m.lon, aliases: m.aliases?.slice(0,3) ?? []
        }));

      return NextResponse.json({
        ok: true,
        counts: {
          totalMerged: merged.length,
          totalReturned: list.length,
          seaguideMerged: sgCountMerged,
          seaguideReturned: sgCountList,
        },
        files: {
          canon: { path: canonPath, ...canonStat },
          seaGuide: { path: sgPath, ...sgStat },
          facts: { path: factsPath, ...factsStat },
        },
        sample: {
          seaguideFirst3: sgFirst3,
        }
      }, {
        status: 200,
        headers: { "cache-control": "no-store" }
      });
    }

    // Κανονική έξοδος + headers για γρήγορο έλεγχο
    const res = NextResponse.json(list, { status: 200 });
    try {
      const sgCount = merged.filter(m => (m as any).__source === "seaguide").length;
      res.headers.set("x-merged-source", "ports+seaguide");
      res.headers.set("x-merged-count", String(list.length));
      res.headers.set("x-merged-seaguide", String(sgCount));
    } catch {
      res.headers.set("x-merged-source", "ports-only");
    }
    res.headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
    return res;

  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
