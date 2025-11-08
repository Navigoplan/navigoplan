// app/api/debug/sg/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const dataDir = path.join(process.cwd(), "public", "data");
  const fileName = "sea_guide_vol3_master.json";
  const full = path.join(dataDir, fileName);

  const out: any = { ok: true, cwd: process.cwd(), dataDir, file: fileName };

  try {
    // λίστα αρχείων στον φάκελο public/data
    const files = await fs.readdir(dataDir);
    out.dir = files;
  } catch (e: any) {
    out.dirError = e?.message || String(e);
  }

  try {
    const txt = await fs.readFile(full, "utf8");
    out.sizeBytes = Buffer.byteLength(txt, "utf8");

    // προσπάθεια parse για να μετρήσουμε εγγραφές
    try {
      const json = JSON.parse(txt);
      out.jsonType = Array.isArray(json) ? "array" : typeof json;
      out.count = Array.isArray(json) ? json.length : undefined;

      // δοκίμασε να βρεις μία εγγραφή Limniona/Limionas
      if (Array.isArray(json)) {
        const hit = json.find((r: any) =>
          (r?.name?.en || r?.name?.el || "").toLowerCase().includes("limnion")
        );
        out.sampleLimnion = hit ? { id: hit.id, name: hit.name, pos: hit.position } : null;
      }
    } catch (e: any) {
      out.parseError = e?.message || String(e);
    }
  } catch (e: any) {
    out.readError = e?.message || String(e);
  }

  return NextResponse.json(out, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  });
}
