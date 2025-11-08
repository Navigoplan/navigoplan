// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMergedPorts } from "./portsMerged";

// ✅ Διαβάζουμε τα facts από το αρχείο σου (lowercase path, named export)
import { FACTS as PORT_FACTS } from "./ports/portFacts";

/* =========================
 *  Regions & Types
 * =======================*/
export const REGIONS = [
  "Saronic",
  "Cyclades",
  "Ionian",
  "Dodecanese",
  "Sporades",
  "NorthAegean",
  "Crete",
] as const;
export type Region = typeof REGIONS[number];
export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: Region;
  aliases?: string[];
  label?: string;
};

/* =========================
 *  Helpers
 * =======================*/
export function normalize(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
function isGreek(s: string) { return /[\u0370-\u03FF]/.test(s); }

function uniq<T>(arr: T[]) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = typeof x === "string" ? normalize(x) : JSON.stringify(x);
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

function guessCategoryFromName(nm: string): PortCategory {
  const n = nm.toLowerCase();
  if (/\bmarina\b/.test(n)) return "marina";
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n)) return "spot";
  return "harbor";
}

const BANNED_IN_PARENS = [
  "traffic","change-over","change over","crowd","crowded","meltemi","swell",
  "fuel","water","power","taxi","shops","supermarket","notes",
  "πολύ","παρασκευή","σάββατο","άνεμο","άνεμοι","κύμα","ρηχ","βράχ","τηλέφ","σημείωση"
];
function isCleanParen(inner: string) {
  const s = (inner || "").trim().toLowerCase();
  if (!s) return false;
  if (BANNED_IN_PARENS.some(w => s.includes(w))) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.split(/\s+/).length > 3) return false;
  return s.length <= 28;
}
function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const matches = s.match(/\(([^)]+)\)/g);
  if (!matches) return s;
  const clean = matches.map(t => t.slice(1, -1)).find(isCleanParen);
  if (!clean) return s.replace(/\s*\([^)]+\)/g, "").trim();
  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  return `${s} (${clean})`;
}
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;        // π.χ. "Βάθη 2–4 m."
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["άφιξη","αφιξη","είσοδος","εξοδος","έξοδος","βάθη","καλύτερα","επικοινωνία","σημείωση","arrival","entrance","depth","better","notes","call"];
  if (bad.some(w => s.toLowerCase().startsWith(w))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s);
}
function bilingualLabel(primary: string, aliases: string[]) {
  const en = [primary, ...aliases].find(x => !isGreek(x)) || primary;
  const el = [primary, ...aliases].find(x => isGreek(x));
  if (el && normalize(el) !== normalize(en)) {
    return isGreek(primary) ? `${primary} (${en})` : `${primary} (${el})`;
  }
  return primary;
}

/* =========================
 *  Enrichment from portFacts (aliases μόνο)
 * =======================*/
function extractParenPlace(label: string): string | null {
  const m = label.match(/\(([^)]+)\)/);
  if (!m) return null;
  const inner = m[1].trim();
  return isCleanParen(inner) ? inner : null;
}

/**
 * Προσθέτει στα υπάρχοντα ports aliases από τα **keys** του portFacts:
 * - Προτίμηση σε match με το παρενθετικό (π.χ. "(Hydra)").
 * - Fallback: exact match στο πλήρες label ή contains.
 * - Δεν δημιουργεί νέα ports χωρίς coords· μόνο aliases.
 */
function enrichWithFacts(list: Port[]): Port[] {
  const out = list.map(p => ({ ...p, aliases: [...(p.aliases ?? [])] as string[] }));

  const byName = new Map<string, number>();
  const byAlias = new Map<string, number>();
  out.forEach((p, i) => {
    byName.set(normalize(p.name), i);
    (p.aliases ?? []).forEach(a => byAlias.set(normalize(a), i));
  });

  const addAlias = (idx: number, al: string) => {
    const clean = sanitizeName(al);
    if (!clean || !isNameLike(clean)) return;
    const arr = out[idx].aliases ?? (out[idx].aliases = []);
    if (!arr.some(a => normalize(a) === normalize(clean))) arr.push(clean);
  };

  const keys = Object.keys(PORT_FACTS ?? {});
  for (const raw of keys) {
    const label = sanitizeName(String(raw || ""));
    if (!isNameLike(label)) continue;

    const inner = extractParenPlace(label);
    let idx: number | undefined;

    if (inner) {
      idx = byName.get(normalize(inner));
      if (idx === undefined) idx = byAlias.get(normalize(inner));
    }
    if (idx === undefined) {
      idx = byName.get(normalize(label));
      if (idx === undefined) idx = byAlias.get(normalize(label));
    }
    if (idx === undefined && inner) {
      idx = out.findIndex(
        p =>
          normalize(p.name) === normalize(inner) ||
          (p.aliases ?? []).some(a => normalize(a) === normalize(inner))
      );
      if (idx < 0) idx = undefined;
    }

    if (idx !== undefined) addAlias(idx, label);
  }

  return out;
}

