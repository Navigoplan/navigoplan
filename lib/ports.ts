// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";
// ΣΩΣΤΟ import για τα facts (singular folder "port")
import { PORT_FACTS_DATA as PORT_FACTS } from "./ports/portFacts";

/* =========================
 *  Types
 * =======================*/
export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: string;          // π.χ. Ionian, Korinthia, Cyclades, …
  aliases?: string[];
  label?: string;          // δίγλωσσο label για dropdown
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
  const out: T[] = []; const seen = new Set<string>();
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
  if (/[0-9.;:!?]/.test(s)) return false;
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
 *  Aliases από το name (auto-expand)
 * =======================*/

// λέξεις που θέλουμε να αφαιρούμε από ονομασίες τύπου "Porto Limnionas Cove"
const STOPWORDS = /\b(cove|bay|harbour|harbor|marina|port)\b/gi;

function stripParensOnce(s: string) {
  return s.replace(/\s*\([^)]+\)/g, "").trim();
}

/**
 * Από ένα canonical name (π.χ. "Porto Limnionas Cove") παράγει βοηθητικά aliases:
 * - "Porto Limnionas" (χωρίς stopwords)
 * - "Limnionas" (τελευταίο token)
 * - πλήρες χωρίς stopwords
 */
function expandNameAliases(nameRaw: string): string[] {
  const out = new Set<string>();
  const base = stripParensOnce(nameRaw).trim();

  const noStop = base.replace(STOPWORDS, "").replace(/\s+/g, " ").trim();

  const parts = noStop.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    out.add(parts.slice(0, parts.length - 1).join(" ")); // π.χ. "Porto Limnionas"
    out.add(parts[parts.length - 1]);                    // π.χ. "Limnionas"
  }
  if (noStop && noStop.toLowerCase() !== base.toLowerCase()) out.add(noStop);

  return Array.from(out).filter(Boolean);
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

