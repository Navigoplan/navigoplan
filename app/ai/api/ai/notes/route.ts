// app/api/ai/notes/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Περιμένει body:
 * {
 *   plan: Array<{ day:number; date?:string; leg?:{ from:string; to:string; nm:number; hours:number; fuelL:number } }>,
 *   prefs?: string[],            // π.χ. ["family","nightlife","gastronomy"]
 *   regionHint?: string,         // optional ("Saronic" | "Cyclades" | ...)
 *   yachtType?: "Motor"|"Sailing",
 *   speed?: number, lph?: number
 * }
 *
 * Επιστρέφει:
 *   { notes: string[] } // ίδιο length με plan
 */
export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const { plan, prefs = [], regionHint = "", yachtType = "Motor", speed = 20, lph = 180 } =
      await req.json();

    if (!Array.isArray(plan) || !plan.length) {
      return NextResponse.json({ error: "plan array required" }, { status: 400 });
    }

    const sys = [
      "You are a concise yachting trip assistant for Greek islands.",
      "Return practical, short daily notes in Greek (<= 220 chars per day).",
      "Prefer safety, popular coves, sensible timings, and realistic advice.",
      "Always return VALID JSON only: {\"notes\":[\"...\",\"...\"]}",
    ].join(" ");

    const user = {
      regionHint,
      yachtType,
      speed,
      lph,
      prefs,
      plan: plan.map((d: any) => ({
        day: d.day,
        date: d.date ?? "",
        leg: d.leg ? {
          from: d.leg.from, to: d.leg.to, nm: d.leg.nm, hours: d.leg.hours
        } : null,
      })),
      output: "JSON: { notes: string[] } with same length as plan",
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: "OpenAI error", detail: text }, { status: 502 });
    }

    const data = await resp.json();
    const text: string =
      data?.choices?.[0]?.message?.content?.trim?.() ?? "{}";

    const jsonStr = extractJson(text);
    const parsed = JSON.parse(jsonStr);
    const notes: string[] = Array.isArray(parsed?.notes) ? parsed.notes : [];

    // ασφαλιστικά: κάνε pad/trim ώστε length === plan.length
    const out = notes.slice(0, plan.length);
    while (out.length < plan.length) out.push("—");

    return NextResponse.json({ notes: out }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 500 });
  }
}

function extractJson(s: string): string {
  const fence = s.match(/```json\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1).trim();
  return "{}";
}
