// lib/portsMerged.ts
// Ενοποίηση canonical ports (ports.v1.json) + PortFacts + SeaGuide Vol.3 master
// Έτοιμο για κατανάλωση από API route /api/ports/merged και usePorts()

import PORTS_V1 from "@/public/data/ports.v1.json";
import SEA_GUIDE from "@/public/data/sea_guide_vol3_master.json"; // βεβαιώσου ότι είναι εδώ
import { PORT_FACTS_DATA, type PortFact } from "./ports/portFacts";

/* ======================== Types ======================== */
export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type CanonicalPort = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: string;
  aliases?: string[];
};

type SeaGuideEntry = {
  id: string;
  region?: string;
  category?: string; // χαλαρό, το χαρτογραφούμε
  position?: { lat?: number; lon?: number };
  name?: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
};

/* ======================== Utils ======================== */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function uniq<T>(arr: T[]): T[] {
  const seen = new Set<string>(), out: T[] = [];
  for (const x of arr) { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
function uniqStr(arr: string[]) {
  const seen = new Set<string>(), out: string[] = [];
  for (const s of arr) { const k = normalize(s); if (!k) continue; if (!seen.has(k)) { seen.add(k); out.push(s); } }
  return out;
}

/* ======================== GEO overrides (facts-only προσωρινά) ======================== */
const GEO_OVERRIDES: Record<string, { lat?: number; lon?: number; region?: string }> = {
  // Korinthia / Saronic
  "Corinth Harbour": { lat: 37.9387, lon: 22.9338, region: "Saronic" },
  "Korinth Canal (Isthmus)": { lat: 37.9328, lon: 22.9930, region: "Saronic" },
  "Kiato Harbour": { lat: 38.0136, lon: 22.7485, region: "Saronic" },
  "Vrachati Harbour": { lat: 37.9532, lon: 22.8450, region: "Saronic" },
  "Lechaion (Ancient Corinth Bay)": { lat: 37.9410, lon: 22.8790, region: "Saronic" },
  "Vouliagmeni / Loutraki Bay": { lat: 37.9762, lon: 22.9755, region: "Saronic" },
  "Mavrolimni Harbour": { lat: 38.0097, lon: 23.1457, region: "Saronic" },

  // Zakynthos (Sea Guide)
  "Kerì Bay (Zakynthos)": { lat: 37.6797, lon: 20.8449, region: "Ionian" },
  "Alykes Harbour (Zakynthos)": { lat: 37.836, lon: 20.794, region: "Ionian" },
  "Zakynthos Harbour": { lat: 37.789, lon: 20.898, region: "Ionian" },
  "Agios Nikolaos (Skinari, Zakynthos)": { lat: 37.9069, lon: 20.7068, region: "Ionian" },
  "Agios Sostis Harbour (Zakynthos)": { lat: 37.7272, lon: 20.8661, region: "Ionian" },
  "Tsilivi Harbour (Zakynthos)": { lat: 37.8239, lon: 20.8476, region: "Ionian" },
  "Makris Gialos (Zakynthos)": { lat: 37.8966, lon: 20.7686, region: "Ionian" },
};

/* ======================== Canonical ports loader ======================== */
const CANONICAL: CanonicalPort[] = Array.isArray(PORTS_V1)
  ? (PORTS_V1 as CanonicalPort[])
  : ((PORTS_V1 as any).list as CanonicalPort[]);

/* ======================== Sea Guide transformation ======================== */
const CATEGORY_MAP: Record<string, PortCategory> = {
  harbor: "harbor",
  harbour: "harbor",
  marina: "marina",
  anchorage: "anchorage",
  spot: "spot",
  bay: "anchorage", // <-- ΣΗΜΑΝΤΙΚΟ: map 'bay' σε anchorage
};

function mapCategory(anyCat?: string): PortCategory {
  if (!anyCat) return "harbor";
  const k = normalize(anyCat);
  return CATEGORY_MAP[k] ?? "harbor";
}

function seaGuideToPorts(sg: SeaGuideEntry[]): CanonicalPort[] {
  const out: CanonicalPort[] = [];
  for (const e of sg) {
    const lat = e.position?.lat;
    const lon = e.position?.lon;
    const nameEn = e.name?.en?.trim();
    const nameEl = e.name?.el?.trim();
    const name = nameEn || nameEl;
    if (!name) continue;

    const aliases: string[] = [];
    if (nameEl && nameEl !== name) aliases.push(nameEl);
    if (nameEn && nameEn !== name) aliases.push(nameEn);
    for (const a of e.aliases?.en ?? []) aliases.push(a);
    for (const a of e.aliases?.el ?? []) aliases.push(a);

    out.push({
      id: e.id || `${normalize(name)}-${(lat ?? 0).toFixed(3)}-${(lon ?? 0).toFixed(3)}`,
      name,
      lat: typeof lat === "number" ? lat : NaN,
      lon: typeof lon === "number" ? lon : NaN,
      category: mapCategory(e.category),
      region: e.region || "Unknown",
      aliases: uniqStr(aliases),
    });
  }
  return out;
}

/* ======================== PortFacts helper ======================== */
function factDerivedAliases(name: string): string[] {
  // Μπορούμε να παράξουμε μερικά variants στο μέλλον.
  return [name];
}

/* ======================== Merge core ======================== */
type Merged = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: string;
  aliases: string[];
  __src: "canonical" | "facts" | "merged" | "seaguide";
};

export function buildMergedPortsAPI(): Merged[] {
  const byKey = new Map<string, Merged>(); // key = normalize(name)
  const byId = new Map<string, Merged>();

  const pushOrMerge = (p: Partial<Merged> & { name: string }) => {
    const key = normalize(p.name);
    const existing = byKey.get(key);
    if (existing) {
      const merged: Merged = {
        ...existing,
        lat: Number.isFinite(existing.lat) ? existing.lat : (p.lat ?? NaN),
        lon: Number.isFinite(existing.lon) ? existing.lon : (p.lon ?? NaN),
        category: (existing.category ?? p.category ?? "harbor") as PortCategory,
        region: (existing.region || p.region || "Unknown") as string,
        aliases: uniqStr([...(existing.aliases ?? []), ...(p.aliases ?? [])]),
        __src: existing.__src === "canonical" && p.__src === "facts" ? "merged"
             : existing.__src === "seaguide" && p.__src === "canonical" ? "merged"
             : existing.__src,
        id: existing.id,
        name: existing.name, // κρατάμε το πρώτο display
      };
      byKey.set(key, merged);
      if (merged.id) byId.set(merged.id, merged);
    } else {
      const id =
        (p as any).id ||
        `${key}-${(p.lat ?? 0).toFixed(3)}-${(p.lon ?? 0).toFixed(3)}`;
      const row: Merged = {
        id,
        name: p.name,
        lat: p.lat ?? NaN,
        lon: p.lon ?? NaN,
        category: (p.category as PortCategory) ?? "harbor",
        region: (p.region as string) ?? "Unknown",
        aliases: uniqStr(p.aliases ?? []),
        __src: p.__src ?? "canonical",
      };
      byKey.set(key, row);
      byId.set(row.id, row);
    }
  };

  // 1) Canonical ports.v1.json
  for (const c of CANONICAL) {
    pushOrMerge({
      id: c.id || normalize(c.name),
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      category: c.category as PortCategory,
      region: c.region,
      aliases: uniqStr([...(c.aliases ?? [])]),
      __src: "canonical",
    });
  }

  // 2) PortFacts (keys) + GEO overrides
  for (const factName of Object.keys(PORT_FACTS_DATA)) {
    const f: PortFact = PORT_FACTS_DATA[factName];
    const geo = GEO_OVERRIDES[factName] ?? {};
    pushOrMerge({
      name: factName,
      lat: typeof (geo as any).lat === "number" ? (geo as any).lat : NaN,
      lon: typeof (geo as any).lon === "number" ? (geo as any).lon : NaN,
      region: (geo as any).region || "Unknown",
      category: "harbor",
      aliases: uniqStr(factDerivedAliases(factName)),
      __src: "facts",
    });
  }

  // 3) Sea Guide master (array)
  const sgArray: SeaGuideEntry[] = Array.isArray(SEA_GUIDE)
    ? (SEA_GUIDE as any)
    : (SEA_GUIDE as any).list ?? [];
  const sgList: CanonicalPort[] = seaGuideToPorts(sgArray);
  for (const sg of sgList) {
    pushOrMerge({
      id: sg.id,
      name: sg.name,
      lat: sg.lat,
      lon: sg.lon,
      region: sg.region,
      category: sg.category,
      aliases: uniqStr([...(sg.aliases ?? [])]),
      __src: "seaguide",
    });
  }

  // 4) facts-only χωρίς coords -> GEO_OVERRIDES
  for (const [k, row] of byKey.entries()) {
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) {
      const override = GEO_OVERRIDES[row.name];
      if (override) {
        row.lat = override.lat ?? row.lat;
        row.lon = override.lon ?? row.lon;
        row.region = (override.region as string) ?? row.region;
        byKey.set(k, row);
      }
    }
  }

  // 5) καθάρισμα: κρατάμε μόνο όσα έχουν coords
  const out: Merged[] = [];
  for (const item of byKey.values()) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon)) continue;
    const aliasDual = uniqStr([item.name, ...item.aliases]);
    out.push({ ...item, aliases: aliasDual });
  }

  // 6) ταξινόμηση
  out.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return out;
}
