// lib/portsMerged.ts
import fs from "fs";
import path from "path";

export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

export type CanonicalPort = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  category: PortCategory;
  aliases?: string[];
};

export type SeaGuidePort = {
  id: string;
  region?: string;
  category?: PortCategory | "bay";
  position?: { lat?: number; lon?: number };
  name?: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
};

export type MergedPort = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  category: PortCategory;
  aliases: string[];
  __source: "canonical" | "seaguide";
};

function normalize(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function readJSON<T = any>(rel: string): T | null {
  try {
    const full = path.join(process.cwd(), "public", "data", rel);
    const raw = fs.readFileSync(full, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function buildMergedPorts(): MergedPort[] {
  const canon = readJSON<CanonicalPort[]>("ports.v1.json") ?? [];
  const sg    = readJSON<SeaGuidePort[]>("sea_guide_vol3_master.json") ?? [];

  const merged: MergedPort[] = [];
  const byKey = new Map<string, number>(); // normalized name/alias -> idx

  // 1) canonical
  for (const p of canon) {
    if (!p?.name || typeof p.lat !== "number" || typeof p.lon !== "number") continue;
    const row: MergedPort = {
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      region: p.region || "Greece",
      category: p.category || "harbor",
      aliases: [...(p.aliases ?? [])],
      __source: "canonical",
    };
    const idx = merged.push(row) - 1;
    byKey.set(normalize(row.name), idx);
    for (const a of row.aliases) byKey.set(normalize(a), idx);
  }

  // 2) Sea-Guide
  for (const s of sg) {
    const en = s?.name?.en?.trim();
    const el = s?.name?.el?.trim();
    const label = en || el;
    const lat = s?.position?.lat;
    const lon = s?.position?.lon;
    if (!label || typeof lat !== "number" || typeof lon !== "number") continue;

    const aliases = [
      ...(s.aliases?.en ?? []),
      ...(s.aliases?.el ?? []),
      ...(en && el && normalize(en) !== normalize(el) ? [el] : []),
    ].filter(Boolean);

    const cat: PortCategory =
      (s.category === "bay" ? "anchorage" : (s.category as PortCategory)) || "harbor";

    // match σε ήδη υπάρχον canonical (με όνομα ή alias)
    const hit =
      byKey.get(normalize(label)) ??
      aliases.map(a => byKey.get(normalize(a))).find(i => i !== undefined);

    if (hit !== undefined) {
      const row = merged[hit];
      for (const a of aliases) {
        const k = normalize(a);
        if (!row.aliases.some(x => normalize(x) === k) && normalize(row.name) !== k) {
          row.aliases.push(a);
          byKey.set(k, hit);
        }
      }
      continue;
    }

    const row: MergedPort = {
      id: s.id || `sg-${normalize(label)}`,
      name: label,
      lat,
      lon,
      region: s.region || "Greece",
      category: cat,
      aliases,
      __source: "seaguide",
    };
    const idx = merged.push(row) - 1;
    byKey.set(normalize(row.name), idx);
    for (const a of row.aliases) byKey.set(normalize(a), idx);
  }

  return merged;
}
