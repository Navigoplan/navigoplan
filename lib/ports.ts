// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMergedPorts } from "./portsMerged";
// ⚠️ Φέρνουμε τα facts RELATIVE (να φύγει κάθε path error)
import { FACTS as PORT_FACTS } from "./ai/ports/portFacts";

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

function isGreek(s: string) {
  return /[\u0370-\u03FF]/.test(s);
}

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

function guessCategoryFromName(name: string): PortCategory {
  const n = name.toLowerCase();
  if (/\bmarina\b/.test(n)) return "marina";
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n)) return "spot";
  return "harbor";
}

/* ===== Καθάρισμα labels/aliases ώστε να ΜΗ μπαίνουν notes ===== */
const BANNED_IN_PARENS = [
  "traffic","change-over","change over","crowd","crowded","meltemi","swell",
  "fuel","water","power","taxi","shops","supermarket","notes",
  "πολύ","παρασκευή","σάββατο","άνεμο","άνεμοι","κύμα","ρηχ","βράχ","τηλέφ","σημείωση"
];

function isCleanParen(inner: string) {
  const s = (inner || "").trim().toLowerCase();
  if (!s) return false;
  if (BANNED_IN_PARENS.some(w => s.includes(w))) return false;
  if (/[0-9!:;.,/\\#@%&*=_+<>?|]/.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (s.length > 28) return false;
  return true;
}

function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const parens = [...s.matchAll(/\(([^)]+)\)/g)];
  if (!parens.length) return s;
  const clean = parens.find(m => isCleanParen(m[1]));
  if (!clean) return s.replace(/\s*\([^)]+\)/g, "").trim();
  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  const base = s.replace(/\s+/g, " ");
  return `${base} (${clean[1]})`;
}

/** true αν το string μοιάζει με ΟΝΟΜΑ (όχι πρόταση/note) */
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;          // "Βάθη 2–4 m.", "Είσοδος…"
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const badStarts = [
    "Άφιξη","Αφιξη","Είσοδος","Έξοδος","Exodos","Βάθη","Καλύτερα",
    "Επικοινωνία","Προσοχή","Σημείωση","Arrival","Entrance","Depth","Better","Notes","Call"
  ];
  const low = s.toLowerCase();
  if (badStarts.some(w => low.startsWith(w.toLowerCase()))) return false;
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s)) return false;
  return true;
}

function bilingualLabel(primary: string, aliases: string[]) {
  const en = [primary, ...aliases].find((x) => !isGreek(x)) || primary;
  const el = [primary, ...aliases].find((x) => isGreek(x));
  if (el && normalize(el) !== normalize(en)) {
    return isGreek(primary) ? `${primary} (${en})` : `${primary} (${el})`;
  }
  return primary;
}

/* =========================
 *  Enrichment from portFacts
 * =======================*/

/** π.χ. "Mylokopi Cove" -> null, "Mandraki (Hydra)" -> "Hydra" */
function extractParenPlace(label: string): string | null {
  const m = String(label || "").match(/\(([^)]+)\)/);
  if (!m) return null;
  const inner = m[1].trim();
  return isCleanParen(inner) ? inner : null;
}

/**
 * Εμπλουτίζει τα ports με aliases που προέρχονται από τα κλειδιά του portFacts:
 * - Αν το key έχει "(Island)", βρίσκουμε port που ταιριάζει στο Island (name/alias).
 * - Αλλιώς δοκιμάζουμε exact/contains πάνω σε name/aliases.
 * - Δεν δημιουργούμε καινούργια ports χωρίς coords· μόνο aliases.
 */
function enrichWithFacts(list: Port[]): Port[] {
  const out = list.map(p => ({ ...p, aliases: [...(p.aliases ?? [])] as string[] }));
  const byName = new Map<string, number>();
  const byAlias = new Map<string, number>();

  out.forEach((p, idx) => {
    byName.set(normalize(p.name), idx);
    (p.aliases ?? []).forEach(a => byAlias.set(normalize(a), idx));
  });

  const addAlias = (idx: number, alias: string) => {
    const clean = sanitizeName(alias);
    if (!clean || !isNameLike(clean)) return;
    const arr = out[idx].aliases ?? (out[idx].aliases = []);
    if (!arr.some(a => normalize(a) === normalize(clean))) arr.push(clean);
  };

  const factKeys = Object.keys(PORT_FACTS ?? {});
  for (const raw of factKeys) {
    const factLabel = sanitizeName(String(raw || "").trim());
    if (!factLabel || !isNameLike(factLabel)) continue;

    const inner = extractParenPlace(factLabel);
    let idx: number | undefined;

    if (inner) {
      // 1) προσπαθούμε με το περιεχόμενο παρενθέσεων (π.χ. "Hydra")
      idx = byName.get(normalize(inner));
      if (idx === undefined) idx = byAlias.get(normalize(inner));
    }

    // 2) fallback: exact πάνω στο full label
    if (idx === undefined) {
      idx = byName.get(normalize(factLabel));
      if (idx === undefined) idx = byAlias.get(normalize(factLabel));
    }

    // 3) fallback: "περιέχει" — π.χ. “Russian Bay (Poros)” -> Poros
    if (idx === undefined && inner) {
      // ψάχνουμε port που "εμπεριέχεται" στο όνομά του ή στα aliases
      idx = out.findIndex(p =>
        normalize(p.name) === normalize(inner) ||
        (p.aliases ?? []).some(a => normalize(a) === normalize(inner))
      );
      if (idx < 0) idx = undefined;
    }

    if (idx !== undefined) addAlias(idx, factLabel);
  }

  return out;
}

