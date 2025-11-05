"use client";
import React from "react";

/* ========= Local type definitions ========= */
type YachtType = "Motor" | "Sailing";

type Leg = {
  from: string;
  to: string;
  nm: number;
  hours: number;
  fuelL: number;
  cost?: number;
  eta?: { dep: string; arr: string; window: string };
};

type DayCard = {
  day: number;
  date: string;
  leg?: Leg;
  notes?: string;
};

type SpotWeather = {
  tempC?: number;
  precipMM?: number;
  cloudPct?: number;
  label?: string;
  windKts?: number;       // <-- ζωντανός άνεμος σε kt (θα έρθει από page.tsx)
  gustKts?: number;       // προαιρετικά
};

/* ========= Small helpers ========= */
function formatHoursHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}
function ktToBeaufort(kt?: number) {
  const v = kt ?? 0;
  if (v < 1) return 0;
  if (v <= 3) return 1;
  if (v <= 6) return 2;
  if (v <= 10) return 3;
  if (v <= 16) return 4;
  if (v <= 21) return 5;
  if (v <= 27) return 6;
  if (v <= 33) return 7;
  if (v <= 40) return 8;
  if (v <= 47) return 9;
  if (v <= 55) return 10;
  if (v <= 63) return 11;
  return 12;
}
function bftLabel(b: number) {
  return [
    "Calm", "Light air", "Light breeze", "Gentle breeze", "Moderate breeze",
    "Fresh breeze", "Strong breeze", "Near gale", "Gale", "Strong gale",
    "Storm", "Violent storm", "Hurricane",
  ][b] || "";
}

/* ========= VHF & Local Hazards (seed) ========= */
const VHF_MAP: Record<string, string> = {
  "Alimos": "71",
  "Aegina": "12",
  "Agistri": "—",
  "Poros": "12",
  "Hydra": "—",
  "Spetses": "—",
  "Ermioni": "—",
  "Porto Cheli": "—",
  "Lavrio": "—",
  "Kea": "—",
  "Kythnos": "—",
  "Syros": "—",
  "Mykonos": "—",
  "Paros": "—",
  "Naxos": "—",
  "Ios": "—",
  "Milos": "—",
  "Sifnos": "—",
  "Serifos": "—",
  "Corfu": "—",
  "Paxos": "—",
  "Lefkada": "—",
  "Zakynthos": "—",
  // πρόσθεσε εδώ ό,τι άλλο θέλεις
};

const HAZARDS_MAP: Record<string, string[]> = {
  "Hydra": ["Στενός λιμένας, συχνό surge", "Περιορισμένοι χειρισμοί μέσα στο λιμάνι"],
  "Poros": ["Περάσματα με ρεύματα", "Αγκυροβολία σε sand/weed (δοκίμασε δύο φορές)"],
  "Porto Cheli": ["Εκτεταμένο αγκυροβόλιο — κίνδυνος μπλεξίματος αλυσίδων"],
  "Mykonos": ["Meltemi exposure — ισχυρές ριπές στα δεσίματα"],
  "Paros": ["Meltemi funneling στο κανάλι Πάρου-Νάξου"],
  "Naxos": ["Ferry wash και κυματισμοί στην προβλήτα"],
  "Milos": ["Ρηχά έξω από κολπίσκους, προσοχή σε βράχια"],
  "Aegina": ["Πολυκοσμία/traffic, ferry wash στην είσοδο"],
  // συνέχισε το seed κατά βούληση
};

/* ========= Operational Warnings ========= */
type Sev = "info" | "warn" | "alert";
type Warn = { sev: Sev; text: string };

function warnClass(sev: Sev) {
  if (sev === "alert") return "bg-rose-100 text-rose-800 border-rose-200";
  if (sev === "warn") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-sky-200";
}

