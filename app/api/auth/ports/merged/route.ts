// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
import { buildMergedPorts } from "@/lib/portsMerged";

export const runtime = "nodejs";

// μικρό helper για id από όνομα (slug).
function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET() {
  try {
    const merged = buildMergedPorts();

    // Καθαρίζουμε σε σχήμα συμβατό με usePorts()
    const out = merged
      .filter(p => typeof p.name === "string")
      .map(p => {
        const id = typeof (p as any).id === "string" && (p as any).id
          ? (p as any).id
          : slugify(p.name);

        return {
          id,
          name: p.name,
          lat: typeof p.lat === "number" ? p.lat : null,
          lon: typeof p.lon === "number" ? p.lon : null,
          category: "harbor" as const, // safe default (θα βάλουμε λεπτομέρειες αργότερα)
          region: (p.region as string) || "Saronic",
          aliases: [] as string[],
        };
      })
      // πετάμε όσα δεν έχουν coords γιατί δεν μπορούν να μπουν στον χάρτη/AI
      .filter(p => typeof p.lat === "number" && typeof p.lon === "number");

    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "merge error" }, { status: 500 });
  }
}
