// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMergedPorts } from "./portsMerged";

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

/** Canonical shape που χρησιμοποιεί το UI */
export type Port = {
  id: string;
  name: string;          // κύριο display name (EN ή mix)
  lat: number;
  lon: number;
  category: PortCategory;
  region: Region;
  aliases?: string[];    // επιπλέον ονόματα για αναζήτηση (EN/EL/variants)
  label?: string;        // προτεινόμενο δίγλωσσο label για dropdown
};

/* =========================
 *  Helpers
 * =======================*/
export function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
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
  if (/\b(cove|bay|anchorage|όρμος|κολπος|παραλία)\b/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n)) return "spot";
  return "harbor";
}

/** Φτιάχνει δίγλωσσο label: EN (EL) ή EL (EN), αποφεύγοντας διπλοεμφάνιση όταν ίδιο */
function bilingualLabel(primary: string, aliases: string[]) {
  const en = [primary, ...aliases].find((x) => !isGreek(x)) || primary;
  const el = [primary, ...aliases].find((x) => isGreek(x));

  if (el && normalize(el) !== normalize(en)) {
    // Αν το primary είναι ελληνικό, βάλε "EL (EN)". Αλλιώς "EN (EL)".
    return isGreek(primary) ? `${primary} (${en})` : `${primary} (${el})`;
  }
  return primary;
}

/* =========================
 *  Index helpers
 * =======================*/
type PortIndex = {
  all: Port[];
  byId: Record<string, Port>;
  byKey: Record<string, string>;
  options: string[];         // ό,τι δείχνουμε στο dropdown (labels)
};

function buildIndex(list: Port[]): PortIndex {
  const byId: Record<string, Port> = {};
  const byKey: Record<string, string> = {};
  const optionSet = new Set<string>();

  for (const p of list) {
    byId[p.id] = p;

    // index by main name
    byKey[normalize(p.name)] = p.id;

    // index by aliases
    for (const a of p.aliases ?? []) byKey[normalize(a)] = p.id;

    // dropdown label
    if (p.label) optionSet.add(p.label);
    else optionSet.add(p.name);

    // Επίσης πρόσθεσε *μερικά* ωφέλιμα aliases σαν επιλογές
    // (όχι όλα για να μη φουσκώσει υπερβολικά το dropdown)
    const greek = (p.aliases ?? []).find(isGreek);
    const latin = (p.aliases ?? []).find((x) => !isGreek(x));
    if (greek) optionSet.add(`${p.name} (${greek})`);
    if (latin && isGreek(p.name)) optionSet.add(`${p.name} (${latin})`);
  }

  const options = Array.from(optionSet).sort((a, b) => a.localeCompare(b, "en"));
  return { all: list, byId, byKey, options };
}

/* =========================
 *  Data builder (Merged)
 * =======================*/
function buildPortsFromMerged(): Port[] {
  // Παίρνουμε ΟΛΑ (canonical + facts-only) από το portsMerged
  const merged = buildMergedPorts();

  const out: Port[] = merged
    .map((m, i) => {
      const id = `merged-${i}-${normalize(m.name).slice(0, 40)}`;

      // region -> Region (fallback Saronic)
      const regRaw = (m.region || "").trim();
      const reg =
        (REGIONS.find((r) => r.toLowerCase() === regRaw.toLowerCase()) ??
          "Saronic") as Region;

      // category guess από όνομα
      const category = guessCategoryFromName(m.name);

      // aliases από sources/notes/hazards + original (αν υπάρχουν), καθαρά & μοναδικά
      const aliases = uniq(
        [
          m.name,
          ...(m.notes ?? []),
          ...(m.sources ?? []),
          ...(m.hazards ?? []).map((h) => h.label || ""),
        ]
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      ).slice(0, 20); // safety cap

      // δίγλωσσο label
      const label = bilingualLabel(m.name, aliases);

      const lat = typeof (m as any).lat === "number" ? (m as any).lat : NaN;
      const lon = typeof (m as any).lon === "number" ? (m as any).lon : NaN;

      return {
        id,
        name: m.name,
        lat,
        lon,
        category,
        region: reg,
        aliases,
        label,
      } as Port;
    })
    .filter(
      (p) =>
        p.name &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        !!p.region
    );

  return out;
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

/** Υπολογίζει περιοχή από όλα τα ports (start/end/vias). */
export function guessRegionFromPorts(
  ports: Array<Port | null | undefined>
): Region | "Multi" | null {
  const valid = ports.filter(Boolean) as Port[];
  const set = new Set(valid.map((p) => p.region));
  if (set.size === 0) return null;
  if (set.size === 1) return valid[0].region;
  return "Multi";
}

/** Label που μπορείς να δείξεις στο UI για Auto mode. */
export function getAutoRegionLabel(auto: Region | "Multi" | null) {
  if (!auto) return "Auto";
  if (auto === "Multi") return "Auto (multi-region)";
  return `${auto} (auto)`;
}

/** Επιστρέφει λίστα για dropdown:
 *  - Σε Auto: όλη η Ελλάδα, μόνο με text query
 *  - Σε manual region: φιλτράρει πρώτα με region και μετά με text query
 */
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
    // Χτίζουμε *τοπικά* το ενοποιημένο dataset (χωρίς network fetch).
    // Έτσι μαζεύουμε canonical + Sea-Guide facts + geo overrides.
    try {
      const list = buildPortsFromMerged();
      setPorts(list);
    } catch (e) {
      setError(e as Error);
      setPorts([]);
    }
  }, []);

  const index = useMemo(() => (ports ? buildIndex(ports) : null), [ports]);

  /** Βρίσκει port με exact match πρώτα (name/label/aliases), μετά με includes */
  function findPort(query: string): Port | null {
    if (!index || !query) return null;
    const key = normalize(query);
    // direct key on name/aliases
    const id = index.byKey[key];
    if (id && index.byId[id]) return index.byId[id];

    // try label exact
    const exactLabel = index.options.find((o) => normalize(o) === key);
    if (exactLabel) {
      const p = index.all.find(
        (x) => normalize(x.label || x.name) === normalize(exactLabel)
      );
      if (p) return p;
    }

    // includes search
    const opt = index.options.find((o) => normalize(o).includes(key));
    if (opt) {
      const p = index.all.find(
        (x) =>
          normalize(x.name).includes(key) ||
          normalize(x.label || "").includes(key) ||
          (x.aliases ?? []).some((a) => normalize(a).includes(key))
      );
      if (p) return p;
    }
    return null;
  }

  return {
    ready: !!index,
    error,
    ports: ports ?? [],
    options: index?.options ?? [],
    findPort,

    // χρήσιμα έξτρα
    byId: index?.byId ?? {},
    all: index?.all ?? [],
  };
}
