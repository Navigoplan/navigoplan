// lib/portsMerged.ts
// Ενοποίηση canonical ports (public/data/ports.v1.json) με PortFacts (lib/ports/portFacts.ts)
// Διαβάζει JSON στον server (fs) για να αποφευχθεί webpack JSON parse στο build.
import { promises as fs } from "fs";
import path from "path";
import { PORT_FACTS_DATA, type PortFact } from "./ports/portFacts";

// ----- Types -----
export type CanonicalPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  category?: string;
  region?: string;
  aliases?: string[];
  [k: string]: any;
};
export type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };
export type MergedPort = CanonicalPort & {
  vhf?: string;
  vhfVerified?: boolean;
  marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;
  exposure?: string;
  hazards?: Hazard[];
  notes?: string[];
  sources?: string[];
  __source: "canonical" | "facts" | "merged";
};

// ----- Helpers -----
function normalize(s: string) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function asArray<T>(v: T | T[] | undefined): T[] {
  return !v ? [] : Array.isArray(v) ? v : [v];
}
function uniqStrings(arr: string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const x of arr) {
    const k = String(x ?? "").trim();
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}
function uniqHazards(arr: Hazard[]) {
  const seen = new Set<string>(), out: Hazard[] = [];
  for (const h of arr) {
    const k = JSON.stringify({
      l: (h.label || "").trim(),
      n: (h.note || "").trim(),
      s: h.sev ?? null,
    });
    if (!seen.has(k)) {
      seen.add(k);
      out.push(h);
    }
  }
  return out;
}

