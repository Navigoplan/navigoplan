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
  /** Ομαδοποίηση στις 7 βασικές περιοχές */
  region: Region;
  /** Το ακατέργαστο region του backend (π.χ. "Korinthia", "Messinia"…) */
  originalRegion?: string;
  /** Δίγλωσση ετικέτα π.χ. "Hydra (Ύδρα)" ή "Ύδρα (Hydra)" */
  label?: string;
  /** Όλα τα aliases (Ελληνικά + Αγγλικά) για αναζήτηση/autocomplete */
  aliases?: string[];
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
  return /[\u0370-\u03FF]/.test(String(s || ""));
}
function uniq<T>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k =
      typeof x === "string" ? normalize(x) : JSON.stringify(x ?? null);
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
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n))
    return "anchorage";
  if (/\bcanal\b/.test(n) || /διώρυγ/.test(n)) return "spot";
  return "harbor";
}

/** Κρατάμε μόνο καθαρά labels για dropdown (όχι φράσεις όπως "Entrance", "Depth" κ.λπ.) */
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false; // π.χ. "Βάθη 2–4 m."
  if (s.length > 64) return false;
  if (s.split(/\s+/).length > 8) return false;
  const bad = [
    "άφιξη",
    "αφιξη",
    "είσοδος",
    "εξοδος",
    "έξοδος",
    "βάθη",
    "καλύτερα",
    "επικοινωνία",
    "σημείωση",
    "arrival",
    "entrance",
    "depth",
    "better",
    "notes",
    "call",
  ];
  if (bad.some((w) => s.toLowerCase().startsWith(w))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().\-]+$/.test(s);
}

/** Αν υπάρχει παρενθετικό, το κρατάμε μόνο αν φαίνεται "τόπος" (όχι περιγραφικό) */
const BANNED_IN_PARENS = [
  "traffic",
  "change-over",
  "change over",
  "crowd",
  "crowded",
  "meltemi",
  "swell",
  "fuel",
  "water",
  "power",
  "taxi",
  "shops",
  "supermarket",
  "notes",
  "πολύ",
  "παρασκευή",
  "σάββατο",
  "άνεμο",
  "άνεμοι",
  "κύμα",
  "ρηχ",
  "βράχ",
  "τηλέφ",
  "σημείωση",
];
function isCleanParen(inner: string) {
  const s = (inner || "").trim().toLowerCase();
  if (!s) return false;
  if (BANNED_IN_PARENS.some((w) => s.includes(w))) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.split(/\s+/).length > 3) return false;
  return s.length <= 28;
}
function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const matches = s.match(/\(([^)]+)\)/g);
  if (!matches) return s;
  const clean = matches.map((t) => t.slice(1, -1)).find(isCleanParen);
  if (!clean) return s.replace(/\s*\([^)]+\)/g, "").trim();
  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  return `${s} (${clean})`;
}

/** Δίγλωσση σύνθεση ετικέτας */
function bilingualLabel(primary: string, aliases: string[]) {
  const en = [primary, ...aliases].find((x) => !isGreek(x)) || primary;
  const el = [primary, ...aliases].find((x) => isGreek(x));
  if (el && normalize(el) !== normalize(en)) {
    return isGreek(primary) ? `${primary} (${en})` : `${primary} (${el})`;
  }
  return primary;
}

/* =========================
 *  Bucket: σε 7 βασικές περιοχές
 * =======================*/
function bucketRegion(rawRegion: string, name: string, lat: number, lon: number): Region {
  const r = (rawRegion || "").toLowerCase();
  const nm = (name || "").toLowerCase();

  // Λέξεις-κλειδιά
  if (r.includes("ion") || nm.includes("zakynth") || nm.includes("corfu") || nm.includes("kerkyra") || nm.includes("paxos") || nm.includes("lefka")) {
    return "Ionian";
  }
  if (r.includes("cycl") || nm.includes("mykon") || nm.includes("naxos") || nm.includes("paros") || nm.includes("kea") || nm.includes("kythn") || nm.includes("serif") || nm.includes("sifn") || nm.includes("santor")) {
    return "Cyclades";
  }
  if (r.includes("dodec") || nm.includes("rhodes") || nm.includes("rodos") || nm.includes("kos") || nm.includes("kalymn") || nm.includes("leros") || nm.includes("patmos")) {
    return "Dodecanese";
  }
  if (r.includes("spor") || nm.includes("skiath") || nm.includes("skopel") || nm.includes("aloniss")) {
    return "Sporades";
  }
  if (r.includes("crete") || r.includes("krit") || nm.includes("herakl") || nm.includes("chania") || nm.includes("rethym") || nm.includes("agios nikolaos") || nm.includes("sitia")) {
    return "Crete";
  }
  if (r.includes("north") || r.includes("aeg") || nm.includes("thessalon") || nm.includes("kavala") || nm.includes("lesvos") || nm.includes("mytil") || nm.includes("chios") || nm.includes("samos") || nm.includes("ikaria") || nm.includes("samothr")) {
    return "NorthAegean";
  }

  // Κορινθιακός / Σαρωνικός / Πελοπόννησος → Saronic (για το planner)
  if (r.includes("korinth") || r.includes("corinth") || r.includes("pelop") || r.includes("saron") || nm.includes("korinth") || nm.includes("loutraki") || nm.includes("aegina") || nm.includes("poros") || nm.includes("hydra") || nm.includes("spetses")) {
    return "Saronic";
  }

  // Fallback με γεωγραφικά όρια
  // Αδρά: Κρήτη (lat < 35.1), Ιόνιο (lon < 21.5), Β. Αιγαίο (lon > 24.8 && lat > 38.5), Σποράδες (lat ~39, lon 23-24), αλλιώς Σαρωνικός
  if (lat < 35.1) return "Crete";
  if (lon < 21.5) return "Ionian";
  if (lon > 24.8 && lat > 38.5) return "NorthAegean";
  if (lat > 38.5 && lon >= 23 && lon <= 24.5) return "Sporades";
  return "Saronic";
}

