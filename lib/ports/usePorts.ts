"use client";

import { useEffect, useMemo, useState } from "react";
import type { Port } from "./ports";

type Filters = {
  area?: string;
  type?: string;
  vibe?: string;
};

export function usePorts(url = "/data/ports.ionian.master.json") {
  const [all, setAll] = useState<Port[]>([]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((d: Port[]) => {
        if (alive) setAll(Array.isArray(d) ? d : []);
      })
      .catch(() => setAll([]));
    return () => {
      alive = false;
    };
  }, [url]);

  const results = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return all.filter((p) => {
      const hay =
        `${p.name_en ?? ""} ${p.name_gr ?? ""} ${p.id ?? ""} ${p.area ?? ""} ${(p.guest?.vibe ?? []).join(" ")}`.toLowerCase();

      if (qlc && !hay.includes(qlc)) return false;
      if (filters.area && p.area !== filters.area) return false;
      if (filters.type && (p.crew?.type ?? "") !== filters.type) return false;
      if (filters.vibe && !(p.guest?.vibe ?? []).includes(filters.vibe)) return false;
      return true;
    });
  }, [all, q, filters]);

  return { all, results, q, setQ, filters, setFilters };
}