/* =========================
 *  Index (περιλαμβάνει ΟΛΑ τα aliases στο dropdown)
 * =======================*/
type PortIndex = {
  all: Port[];
  byId: Record<string, Port>;
  byKey: Record<string, string>;
  options: string[];
};
function buildIndex(list: Port[]): PortIndex {
  const byId: Record<string, Port> = {};
  const byKey: Record<string, string> = {};
  const opts = new Set<string>();

  for (const p of list) {
    byId[p.id] = p;
    byKey[normalize(p.name)] = p.id;
    (p.aliases ?? []).forEach(a => (byKey[normalize(a)] = p.id));

    // κύριο label
    if (p.label) opts.add(p.label);
    else opts.add(p.name);

    // ΟΛΑ τα aliases (καθαρά) ως ξεχωριστές επιλογές
    (p.aliases ?? []).forEach(a => {
      const s = sanitizeName(a);
      if (s && isNameLike(s)) opts.add(s);
    });

    // +δίγλωσσα combos για άνεση αναζήτησης
    const gr = (p.aliases ?? []).find(isGreek);
    const la = (p.aliases ?? []).find(x => !isGreek(x));
    if (gr) opts.add(`${p.name} (${gr})`);
    if (la && isGreek(p.name)) opts.add(`${p.name} (${la})`);
  }

  return {
    all: list,
    byId,
    byKey,
    options: Array.from(opts).sort((a, b) => a.localeCompare(b, "en")),
  };
}

/* =========================
 *  Build & Hook
 * =======================*/
function buildPortsFromMerged(): Port[] {
  let merged = buildMergedPorts().map((m, i) => {
    const name = sanitizeName(String(m.name ?? "").trim());
    const id = String(m.id ?? `merged-${i}-${normalize(name).slice(0, 40)}`).trim();

    const reg = (REGIONS.find(r => r.toLowerCase() === String(m.region ?? "").toLowerCase()) ?? "Saronic") as Region;
    const cat = (m.category as PortCategory) ?? guessCategoryFromName(name);

    const aliases = uniq(
      [name, ...(Array.isArray(m.aliases) ? m.aliases : [])]
        .map(x => sanitizeName(String(x || "")))
        .filter(isNameLike)
    ).slice(0, 60);

    const lat = typeof (m as any).lat === "number" ? (m as any).lat : NaN;
    const lon = typeof (m as any).lon === "number" ? (m as any).lon : NaN;

    const label = bilingualLabel(name, aliases);

    return { id, name, lat, lon, category: cat, region: reg, aliases, label } as Port;
  }).filter(p => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.region);

  // ➕ Εμπλουτισμός με portFacts (aliases μόνο)
  merged = enrichWithFacts(merged);

  return merged;
}

export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if (p.label && normalize(p.label).includes(needle)) return true;
  return (p.aliases ?? []).some(a => normalize(a).includes(needle));
}

export function guessRegionFromPorts(ports: Array<Port | null | undefined>): Region | "Multi" | null {
  const valid = ports.filter(Boolean) as Port[];
  const set = new Set(valid.map(p => p.region));
  if (set.size === 0) return null;
  if (set.size === 1) return valid[0].region;
  return "Multi";
}
export function getAutoRegionLabel(auto: Region | "Multi" | null) {
  if (!auto) return "Auto";
  return auto === "Multi" ? "Auto (multi-region)" : `${auto} (auto)`;
}
export function filterPortsForDropdown(all: Port[], mode: "Auto" | Region, query: string) {
  const base = mode === "Auto" ? all : all.filter(p => p.region === mode);
  return base.filter(p => portMatchesQuery(p, query));
}

export function usePorts() {
  const [ports, setPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const list = buildPortsFromMerged();
      setPorts(list);
    } catch (e) {
      setError(e as Error);
      setPorts([]);
    }
  }, []);

  const index = useMemo(() => (ports ? buildIndex(ports) : null), [ports]);

  function findPort(q: string): Port | null {
    if (!index || !q) return null;
    const key = normalize(q);

    // exact: name/alias
    const id = index.byKey[key];
    if (id && index.byId[id]) return index.byId[id];

    // exact: label
    const exact = index.options.find(o => normalize(o) === key);
    if (exact) {
      const p = index.all.find(x => normalize(x.label || x.name) === key);
      if (p) return p;
    }

    // includes
    return index.all.find(
      x =>
        normalize(x.name).includes(key) ||
        normalize(x.label || "").includes(key) ||
        (x.aliases ?? []).some(a => normalize(a).includes(key))
    ) ?? null;
  }

  return {
    ready: !!index,
    error,
    ports: ports ?? [],
    options: index?.options ?? [],
    findPort,
    byId: index?.byId ?? {},
    all: index?.all ?? [],
  };
}