function enrichWithFactsAliases(list: Port[]): Port[] {
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
 *  Index (όλα τα aliases στο dropdown)
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

    // κύριο/δίγλωσσο label
    const base = p.label ? p.label : bilingualLabel(p.name, p.aliases ?? []);
    opts.add(base);

    // ΟΛΑ τα aliases ως ξεχωριστές επιλογές
    (p.aliases ?? []).forEach(a => {
      const s = sanitizeName(a);
      if (s && isNameLike(s)) opts.add(s);
    });

    // + δίγλωσσα combos
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
 *  Fetch helpers (API + FallBack)
 * =======================*/
async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

async function fetchMergedApi(): Promise<Port[]> {
  // 1) Προσπάθεια μέσω API (server merge)
  const arr = await fetchJSON<Array<Partial<Port> & { name: string }>>("/api/ports/merged");

  const list: Port[] = arr
    .map((p, i) => {
      const name = sanitizeName(String(p.name ?? "").trim());
      const id = String(p.id ?? `port-${i}-${normalize(name).slice(0, 40)}`).trim();
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      const region = String(p.region ?? "").trim() || "Greece";
      const cat = (p.category as PortCategory) ?? guessCategoryFromName(name);

      const rawAliases = Array.isArray(p.aliases) ? p.aliases : [];
      const expanded = [
        ...rawAliases,
        ...expandNameAliases(name), // <— auto-aliases από το canonical name
      ];
      const aliases = uniq(
        [name, ...expanded]
          .map(x => sanitizeName(String(x || "")))
          .filter(isNameLike)
      ).slice(0, 80);

      return { id, name, lat, lon, category: cat, region, aliases } as Port;
    })
    .filter(p => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.region);

  return list;
}

/** Fallback όταν το API αποτύχει: χτίζει ports από τα static αρχεία */
async function fetchFallbackFromStatic(): Promise<Port[]> {
  // canonical
  type Canon = { id?: string; name: string; lat?: number; lon?: number; region?: string; category?: PortCategory; aliases?: string[] };
  let canon: Canon[] = [];
  try { canon = await fetchJSON<Canon[]>("/data/ports.v1.json"); } catch {}

  // sea guide (προαιρετικό)
  type SG = {
    id?: string; region?: string; category?: PortCategory | "bay";
    position?: { lat?: number; lon?: number };
    name?: { el?: string; en?: string };
    aliases?: { el?: string[]; en?: string[] };
  };
  let sg: SG[] = [];
  try { sg = await fetchJSON<SG[]>("/data/sea_guide_vol3_master.json"); } catch {}

  // canonical → βάση
  const out: Port[] = [];
  for (let i = 0; i < canon.length; i++) {
    const c = canon[i];
    if (!c?.name || typeof c.lat !== "number" || typeof c.lon !== "number") continue;
    const name = sanitizeName(c.name);
    const id = String(c.id ?? `canon-${i}-${normalize(name).slice(0,40)}`);
    const region = String(c.region ?? "Greece").trim();
    const cat = c.category ?? guessCategoryFromName(name);

    const aliases = uniq(
      [name, ...(c.aliases ?? []), ...expandNameAliases(name)]
        .map(x => sanitizeName(String(x||"")))
        .filter(isNameLike)
    ).slice(0,80);

    out.push({ id, name, lat: c.lat!, lon: c.lon!, region, category: cat, aliases });
  }

  // SeaGuide → merge (αν βρούμε by name, ενώ αλλιώς προσθέτουμε με coords)
  const byName = new Map<string, number>();
  out.forEach((p, i) => byName.set(normalize(p.name), i));

  for (let j = 0; j < sg.length; j++) {
    const r = sg[j];
    const nameEn = r?.name?.en?.trim();
    const nameEl = r?.name?.el?.trim();
    const baseName = nameEn || nameEl || "";
    if (!baseName) continue;

    const lat = r.position?.lat;
    const lon = r.position?.lon;
    const finalCat: PortCategory =
      (r.category === "bay" ? "anchorage" : (r.category as PortCategory)) || "harbor";

    const aliases = uniq(
      [
        ...(r.aliases?.en ?? []),
        ...(r.aliases?.el ?? []),
        ...(nameEn && nameEl && normalize(nameEn) !== normalize(nameEl) ? [nameEl] : []),
        ...expandNameAliases(baseName) // <— auto-aliases από SeaGuide name
      ]
      .map(x => sanitizeName(String(x||"")))
      .filter(isNameLike)
    );

    const key = normalize(baseName);
    const idx = byName.get(key);

    if (idx !== undefined) {
      // merge σε υπάρχον canonical
      const prev = out[idx];
      out[idx] = {
        ...prev,
        region: prev.region || (r.region ?? "Greece"),
        category: prev.category || finalCat,
        lat: typeof prev.lat === "number" ? prev.lat : (lat ?? prev.lat),
        lon: typeof prev.lon === "number" ? prev.lon : (lon ?? prev.lon),
        aliases: uniq([...(prev.aliases ?? []), ...aliases]).slice(0, 80),
      };
    } else if (typeof lat === "number" && typeof lon === "number") {
      const id = String(r.id ?? `sg-${j}-${key.slice(0,40)}`);
      const name = sanitizeName(baseName);
      out.push({
        id,
        name,
        lat,
        lon,
        region: r.region ?? "Greece",
        category: finalCat,
        aliases,
      });
    }
  }

  return out;
}

/* =========================
 *  Hook (με ανθεκτικό fallback)
 * =======================*/
export function usePorts() {
  const [ports, setPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let base: Port[] = [];
        try {
          // 1) API first
          base = await fetchMergedApi();
        } catch (e) {
          // 2) Fallback σε static
          base = await fetchFallbackFromStatic();
        }

        // Εμπλουτισμός με aliases από portFacts + δίγλωσσο label
        const enriched = enrichWithFactsAliases(base).map(p => ({
          ...p,
          label: p.label ?? bilingualLabel(p.name, p.aliases ?? []),
        }));

        if (!cancelled) {
          setPorts(enriched);
          setError(null); // μη μένει “Σφάλμα dataset”
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e as Error);
          setPorts([]); // κενό αλλά UI λειτουργεί (χωρίς crash)
        }
      }
    })();
    return () => { cancelled = true; };
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

/* =========================
 *  Utilities for planner UI
 * =======================*/
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if (p.label && normalize(p.label).includes(needle)) return true;
  return (p.aliases ?? []).some(a => normalize(a).includes(needle));
}
export function guessRegionFromPorts(ports: Array<Port | null | undefined>): string | "Multi" | null {
  const valid = ports.filter(Boolean) as Port[];
  const set = new Set(valid.map(p => p.region));
  if (set.size === 0) return null;
  if (set.size === 1) return valid[0].region;
  return "Multi";
}
export function getAutoRegionLabel(auto: string | "Multi" | null) {
  if (!auto) return "Auto";
  return auto === "Multi" ? "Auto (multi-region)" : `${auto} (auto)`;
}
export function filterPortsForDropdown(all: Port[], mode: "Auto" | string, query: string) {
  const base = mode === "Auto" ? all : all.filter(p => normalize(p.region) === normalize(mode));
  return base.filter(p => portMatchesQuery(p, query));
}
