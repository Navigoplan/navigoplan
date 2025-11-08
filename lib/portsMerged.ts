// lib/portsMerged.ts
// Ενοποίηση canonical ports (/public/data/ports.v1.json),
// Sea Guide master (/public/data/sea_guide_vol3_master.json) [optional],
// και PortFacts (/public/data/port-facts.v1.json) [optional].
//
// ΣΗΜΕΙΩΣΗ: Καμία module-level cache – να διαβάζει ΠΑΝΤΑ φρέσκα αρχεία.

import { promises as fs } from "fs";
import path from "path";

export type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };

export type CanonicalPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  notes?: string[];
  sources?: string[];
};

export type SeaGuideRecord = {
  id: string;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot" | "bay";
  position?: { lat?: number; lon?: number };
  name?: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
};

export type PortFact = {
  vhf?: string;
  vhfVerified?: boolean;
  marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;
  exposure?: string;
  hazards?: Hazard[];
  notes?: string[];
  sources?: string[];
};

export type MergedPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  // ops fields (μελλοντική χρήση)
  vhf?: string; vhfVerified?: boolean; marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string; exposure?: string; hazards?: Hazard[]; notes?: string[]; sources?: string[];
  __source: "canonical" | "facts" | "seaguide" | "merged";
};

const DATA_DIR = path.join(process.cwd(), "public", "data");
const FILE_CANON = "ports.v1.json";
const FILE_FACTS = "port-facts.v1.json";
const FILE_SG    = "sea_guide_vol3_master.json";

function normalize(s: string) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function uniqStrings(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr ?? []) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    const k = normalize(t);
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

async function readJSON<T = any>(fileName: string): Promise<T | null> {
  const full = path.join(DATA_DIR, fileName);
  try {
    const buf = await fs.readFile(full, "utf8");
    return JSON.parse(buf) as T;
  } catch (e) {
    console.error(`[portsMerged] Failed to read ${full}:`, e);
    return null;
  }
}

/** Μετατροπή SeaGuide -> MergedPort (μόνο όσα χρειάζονται για dropdown/coords) */
function fromSeaGuide(r: SeaGuideRecord): MergedPort | null {
  const nameEn = r.name?.en?.trim();
  const nameEl = r.name?.el?.trim();
  const name = nameEn || nameEl;
  if (!name) return null;

  const lat = typeof r.position?.lat === "number" ? r.position!.lat : undefined;
  const lon = typeof r.position?.lon === "number" ? r.position!.lon : undefined;

  const aliases = uniqStrings([
    ...(r.aliases?.en ?? []),
    ...(r.aliases?.el ?? []),
    ...(nameEn && nameEl && normalize(nameEn) !== normalize(nameEl) ? [nameEl] : []),
  ]);

  const category =
    r.category === "bay" ? "anchorage" :
    (r.category as MergedPort["category"]) ?? "harbor";

  return {
    id: r.id,
    name,
    lat,
    lon,
    region: r.region,
    category,
    aliases,
    __source: "seaguide",
  };
}

/** Δημιουργεί ΠΑΝΤΑ φρέσκια merged λίστα για το API */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  // 1) Canonical
  const canonRaw = await readJSON<CanonicalPort[] | { list: CanonicalPort[] }>(FILE_CANON);
  const CANON: CanonicalPort[] = Array.isArray(canonRaw) ? canonRaw : (canonRaw?.list ?? []);

  // 2) Port facts (προαιρετικό)
  const factsRaw = await readJSON<{ version?: string; facts?: any[] }>(FILE_FACTS);

  // 3) Sea Guide (προαιρετικό)
  const sgRaw = await readJSON<SeaGuideRecord[]>(FILE_SG);

  const out: MergedPort[] = [];

  // Canonical → βάση
  for (const c of CANON) {
    if (!c?.name) continue;
    out.push({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      region: c.region,
      category: c.category,
      aliases: asArray(c.aliases),
      notes: asArray(c.notes),
      sources: asArray(c.sources),
      __source: "canonical",
    });
  }

  // SeaGuide → merge by name (ή νέα εγγραφή)
  if (Array.isArray(sgRaw)) {
    for (const rec of sgRaw) {
      const s = fromSeaGuide(rec);
      if (!s) continue;

      // Κουμπώνουμε με βάση το όνομα (canonical) ή κάποιο alias
      const k = normalize(s.name);
      const idx = out.findIndex(p =>
        normalize(p.name) === k ||
        (p.aliases ?? []).some(a => normalize(a) === k)
      );

      if (idx >= 0) {
        const base = out[idx];
        out[idx] = {
          ...base,
          region: base.region ?? s.region,
          category: base.category ?? s.category,
          lat: typeof base.lat === "number" ? base.lat : s.lat,
          lon: typeof base.lon === "number" ? base.lon : s.lon,
          aliases: uniqStrings([...(base.aliases ?? []), ...(s.aliases ?? [])]),
          __source: "merged",
        };
      } else {
        out.push(s);
      }
    }
  }

  // Facts (αν υπάρχει JSON facts με names.* aliases)
  if (factsRaw?.facts?.length) {
    for (const f of factsRaw.facts) {
      const label = f?.names?.en || f?.names?.el || f?.id || null;
      if (!label) continue;
      const key = normalize(String(label));

      const idx = out.findIndex(p =>
        normalize(p.name) === key ||
        (p.aliases ?? []).some(a => normalize(a) === key)
      );
      if (idx >= 0) {
        const aliases = uniqStrings([
          ...(out[idx].aliases ?? []),
          ...(Array.isArray(f?.names?.aliases) ? f.names.aliases : []),
          f?.names?.en ?? "",
          f?.names?.el ?? "",
        ]);
        out[idx] = {
          ...out[idx],
          aliases,
          __source: out[idx].__source === "canonical" ? "merged" : out[idx].__source,
        };
      }
    }
  }

  // Επιστρέφουμε ΜΟΝΟ όσα έχουν name + region (τα coords μπορεί να λείπουν,
  // αλλά στο route φιλτράρουμε όσα δεν έχουν lat/lon).
  return out.filter(p => p?.name && p?.region);
}