/* =========================
 *  Index helpers
 * =======================*/
type PortIndex = {
  all: Port[];
  byId: Record<string, Port>;
  byKey: Record<string, string>;
  options: string[];         // dropdown list (labels + aliases καθαρά)
};

function buildIndex(list: Port[]): PortIndex {
  const byId: Record<string, Port> = {};
  const byKey: Record<string, string> = {};
  const optionSet = new Set<string>();

  for (const p of list) {
    byId[p.id] = p;

    // index exact name/aliases
    byKey[normalize(p.name)] = p.id;
    for (const a of p.aliases ?? []) byKey[normalize(a)] = p.id;

    // 1) κύριο label
    if (p.label) optionSet.add(p.label);
    else optionSet.add(p.name);

    // 2) ΟΛΑ τα aliases ως **ξεχωριστές** επιλογές
    for (const a of p.aliases ?? []) {
      const s = sanitizeName(a);
      if (s && isNameLike(s)) optionSet.add(s);
    }

    // 3) προαιρετικά δίγλωσσα combos
    const greek = (p.aliases ?? []).find(isGreek);
    const latin = (p.aliases ?? []).find((x) => !isGreek(x));
    if (greek) optionSet.add(`${p.name} (${greek})`);
    if (latin && isGreek(p.name)) optionSet.add(`${p.name} (${latin})`);
  }

  const options = Array.from(optionSet).sort((a, b) => a.localeCompare(b, "en"));
  return { all: list, byId, byKey, options };
}

/* =========================
 *  Data builder
 * =======================*/
function buildPortsFromMerged(): Port[] {
  // 1) canonical base
  let merged = buildMergedPorts().map((m, i) => {
    const nameClean = sanitizeName(String(m.name ?? "").trim());
    const id = String(m.id ?? `merged-${i}-${normalize(nameClean).slice(0, 40)}`).trim();

    const regRaw = String(m.region ?? "").trim();
    const region =
      (REGIONS.find((r) => r.toLowerCase() === regRaw.toLowerCase()) ??
        "Saronic") as Region;

    const category = (m.category as PortCategory) ?? guessCategoryFromName(nameClean);

    const aliases = uniq(
      [nameClean, ...(Array.isArray(m.aliases) ? m.aliases : [])]
        .map((x) => sanitizeName(String(x || "")))
        .filter((x) => x && isNameLike(x))
    ).slice(0, 60);

    const lat = typeof (m as any).lat === "number" ? (m as any).lat : NaN;
    const lon = typeof (m as any).lon === "number" ? (m as any).lon : NaN;

    const label = bilingualLabel(nameClean, aliases);

    return {
      id, name: nameClean, lat, lon, category, region, aliases, label
    } as Port;
  })
  .filter(p => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon) && !!p.region);

  // 2) Εμπλουτισμός με portFacts (aliases μόνο)
  merged = enrichWithFacts(merged);

  return merged;
}

/* =========================
 *  Public API (+search)
 * =======================*/
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if (p.label && normalize(p.label).includes(needle)) return true;
  if (Array.isArray(p.aliases)) {
    return p.aliases.some((a) => normalize(a).includes(needle));
  }
  return false;
}

export function guessRegionFromPorts(
  ports: Array<Port | null | undefined>
): Region | "Multi" | null {
  const valid = ports.filter(Boolean) as Port[];
  const set = new Set(valid.map((p) => p.region));
  if (set.size === 0) return null;
  if (set.size === 1) return valid[0].region;
  return "Multi";
}

export function getAutoRegionLabel(auto: Region | "Multi" | null) {
  if (!auto) return "Auto";
  if (auto === "Multi") return "Auto (multi-region)";
  return `${auto} (auto)`;
}

export function filterPortsForDropdown(
  all: Port[],
  mode: "Auto" | Region,
  query: string
) {
  const base = mode === "Auto" ? all : all.filter((p) => p.region === mode);
  return base.filter((p) => portMatchesQuery(p, query));
}

/* =========================
 *  React Hook
 * =======================*/
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

  function findPort(query: string): Port | null {
    if (!index || !query) return null;
    const key = normalize(query);

    // exact by name/alias
    const id = index.byKey[key];
    if (id && index.byId[id]) return index.byId[id];

    // exact by label
    const exactLabel = index.options.find((o) => normalize(o) === key);
    if (exactLabel) {
      const p = index.all.find(
        (x) => normalize(x.label || x.name) === normalize(exactLabel)
      );
      if (p) return p;
    }

    // includes
    const p = index.all.find(
      (x) =>
        normalize(x.name).includes(key) ||
        normalize(x.label || "").includes(key) ||
        (x.aliases ?? []).some((a) => normalize(a).includes(key))
    );
    return p ?? null;
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