async function readJsonSafe<T = unknown>(rel: string): Promise<T | null> {
  try {
    const file = path.join(process.cwd(), rel.replace(/^\/+/, ""));
    const buf = await fs.readFile(file, "utf8");
    const txt = (buf || "").trim();
    if (!txt) return null;
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

// ----- Γεωγραφικές διορθώσεις για facts-only (WGS84) -----
const GEO_OVERRIDES: Record<string, { lat?: number; lon?: number; region?: string }> = {
  // ενδεικτικά (όπως πριν) – συμπλήρωσε ελεύθερα
  "Corinth Harbour": { lat: 37.9387, lon: 22.9338, region: "Korinthia" },
  "Korinth Canal (Isthmus)": { lat: 37.9328, lon: 22.993, region: "Korinthia" },
  "Kiato Harbour": { lat: 38.0136, lon: 22.7485, region: "Korinthia" },
  "Vrachati Harbour": { lat: 37.9532, lon: 22.845, region: "Korinthia" },
  // … (κρατάω τα δικά σου από πριν — μπορείς να τα επεκτείνεις)
};

function applyGeoOverrides(m: MergedPort, factName: string) {
  const o = GEO_OVERRIDES[factName];
  if (!o) return;
  if (typeof o.lat === "number") m.lat = o.lat;
  if (typeof o.lon === "number") m.lon = o.lon;
  if (o.region) m.region = o.region;
}

// ----- Merge ενός port -----
function mergeOne(
  canon: CanonicalPort | undefined,
  factName: string,
  fact: (PortFact & { lat?: number; lon?: number; region?: string }) | undefined
): MergedPort {
  const F = fact ?? ({} as any);

  if (canon) {
    const m: MergedPort = {
      ...canon,
      region: canon.region ?? F.region,
      vhf: F.vhf ?? (canon as any).vhf,
      vhfVerified: F.vhfVerified ?? (canon as any).vhfVerified,
      marina: F.marina ?? (canon as any).marina,
      anchorage: F.anchorage ?? (canon as any).anchorage,
      shelter: F.shelter ?? (canon as any).shelter,
      exposure: F.exposure ?? (canon as any).exposure,
      hazards: uniqHazards([...(asArray((canon as any).hazards)), ...(asArray(F.hazards))]),
      notes: uniqStrings([...(asArray((canon as any).notes)), ...(asArray(F.notes))]),
      sources: uniqStrings([...(asArray((canon as any).sources)), ...(asArray(F.sources))]),
      __source: "merged",
    };
    if (typeof m.lat !== "number" && typeof F.lat === "number") m.lat = F.lat;
    if (typeof m.lon !== "number" && typeof F.lon === "number") m.lon = F.lon;
    applyGeoOverrides(m, factName);
    return m;
  }

  const m: MergedPort = {
    name: factName,
    region: F.region,
    lat: F.lat,
    lon: F.lon,
    vhf: F.vhf,
    vhfVerified: F.vhfVerified,
    marina: F.marina,
    anchorage: F.anchorage,
    shelter: F.shelter,
    exposure: F.exposure,
    hazards: asArray(F.hazards),
    notes: asArray(F.notes),
    sources: asArray(F.sources),
    __source: "facts",
  };
  applyGeoOverrides(m, factName);
  return m;
}

// ----- Κύρια συνάρτηση: διαβάζει JSON από public + ενώνει με facts -----
let _cache: MergedPort[] | null = null;

/**
 * Διαβάζει:
 *  - public/data/ports.v1.json (canonical)
 *  - public/data/sea_guide_vol3_master.json (αν υπάρχει, extra πηγές)
 * και τα ενώνει με τα PortFacts (lib/ports/portFacts.ts).
 */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  if (_cache) return _cache;

  // 1) canonical ports
  const canonicalArray =
    (await readJsonSafe<CanonicalPort[]>("public/data/ports.v1.json")) ??
    (await readJsonSafe<CanonicalPort[]>("public/data/ports.v.json")) ?? // fallback στο παλιό όνομα αν υπάρχει
    [];

  // 2) sea guide master (αν υπάρχει) — μπορεί να είναι λίστα αντικειμένων με δικό τους schema
  const seaGuideMaster =
    (await readJsonSafe<any[]>("public/data/sea_guide_vol3_master.json")) ?? [];

  // Indexes
  const canonByKey = new Map<string, CanonicalPort>();
  for (const p of canonicalArray) {
    const k = normalize(p.name);
    if (k && !canonByKey.has(k)) canonByKey.set(k, p);
  }

  const factsByKey = new Map<
    string,
    { key: string; fact: (PortFact & { lat?: number; lon?: number; region?: string }) }
  >();
  for (const name of Object.keys(PORT_FACTS_DATA)) {
    const k = normalize(name);
    factsByKey.set(k, { key: name, fact: PORT_FACTS_DATA[name] as any });
  }

  // Build from canonical (+ facts overlap)
  const out: MergedPort[] = [];
  for (const c of canonicalArray) {
    const k = normalize(c.name);
    if (factsByKey.has(k)) {
      const { key: factName, fact } = factsByKey.get(k)!;
      out.push(mergeOne(c, factName, fact));
    } else {
      out.push({ ...(c as any), __source: "canonical" });
    }
  }

  // Facts-only (χωρίς canonical)
  for (const [k, { key: factName, fact }] of factsByKey.entries()) {
    if (!canonByKey.has(k)) out.push(mergeOne(undefined, factName, fact));
  }

  // 3) Εμπλουτισμός από sea_guide_vol3_master.json (αν έχει δικά του entries/aliases)
  for (const rec of seaGuideMaster) {
    try {
      const nameEL = rec?.name?.el ? String(rec.name.el).trim() : "";
      const nameEN = rec?.name?.en ? String(rec.name.en).trim() : "";
      const primaryName = nameEN || nameEL || String(rec?.id || "").trim();
      if (!primaryName) continue;

      const lat = Number(rec?.position?.lat);
      const lon = Number(rec?.position?.lon);
      const region = rec?.region || rec?.area || "";

      const key = normalize(primaryName);
      const existed = out.find((p) => normalize(p.name) === key);

      const aliases: string[] = [
        ...(Array.isArray(rec?.aliases?.el) ? rec.aliases.el : []),
        ...(Array.isArray(rec?.aliases?.en) ? rec.aliases.en : []),
      ]
        .map((s: string) => String(s || "").trim())
        .filter(Boolean);

      if (existed) {
        // πρόσθεσε aliases & μην πειράξεις coords αν υπάρχουν ήδη
        existed.aliases = uniqStrings([...(existed.aliases ?? []), ...aliases]);
        if (Number.isFinite(lat) && !Number.isFinite(existed.lat as any))
          (existed as any).lat = lat;
        if (Number.isFinite(lon) && !Number.isFinite(existed.lon as any))
          (existed as any).lon = lon;
        if (!existed.region && region) existed.region = region;
        existed.__source = existed.__source === "canonical" ? "merged" : existed.__source;
      } else {
        // φτιάξε facts-only record από το sea_guide master
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          out.push({
            id: rec?.id || primaryName,
            name: primaryName,
            lat,
            lon,
            region,
            aliases,
            category: rec?.category || "harbor",
            __source: "facts",
          } as MergedPort);
        }
      }
    } catch {
      // ignore broken entry
    }
  }

  _cache = out;
  return out;
}
