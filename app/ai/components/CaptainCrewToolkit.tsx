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
  label?: string; // Clear / Partly cloudy / Cloudy / Rain
};

type Props = {
  plan: DayCard[];
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, SpotWeather>;
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

/* ========= Operational Warnings ========= */
/** Severity scale used in UI */
type Sev = "info" | "warn" | "alert";
type Warn = { sev: Sev; text: string };

function warnClass(sev: Sev) {
  if (sev === "alert") return "bg-rose-100 text-rose-800 border-rose-200";
  if (sev === "warn") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-sky-200";
}

/** Heuristics based on destination weather + leg timing/length */
function computeWarnings(l?: Leg, wx?: SpotWeather): Warn[] {
  const out: Warn[] = [];
  if (!l) return out;

  // Rain / precipitation
  if ((wx?.precipMM ?? 0) >= 0.5 || (wx?.label ?? "").toLowerCase().includes("rain")) {
    out.push({
      sev: "alert",
      text:
        "Rain expected at destination — slippery decks, reduced visibility; consider early window & PPE.",
    });
  }

  // Heavy cloud = possible lower contrast/swell reading
  if ((wx?.cloudPct ?? 0) >= 85) {
    out.push({
      sev: "warn",
      text:
        "Low ceiling / heavy cloud — watch for reduced horizon contrast; verify bearings & lights by day.",
    });
  }

  // Chilly temps comfort note
  if ((wx?.tempC ?? 99) <= 15) {
    out.push({
      sev: "info",
      text: "Cool conditions — advise guests for layers; check tender spray covers.",
    });
  }

  // Long leg
  if (l.hours >= 3.5) {
    out.push({
      sev: "warn",
      text:
        `Long passage (~${formatHoursHM(l.hours)}) — plan crew rotations, snacks & toys secured.`,
    });
  }

  // Late arrival risk (very rough heuristic: arrival ≥ 18:30)
  const mayBeNight =
    !!l.eta?.arr &&
    (() => {
      const [hh, mm] = (l.eta!.arr ?? "00:00").split(":").map((n) => parseInt(n, 10));
      return hh > 18 || (hh === 18 && mm >= 30);
    })();
  if (mayBeNight) {
    out.push({
      sev: "warn",
      text: "Arrival near dusk — prepare extra crew on bow/stern, test deck lights & searchlight.",
    });
  }

  // Wet conditions + arrivals: add line handling notice
  if ((wx?.precipMM ?? 0) >= 0.1) {
    out.push({
      sev: "info",
      text: "Wet quays possible — brief fender/line teams for safe footing & gloves.",
    });
  }

  return out;
}

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
  // Build top-level warnings summary (first severe per day)
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
            Operational Warnings (auto)
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
              <th className="px-3 py-2 text-left font-semibold">Ops</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => {
              const l = d.leg;
              const wx = l ? destWeather[l.to] : undefined;
              const warns = computeWarnings(l, wx);
              return (
                <tr key={d.day} className="border-t align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 font-medium">{d.day}</td>
                  <td className="px-3 py-2">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 font-medium text-brand-navy">
                    {l ? (
                      <div className="flex items-center gap-2">
                        {/* optional thumbnail if you later pass thumbs[to] */}
                        {l.to && (
                          <img
                            src={typeof window !== "undefined" && (window as any).__noop ? "" : (undefined as any)}
                            alt=""
                            className="hidden"
                          />
                        )}
                        {l.from} → {l.to}
                      </div>
                    ) : (
                      "—"
                    )}
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
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {warns.length ? (
                        warns.slice(0, 3).map((w, i) => (
                          <span
                            key={i}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${warnClass(
                              w.sev
                            )}`}
                            title={w.text}
                          >
                            {w.text}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500">—</span>
                      )}
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
          ⚓ <b>Use this toolkit</b> για καθημερινές ενημερώσεις πληρώματος, καιρικά
          δεδομένα, υπολογισμό χρόνων πλεύσης και κατανάλωσης. Οι προειδοποιήσεις είναι
          βοηθητικές και δεν αντικαθιστούν επίσημες μετεωρολογικές αναφορές / Notice to
          Mariners.
        </p>
      </div>
    </div>
  );
}
