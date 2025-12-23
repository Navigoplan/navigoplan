import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type RegionKey =
  | "Saronic"
  | "Cyclades"
  | "Ionian"
  | "Dodecanese"
  | "Sporades"
  | "NorthAegean"
  | "Crete";

function normalize(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Simple in-memory cache per server instance
let CACHE: any[] | null = null;

async function loadSeaGuideMaster(): Promise<any[]> {
  if (CACHE) return CACHE;
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "sea_guide_vol3_master.json"
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const json = JSON.parse(raw);
  CACHE = Array.isArray(json) ? json : [];
  return CACHE;
}

function getAllNames(entry: any): string[] {
  const out: string[] = [];
  const n = entry?.name;
  if (typeof n === "string") out.push(n);
  if (n && typeof n === "object") {
    if (n.en) out.push(n.en);
    if (n.el) out.push(n.el);
  }
  if (Array.isArray(entry?.aliases)) out.push(...entry.aliases);
  if (Array.isArray(entry?.alt_names)) out.push(...entry.alt_names);
  return out.filter(Boolean);
}

function pickBestMatch(candidates: any[], wantedRegion?: RegionKey): any | null {
  if (!candidates.length) return null;
  if (!wantedRegion) return candidates[0];

  const wr = normalize(wantedRegion);
  const exact = candidates.filter(
    (c) => normalize(String(c?.region || "")) === wr
  );
  if (exact.length) return exact[0];

  return candidates[0];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      names = [],
      region,
    }: {
      names: string[];
      region?: RegionKey;
    } = body;

    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: "names[] required" }, { status: 400 });
    }

    const data = await loadSeaGuideMaster();

    const wanted = names
      .map((n) => ({ raw: n, norm: normalize(n) }))
      .filter((x) => x.norm);

    const items: Record<string, any> = {};

    for (const w of wanted) {
      const matches: any[] = [];

      for (const entry of data) {
        const entryNames = getAllNames(entry);
        if (!entryNames.length) continue;
        if (entryNames.some((nm) => normalize(nm) === w.norm)) {
          matches.push(entry);
        }
      }

      const best = pickBestMatch(matches, region);
      if (best) items[w.raw] = best;
    }

    return NextResponse.json({ region: region ?? null, items }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
