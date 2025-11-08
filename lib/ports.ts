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
  "Greece",
] as const;

export type Region = (typeof REGIONS)[number];

export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: Region;
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
 * =======================*/
type ApiMergedPort = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region?: string;
  category?: string;
  aliases?: string[];
};

async function fetchPorts(): Promise<Port[]> {
  // ΕΝΩΜΕΝΑ από όλες τις πηγές μας
  const res = await fetch("/api/ports/merged", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load /api/ports/merged");
  const data = (await res.json()) as ApiMergedPort[];

  // Αμυντικό φίλτρο/shape
  const list: Port[] = (Array.isArray(data) ? data : [])
    .map((p: ApiMergedPort): Port => {
      const rawAliases: string[] = Array.isArray(p.aliases)
        ? (p.aliases as string[]).map((x: string) => String(x || "").trim()).filter(Boolean)
        : [];

      // region to known enum (fallback "Greece")
      const regionClean = String(p.region ?? "Greece").trim();
      const regionEnum = (REGIONS.includes(regionClean as Region)
        ? (regionClean as Region)
        : "Greece") as Region;

      // category to enum fallback
      const cat = String(p.category ?? "harbor").toLowerCase();
      const categoryEnum: PortCategory =
        cat === "marina"
          ? "marina"
          : cat === "anchorage"
          ? "anchorage"
          : cat === "spot"
          ? "spot"
          : "harbor";

      return {
        id: String(p.id || p.name || "").trim().toLowerCase().replace(/\s+/g, "-"),
        name: String(p.name ?? "").trim(),
        lat: Number(p.lat),
        lon: Number(p.lon),
        category: categoryEnum,
        region: regionEnum,
        aliases: rawAliases,
      };
    })
    .filter((p) => {
      return (
        p.name &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        !!p.category &&
        !!p.region
      );
    });

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

    // Χρήσιμα έξτρα για UI:
    byId: index?.byId ?? {},
    all: index?.all ?? [],
  };
}
