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
  region: string;     // UI θα το χαρτογραφήσει downstream σε RegionKey
  aliases: string[];  // καθαρά ονόματα, όχι notes
};

// ✅ canonical dataset (relative path για Vercel)
import basePorts from "../public/data/ports.v1.json";

// ✅ robust import facts (relative, χωρίς aliases)
import * as PF_NS from "./ports/portFacts";
const FACTS: Record<string, any> =
  (PF_NS as any).PORT_FACTS_DATA ??
  (PF_NS as any).FACTS ??
  (PF_NS as any).default ??
  {};

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
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.split(/\s+/).length > 3) return false;
  return s.length <= 28;
}

function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const matches = s.match(/\(([^)]+)\)/g);
  if (!matches) return s;
  const clean = matches.map(t => t.slice(1, -1)).find(isCleanParen);
  if (!clean) return s.replace(/\s*\([^)]+\)/g, "").trim();
  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  return `${s} (${clean})`;
}

function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).length > 6) return false;
  const bad = ["άφιξη","αφιξη","είσοδος","εξοδος","έξοδος","βάθη","καλύτερα",
               "επικοινωνία","σημείωση","arrival","entrance","depth","better","notes","call"];
  if (bad.some(w => s.toLowerCase().startsWith(w))) return false;
  return /^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s);
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

  // 1) index για match
  type BaseRec = { idx: number; id: string; name: string; aliases: string[] };
  const idxMap = new Map<string, BaseRec>();
  const addKey = (k: string, rec: BaseRec) => { if (!idxMap.has(k)) idxMap.set(k, rec); };

  baseArr.forEach((p, i) => {
    const name = String(p.name ?? "").trim();
    const rec: BaseRec = {
      idx: i,
      id: String(p.id ?? name),
      name,
      aliases: Array.isArray(p.aliases) ? p.aliases.map((x:any)=>String(x??"")) : []
    };
    addKey(normalize(name), rec);
    rec.aliases.forEach(a => addKey(normalize(String(a)), rec));
  });

  // 2) aliases από FACTS keys
  const extraAliases = new Map<number, Set<string>>();

  for (const raw of Object.keys(FACTS)) {
    const label = sanitizeName(String(raw || ""));
    if (!isNameLike(label)) continue;

    let rec: BaseRec | undefined;

    // Προτίμηση: match στο περιεχόμενο παρενθέσεων (π.χ. "(Hydra)")
    const m = label.match(/\(([^)]+)\)/);
    if (m && isCleanParen(m[1])) {
      rec = idxMap.get(normalize(m[1]));
    }

    // Fallback: exact στο πλήρες label
    if (!rec) rec = idxMap.get(normalize(label));

    // Δεν δημιουργούμε “ορφανό” port χωρίς coords
    if (!rec) continue;

    if (!extraAliases.has(rec.idx)) extraAliases.set(rec.idx, new Set());
    extraAliases.get(rec.idx)!.add(label);
  }

  // 3) τελικό merge
  const out: MergedPort[] = baseArr
    .map((p:any, i:number) => {
      const name = sanitizeName(String(p.name ?? "").trim());
      const id = String(p.id ?? name).trim();

      const baseAl = Array.isArray(p.aliases) ? p.aliases.map((x:any)=>String(x??"")) : [];
      const extras = Array.from(extraAliases.get(i) ?? new Set<string>());

      const aliases = Array.from(
        new Set([...baseAl, ...extras].map(sanitizeName).filter(isNameLike))
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
      r.region
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return out;
}
