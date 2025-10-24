// app/lib/ports/usePorts.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Port } from "./ports";

export type Filters = {
  area?: string;
  type?: string;   // crew.type
  vibe?: string;   // guest.vibe includes
};

type UsePortsResult = {
  all: Port[];
  results: Port[];
  q: string;
  setQ: (s: string) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
};

async function loadPorts(): Promise<Port[]> {
  // χρησιμοποίησε ΟΠΟΙΟ από τα δύο έχεις διαθέσιμο στο /public/data
  // const url = "/data/ports.v1.json";
  const url = "/data/ports.ionian.master.json";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return (await res.json()) as Port[];
}

export function usePorts(): UsePortsResult {
  const [all, setAll] = useState<Port[]>([]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    let dead = false;
    loadPorts()
      .then((data) => {
        if (!dead) setAll(data);
      })
      .catch((err) => {
        console.error(err);
        if (!dead) setAll([]);
      });
    return () => {
      dead = true;
    };
  }, []);

  const results = useMemo(() => {
    const qlc = q.trim().toLowerCase();

    return all.filter((p) => {
      // text search: name_en, name_gr, id, area, vibe
      const hay = `${p.name_en ?? ""} ${p.name_gr ?? ""} ${p.id ?? ""} ${p.area ?? ""} ${(p.guest?.vibe ?? []).join(" ")}`.toLowerCase();
      if (qlc && !hay.includes(qlc)) return false;

      if (filters.area && p.area !== filters.area) return false;
      if (filters.type && (p.crew?.type ?? "") !== filters.type) return false;
      if (filters.vibe && !((p.guest?.vibe ?? []).includes(filters.vibe))) return false;

      return true;
    });
  }, [all, q, filters]);

  return { all, results, q, setQ, filters, setFilters };
}
