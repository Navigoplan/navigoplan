"use client";
import { useEffect, useMemo, useState } from "react";

export interface PortEntry {
  id: string;
  region: string;
  area: string;
  name_gr: string;
  name_en: string;
  guest: {
    vibe?: string[];
    luxury_score?: number;
    highlight_photo?: string;
    experience_notes?: string;
    recommended_spots?: string[];
  };
  crew: {
    type: "harbour"|"marina"|"anchorage"|"pier"|"fuel";
    lat: number|null; lon: number|null; datum: "WGS84";
    min_depth_m?: number; max_depth_m?: number; shelter_from?: string[]; exposed_to?: string[];
    mooring?: string; holding?: string; vhf?: string; dangers?: string; approach_notes?: string;
    facilities?: Record<string, boolean>;
  };
  source?: string;
}

export function usePorts(url = "/data/ports.ionian.master.json") {
  const [all, setAll] = useState<PortEntry[]>([]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<{ area?: string; type?: string; vibe?: string }>({});

  useEffect(() => {
    let stop = false;
    (async () => {
      const res = await fetch(url, { cache: "force-cache" });
      const json = (await res.json()) as PortEntry[];
      if (!stop) setAll(json);
    })();
    return () => { stop = true; };
  }, [url]);

  const results = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return all.filter(p => {
      if (qlc) {
        const hay = `${p.name_en} ${p.name_gr} ${p.id} ${p.area} ${(p.guest.vibe||[]).join(" ")}`.toLowerCase();
        if (!hay.includes(qlc)) return false;
      }
      if (filters.area && p.area !== filters.area) return false;
      if (filters.type && p.crew.type !== filters.type) return false;
      if (filters.vibe && !(p.guest.vibe||[]).includes(filters.vibe)) return false;
      return true;
    });
  }, [all, q, filters]);

  return { all, results, q, setQ, filters, setFilters };
}
