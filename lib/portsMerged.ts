// lib/portsMerged.ts
"use client";

/* ========= Types ========= */
export type PortCategory = "harbor" | "marina" | "anchorage" | "spot";
export type RegionKey =
  | "Saronic" | "Cyclades" | "Ionian" | "Dodecanese"
  | "Sporades" | "NorthAegean" | "Crete";

export type MergedPort = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: PortCategory;
  region: string;        // θα χαρτογραφηθεί downstream σε RegionKey
  aliases: string[];     // ΠΑΝΤΑ καθαρό string[]
};

// canonical dataset (ports.v1.json)
import basePorts from "@/public/data/ports.v1.json";
// facts μόνο για ονόματα/aliases (ΔΕΝ περνάμε notes/hazards)
import * as PortFactsMod from "@/lib/ports/portFacts";

/* ========= Helpers ========= */
function normalize(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const BANNED_IN_PARENS = [
  "traffic","change-over","change over","crowd","crowded","meltemi","swell",
  "fuel","water","power","notes",
  "πολύ","παρασκευή","σάββατο","άνεμο","άνεμοι","κύμα","ρηχ","βράχ","τηλέφ","σημείωση"
];

function isCleanParen(inner: string) {
  const s = (inner || "").trim().toLowerCase();
  if (!s) return false;
  if (BANNED_IN_PARENS.some(w => s.includes(w))) return false;
  if (/[0-9!:;.,/\\#@%&*=_+<>?|]/.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (s.length > 28) return false;
  return true;
}

function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const parens = [...s.matchAll(/\(([^)]+)\)/g)];
  if (parens.length === 0) return s;

  const clean = parens.find(m => isCleanParen(m[1]));
  if (!clean) return s.replace(/\s*\([^)]+\)/g, "").trim();

  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  const base = s.replace(/\s+/g, " ");
  return `${base} (${clean[1]})`;
}

/** true αν το string μοιάζει με ΟΝΟΜΑ (και όχι πρόταση/note) */
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const badStarts = [
    "Άφιξη","Αφιξη","Είσοδος","Έξοδος","Exodos","Βάθη","Καλύτερα",
    "Επικοινωνία","Προσοχή","Σημείωση","Arrival","Entrance","Depth","Better","Notes","Call"
  ];
  const low = s.toLowerCase();
  if (badStarts.some(w => low.startsWith(w.toLowerCase()))) return false;
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s)) return false;
  return true;
}

function guessCategoryFromName(name: string): PortCategory {
  const n = name.toLowerCase();
  if (/\bmarina\b/.test(n)) return "marina";
  if (/\b(cove|bay|anchorage)\b/.test(n) || /όρμος|κολπ/.test(n)) return "anchorage";
  if (/\bcanal\b/.test(n)) return "spot";
  return "harbor";
}

/* ========= Main builder ========= */
export function buildMergedPorts(): MergedPort[] {
  const baseArr: any[] = Array.isArray(basePorts) ? (basePorts as any[]) : [];

  // === 1) Χτίζουμε index από το base για γρήγορο ταίριασμα ===
  type BaseRec = { idx: number; id: string; name: string; aliases: string[] };
  const baseIndex = new Map<string, BaseRec>(); // key -> base rec
  const addKey = (k: string, rec: BaseRec) => { if (!baseIndex.has(k)) baseIndex.set(k, rec); };

  baseArr.forEach((p, idx) => {
    const name = String(p.name ?? "").trim();
    const rec: BaseRec = { idx, id: String(p.id ?? name), name, aliases: Array.isArray(p.aliases) ? p.aliases.map((x: any)=>String(x??"")) : [] };
    addKey(normalize(name), rec);
    rec.aliases.forEach(a => addKey(normalize(String(a)), rec));
  });

  // === 2) Μαζεύουμε ΟΝΟΜΑΤΑ από portFacts ως aliases στόχου ===
  const FACTS: Record<string, any> =
    (PortFactsMod as any).default ?? (PortFactsMod as any).FACTS ?? (PortFactsMod as any);

  const aliasesByBaseIdx = new Map<number, Set<string>>();

  if (FACTS && typeof FACTS === "object") {
    for (const rawKey of Object.keys(FACTS)) {
      const factKey = sanitizeName(String(rawKey));
      if (!isNameLike(factKey)) continue;

      // αν υπάρχει “(Island)” → προσπάθησε match με το περιεχόμενο
      const m = factKey.match(/\(([^)]+)\)/);
      let matched: BaseRec | undefined;
      if (m && isCleanParen(m[1])) {
        const inner = m[1].trim();
        matched = baseIndex.get(normalize(inner));
      }
      // αν δεν βρέθηκε, προσπάθησε exact με όλο το κλειδί
      if (!matched) {
        matched = baseIndex.get(normalize(factKey));
      }
      if (!matched) continue; // δεν κάνουμε facts-only ports χωρίς coords

      if (!aliasesByBaseIdx.has(matched.idx)) aliasesByBaseIdx.set(matched.idx, new Set());
      aliasesByBaseIdx.get(matched.idx)!.add(factKey);
    }
  }

  // === 3) Φτιάχνουμε το τελικό merged out (βάση + εμπλουτισμένα aliases) ===
  const out: MergedPort[] = baseArr
    .map((p: any, i: number): MergedPort => {
      const name = sanitizeName(String(p.name ?? "").trim());
      const id = String(p.id ?? name).trim();

      const baseAliases: string[] = Array.isArray(p.aliases)
        ? p.aliases.map((x: any) => String(x ?? ""))
        : [];

      const extraAliases = Array.from(aliasesByBaseIdx.get(i) ?? new Set<string>());

      const aliases: string[] = Array.from(
        new Set<string>(
          [...baseAliases, ...extraAliases]
            .map(x => sanitizeName(x))
            .filter(x => x && isNameLike(x))
        )
      );

      const lat = typeof p.lat === "number" ? p.lat : NaN;
      const lon = typeof p.lon === "number" ? p.lon : NaN;

      const category: PortCategory =
        (p.category as PortCategory) ?? guessCategoryFromName(name);

      const region: string = String(p.region ?? "").trim() || "Saronic";

      return { id, name, lat, lon, category, region, aliases };
    })
    .filter(r =>
      r.name &&
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lon) &&
      String(r.region || "").trim().length > 0
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return out;
}
