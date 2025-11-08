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
  island?: string;
  region: Region | string;
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

/** Αναζήτηση σε name + aliases */
export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
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
  if (set.size === 1) return valid[0].region as Region;
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
  const base = mode === "Auto" ? all : all.filter((p) => String(p.region) === mode);
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
      byKey[normalize(a)] = p.id;
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
 *  1) Προσπαθεί από /api/ports/merged (canonical+facts)
 *  2) Fallback σε /data/ports.v1.json
 * =======================*/
async function fetchPorts(): Promise<Port[]> {
  // 1) merged API
  try {
    const res = await fetch("/api/ports/merged", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as any[];
      return shapeAndFilter(data);
    }
  } catch {
    // ignore -> fallback
  }

  // 2) fallback static JSON
  const res = await fetch("/data/ports.v1.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load ports dataset");
  const data = (await res.json()) as any[];
  return shapeAndFilter(data);
}

/** Στρογγυλοποίηση/shape & ασφαλιστικά φίλτρα */
function shapeAndFilter(data: any[]): Port[] {
  const list: Port[] = (data || [])
    .map((p: any) => {
      const id = String(p.id ?? p.name ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
      const name = String(p.name ?? "").trim();
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      const category = (String(p.category ?? "harbor").toLowerCase() as PortCategory) || "harbor";
      const region = String(p.region ?? "Greece");
      const aliases: string[] = Array.isArray(p.aliases)
        ? (p.aliases as any[]).map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      return {
        id,
        name,
        lat,
        lon,
        category,
        region,
        aliases,
      } as Port;
    })
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

  /** Βρίσκει port με exact match πρώτα (name/aliases), μετά με includes */
  function findPort(query: string): Port | null {
    if (!index || !query) return null;
    const key = normalize(query);
    const id = index.byKey[key];
    if (id && index.byId[id]) return index.byId[id];

    const opt = index.options.find((o) => normalize(o).includes(key));
    if (opt) {
      const id2 = index.byKey[normalize(opt)];
      if (id2 && index.byId[id2]) return index.byId[id2];
    }
    return null;
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
