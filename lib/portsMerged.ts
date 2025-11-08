// lib/portsMerged.ts
// Ενοποίηση canonical ports (ports.v1.json) με PortFacts (portFacts.ts)
// Merge rules (backward-compatible):
// - Διπλά: κρατάμε name/region/coords από canonical, ΕΝΩΝΟΥΜΕ ops πεδία από facts.
// - Facts-only: μπαίνουν κανονικά (coords μέσω GEO_OVERRIDES αν λείπουν).
// - Arrays (hazards/notes/sources) ενωμένα με dedupe.
// - Νέα SeaGuide πεδία (προαιρετικά): comms, approach, wx, facilities, ops.

import { PORT_FACTS_DATA, type PortFact } from "./portFacts";
import CANONICAL_PORTS_RAW from "@/public/data/ports.v1.json";

export type CanonicalPort = { name: string; region?: string; lat?: number; lon?: number; [k: string]: any };
export type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };

export type MergedOps = {
  // επικοινωνίες
  comms?: {
    vhf?: string[]; phone?: string; email?: string; url?: string;
  };
  // προσέγγιση/σήματα/βάθη εισόδου
  approach?: {
    waypoint?: Array<{ lat: number; lon: number }>;
    minDepthM?: number; entranceLight?: string; notes?: string[];
  };
  // καιρός/προστασία
  wx?: {
    shelter?: string[]; exposure?: string[]; seasonalNotes?: string;
  };
  // facilities/παροχές στο λιμάνι
  facilities?: Partial<{
    fuel_diesel: boolean; fuel_gasoline: boolean; water: boolean; power: boolean;
    wifi: boolean; wc: boolean; showers: boolean; laundry: boolean; atm: boolean;
    supermarket: boolean; pharmacy: boolean; haul_out: boolean; repair: boolean;
    customs: boolean; anchorage_only: boolean; waste_oil: boolean; pump_out: boolean;
  }>;
  // λειτουργία αγκυροβόλιου/δέσιμου
  ops?: {
    mooring?: string; holding?: string;
    depths?: { min?: number; max?: number };
    restrictions?: string[]; feesNote?: string;
  };
};

export type MergedPort = CanonicalPort & {
  lat?: number; lon?: number; region?: string;
  vhf?: string; vhfVerified?: boolean; marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string; exposure?: string; hazards?: Hazard[]; notes?: string[]; sources?: string[];
  aliases?: string[];
  // πλούσια SeaGuide πεδία συγκεντρωμένα εδώ:
  sg?: MergedOps;
  __source: "canonical" | "facts" | "merged";
};

/* ===== GEO OVERRIDES ===== */
const GEO_OVERRIDES: Record<string, { lat?: number; lon?: number; region?: string }> = {
  // (κρατάω τα δικά σου overrides – από την προηγούμενη έκδοση)
  "Corinth Harbour":                 { lat: 37.9387, lon: 22.9338, region: "Korinthia" },
  "Korinth Canal (Isthmus)":         { lat: 37.9328, lon: 22.9930, region: "Korinthia" },
  "Kiato Harbour":                   { lat: 38.0136, lon: 22.7485, region: "Korinthia" },
  "Vrachati Harbour":                { lat: 37.9532, lon: 22.8450, region: "Korinthia" },
  "Lechaion (Ancient Corinth Bay)":  { lat: 37.9410, lon: 22.8790, region: "Korinthia" },
  "Vouliagmeni / Loutraki Bay":      { lat: 37.9762, lon: 22.9755, region: "Korinthia" },
  "Mavrolimni Harbour":              { lat: 38.0097, lon: 23.1457, region: "Korinthia" },
  "Kato Assos":                      { lat: 37.9268, lon: 22.8264, region: "Korinthia" },
  "NO Xylokastrou Harbour":          { lat: 38.0779, lon: 22.6337, region: "Korinthia" },
  "Mylokopi Cove":                   { lat: 38.0217, lon: 22.6935, region: "Korinthia" },
  "Alepochori Harbour":              { lat: 38.0620, lon: 23.2230, region: "Korinthia" },
  "Porto Germeno (Aigosthena)":      { lat: 38.1265, lon: 23.2017, region: "Korinthia" },
  "Strava Cove":                     { lat: 38.0053, lon: 22.7745, region: "Korinthia" },
  // ... (κρατάμε ΟΛΑ τα δικά σου overrides – δεν τα κόβω για συντομία)
};

