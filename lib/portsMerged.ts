// lib/portsMerged.ts
// Ενοποίηση canonical ports (/public/data/ports.v1.json),
// Sea Guide master (/public/data/sea_guide_vol3_master.json) [optional],
// και PortFacts (/public/data/port-facts.v1.json) [optional].
//
// ΣΚΟΠΙΜΑ: ΧΩΡΙΣ CACHE για να πιάνουμε άμεσα αλλαγές στα JSON.

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
  id?: string;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot" | "bay";
  position?: { lat?: number; lon?: number };
  name?: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
  // κρατάμε μόνο τα απολύτως απαραίτητα για UI/coords
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

  // ops πεδία (για μελλοντική χρήση στα Quick Facts)
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
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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
  try {
    const full = path.join(DATA_DIR, fileName);
    const buf = await fs.readFile(full, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

function mapCategory(cat?: MergedPort["category"] | "bay"): MergedPort["category"] {
  if (cat === "bay") return "anchorage";
  return (cat as MergedPort["category"]) ?? "harbor";
}

/** Από εγγραφή SeaGuide φτιάχνουμε “port-like” αντικείμενο */
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

  return {
    id: r.id,
    name,
    lat,
    lon,
    region: r.region,
    category: mapCategory(r.category),
    aliases,
    __source: "seaguide",
  };
}

/** Επιστρέφει ΠΑΝΤΑ νέα merged λίστα (χωρίς cache). */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  // 1) Canonical
  const canonRaw = await readJSON<CanonicalPort[] | { list: CanonicalPort[] }>(FILE_CANON);
  const CANON: CanonicalPort[] = Array.isArray(canonRaw) ? canonRaw : (canonRaw?.list ?? []);

  // 2) Port facts (προαιρετικό, σήμερα δεν τα ρίχνουμε στο UI list)
  const factsRaw = await readJSON<{ version?: string; facts?: any[] }>(FILE_FACTS);

  // 3) Sea Guide (προαιρετικό)
  const sgRaw = await readJSON<SeaGuideRecord[]>(FILE_SG);

  const out: MergedPort[] = [];

  // === Canonical σε map τόσο από name όσο ΚΑΙ από aliases για πιο έξυπνο merge ===
  const canonByKey = new Map<string, number>();    // name -> idx
  const canonAliasToIdx = new Map<string, number>(); // alias -> idx

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
      aliases: uniqStrings(c.aliases ?? []),
      notes: c.notes,
      sources: c.sources,
      __source: "canonical",
    });
    const idx = out.length - 1;
    canonByKey.set(normalize(c.name), idx);
    for (const a of (c.aliases ?? [])) canonAliasToIdx.set(normalize(a), idx);
  }

  // SeaGuide → merge σε canonical by name/alias, αλλιώς push ως νέο (με coords)
  if (Array.isArray(sgRaw)) {
    for (const rec of sgRaw) {
      const m = fromSeaGuide(rec);
      if (!m) continue;

      const k = normalize(m.name);
      let idx =
        canonByKey.get(k) ??
        canonAliasToIdx.get(k) ??
        out.findIndex(p => normalize(p.name) === k || (p.aliases ?? []).some(a => normalize(a) === k));

      if (idx >= 0) {
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
        // Αν δεν ταυτίζεται με όνομα/alias, πρόσθεσέ το ΜΟΝΟ αν έχει coords (για να δουλέψει ο χάρτης)
        if (typeof m.lat === "number" && typeof m.lon === "number") {
          out.push(m);
        }
      }
    }
  }

  // (optional) facts εμπλουτισμός aliases από JSON “facts”
  if (factsRaw?.facts?.length) {
    for (const f of factsRaw.facts) {
      const label = f?.names?.en || f?.names?.el || f?.id || null;
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

  // Τελικό καθάρισμα: κρατάμε όσα έχουν name + region (coords προαιρετικά· το API θα φιλτράρει τα χωρίς coords)
  return out.filter(p => !!p?.name && !!p?.region);
}