function computeWarnings(l?: Leg, wx?: SpotWeather): Warn[] {
  const out: Warn[] = [];
  if (!l) return out;

  // Άνεμος / Beaufort
  const bft = ktToBeaufort(wx?.windKts);
  if (bft >= 7) {
    out.push({ sev: "alert", text: `Strong winds: Bft ${bft} (${bftLabel(bft)}). Δεσίματα/ανέσεις αυξημένα.` });
  } else if (bft >= 5) {
    out.push({ sev: "warn", text: `Fresh breeze: Bft ${bft}. Πρόσεχε ριπές/πλευρικούς ανέμους σε χειρισμούς.` });
  }

  // Βροχή/ορατότητα/νεφοκάλυψη
  if ((wx?.precipMM ?? 0) >= 0.5 || (wx?.label ?? "").toLowerCase().includes("rain")) {
    out.push({ sev: "alert", text: "Rain expected — slippery decks & reduced visibility." });
  }
  if ((wx?.cloudPct ?? 0) >= 85) {
    out.push({ sev: "warn", text: "Heavy cloud — μειωμένη αντίθεση ορίζοντα, τσέκαρε φώτα/σημαντήρες." });
  }
  if ((wx?.tempC ?? 99) <= 15) {
    out.push({ sev: "info", text: "Χαμηλή θερμοκρασία — ενημέρωσε για ρουχισμό, tender spray covers." });
  }

  // Μεγάλο σκέλος
  if (l.hours >= 3.5) {
    out.push({ sev: "warn", text: `Long passage (~${formatHoursHM(l.hours)}) — rotations, snacks, securing.` });
  }

  // Άφιξη κοντά στη δύση
  const late =
    !!l.eta?.arr &&
    (() => {
      const [hh, mm] = (l.eta!.arr ?? "00:00").split(":").map((n) => parseInt(n, 10));
      return hh > 18 || (hh === 18 && mm >= 30);
    })();
  if (late) {
    out.push({ sev: "warn", text: "Arrival near dusk — searchlight/deck lights check & extra hands." });
  }

  return out;
}

/* ========= Props ========= */
type Props = {
  plan: DayCard[];
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, SpotWeather>;
};

