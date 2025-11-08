// lib/portsMerged.ts
// Ενοποίηση canonical ports (/public/data/ports.v1.json),
// Sea Guide master (/public/data/sea_guide_vol3_master.json) [optional],
// και PortFacts (/public/data/port-facts.v1.json) [optional].
//
// Σχεδιασμένο για Vercel/Node runtime (fs read από public/data).

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
  region?: string; // π.χ. "Peloponnisos", "StereEllada", "Ionian", ...
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
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  category: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  // ops πεδία για μέλλον
  vhf?: string; vhfVerified?: boolean; marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string; exposure?: string; hazards?: Hazard[]; notes?: string[]; sources?: string[];
  __source: "canonical" | "facts" | "seaguide" | "merged";
};

const DATA_DIR = path.join(process.cwd(), "public", "data");
const FILE_CANON = "ports.v1.json";
const FILE_FACTS = "port-facts.v1.json";
const FILE_SG    = "sea_guide_vol3_master.json";

/* ---------- utils ---------- */
function normalize(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
function uniqStrings(arr: (string | undefined)[]) {
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
function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
function distMeters(a: {lat:number;lon:number}, b:{lat:number;lon:number}) {
  const R = 6371000;
  const toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
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

/* ---------- region mapping (SeaGuide → app regions) ---------- */
/**
 * Στο app χρησιμοποιούμε 7 «ομπρέλες» περιοχών:
 * Saronic, Cyclades, Ionian, Dodecanese, Sporades, NorthAegean, Crete
 * Τα SeaGuide records έρχονται με Peloponnisos / StereEllada / Ionian κ.λπ.
 * Τα χαρτογραφούμε ώστε να εμφανίζονται στο Planner.
 */
function mapRegionForApp(raw: string | undefined, lat?: number, lon?: number): string {
  const r = normalize(raw || "");
  if (r.includes("ionian")) return "Ionian";
  if (r.includes("dodecanese")) return "Dodecanese";
  if (r.includes("sporad")) return "Sporades";
  if (r.includes("crete") || r.includes("krit")) return "Crete";
  if (r.includes("cyclad") || r.includes("kyklad")) return "Cyclades";
  if (r.includes("north") || r.includes("aeg") || r.includes("ai") || r.includes("halkid")) return "NorthAegean";
  if (r.includes("saronic") || r.includes("argosaronic")) return "Saronic";

  // Peloponnisos / StereaEllada: αποφασίζουμε από coords
  if (isFiniteNum(lat) && isFiniteNum(lon)) {
    // Κορινθιακός/Πατραϊκός → Ionian (όπως έχεις δομήσει τον planner)
    if (lon > 20.5 && lon < 23.5 && lat > 37.0 && lat < 39.0) return "Ionian";
    // ΝΑ/ΝΔ Πελοπόννησος (Μάνη, Μεσσηνία, Λακωνία) → Saronic (σύμφωνα με το dataset σου)
    if (lon > 21.0 && lon < 23.5 && lat < 37.4) return "Saronic";
  }
  // fallback: Saronic (ουδέτερο)
  return "Saronic";
}

/* ---------- category mapping ---------- */
function mapCategory(cat?: string): MergedPort["category"] {
  const c = normalize(cat || "");
  if (c === "marina") return "marina";
  if (c === "spot") return "spot";
  if (c === "bay" || c === "anchorage") return "anchorage";
  return "harbor";
}

/* ---------- SeaGuide → MergedPort (port-like) ---------- */
function fromSeaGuide(r: SeaGuideRecord): MergedPort | null {
  const nameEn = r.name?.en?.trim();
  const nameEl = r.name?.el?.trim();
  const name = nameEn || nameEl;
  if (!name) return null;

  const lat = r.position?.lat;
  const lon = r.position?.lon;
  if (!isFiniteNum(lat) || !isFiniteNum(lon)) return null;

  const aliases = uniqStrings([
    ...(r.aliases?.en ?? []),
    ...(r.aliases?.el ?? []),
    (nameEn && nameEl && normalize(nameEn) !== normalize(nameEl)) ? nameEl : undefined,
  ]);

  return {
    id: r.id?.trim() || `sg-${normalize(name).slice(0,40)}`,
    name,
    lat,
    lon,
    region: mapRegionForApp(r.region, lat, lon),
    category: mapCategory(r.category),
    aliases,
    __source: "seaguide",
  };
}

/* ---------- cache ---------- */
let _cache: MergedPort[] | null = null;

/* ---------- main builder ---------- */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  if (_cache) return _cache;

  // 1) Canonical
  const canonRaw = await readJSON<CanonicalPort[] | { list: CanonicalPort[] }>(FILE_CANON);
  const CANON: CanonicalPort[] = Array.isArray(canonRaw) ? canonRaw : (canonRaw?.list ?? []);

  // 2) Sea Guide (optional)
  const sgRaw = await readJSON<SeaGuideRecord[]>(FILE_SG);

  // 3) Port facts (optional – προς μελλοντική χρήση)
  const factsRaw = await readJSON<{ version?: string; facts?: any[] }>(FILE_FACTS);

  const out: MergedPort[] = [];

  // ---- από canonical
  for (const c of CANON) {
    if (!c?.name || !isFiniteNum(c.lat) || !isFiniteNum(c.lon)) continue;
    const region = c.region?.trim() || "Saronic";
    out.push({
      id: String(c.id ?? `canon-${normalize(c.name).slice(0,40)}`),
      name: c.name.trim(),
      lat: c.lat!,
      lon: c.lon!,
      region,
      category: mapCategory(c.category),
      aliases: uniqStrings([...(c.aliases ?? [])]),
      __source: "canonical",
    });
  }

  // ---- helper για εύρεση κοντινού/ίδιου
  const findExistingIdx = (m: MergedPort) => {
    const keyName = normalize(m.name);
    let bestIdx = out.findIndex(p => normalize(p.name) === keyName);
    if (bestIdx >= 0) return bestIdx;
    // αλλιώς: κοντινό σημείο (<= 2 km) + ίδιο περίπου όνομα ή alias
    let win = -1, winD = Infinity;
    for (let i = 0; i < out.length; i++) {
      const p = out[i];
      const d = distMeters({lat:m.lat,lon:m.lon},{lat:p.lat,lon:p.lon});
      if (d <= 2000) {
        const nameHit = normalize(p.name) === keyName
          || (p.aliases ?? []).some(a => normalize(a) === keyName)
          || (m.aliases ?? []).some(a => normalize(a) === normalize(p.name));
        if (nameHit && d < winD) { win = i; winD = d; }
      }
    }
    return win;
  };

  // ---- από SeaGuide (merge ή push)
  if (Array.isArray(sgRaw)) {
    for (const rec of sgRaw) {
      const m = fromSeaGuide(rec);
      if (!m) continue;

      const idx = findExistingIdx(m);
      if (idx >= 0) {
        // merge (προτεραιότητα στα canonical coords/ids/region, αλλά ενώνουμε aliases)
        const base = out[idx];
        out[idx] = {
          ...base,
          region: base.region || m.region,
          category: base.category || m.category,
          // κρατάμε πάντα τα canonical coords, αλλιώς SeaGuide
          lat: isFiniteNum(base.lat) ? base.lat : m.lat,
          lon: isFiniteNum(base.lon) ? base.lon : m.lon,
          aliases: uniqStrings([...(base.aliases ?? []), ...(m.aliases ?? [])]),
          __source: base.__source === "canonical" ? "merged" : base.__source,
        };
      } else {
        out.push(m);
      }
    }
  }

  // ---- (προαιρετικό) enrich aliases από port-facts JSON, αν υπάρχει
  if (factsRaw?.facts?.length) {
    for (const f of factsRaw.facts) {
      const label = f?.names?.en || f?.names?.el || f?.id || null;
      if (!label) continue;
      const key = normalize(String(label));
      const idx = out.findIndex(
        p => normalize(p.name) === key || (p.aliases ?? []).some(a => normalize(a) === key)
      );
      if (idx >= 0) {
        const aliases = uniqStrings([
          ...(out[idx].aliases ?? []),
          ...(Array.isArray(f?.names?.aliases) ? f.names.aliases : []),
          f?.names?.en,
          f?.names?.el,
        ]);
        out[idx] = { ...out[idx], aliases, __source: out[idx].__source === "canonical" ? "merged" : out[idx].__source };
      }
    }
  }

  // τελικό καθάρισμα/τυποποίηση
  const cleaned: MergedPort[] = out
    .filter(p => p?.name && isFiniteNum(p.lat) && isFiniteNum(p.lon) && p?.region)
    .map((p, i) => ({
      id: String(p.id || `mp-${i}`),
      name: String(p.name).trim(),
      lat: p.lat,
      lon: p.lon,
      region: p.region,
      category: p.category ?? "harbor",
      aliases: uniqStrings(p.aliases ?? []),
      __source: p.__source ?? "merged",
    }));

  _cache = cleaned;
  return _cache;
}
