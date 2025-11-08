// lib/portsMerged.ts
// Ενοποίηση canonical ports (/public/data/ports.v1.json),
// Sea Guide master (/public/data/sea_guide_vol3_master.json) [optional],
// και PortFacts (/public/data/port-facts.v1.json) [optional].
//
// Δεν χρησιμοποιούμε JSON imports, μόνο fs ώστε να παίζει καθαρά σε Vercel.

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
  // …κρατάμε μόνο ό,τι χρειαζόμαστε για το dropdown/coords
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
  // ops fields (μένουν εδώ για μελλοντική χρήση)
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
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function uniqStrings(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    const k = normalize(t);
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

function uniqHazards(arr: Hazard[]) {
  const out: Hazard[] = [];
  const seen = new Set<string>();
  for (const h of arr ?? []) {
    const k = JSON.stringify({ l: (h.label||"").trim(), n: (h.note||"").trim(), s: h.sev ?? null });
    if (!seen.has(k)) { seen.add(k); out.push(h); }
  }
  return out;
}

async function readJSON<T = any>(fileName: string): Promise<T | null> {
  try {
    const full = path.join(DATA_DIR, fileName);
    const buf = await fs.readFile(full, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

/** Μετατρέπει ένα SeaGuide record σε “port-like” εγγραφή για merge */
function fromSeaGuide(r: SeaGuideRecord): MergedPort | null {
  const nameEn = r.name?.en?.trim();
  const nameEl = r.name?.el?.trim();
  const name = nameEn || nameEl;
  if (!name) return null;

  const lat = r.position?.lat;
  const lon = r.position?.lon;

  const aliases = uniqStrings([
    ...(r.aliases?.en ?? []),
    ...(r.aliases?.el ?? []),
    ...(nameEn && nameEl && normalize(nameEn) !== normalize(nameEl) ? [nameEl] : []),
  ]);

  // map “bay” σε “anchorage” για συμβατότητα
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

/* ====== cache ====== */
let _cache: MergedPort[] | null = null;

/** Δημιουργεί τη merged λίστα για το API */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  if (_cache) return _cache;

  // 1) Canonical ports
  const canonRaw = await readJSON<CanonicalPort[] | { list: CanonicalPort[] }>(FILE_CANON);
  const CANON: CanonicalPort[] = Array.isArray(canonRaw)
    ? canonRaw
    : (canonRaw?.list ?? []);

  // 2) Port facts (προαιρετικό)
  const factsRaw = await readJSON<{ version?: string; facts?: any[] }>(FILE_FACTS);
  // εδώ δεν τα χρησιμοποιούμε για UI πέρα από μελλοντική εμπλουτισμό ops πεδίων

  // 3) Sea Guide master (προαιρετικό)
  const sgRaw = await readJSON<SeaGuideRecord[]>(FILE_SG);

  const canonByKey = new Map<string, CanonicalPort>();
  CANON.forEach(p => {
    if (!p?.name) return;
    const k = normalize(p.name);
    if (!canonByKey.has(k)) canonByKey.set(k, p);
  });

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

  // SeaGuide → είτε merge σε existing (by name), είτε νέα αν δεν υπάρχει
  if (Array.isArray(sgRaw)) {
    for (const rec of sgRaw) {
      const m = fromSeaGuide(rec);
      if (!m) continue;
      const k = normalize(m.name);
      const idx = out.findIndex(p => normalize(p.name) === k);
      if (idx >= 0) {
        // merge: κρατάμε coords/region από ό,τι έχουμε διαθέσιμο (προτεραιότητα canonical)
        const base = out[idx];
        out[idx] = {
          ...base,
          region: base.region ?? m.region,
          category: base.category ?? m.category,
          lat: typeof base.lat === "number" ? base.lat : m.lat,
          lon: typeof base.lon === "number" ? base.lon : m.lon,
          aliases: uniqStrings([...(base.aliases ?? []), ...(m.aliases ?? [])]),
          __source: "merged",
        };
      } else {
        out.push(m);
      }
    }
  }

  // (προαιρετικό) facts εμπλουτισμός aliases από JSON “facts”
  if (factsRaw?.facts?.length) {
    for (const f of factsRaw.facts) {
      // facts.names?.en/?.el/?.aliases
      const label =
        f?.names?.en ||
        f?.names?.el ||
        f?.id ||
        null;
      if (!label) continue;
      const k = normalize(String(label));
      const idx = out.findIndex(p => normalize(p.name) === k || (p.aliases ?? []).some(a => normalize(a) === k));
      if (idx >= 0) {
        const aliases = uniqStrings([
          ...(out[idx].aliases ?? []),
          ...(Array.isArray(f?.names?.aliases) ? f.names.aliases : []),
          f?.names?.en ?? "",
          f?.names?.el ?? "",
        ]);
        out[idx] = { ...out[idx], aliases, __source: out[idx].__source === "canonical" ? "merged" : out[idx].__source };
      }
    }
  }

  // καθάρισμα: κρατάμε όσα έχουν name + region, κι αν γίνεται coords (τα χωρίς coords μένουν αλλά δεν θα εμφανιστούν στο API filter)
  _cache = out.filter(p => p?.name && p?.region);
  return _cache;
}
