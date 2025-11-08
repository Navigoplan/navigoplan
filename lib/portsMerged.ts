// lib/portsMerged.ts
// Ενοποίηση canonical ports (public/data/ports.v1.json) με PortFacts (lib/ports/portFacts.ts).
// Εξάγει πλήρη λίστα με coords/region/aliases/ops και δίνει προτεραιότητα στο canonical
// για name/coords/region, ενώ ενώνει τα operational πεδία από facts.

import { PORT_FACTS_DATA, type PortFact } from "./ports/portFacts";
import CANONICAL_PORTS_RAW from "@/public/data/ports.v1.json";

/* ===== Types ===== */
export type CanonicalPort = {
  id?: string;
  name: string;
  lat?: number; lon?: number;
  region?: string;
  aliases?: string[];
  [k: string]: any;
};

export type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };

export type MergedPort = CanonicalPort & {
  vhf?: string; vhfVerified?: boolean; marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string; exposure?: string;
  hazards?: Hazard[];
  notes?: string[];
  sources?: string[];
  __source: "canonical" | "facts" | "merged";
};

/* ===== GEO OVERRIDES (Sea Guide Vol.3–4) ===== */
const GEO_OVERRIDES: Record<string, { lat?: number; lon?: number; region?: string }> = {
  // Korinthia
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

  // Sterea Ellada / Fokida – Viotia
  "Antikyra Harbour":                { lat: 38.3738, lon: 22.6337, region: "Sterea Ellada" },
  "Agios Isidoros Harbour":          { lat: 38.3490, lon: 22.6015, region: "Sterea Ellada" },
  "Agios Nikolaos (Sterea Ellada)":  { lat: 38.3329, lon: 22.5966, region: "Sterea Ellada" },
  "Noussa Harbour":                  { lat: 38.3146, lon: 22.5360, region: "Sterea Ellada" },
  "Paralia Saranti Harbour":         { lat: 38.3772, lon: 23.1448, region: "Sterea Ellada" },
  "Aliki Harbour (Sterea Ellada)":   { lat: 38.3652, lon: 23.1545, region: "Sterea Ellada" },
  "Agios Vasileios Harbour":         { lat: 38.3812, lon: 23.1265, region: "Sterea Ellada" },
  "Chania Harbour (Sterea Ellada)":  { lat: 38.3235, lon: 22.2087, region: "Sterea Ellada" },
  "Vidavi Bay":                      { lat: 38.3707, lon: 22.4060, region: "Sterea Ellada" },
  "Eratini Harbour":                 { lat: 38.3777, lon: 22.2557, region: "Sterea Ellada" },
  "Panormos Harbour":                { lat: 38.3619, lon: 22.2275, region: "Sterea Ellada" },
  "Glyfada Harbour (Sterea Ellada)": { lat: 38.3389, lon: 22.1302, region: "Sterea Ellada" },

  // Achaia / Aitoloakarnania / Fokida
  "Aigio Harbour":                   { lat: 38.2493, lon: 22.0816, region: "Achaia" },
  "Mavra Litharia Harbour":          { lat: 38.1708, lon: 22.3099, region: "Achaia" },
  "Diakopto Harbour":                { lat: 38.1604, lon: 22.1960, region: "Achaia" },
  "NC Akrata Harbour":               { lat: 38.1536, lon: 22.3285, region: "Achaia" },
  "Paralia Kato Achaia Harbour":     { lat: 38.1466, lon: 21.5539, region: "Achaia" },
  "Rio–Antirrio":                    { lat: 38.3258, lon: 21.7704, region: "Achaia" },
  "Patras Marina":                   { lat: 38.2499, lon: 21.7332, region: "Achaia" },
  "Mesolongi Marina":                { lat: 38.3692, lon: 21.4319, region: "Aitoloakarnania" },
  "Mesolongi Channel Approach":      { lat: 38.3610, lon: 21.3905, region: "Aitoloakarnania" },
  "Nafpaktos Harbour":               { lat: 38.3920, lon: 21.8278, region: "Aitoloakarnania" },
  "Monastiraki Bay":                 { lat: 38.3937, lon: 21.9596, region: "Fokida" },
  "Marathias Harbour":               { lat: 38.3947, lon: 21.9686, region: "Fokida" },

  // Zakynthos
  "Alykes Harbour (Zakynthos)":          { lat: 37.8363, lon: 20.7940, region: "Zakynthos" },
  "Zakynthos Harbour":                   { lat: 37.7838, lon: 20.9004, region: "Zakynthos" },
  "Agios Nikolaos (Skinari, Zakynthos)": { lat: 37.9069, lon: 20.7068, region: "Zakynthos" },
  "Agios Sostis Harbour (Zakynthos)":    { lat: 37.7272, lon: 20.8661, region: "Zakynthos" },
  "Kerì Bay (Zakynthos)":                { lat: 37.6797, lon: 20.8449, region: "Zakynthos" },
  "Tsilivi Harbour (Zakynthos)":         { lat: 37.8239, lon: 20.8476, region: "Zakynthos" },
  "Makris Gialos (Zakynthos)":           { lat: 37.8966, lon: 20.7686, region: "Zakynthos" },

  // Messinia
  "Kyparissia Harbour":              { lat: 37.2524, lon: 21.6698, region: "Messinia" },
  "Marathopoli Harbour":             { lat: 36.8467, lon: 21.6972, region: "Messinia" },
  "Navarino Bay (Pylos)":            { lat: 36.9187, lon: 21.6963, region: "Messinia" },
  "Pylos Marina":                    { lat: 36.9170, lon: 21.6985, region: "Messinia" },
  "Voïdokilia Bay":                  { lat: 36.9552, lon: 21.6112, region: "Messinia" },
  "Finikounda Harbour":              { lat: 36.8043, lon: 21.8006, region: "Messinia" },

  // Mani – Laconia
  "Kalamata Marina":                 { lat: 37.0216, lon: 22.1130, region: "Messinia" },
  "Kitries Harbour":                 { lat: 36.9065, lon: 22.1502, region: "Messinia" },
  "Kardamyli Harbour":               { lat: 36.8893, lon: 22.2372, region: "Messinia" },
  "Kotrona Harbour":                 { lat: 36.6962, lon: 22.4860, region: "Laconia" },
  "Porto Kagio":                     { lat: 36.4065, lon: 22.4836, region: "Laconia" },
  "Vathy Bay (Poseidonia)":          { lat: 36.8968, lon: 22.4613, region: "Laconia" },
  "Asomaton Bay":                    { lat: 36.7605, lon: 22.4107, region: "Laconia" },
  "Limeni Bay":                      { lat: 36.6817, lon: 22.3831, region: "Laconia" },
  "Dirou Bay":                       { lat: 36.6505, lon: 22.3786, region: "Laconia" },
  "Mezapos Harbour":                 { lat: 36.6837, lon: 22.3829, region: "Laconia" },
  "Gerolimenas Harbour":             { lat: 36.4824, lon: 22.4058, region: "Laconia" },
  "Gytheio Harbour":                 { lat: 36.7548, lon: 22.5659, region: "Laconia" },
  "Skoutari Harbour":                { lat: 36.7228, lon: 22.5805, region: "Laconia" },
  "Plitra Harbour":                  { lat: 36.7385, lon: 22.9815, region: "Laconia" },
  "Archangelos Bay (Laconia)":       { lat: 36.7910, lon: 23.0238, region: "Laconia" },
  "Kokkiniá Pier and Harbour":       { lat: 36.7906, lon: 23.0791, region: "Laconia" },
  "Kalyvia Pier":                    { lat: 36.8165, lon: 23.0612, region: "Laconia" },
};