/* ========= Component ========= */
export default function CaptainCrewToolkit({
  plan,
  startDate,
  yachtType,
  speed,
  lph,
  thumbs = {},
  destWeather = {},
}: Props) {
  // Σύνοψη κορυφής
  const topSummary: { day: number; port?: string; sev: Sev; text: string }[] = [];
  for (const d of plan) {
    const l = d.leg;
    const wx = l ? destWeather[l.to] : undefined;
    const warns = computeWarnings(l, wx);
    if (warns.length) {
      const first = warns.find((w) => w.sev === "alert") ?? warns[0];
      topSummary.push({ day: d.day, port: l?.to, sev: first.sev, text: first.text });
    }
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative h-28 bg-gradient-to-r from-[#001428] via-[#012b55] to-[#001428]">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full px-6 flex items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-300">
              Navigoplan • Captain & Crew Toolkit
            </div>
            <h2 className="text-2xl font-semibold text-white">Operational Plan</h2>
            <div className="text-neutral-300 text-sm">
              From {formatDate(startDate)} • {plan.length} days • {speed} kn{" "}
              {yachtType === "Motor" ? `• ${lph} L/h` : "• Sailing"}
            </div>
          </div>
        </div>
      </div>

      {/* Top warnings summary */}
      {topSummary.length > 0 && (
        <div className="px-6 pt-4">
          <div className="mb-2 text-sm font-semibold text-neutral-800">
            Hazards & Advisories (auto)
          </div>
          <div className="flex flex-wrap gap-2">
            {topSummary.map((w) => (
              <div
                key={w.day}
                className={`border rounded-full px-3 py-1 text-sm ${warnClass(w.sev)}`}
                title={`Day ${w.day}${w.port ? ` • ${w.port}` : ""}`}
              >
                <span className="font-medium">Day {w.day}</span>
                {w.port && <> • {w.port}</>}
                <span className="opacity-80"> — {w.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="p-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700">
              <th className="px-3 py-2 text-left font-semibold">Day</th>
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">From → To</th>
              <th className="px-3 py-2 text-left font-semibold">NM</th>
              <th className="px-3 py-2 text-left font-semibold">Hours</th>
              <th className="px-3 py-2 text-left font-semibold">Depart</th>
              <th className="px-3 py-2 text-left font-semibold">Arrive</th>
              {yachtType === "Motor" && (
                <th className="px-3 py-2 text-left font-semibold">Fuel (L)</th>
              )}
              {yachtType === "Motor" && (
                <th className="px-3 py-2 text-left font-semibold">Cost (€)</th>
              )}
              <th className="px-3 py-2 text-left font-semibold">Weather</th>
              <th className="px-3 py-2 text-left font-semibold">Wind / Bft</th>
              <th className="px-3 py-2 text-left font-semibold">VHF</th>
              <th className="px-3 py-2 text-left font-semibold">Hazards</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => {
              const l = d.leg;
              const wx = l ? destWeather[l.to] : undefined;
              const warns = computeWarnings(l, wx);
              const bft = ktToBeaufort(wx?.windKts);
              const local = l?.to ? (HAZARDS_MAP[l.to] ?? []) : [];

              return (
                <tr key={d.day} className="border-t align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 font-medium">{d.day}</td>
                  <td className="px-3 py-2">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 font-medium text-brand-navy">
                    {l ? `${l.from} → ${l.to}` : "—"}
                  </td>
                  <td className="px-3 py-2">{l ? l.nm : "—"}</td>
                  <td className="px-3 py-2">{l ? formatHoursHM(l.hours) : "—"}</td>
                  <td className="px-3 py-2">{l?.eta?.dep ?? "—"}</td>
                  <td className="px-3 py-2">{l?.eta?.arr ?? "—"}</td>
                  {yachtType === "Motor" && <td className="px-3 py-2">{l?.fuelL ?? "—"}</td>}
                  {yachtType === "Motor" && <td className="px-3 py-2">€{l?.cost ?? "—"}</td>}
                  <td className="px-3 py-2 text-xs">
                    {wx ? (
                      <>
                        {wx.label} {wx.tempC != null && <>({wx.tempC}°C)</>}
                        {wx.cloudPct != null && <> • ☁ {wx.cloudPct}%</>}
                        {wx.precipMM != null && <> • 🌧 {wx.precipMM}mm</>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {wx?.windKts != null ? (
                      <>
                        {Math.round(wx.windKts)} kt • Bft {bft} ({bftLabel(bft)})
                        {wx.gustKts != null && <> • gust {Math.round(wx.gustKts)} kt</>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">{l?.to ? (VHF_MAP[l.to] ?? "—") : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {local.map((t, i) => (
                        <span key={`loc-${i}`} className="inline-block border rounded-full px-2 py-0.5 text-xs bg-neutral-100 border-neutral-200">
                          {t}
                        </span>
                      ))}
                      {warns.length ? (
                        warns.slice(0, 3).map((w, i) => (
                          <span
                            key={`w-${i}`}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${warnClass(w.sev)}`}
                          >
                            {w.text}
                          </span>
                        ))
                      ) : local.length === 0 ? (
                        <span className="text-xs text-neutral-500">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="border-t bg-neutral-50 px-6 py-4 text-sm text-neutral-600">
        <p>
          ⚓ Οι προειδοποιήσεις είναι ενδεικτικές και δεν αντικαθιστούν επίσημες ναυτικές/μετεωρολογικές αναφορές.
          Μπορούμε να επεκτείνουμε άμεσα VHF & hazards με πλήρη βάση (OSM/Wikidata/Sea Guide).
        </p>
      </div>
    </div>
  );
}
