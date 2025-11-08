// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";

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
  /** label για dropdown (δίγλωσσο όταν μπορούμε) */
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
const isGreek = (s: string) => /[\u0370-\u03FF]/.test(s);

function uniq<T>(arr: T[]) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = typeof x === "string" ? normalize(x) : JSON.stringify(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

function guessCategoryFromName(nm: string): PortCategory {
  const n = nm.toLowerCase();
  if (/\bmarina\b/.test(n) || /μαρίν/.test(n)) return "marina";
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n) || /διώρυγ/.test(n)) return "spot";
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
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["άφιξη","αφιξη","είσοδος","εξοδος","έξοδος","βάθη","καλύτερα","επικοινωνία","σημείωση","arrival","entrance","depth","better","notes","call"];
  if (bad.some(w => s.toLowerCase().startsWith(w))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s);
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

    // ΟΛΑ τα aliases ως ξεχωριστές επιλογές
    (p.aliases ?? []).forEach(a => {
      const s = sanitizeName(a);
      if (s && isNameLike(s)) opts.add(s);
    });

    // Δίγλωσσα combos για άνεση
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
 *  Fetch από API (merged)
 * =======================*/
type ApiPort = {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  category?: PortCategory;
  region?: string;
  aliases?: string[];
};

async function fetchMerged(): Promise<Port[]> {
  const res = await fetch("/api/ports/merged", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = (await res.json()) as ApiPort[];

  const list: Port[] = [];
  for (const r of raw) {
    const name = sanitizeName(String(r.name ?? "").trim());
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    const regionStr = String(r.region ?? "").trim();

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || !regionStr) continue;

    const reg = (REGIONS.find(x => x.toLowerCase() === regionStr.toLowerCase()) ?? "Saronic") as Region;
    const cat = (r.category as PortCategory) ?? guessCategoryFromName(name);
    const aliases = uniq(
      [name, ...(Array.isArray(r.aliases) ? r.aliases : [])]
        .map(x => sanitizeName(String(x || "")))
        .filter(isNameLike)
    ).slice(0, 60);

    const id = String(r.id ?? `p-${normalize(name).slice(0, 40)}`);

    const label = bilingualLabel(name, aliases);

    list.push({ id, name, lat, lon, region: reg, category: cat, aliases, label });
  }

  return list;
}

/* =========================
 *  Public helpers για UI
 * =======================*/
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if ((p.label && normalize(p.label).includes(needle))) return true;
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

/* =========================
 *  Hook
 * =======================*/
export function usePorts() {
  const [ports, setPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchMerged();
        if (!cancelled) setPorts(list);
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setPorts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
    return (
      index.all.find(
        x =>
          normalize(x.name).includes(key) ||
          normalize(x.label || "").includes(key) ||
          (x.aliases ?? []).some(a => normalize(a).includes(key))
      ) ?? null
    );
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
