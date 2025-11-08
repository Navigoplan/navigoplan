// lib/portsMerged.ts
// Ενοποίηση canonical (/public/data/ports.v1.json),
// Sea Guide master (/public/data/sea_guide_vol3_master.json),
// και (προαιρετικά) port-facts (/public/data/port-facts.v1.json).
//
// Σημαντικά:
// - Χωρίς επίμονη in-memory cache ώστε κάθε κλήση να βλέπει φρέσκα αρχεία.
// - Για SeaGuide records με region "Peloponnisos"/"StereEllada" γίνεται geo-based mapping σε
//   μία από τις 7 canonical regions (Saronic, Ionian, ...), + subregionTags για φιλτράρισμα.

import { promises as fs } from "fs";
import path from "path";

export type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };

export type CanonicalPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  notes?: string[];
  sources?: string[];
  subregionTags?: string[];
};

export type SeaGuideRecord = {
  id: string;
  region?: string; // π.χ. "Peloponnisos", "StereEllada", "Ionian" ...
  category?: "harbor" | "marina" | "anchorage" | "spot" | "bay";
  position?: { lat?: number; lon?: number };
  name?: { el?: string; en?: string };
  aliases?: { el?: string[]; en?: string[] };
  // κρατάμε μόνο ό,τι χρειαζόμαστε για merge προς dropdown/coords
};

export type PortFact = {
  vhf?: string;
  vhfVerified?: boolean;
  marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;
  exposure?: string;
  hazards?: Hazard[];
  notes?: string[];
  sources?: string[];
};

export type MergedPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  region?: string; // μία από τις 7 όταν γίνεται mapping
  category?: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  subregionTags?: string[];
  // ops fields (reserved)
  vhf?: string; vhfVerified?: boolean; marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string; exposure?: string; hazards?: Hazard[]; notes?: string[]; sources?: string[];
  __source: "canonical" | "facts" | "seaguide" | "merged";
};

const DATA_DIR = path.join(process.cwd(), "public", "data");
const FILE_CANON = "ports.v1.json";
const FILE_FACTS = "port-facts.v1.json";
const FILE_SG    = "sea_guide_vol3_master.json";

