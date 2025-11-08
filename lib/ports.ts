// lib/ports.ts
"use client";

import { useEffect, useMemo, useState } from "react";

export const REGIONS = ["Saronic","Cyclades","Ionian","Dodecanese","Sporades","NorthAegean","Crete"] as const;
export type Region = typeof REGIONS[number];
export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type Port = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: Region | string;
  aliases?: string[];
};

type MergedPortWire = {
  name: string;
  lat?: number; lon?: number;
  region?: string;
  aliases?: string[];
  __source: "canonical" | "facts" | "merged";
};

type PortIndex = { all: Port[]; byId: Record<string, Port>; byKey: Record<string, string>; options: string[] };

export function normalize(s: string) { return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); }
function keyOf(p: Port) { return normalize(p.name); }

function makeAliases(p: MergedPortWire): string[] {
  const out = new Set<string>();
  const push = (v?: string) => { const s = String(v || "").trim(); if (s) { out.add(s); out.add(s.normalize("NFD").replace(/\p{Diacritic}/gu,"")); } };
  // κύριο όνομα
  push(p.name);
  // predefined aliases (canonical dataset)
  for (const a of p.aliases ?? []) push(a);
  // απλά heuristics για ελληνικά/λατινικά (light)
  if (/ker[iìí]/i.test(p.name)) { out.add("Keri"); out.add("Κερί"); out.add("κερι"); }
  if (/vidav/i.test(p.name)) { out.add("Βιδαβί"); out.add("βιδαβι"); }
  if (/agios/i.test(p.name)) { out.add(p.name.replace(/Agios/,"Άγιος")); out.add(p.name.replace(/Agios/,"Αγιος")); }
  if (/harbour/i.test(p.name)) { out.add(p.name.replace(/Harbour/,"Λιμάνι")); out.add(p.name.replace(/Harbour/,"Λιμάνι")); }
  return Array.from(out);
}

async function fetchMerged(): Promise<MergedPortWire[]> {
  const r = await fetch("/api/ports/merged", { cache: "no-store" });
  if (!r.ok) throw new Error("merged api failed");
  const j = await r.json();
  return (j?.ports ?? []) as MergedPortWire[];
}

export function portMatchesQuery(p: Port, q: string) {
  if (!q) return true;
  const needle = normalize(q);
  if (normalize(p.name).includes(needle)) return true;
  for (const a of p.aliases ?? []) if (normalize(a).includes(needle)) return true;
  return false;
}

function buildIndex(list: Port[]): PortIndex {
  const byId: Record<string, Port> = {};
  const byKey: Record<string, string> = {};
  const optionsSet = new Set<string>();
  for (const p of list) {
    const id = p.id ?? `${normalize(p.name)}@${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
    byId[id] = p;
    byKey[keyOf(p)] = id;
    optionsSet.add(p.name);
    for (const a of p.aliases ?? []) optionsSet.add(a);
  }
  const options = Array.from(optionsSet).sort((a,b)=>a.localeCompare(b,"en"));
  return { all: list, byId, byKey, options };
}

async function fetchPorts(): Promise<Port[]> {
  const raw = await fetchMerged();
  const list: Port[] = raw
    .map((p: MergedPortWire) => {
      if (typeof p.lat !== "number" || typeof p.lon !== "number") return null;
      const aliases = makeAliases(p);
      // κατηγορία περίπου από το όνομα (fallback). Canonical έχει ήδη category, αλλά εδώ κρατάμε light.
      let category: PortCategory = "harbor";
      const nm = p.name.toLowerCase();
      if (nm.includes("marina")) category = "marina";
      else if (nm.includes("bay") || nm.includes("cove") || nm.includes("anchorage")) category = "anchorage";
      return {
        name: p.name,
        lat: p.lat!,
        lon: p.lon!,
        region: (p.region as any) || "Greece",
        category,
        aliases,
      } as Port;
    })
    .filter((x): x is Port => !!x && Number.isFinite(x.lat) && Number.isFinite(x.lon) && !!x.name);

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
      .then((list) => { if (!cancelled) setPorts(list); })
      .catch((e) => { if (!cancelled) setError(e as Error); });
    return () => { cancelled = true; };
  }, []);

  const index = useMemo(() => (ports ? buildIndex(ports) : null), [ports]);

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
