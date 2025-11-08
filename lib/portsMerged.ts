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
  region: string;          // αφήνουμε string, το UI θα το χαρτογραφήσει σε RegionKey
  aliases: string[];       // ΠΑΝΤΑ string[]
};

// canonical dataset (ports.v1.json)
import basePorts from "@/public/data/ports.v1.json";

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
  if (/[0-9.;:!?]/.test(s)) return false;        // "Βάθη 2–4 m.", "Είσοδος…"
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
  // basePorts είναι το canonical JSON (public/data/ports.v1.json)
  const baseArr: any[] = Array.isArray(basePorts) ? (basePorts as any[]) : [];

  const out: MergedPort[] = baseArr
    .map((p: any): MergedPort => {
      const name = sanitizeName(String(p.name ?? "").trim());
      const id = String(p.id ?? name).trim();

      // aliases: μόνο από p.aliases, καθαρισμένα & name-like
      const src: string[] = Array.isArray(p.aliases)
        ? (p.aliases as any[]).map(x => String(x ?? ""))
        : [];

      const aliases: string[] = Array.from(
        new Set<string>(
          src
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
    // drop όσα δεν έχουν βασικά πεδία
    .filter(r =>
      r.name &&
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lon) &&
      String(r.region || "").trim().length > 0
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return out;
}
