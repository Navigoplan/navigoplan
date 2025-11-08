// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { buildMergedPorts } from "@/lib/portsMerged";

export const runtime = "nodejs";

/** -------- helpers -------- */
type Hazard = { label: string; note?: string; sev?: 0 | 1 | 2 };
type RawPort = {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
  region?: string;
  category?: "harbor" | "marina" | "anchorage" | "spot";
  aliases?: string[];
  hazards?: Hazard[];
  notes?: string[];
  sources?: string[];
};

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function uniq<T>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = JSON.stringify(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}
function uniqStr(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = normalize(x || "");
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}
function pickCategory(a?: string, b?: string) {
  // προτεραιότητα category: marina > harbor > anchorage > spot
  const order = (c?: string) =>
    c === "marina" ? 0 : c === "harbor" ? 1 : c === "anchorage" ? 2 : 3;
  return order(a) <= order(b) ? (a as any) : (b as any);
}
function canonId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF\s\-]/gi, "")
    .replace(/\s+/g, "-");
}

/** -------- loaders for extra datasets in /public/data -------- */
async function readJsonPublic<T = any>(rel: string): Promise<T | null> {
  try {
    // public/… αρχεία είναι διαθέσιμα στο filesystem του Next
    const abs = path.join(process.cwd(), "public", rel.replace(/^\/+/, ""));
    const raw = await fs.readFile(abs, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** map Ionian master (guest/crew schema) -> RawPort[] */
function mapIonianMasterToPorts(json: any): RawPort[] {
  const arr: any[] = Array.isArray(json) ? json : [];
  const out: RawPort[] = [];
  for (const item of arr) {
    const en = String(item?.name_en || "").trim();
    const el = String(item?.name_gr || "").trim();
    const name = en || el;
    if (!name) continue;

    // συντεταγμένες μπορεί να είναι στο crew.lat/lon (πολλά είναι null)
    const lat = Number(item?.crew?.lat);
    const lon = Number(item?.crew?.lon);

    const region = String(item?.region || "").trim() || undefined;

    const aliases: string[] = uniqStr(
      [
        name,
        en,
        el,
        ...(Array.isArray(item?.aliases) ? item.aliases : []),
        String(item?.area || "").trim(),
      ].filter(Boolean)
    );

    // Προσπάθεια να βγάλουμε category
    let category: RawPort["category"] = "harbor";
    const t = String(item?.crew?.type || "").toLowerCase();
    if (t.includes("marina")) category = "marina";
    else if (t.includes("harb")) category = "harbor";
    else if (t.includes("anchor")) category = "anchorage";

    out.push({
      id: item?.id ? String(item.id) : undefined,
      name,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      region,
      category,
      aliases,
    });
  }
  return out;
}

/** merge list B into A with dedupe on name/aliases (EL/EN) */
function mergeAll(sources: RawPort[][]): RawPort[] {
  const bucket = new Map<string, RawPort>(); // key = normalize(name)

  const tryPut = (p: RawPort) => {
    if (!p?.name) return;

    // primary key = normalized English/Greek name
    const keys = uniqStr([p.name, ...(p.aliases ?? [])]).map(normalize);
    const primaryKey = keys[0];
    if (!primaryKey) return;

    // find existing slot by any key
    let slotKey = primaryKey;
    for (const k of keys) {
      if (bucket.has(k)) {
        slotKey = k;
        break;
      }
    }

    const prev = bucket.get(slotKey);
    if (!prev) {
      // ensure minimal shape
      bucket.set(slotKey, {
        id: p.id ?? canonId(p.name),
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        region: p.region,
        category: p.category ?? "harbor",
        aliases: uniqStr([p.name, ...(p.aliases ?? [])]),
        hazards: p.hazards ?? [],
        notes: p.notes ?? [],
        sources: p.sources ?? [],
      });
      return;
    }

    // merge
    prev.name = prev.name || p.name;
    prev.region = prev.region || p.region;

    // category choose best
    prev.category = pickCategory(prev.category, p.category) || prev.category;

    // coords: κράτα ό,τι έχεις, αλλιώς πάρε από p
    if (!(Number.isFinite(prev.lat) && Number.isFinite(prev.lon))) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
        prev.lat = p.lat;
        prev.lon = p.lon;
      }
    }

    prev.aliases = uniqStr([...(prev.aliases || []), p.name, ...(p.aliases || [])]);
    prev.hazards = uniq([...(prev.hazards || []), ...(p.hazards || [])]);
    prev.notes = uniqStr([...(prev.notes || []), ...(p.notes || [])]);
    prev.sources = uniqStr([...(prev.sources || []), ...(p.sources || [])]);

    // re-store
    bucket.set(slotKey, prev);

    // map any other key to the same reference for future merges
    for (const k of keys) {
      if (!bucket.has(k)) bucket.set(k, prev);
    }
  };

  for (const list of sources) {
    for (const p of list) tryPut(p);
  }

  // produce unique objects (by pointer)
  const unique = new Set<RawPort>(bucket.values());
  // only with valid coords
  return Array.from(unique).filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
  );
}