/* ===== helpers ===== */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function uniqStrings(arr: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const x of arr) { const k = String(x ?? "").trim(); if (!k) continue; if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
function uniqHazards(arr: Hazard[]): Hazard[] {
  const seen = new Set<string>(); const out: Hazard[] = [];
  for (const h of arr) {
    const k = JSON.stringify({ l: (h.label || "").trim(), n: (h.note || "").trim(), s: h.sev ?? null });
    if (!seen.has(k)) { seen.add(k); out.push(h); }
  }
  return out;
}

/* ===== load canonical (array or {list:[]}) ===== */
const CANONICAL: CanonicalPort[] = Array.isArray(CANONICAL_PORTS_RAW)
  ? (CANONICAL_PORTS_RAW as CanonicalPort[])
  : ((CANONICAL_PORTS_RAW as any).list as CanonicalPort[]);

/* ===== indexes ===== */
const canonByKey = new Map<string, CanonicalPort>();
for (const p of CANONICAL) {
  const k = normalize(p.name);
  if (!canonByKey.has(k)) canonByKey.set(k, p);
}
const factsByKey = new Map<string, { key: string; fact: PortFact & { lat?: number; lon?: number; region?: string } }>();
for (const name of Object.keys(PORT_FACTS_DATA)) {
  const k = normalize(name);
  factsByKey.set(k, { key: name, fact: PORT_FACTS_DATA[name] as any });
}

/* apply overrides */
function applyGeoOverrides(m: MergedPort, factName: string) {
  const o = GEO_OVERRIDES[factName]; if (!o) return;
  if (typeof o.lat === "number") m.lat = o.lat;
  if (typeof o.lon === "number") m.lon = o.lon;
  if (o.region) m.region = o.region;
}

/* merge */
function mergeOne(
  canon: CanonicalPort | undefined,
  factName: string,
  fact: PortFact & { lat?: number; lon?: number; region?: string }
): MergedPort {
  if (canon) {
    const m: MergedPort = {
      ...canon,
      region: canon.region ?? fact.region,
      vhf: fact.vhf ?? (canon as any).vhf,
      vhfVerified: fact.vhfVerified ?? (canon as any).vhfVerified,
      marina: fact.marina ?? (canon as any).marina,
      anchorage: fact.anchorage ?? (canon as any).anchorage,
      shelter: fact.shelter ?? (canon as any).shelter,
      exposure: fact.exposure ?? (canon as any).exposure,
      hazards: uniqHazards([...(asArray((canon as any).hazards)), ...(asArray(fact.hazards))]),
      notes: uniqStrings([...(asArray((canon as any).notes)), ...(asArray(fact.notes))]),
      sources: uniqStrings([...(asArray((canon as any).sources)), ...(asArray(fact.sources))]),
      __source: "merged",
    };
    if (typeof m.lat !== "number" && typeof fact.lat === "number") m.lat = fact.lat;
    if (typeof m.lon !== "number" && typeof fact.lon === "number") m.lon = fact.lon;
    applyGeoOverrides(m, factName);
    return m;
  } else {
    const m: MergedPort = {
      name: factName,
      region: fact.region, lat: fact.lat, lon: fact.lon,
      vhf: fact.vhf, vhfVerified: fact.vhfVerified, marina: fact.marina,
      anchorage: fact.anchorage, shelter: fact.shelter, exposure: fact.exposure,
      hazards: asArray(fact.hazards), notes: asArray(fact.notes), sources: asArray(fact.sources),
      __source: "facts",
    };
    applyGeoOverrides(m, factName);
    return m;
  }
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

/* ===== helpers for UI/AI ===== */
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