function normalize(s: string) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function uniqStrings(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr ?? []) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    const k = normalize(t);
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}
function uniqHazards(arr: Hazard[]) {
  const out: Hazard[] = [];
  const seen = new Set<string>();
  for (const h of arr ?? []) {
    const k = JSON.stringify({ l: (h.label||"").trim(), n: (h.note||"").trim(), s: h.sev ?? null });
    if (!seen.has(k)) { seen.add(k); out.push(h); }
  }
  return out;
}
async function readJSON<T = any>(fileName: string): Promise<T | null> {
  try {
    const full = path.join(DATA_DIR, fileName);
    const buf = await fs.readFile(full, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

/** Geo-based mapping των SeaGuide περιοχών σε canonical 7 regions */
function mapRegionForUI(rawRegion: string | undefined, lat?: number, lon?: number): { region?: string; tags: string[] } {
  const tags: string[] = [];

  // Helper: σε ποια “μεγάλη” γεω-κουρτίνα πέφτει το σημείο;
  const isBetween = (v: number, a: number, b: number) => v >= Math.min(a, b) && v <= Math.max(a, b);

  // Default: αν ήδη είναι μία από τις 7, κράτα την
  const canonical = ["Saronic","Cyclades","Ionian","Dodecanese","Sporades","NorthAegean","Crete"];
  if (rawRegion && canonical.includes(rawRegion)) {
    return { region: rawRegion, tags };
  }

  // Χρήσιμα tags από SeaGuide
  if (rawRegion) {
    const t = rawRegion.replace(/\s+/g, "");
    tags.push(t); // π.χ. Peloponnisos, StereEllada
  }

  // Χοντρική γεω-χαρτογράφηση για Κορινθιακό/Πατραϊκό:
  // - Κορινθιακός/Πατραϊκός: lon ~ [20.7, 23.2], lat ~ [37.7, 38.6]
  //   Ανατολικό τμήμα (lon >= 22.4) → Saronic, Δυτικό (lon < 22.4) → Ionian
  if (typeof lat === "number" && typeof lon === "number") {
    if (isBetween(lon, 20.7, 23.2) && isBetween(lat, 37.6, 38.7)) {
      tags.push("CorinthianGulf");
      return { region: lon < 22.4 ? "Ionian" : "Saronic", tags };
    }
    // Πελοπόννησος ΝΔ/Μεσσηνία/Μάνη (lon 21–23, lat 36.3–37.4) → Saronic ή Ionian;
    // Πρακτικά ταξιδιωτικά τα εντάσσουμε σε **Ionian** (δυτική/νότια ακτή) ή **Saronic** αν είναι Αργολίδα.
    if (isBetween(lat, 36.2, 37.6) && isBetween(lon, 21.0, 23.3)) {
      // Χοντρικά: αν lon <= 22.2 → Ionian (Μεσσηνία/Μάνη), αλλιώς Saronic (Αργολίδα/Ανατ. Λακωνία)
      return { region: lon <= 22.2 ? "Ionian" : "Saronic", tags };
    }
    // Στερεά Ελλάδα βόρεια Κορινθιακού → Ionian
    if (isBetween(lat, 38.0, 38.8) && isBetween(lon, 21.0, 23.2)) {
      return { region: "Ionian", tags };
    }
  }

  // Fallback: αν δεν μπόρεσα να μαντέψω, άσε το όπως είναι (θα περάσει σαν "Greece" αργότερα).
  return { region: undefined, tags };
}

/** Μετατροπή SeaGuide record σε merged εγγραφή */
function fromSeaGuide(r: SeaGuideRecord): MergedPort | null {
  const nameEn = r.name?.en?.trim();
  const nameEl = r.name?.el?.trim();
  const baseName = nameEn || nameEl;
  if (!baseName) return null;

  const lat = r.position?.lat;
  const lon = r.position?.lon;

  const tags: string[] = [];
  const mapped = mapRegionForUI(r.region, lat, lon);
  const region = mapped.region;
  tags.push(...mapped.tags);

  const aliases = uniqStrings([
    ...(r.aliases?.en ?? []),
    ...(r.aliases?.el ?? []),
    ...(nameEn && nameEl && normalize(nameEn) !== normalize(nameEl) ? [nameEl] : []),
  ]);

  const category =
    r.category === "bay" ? "anchorage" :
    (r.category as MergedPort["category"]) ?? "harbor";

  return {
    id: r.id,
    name: baseName,
    lat,
    lon,
    region,
    category,
    aliases,
    subregionTags: tags.length ? Array.from(new Set(tags)) : undefined,
    __source: "seaguide",
  };
}

/** Κύρια συνάρτηση: χτίζει το merged array για το API */
export async function buildMergedPorts(): Promise<MergedPort[]> {
  // 1) Canonical
  const canonRaw = await readJSON<CanonicalPort[] | { list: CanonicalPort[] }>(FILE_CANON);
  const CANON: CanonicalPort[] = Array.isArray(canonRaw) ? canonRaw : (canonRaw?.list ?? []);

  // 2) Facts (optional). Προς το παρόν δεν τα ενσωματώνουμε στα UI fields.
  const factsRaw = await readJSON<{ version?: string; facts?: any[] }>(FILE_FACTS);

  // 3) Sea Guide (optional)
  const sgRaw = await readJSON<SeaGuideRecord[]>(FILE_SG);

  const out: MergedPort[] = [];

  // Canonical → βάση
  for (const c of CANON ?? []) {
    if (!c?.name) continue;
    out.push({
      id: c.id,
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      region: c.region,
      category: c.category,
      aliases: asArray(c.aliases),
      subregionTags: c.subregionTags ? Array.from(new Set(c.subregionTags)) : undefined,
      notes: asArray(c.notes),
      sources: asArray(c.sources),
      __source: "canonical",
    });
  }

  // SeaGuide → merge αν υπάρχει ίδιο όνομα (ή alias), αλλιώς νέα εγγραφή
  if (Array.isArray(sgRaw)) {
    for (const rec of sgRaw) {
      const m = fromSeaGuide(rec);
      if (!m) continue;

      // try match by name or any alias (normalized)
      const keyName = normalize(m.name);
      let idx = out.findIndex(p =>
        normalize(p.name) === keyName ||
        (p.aliases ?? []).some(a => normalize(a) === keyName)
      );

      if (idx >= 0) {
        const base = out[idx];
        out[idx] = {
          ...base,
          region: base.region ?? m.region,
          category: base.category ?? m.category,
          lat: typeof base.lat === "number" ? base.lat : m.lat,
          lon: typeof base.lon === "number" ? base.lon : m.lon,
          aliases: uniqStrings([...(base.aliases ?? []), ...(m.aliases ?? [])]),
          subregionTags: uniqStrings([...(base.subregionTags ?? []), ...(m.subregionTags ?? [])]),
          __source: "merged",
        };
      } else {
        // Αν δεν υπάρχει τίποτα να κάνει merge, πρόσθεσέ το ως νέο port
        out.push(m);
      }
    }
  }

  // (optional) εμπλουτισμός aliases από port-facts json (αν έχει structure .facts[].names)
  if (factsRaw?.facts?.length) {
    for (const f of factsRaw.facts) {
      const label = f?.names?.en || f?.names?.el || f?.id || null;
      if (!label) continue;
      const k = normalize(String(label));
      const idx = out.findIndex(p =>
        normalize(p.name) === k ||
        (p.aliases ?? []).some(a => normalize(a) === k)
      );
      if (idx >= 0) {
        const aliases = uniqStrings([
          ...(out[idx].aliases ?? []),
          ...(Array.isArray(f?.names?.aliases) ? f.names.aliases : []),
          f?.names?.en ?? "",
          f?.names?.el ?? "",
        ]);
        out[idx] = { ...out[idx], aliases, __source: out[idx].__source === "canonical" ? "merged" : out[idx].__source };
      }
    }
  }

  // Cleanup/Defaults: αν δεν βρέθηκε region για κάποια SG εγγραφή, δώσε "Greece" για να περάσει από το API filter
  const cleaned = out.map(p => {
    if (!p.region) {
      // έσχατο fallback
      p.region = "Greece";
    }
    return p;
  });

  // μόνο όσα έχουν name+region (coords μπορεί να λείπουν, αλλά στο API θα φιλτραριστούν αν δεν έχουν)
  return cleaned.filter(p => p?.name && p?.region);
}