/** map merged result (returned to client) */
function toClientShape(p: RawPort) {
  return {
    id: p.id ?? canonId(p.name),
    name: p.name,
    lat: p.lat!,
    lon: p.lon!,
    region: p.region || "Greece",
    category: (p.category || "harbor") as "harbor" | "marina" | "anchorage" | "spot",
    aliases: uniqStr([p.name, ...(p.aliases || [])]),
  };
}

/** -------- handler -------- */
export async function GET() {
  try {
    // 1) lib/portsMerged -> canonical + portFacts (+ GEO overrides & facts-only)
    const libMerged = buildMergedPorts().map<RawPort>((m) => ({
      id: (m as any).id ?? undefined,
      name: String(m.name),
      lat: Number(m.lat),
      lon: Number(m.lon),
      region: (m as any).region ?? "Greece",
      category: ((m as any).category || "harbor") as any,
      aliases: uniqStr([
        String(m.name),
        // αν στο canonical υπήρχαν aliases θα έχουν μπει ήδη στο lib, αλλά κρατάμε merge ασφαλείας
        ...(((m as any).aliases as string[]) || []),
      ]),
      hazards: ((m as any).hazards as Hazard[]) || [],
      notes: ((m as any).notes as string[]) || [],
      sources: ((m as any).sources as string[]) || [],
    }));

    // 2) extra: /public/data/ports.ionian.master.json
    const ionianMaster = await readJsonPublic<any>("/data/ports.ionian.master.json");
    const ionianPorts = ionianMaster ? mapIonianMasterToPorts(ionianMaster) : [];

    // 3) (optional) /public/data/port-facts.v1.json -> μόνο αν αρχίσεις να βάζεις coords εκεί
    const factsJson = await readJsonPublic<any>("/data/port-facts.v1.json");
    const factsPorts: RawPort[] = [];
    if (factsJson && Array.isArray(factsJson.facts)) {
      for (const f of factsJson.facts) {
        const en = String(f?.names?.en || "").trim();
        const el = String(f?.names?.el || "").trim();
        const name = en || el;
        const lat = Number(f?.lat);
        const lon = Number(f?.lon);
        if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const aliases = uniqStr([
          name,
          en,
          el,
          ...(Array.isArray(f?.names?.aliases) ? f.names.aliases : []),
        ]);
        factsPorts.push({
          name,
          lat,
          lon,
          region: undefined,
          category: "harbor",
          aliases,
        });
      }
    }

    // 4) Merge όλων των παραπάνω
    const merged = mergeAll([libMerged, ionianPorts, factsPorts])
      .map(toClientShape)
      // Sort: merged/canonical πρώτα, ύστερα αλφαβητικά
      .sort((a, b) => a.name.localeCompare(b.name, "en"));

    return NextResponse.json(merged, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "failed to merge ports" },
      { status: 500 }
    );
  }
}
