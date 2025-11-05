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

type SpotWeather = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

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
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
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
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative h-28 bg-gradient-to-r from-[#001428] via-[#012b55] to-[#001428]">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full px-6 flex items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-300">Navigoplan • Captain & Crew Toolkit</div>
            <h2 className="text-2xl font-semibold text-white">Operational Plan</h2>
            <div className="text-neutral-300 text-sm">From {formatDate(startDate)} • {plan.length} days</div>
          </div>
        </div>
      </div>

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
              {yachtType === "Motor" && <th className="px-3 py-2 text-left font-semibold">Fuel (L)</th>}
              {yachtType === "Motor" && <th className="px-3 py-2 text-left font-semibold">Cost (€)</th>}
              <th className="px-3 py-2 text-left font-semibold">Weather</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => {
              const l = d.leg;
              const wx = l ? destWeather[l.to] : undefined;
              return (
                <tr key={d.day} className="border-t hover:bg-neutral-50">
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
                        {wx.label} ({wx.tempC ?? "–"}°C)
                        {wx.cloudPct != null && <> • ☁ {wx.cloudPct}%</>}
                        {wx.precipMM != null && <> • 🌧 {wx.precipMM}mm</>}
                      </>
                    ) : (
                      "—"
                    )}
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
          ⚓ <b>Use this toolkit</b> για καθημερινές ενημερώσεις πληρώματος, καιρικά δεδομένα, υπολογισμό χρόνων
          πλεύσης και κατανάλωσης. Ενδείκνυται για Bridge Briefing & Charter Handovers.
        </p>
      </div>
    </div>
  );
}
