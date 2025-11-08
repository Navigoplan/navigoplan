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
  // Συνθέτες περιοχές από Sea Guide / overrides
  "Korinthia",
  "Sterea Ellada",
  "Achaia",
  "Aitoloakarnania",
  "Fokida",
  "Viotia",
  "Messinia",
  "Laconia",
  "Zakynthos",
] as const;

export type Region = typeof REGIONS[number];

export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  /** island/area optional, μπορεί να έρθει στο μέλλον */
  island?: string | null;
  /** Μπορεί να είναι μία από REGIONS ή σύνθετη (π.χ. Korinthia) */
  region: string;
  /** ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ: εδώ έχουμε και GR και EN aliases */
  aliases?: string[];
};

/* =========================
 *  Index helpers
 * =======================*/
type PortIndex = {
  all: Port[];
  byId: Record<string, Port>;
  byKey: Record<string, string>;
  options: string[];
};

export function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** match σε name + aliases (EN/EL) */
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  if (Array.isArray(p.aliases)) {
    return p.aliases.some((a) => normalize(a).includes(needle));
  }
  return false;
}

/** Υπολογίζει “auto region” από επιλεγμένα ports */
export function guessRegionFromPorts(
  ports: Array<Port | null | undefined>
): Region | "Multi" | null {
  const valid = ports.filter(Boolean) as Port[];
  const set = new Set(valid.map((p) => p.region));
  if (set.size === 0) return null;
  if (set.size === 1) return (valid[0].region as Region) ?? null;
  return "Multi";
}

export function getAutoRegionLabel(auto: Region | "Multi" | null) {
  if (!auto) return "Auto";
  if (auto === "Multi") return "Auto (multi-region)";
  return `${auto} (auto)`;
}

/** Dropdown φίλτρο: σε Auto εμφανίζει όλα, αλλιώς φιλτράρει πρώτα με region και μετά με query */
export function filterPortsForDropdown(
  all: Port[],
  mode: "Auto" | string,
  query: string
) {
  const base =
    mode === "Auto"
      ? all
      : all.filter(
          (p) => normalize(String(p.region)) === normalize(String(mode))
        );
  return base.filter((p) => portMatchesQuery(p, query));
}

function buildIndex(list: Port[]): PortIndex {
  const byId: Record<string, Port> = {};
  const byKey: Record<string, string> = {};
  const optionsSet = new Set<string>();

  for (const p of list) {
    byId[p.id] = p;
    byKey[normalize(p.name)] = p.id;
    optionsSet.add(p.name);

    for (const a of p.aliases ?? []) {
      const k = normalize(a);
      // αν το alias δείχνει ήδη σε άλλο id, κρατάμε το πρώτο (σταθερότητα)
      if (!byKey[k]) byKey[k] = p.id;
      optionsSet.add(a);
    }
  }

  const options = Array.from(optionsSet).sort((a, b) =>
    a.localeCompare(b, "en")
  );
  return { all: list, byId, byKey, options };
}

/* =========================
 *  Data loader
 *  (ΠΛΕΟΝ από /api/ports/merged -> canonical + PortFacts + aliases GR/EN)
 * =======================*/
async function fetchPorts(): Promise<Port[]> {
  const res = await fetch("/api/ports/merged", { cache: "no-store" });
  if (!res.ok) {
    // ρίχνουμε καθαρό error ώστε να το δει το UI
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Failed to load merged ports: ${res.status} ${res.statusText} ${txt}`
    );
  }
  const data = (await res.json()) as any[];

  // Αμυντικό φίλτρο/shape
  const list: Port[] = (data || [])
    .map((p: any) => ({
      id: String(p.id ?? p.name ?? "").trim().toLowerCase().replace(/\s+/g, "-"),
      name: String(p.name ?? "").trim(),
      lat: Number(p.lat),
      lon: Number(p.lon),
      category: (String(p.category ?? "harbor").toLowerCase() as PortCategory),
      region: String(p.region ?? "Greece"),
      aliases: Array.isArray(p.aliases)
        ? p.aliases
            .map((x) => String(x || "").trim())
            .filter(Boolean)
        : [],
    }))
    .filter(
      (p) =>
        p.name &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        p.category &&
        p.region
    );

  return list;
}

/* =========================
 *  React Hook
 * =======================*/
export function usePorts() {
  const [ports, setPorts] = useState<Port[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPorts()
      .then((list) => {
        if (!cancelled) setPorts(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const index = useMemo(() => (ports ? buildIndex(ports) : null), [ports]);

  /** Βρίσκει port με exact match πρώτα (name/aliases EN/EL), μετά με includes */
  function findPort(query: string): Port | null {
    if (!index || !query) return null;
    const key = normalize(query);
    const id = index.byKey[key];
    if (id && index.byId[id]) return index.byId[id];

    // fallback: first includes (πιάνει partials και GR/EN)
    const opt = index.options.find((o) => normalize(o).includes(key));
    if (opt) {
      const id2 = index.byKey[normalize(opt)];
      if (id2 && index.byId[id2]) return index.byId[id2];
    }
    return null;
  }

  return {
    ready: !!index && !error,
    error,
    ports: ports ?? [],
    options: index?.options ?? [],
    findPort,

    // helpers για UI
    byId: index?.byId ?? {},
    all: index?.all ?? [],
  };
}