/* =========================
 *  API fetch
 * =======================*/
type APIRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  region?: string; // raw
  aliases?: string[];
};

async function fetchMerged(): Promise<APIRow[]> {
  const res = await fetch("/api/ports/merged", { cache: "no-store" });
  if (!res.ok) throw new Error(`merged fetch: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? (json as APIRow[]) : [];
}

/* =========================
 *  Build index (με ΟΛΑ τα aliases στο dropdown)
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
    (p.aliases ?? []).forEach((a) => (byKey[normalize(a)] = p.id));

    // κύριο label
    opts.add(p.label || p.name);

    // όλα τα aliases (καθαρά)
    (p.aliases ?? []).forEach((a) => {
      const s = sanitizeName(String(a || ""));
      if (s && isNameLike(s)) opts.add(s);
    });

    // δίγλωσσα combos για ευκολία
    const gr = (p.aliases ?? []).find(isGreek);
    const la = (p.aliases ?? []).find((x) => !isGreek(x));
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
 *  Public API
 * =======================*/
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if (p.label && normalize(p.label).includes(needle)) return true;
  return (p.aliases ?? []).some((a) => normalize(a).includes(needle));
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
  return auto === "Multi" ? "Auto (multi-region)" : `${auto} (auto)`;
}

/** Φιλτράρει για το region dropdown του Planner */
export function filterPortsForDropdown(
  all: Port[],
  mode: "Auto" | Region,
  query: string
) {
  const base = mode === "Auto" ? all : all.filter((p) => p.region === mode);
  return base.filter((p) => portMatchesQuery(p, query));
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
        const rows = await fetchMerged();

        // Χτίζουμε Port αντικείμενα με δίγλωσσα labels & aliases
        let list: Port[] = rows
          .map((r, i) => {
            const name = sanitizeName(String(r.name || "").trim());
            if (!name || !Number.isFinite(r.lat) || !Number.isFinite(r.lon))
              return null;

            const rawAliases = Array.isArray(r.aliases) ? r.aliases : [];
            const aliases = uniq(
              [name, ...rawAliases]
                .map((x) => sanitizeName(String(x || "")))
                .filter(isNameLike)
            ).slice(0, 80);

            const label = bilingualLabel(name, aliases);
            const cat = (r.category as PortCategory) || guessCategoryFromName(name);
            const region = bucketRegion(String(r.region || ""), name, r.lat, r.lon);

            const id =
              String((r as any).id ?? `m-${i}-${normalize(name).slice(0, 40)}`).trim();

            return {
              id,
              name,
              lat: Number(r.lat),
              lon: Number(r.lon),
              category: cat,
              region,
              originalRegion: r.region || "",
              label,
              aliases,
            } as Port;
          })
          .filter(Boolean) as Port[];

        // dedupe με βάση (name,lat,lon)
        const seen = new Set<string>();
        list = list.filter((p) => {
          const k = `${normalize(p.name)}|${p.lat.toFixed(5)}|${p.lon.toFixed(
            5
          )}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

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

    // exact: συνολικό label
    const exact = index.options.find((o) => normalize(o) === key);
    if (exact) {
      const p = index.all.find(
        (x) => normalize(x.label || x.name) === key
      );
      if (p) return p;
    }

    // includes
    return (
      index.all.find(
        (x) =>
          normalize(x.name).includes(key) ||
          normalize(x.label || "").includes(key) ||
          (x.aliases ?? []).some((a) => normalize(a).includes(key))
      ) ?? null
    );
  }

  return {
    ready: !!index,
    error,
    ports: ports ?? [],
    options: index?.options ?? [],
    findPort,

    // Χρήσιμα έξτρα για UI
    byId: index?.byId ?? {},
    all: index?.all ?? [],
  };
}
