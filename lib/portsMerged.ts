// lib/portsMerged.ts
// Ενοποίηση ports.v1.json + sea_guide_vol3_master.json
// Συνδυάζει canonical dataset + Sea Guide Vol.3 για επιπλέον λιμάνια

import fs from "fs";
import path from "path";

/* ========= Types ========= */
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
  category?: PortCategory;
  position: { lat: number; lon: number };
  name: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
};

export type MergedPort = CanonicalPort & {
  __source?: "canonical" | "seaguide";
};

/* ========= Helper ========= */
function normalize(s: string) {
  return String(s || "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/* ========= Loader ========= */
function loadJSON<T = any>(relPath: string): T {
  const full = path.join(process.cwd(), "public", "data", relPath);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw) as T;
}

/* ========= Build merged list ========= */
export function buildMergedPorts(): MergedPort[] {
  const canonical: CanonicalPort[] = loadJSON("ports.v1.json");
  let seaGuide: SeaGuidePort[] = [];

  try {
    seaGuide = loadJSON("sea_guide_vol3_master.json");
  } catch (err) {
    console.warn("⚠️ SeaGuide file missing or unreadable:", err);
  }

  const merged: MergedPort[] = [];

  // === 1️⃣ Canonical ports ===
  for (const p of canonical) {
    merged.push({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      region: p.region,
      category: p.category,
      aliases: p.aliases ?? [],
      __source: "canonical",
    });
  }

  // === 2️⃣ SeaGuide ports (extra or enrich) ===
  for (const s of seaGuide) {
    const nameEn = s.name?.en || s.name?.el || "";
    if (!nameEn) continue;

    const match = merged.find(
      (p) =>
        normalize(p.name) === normalize(nameEn) ||
        (p.aliases ?? []).some((a) => normalize(a) === normalize(nameEn))
    );

    const aliases: string[] = [
      ...(s.aliases?.en ?? []),
      ...(s.aliases?.el ?? []),
    ].filter(Boolean);

    if (match) {
      // Αν υπάρχει ήδη, εμπλουτίζουμε aliases
      const added = aliases.filter(
        (a) => !(match.aliases ?? []).some((b) => normalize(a) === normalize(b))
      );
      if (added.length) match.aliases = [...(match.aliases ?? []), ...added];
    } else {
      merged.push({
        id: s.id,
        name: nameEn,
        lat: s.position?.lat ?? 0,
        lon: s.position?.lon ?? 0,
        region: s.region ?? "Ionian",
        category: s.category ?? "harbor",
        aliases,
        __source: "seaguide",
      });
    }
  }

  return merged;
}
