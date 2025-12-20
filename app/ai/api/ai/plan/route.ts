// app/ai/api/plan/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // χρειαζόμαστε Node (όχι edge) για εξωτερικά fetch με κλειδί

type PlannerMode = "Region" | "Custom";
type RegionKey =
  | "Saronic"
  | "Cyclades"
  | "Ionian"
  | "Dodecanese"
  | "Sporades"
  | "NorthAegean"
  | "Crete";

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function pickFirstValidNames(
  candidates: string[],
  allowed: string[],
  max = 10
) {
  const out: string[] = [];
  const allowedNorm = allowed.map((a) => ({ raw: a, norm: normalize(a) }));
  for (const c of candidates) {
    const cn = normalize(c);
    const hit = allowedNorm.find(
      (a) => a.norm === cn || a.raw.toLowerCase() === c.toLowerCase()
    );
    if (hit && !out.some((x) => normalize(x) === hit.norm)) {
      out.push(hit.raw);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * Περιμένει body:
 * {
 *   mode: "Region" | "Custom",
 *   start?: string, end?: string, days?: number, region?: "Auto"|RegionKey,
 *   customStart?: string, customDays?: number,
 *   options: string[]   // λίστα επιτρεπτών ports (από usePorts options)
 * }
 *
 * Επιστρέφει (ανά mode):
 *  - Region: { vias: string[] }
 *  - Custom: { dayStops: string[] }  // length === customDays
 */
export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const input = await req.json().catch(() => ({} as any));
    const {
      mode,
      start = "",
      end = "",
      days = 7,
      region = "Auto",
      customStart = "",
      customDays = 7,
      options = [],
    }: {
      mode: PlannerMode;
      start?: string;
      end?: string;
      days?: number;
      region?: "Auto" | RegionKey;
      customStart?: string;
      customDays?: number;
      options: string[];
    } = input;

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "options list (ports) is required" },
        { status: 400 }
      );
    }

    // ----- extra constraint ανάλογα με το region -----
    const regionConstraint =
      region && region !== "Auto"
        ? [
            `The user selected region = "${region}".`,
            `All suggested stops (vias or dayStops) MUST lie strictly within the "${region}" region of Greece.`,
            `Do NOT send the yacht to other Greek regions or to foreign coasts (e.g. Turkey, Italy) even if such ports exist in allowedPorts.`,
            `If you are unsure whether a port belongs to "${region}", DO NOT use it.`,
          ].join(" ")
        : [
            "Region is Auto – infer a coherent area (e.g. Saronic, Cyclades, Ionian) from start/end and keep most of the itinerary within that same area.",
          ].join(" ");

    const sys = [
      "You help plan Greek yachting itineraries.",
      "Always return VALID JSON only. No Markdown. No extra commentary.",
      "Only use place names that the user provided in the `allowedPorts` list.",
      regionConstraint,
    ].join(" ");

    const user = {
      mode,
      start,
      end,
      days,
      region,
      customStart,
      customDays,
      allowedPorts: options,
      constraints: [
        "Avoid unrealistic long hops day-to-day.",
        "Prefer short/medium legs and popular safe marinas.",
        "If 'region: Auto', infer Saronic/Cyclades/Ionian etc from start/end and keep the plan consistent.",
        "Never invent ports outside allowedPorts.",
        regionConstraint,
      ],
      outputFormat:
        mode === "Region"
          ? { type: "Region", want: "JSON with { vias: string[] }" }
          : {
              type: "Custom",
              want: "JSON with { dayStops: string[] } (length == customDays)",
            },
    };

    // ---------------- OpenAI call (chat.completions) ----------------
    const prompt = [
      `Mode: ${mode}`,
      mode === "Region"
        ? `Start: ${start} • End: ${end} • Days: ${days} • Region: ${region}`
        : `CustomStart: ${customStart} • Days: ${customDays}`,
      `Allowed ports (${options.length}): ${options.join(", ")}`,
      mode === "Region"
        ? `Return ONLY: {"vias":["Port1","Port2", ...]} (<= ${Math.max(
            0,
            days - 1
          )} items)`
        : `Return ONLY: {"dayStops":["Port for day 1","Port for day 2", ...]} (length ${customDays})`,
      regionConstraint,
    ].join("\n");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // μικρό, γρήγορο, αρκετά ικανό για routing
        temperature: 0.6,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "OpenAI error", detail: text },
        { status: 502 }
      );
    }
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content?.trim?.() ?? "{}";

    // Προσπαθούμε να βρούμε καθαρό JSON (αν έβαλε τυχόν code fences)
    const jsonStr = extractJson(text);
    const raw = JSON.parse(jsonStr);

    if (mode === "Region") {
      const viasRaw: string[] = Array.isArray(raw?.vias) ? raw.vias : [];
      const filtered = pickFirstValidNames(
        viasRaw,
        options,
        Math.max(0, days - 1)
      );
      return NextResponse.json({ vias: filtered }, { status: 200 });
    } else {
      const dsRaw: string[] = Array.isArray(raw?.dayStops)
        ? raw.dayStops
        : [];
      const filtered = pickFirstValidNames(dsRaw, options, customDays);
      // Αν είναι λιγότερα από customDays, συμπλήρωσε με το κοντινότερο στο τέλος (ασφαλές fallback)
      while (filtered.length < customDays)
        filtered.push(filtered[filtered.length - 1] ?? options[0]);
      return NextResponse.json(
        { dayStops: filtered.slice(0, customDays) },
        { status: 200 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}

function extractJson(s: string): string {
  // αν έρθει ```json ... ``` πάρε το μέσα
  const fence = s.match(/```json\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  // αλλιώς προσπάθησε να εντοπίσεις το πρώτο { ... } block
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) return s.slice(first, last + 1).trim();
  return "{}";
}
