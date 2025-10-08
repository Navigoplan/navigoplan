"use client";

export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";
export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  island?: string;
  region?: string;
  aliases?: string[];
};

type PortIndex = {
  all: Port[];
  byId: Record<string, Port>;
  byKey: Record<string, string>;
  options: string[];
};

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
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

  const options = Array.from(optionsSet).sort((a, b) => a.localeCompare(b, "en"));
  return { all: list, byId, byKey, options };
}

async function fetchPorts(): Promise<Port[]> {
  const res = await fetch("/data/ports.v1.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load ports.v1.json");
  return res.json();
}

import { useEffect, useMemo, useState } from "react";
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
  };
}