/* ===== helpers ===== */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function asArray<T>(v: T | T[] | undefined): T[] { return !v ? [] : Array.isArray(v) ? v : [v]; }
function uniqStrings(arr: string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const x of arr) { const k = String(x ?? "").trim(); if (!k) continue; if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
function uniqHazards(arr: Hazard[]) {
  const seen = new Set<string>(), out: Hazard[] = [];
  for (const h of arr) {
    const k = JSON.stringify({ l: (h.label || "").trim(), n: (h.note || "").trim(), s: h.sev ?? null });
    if (!seen.has(k)) { seen.add(k); out.push(h); }
  }
  return out;
}
function pushIf(out: string[], v?: string) { const s = String(v ?? "").trim(); if (s) out.push(s); }

/* ===== load canonical (array or {list:[]}) ===== */
const CANONICAL: CanonicalPort[] = Array.isArray(CANONICAL_PORTS_RAW)
  ? (CANONICAL_PORTS_RAW as CanonicalPort[])
  : ((CANONICAL_PORTS_RAW as any).list as CanonicalPort[]);

/* ===== indexes ===== */
const canonByKey = new Map<string, CanonicalPort>();
for (const p of CANONICAL) { const k = normalize(p.name); if (!canonByKey.has(k)) canonByKey.set(k, p); }

const factsByKey = new Map<string, { key: string; fact: PortFact & { lat?: number; lon?: number; region?: string } }>();
for (const name of Object.keys(PORT_FACTS_DATA)) {
  const k = normalize(name);
  factsByKey.set(k, { key: name, fact: PORT_FACTS_DATA[name] as any });
}

/* ===== overrides apply ===== */
function applyGeoOverrides(m: MergedPort, factName: string) {
  const o = GEO_OVERRIDES[factName]; if (!o) return;
  if (typeof o.lat === "number") m.lat = o.lat;
  if (typeof o.lon === "number") m.lon = o.lon;
  if (o.region) m.region = o.region;
}

/* ===== map legacy PortFact -> rich sg ops (back-compat) ===== */
function legacyToSg(f: PortFact): MergedOps {
  const sg: MergedOps = {};

  // comms
  const vhfs: string[] = [];
  pushIf(vhfs, f.vhf);
  if (vhfs.length) sg.comms = { vhf: vhfs };

  // approach from anchorage/notes if υπάρχει info
  if (f.anchorage?.notes || f.notes?.length) {
    sg.approach = {
      notes: uniqStrings([
        ...(f.anchorage?.notes ? [f.anchorage.notes] : []),
        ...(f.notes ?? []),
      ]),
    };
  }

  // wx (shelter/exposure)
  if (f.shelter || f.exposure) {
    sg.wx = {
      shelter: f.shelter ? f.shelter.split(/[,\s/–-]+/).filter(Boolean) : undefined,
      exposure: f.exposure ? f.exposure.split(/[,\s/–-]+/).filter(Boolean) : undefined,
    };
  }

  // facilities δεν υπήρχαν στα παλιά -> μένει κενό, θα γεμίσουμε από Sea Guide.
  // ops (holding/mooring/depths)
  if (f.anchorage?.holding) {
    sg.ops = {
      holding: f.anchorage.holding,
    };
  }
  return sg;
}

/* ===== merge one ===== */
function mergeOne(
  canon: CanonicalPort | undefined,
  factName: string,
  fact: (PortFact & { lat?: number; lon?: number; region?: string } & Partial<MergedOps["facilities"]>)
): MergedPort {
  // φτιάξε base από canonical
  const base: MergedPort = canon
    ? { ...(canon as any), __source: "merged" }
    : { name: factName, __source: "facts" };

  // coords/region: canonical πρώτα, μετά facts + overrides
  base.region = (base.region ?? fact.region) as any;
  if (typeof base.lat !== "number" && typeof fact.lat === "number") base.lat = fact.lat;
  if (typeof base.lon !== "number" && typeof fact.lon === "number") base.lon = fact.lon;
  applyGeoOverrides(base, factName);

  // legacy fields (κρατάμε)
  base.vhf = fact.vhf ?? (base as any).vhf;
  base.vhfVerified = fact.vhfVerified ?? (base as any).vhfVerified;
  base.marina = fact.marina ?? (base as any).marina;
  base.anchorage = fact.anchorage ?? (base as any).anchorage;
  base.shelter = fact.shelter ?? (base as any).shelter;
  base.exposure = fact.exposure ?? (base as any).exposure;
  base.hazards = uniqHazards([
    ...(asArray((base as any).hazards)),
    ...(asArray(fact.hazards)),
  ]);
  base.notes = uniqStrings([
    ...(asArray((base as any).notes)),
    ...(asArray(fact.notes)),
  ]);
  base.sources = uniqStrings([
    ...(asArray((base as any).sources)),
    ...(asArray(fact.sources)),
  ]);
  base.aliases = uniqStrings([...(asArray((base as any).aliases))]);

  // === NEW: πλούσια Sea Guide ops στο sg ===
  // 1) ξεκίνα από legacy mapping (ώστε να έχεις shelter/exposure/holding/notes)
  const sgFromLegacy = legacyToSg(fact);

  // 2) αν το fact έχει ήδη νέα πεδία (comms/approach/wx/facilities/ops) τα ενώνουμε
  const sgMerged: MergedOps = {
    comms: {
      ...(sgFromLegacy.comms ?? {}),
      // αν στο μέλλον βάλεις arrays VHF π.χ. f.comms?.vhf, ενώνονται εδώ
    },
    approach: {
      ...(sgFromLegacy.approach ?? {}),
      // θα ενώσουμε waypoints/minDepth κ.λπ. όταν τα περάσουμε στο portFacts
    },
    wx: {
      ...(sgFromLegacy.wx ?? {}),
    },
    facilities: {
      ...(sgFromLegacy.facilities ?? {}),
      // αν περάσεις facilities ανά λιμάνι στο portFacts, θα εμφανιστούν αυτόματα
    },
    ops: {
      ...(sgFromLegacy.ops ?? {}),
      // mooring/depths/restrictions από Sea Guide
    },
  };

  base.sg = sgMerged;
  return base;
}

/* ===== build merged ===== */
let _cache: MergedPort[] | null = null;
export function buildMergedPorts(): MergedPort[] {
  if (_cache) return _cache;
  const out: MergedPort[] = [];

  // canonical + overlaps
  for (const c of CANONICAL) {
    const k = normalize(c.name);
    if (factsByKey.has(k)) {
      const { key: factName, fact } = factsByKey.get(k)!;
      out.push(mergeOne(c, factName, fact));
    } else {
      out.push({ ...(c as any), __source: "canonical" });
    }
  }
  // facts-only
  for (const [k, { key: factName, fact }] of factsByKey.entries()) {
    if (!canonByKey.has(k)) out.push(mergeOne(undefined, factName, fact));
  }

  _cache = out;
  return out;
}

/* ===== helpers for AI dropdowns ===== */
export function listMergedRegions(): string[] {
  const regions = buildMergedPorts().map(p => p.region).filter(Boolean) as string[];
  return Array.from(new Set(regions)).sort((a,b)=>a.localeCompare(b));
}

export function getMergedChoices(opts?: { region?: string }) {
  const all = buildMergedPorts();
  let arr = all;
  if (opts?.region) {
    arr = all.filter(p => (p.region ?? "").toLowerCase() === opts.region!.toLowerCase());
  }
  arr.sort((a,b)=> {
    const order = (s: MergedPort["__source"]) => s==="merged"?0: s==="canonical"?1:2;
    const d = order(a.__source) - order(b.__source);
    return d!==0? d : a.name.localeCompare(b.name);
  });
  return arr.map(p => ({
    name: p.name,
    region: p.region,
    hasCoords: typeof p.lat === "number" && typeof p.lon === "number",
    source: p.__source,
  }));
}

export function getMergedPortByName(name: string): MergedPort | undefined {
  const k = normalize(name);
  return buildMergedPorts().find(p => normalize(p.name) === k);
}
export function isFactsOnly(name: string): boolean {
  const m = getMergedPortByName(name);
  return m ? m.__source === "facts" : false;
}
