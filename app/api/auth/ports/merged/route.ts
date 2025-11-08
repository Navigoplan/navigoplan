// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

import { buildMergedPorts } from "@/lib/portsMerged";

type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

/* ---------- helpers ---------- */
function classifyCategory(name: string): PortCategory {
  const n = (name || "").toLowerCase();
  if (n.includes("marina")) return "marina";
  if (n.includes("bay") || n.includes("cove") || n.includes("anchorage")) return "anchorage";
  if (n.includes("canal")) return "spot";
  return "harbor";
}

function deaccent(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function stripParen(s: string) {
  return s.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
function uniq(arr: string[]) {
  const set = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = (x || "").trim();
    if (!k) continue;
    if (!set.has(k)) { set.add(k); out.push(k); }
  }
  return out;
}

/** Χειροκίνητα aliases για δύσκολα cases */
const EXTRA_ALIASES: Record<string, string[]> = {
  "Kerì Bay (Zakynthos)": ["Kerì Bay", "Keri Bay", "Keri"],
  "Glyfada Harbour (Sterea Ellada)": ["Glyfada Harbour"],
};

export async function GET() {
  try {
    const merged = buildMergedPorts();

    const ports = merged
      .filter(p => typeof p.lat === "number" && typeof p.lon === "number")
      .map(p => {
        const name = p.name;
        const base = stripParen(name);
        const cat: PortCategory = classifyCategory(name);

        // βασικά aliases
        const al: string[] = [
          base,                           // χωρίς παρενθέσεις
          deaccent(name),                 // χωρίς τόνους/διακριτικά
          deaccent(base),                 // χωρίς τόνους/διακριτικά & χωρίς παρενθέσεις
        ];

        // προσθέτουμε χειροκίνητα όπου έχουμε
        if (EXTRA_ALIASES[name]) al.push(...EXTRA_ALIASES[name]);

        const aliases = uniq([name, ...al]);

        return {
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          lat: p.lat as number,
          lon: p.lon as number,
          category: cat,
          region: p.region || "Greece",
          aliases,
        };
      });

    return NextResponse.json(ports, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "merge failed" }, { status: 500 });
  }
}
