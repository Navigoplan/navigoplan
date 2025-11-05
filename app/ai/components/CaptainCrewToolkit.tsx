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
type DayCard = { day: number; date: string; leg?: Leg; notes?: string };
type SpotWeather = {
  tempC?: number;
  precipMM?: number;
  cloudPct?: number;
  label?: string;
  windKts?: number;
  gustKts?: number;
};

/* ========= Utility helpers ========= */
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
  const scale = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
  const idx = scale.findIndex((s) => v < s);
  return idx === -1 ? 12 : idx;
}
function bftLabel(b: number) {
  const arr = [
    "Calm", "Light air", "Light breeze", "Gentle breeze", "Moderate breeze",
    "Fresh breeze", "Strong breeze", "Near gale", "Gale", "Strong gale",
    "Storm", "Violent storm", "Hurricane",
  ];
  return arr[b] ?? "";
}

/* ========= VHF + Hazards (seed) ========= */
const VHF_MAP: Record<string, string> = {
  Alimos: "71",
  Aegina: "12",
  Poros: "12",
  Hydra: "12",
  Spetses: "—",
  "Porto Cheli": "—",
  Mykonos: "—",
  Paros: "—",
  Naxos: "—",
  Milos: "—",
};
const HAZARDS_MAP: Record<
  string,
  { label: string; sev: number; note?: string }[]
> = {
  Hydra: [
    { label: "Tight harbor", sev: 2, note: "Limited maneuvering space" },
    { label: "Surge", sev: 2, note: "From ferries & traffic" },
  ],
  Poros: [
    { label: "Cross current", sev: 1 },
    { label: "Weed patches", sev: 1, note: "Test set twice" },
  ],
  "Porto Cheli": [
    { label: "Shallow edges", sev: 1 },
    { label: "Chain overlaps", sev: 1 },
  ],
  Mykonos: [
    { label: "Meltemi gusts", sev: 2 },
    { label: "Ferry wash", sev: 1 },
  ],
  Aegina: [{ label: "Traffic density", sev: 1 }],
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

  const bft = ktToBeaufort(wx?.windKts);
  if (bft >= 7)
    out.push({
      sev: "alert",
      text: `Strong wind Bft ${bft} (${bftLabel(
        bft
      )}) — secure moorings, adjust approach.`,
    });
  else if (bft >= 5)
    out.push({
      sev: "warn",
      text: `Fresh breeze Bft ${bft} (${bftLabel(
        bft
      )}) — caution on beam wind berthing.`,
    });

  if ((wx?.precipMM ?? 0) > 0.5)
    out.push({
      sev: "alert",
      text: "Rain expected — slippery decks, reduced visibility.",
    });
  if ((wx?.cloudPct ?? 0) >= 85)
    out.push({
      sev: "warn",
      text: "Heavy cloud — reduced horizon contrast, verify lights.",
    });

  if (l.hours >= 3.5)
    out.push({
      sev: "warn",
      text: `Long passage (${formatHoursHM(
        l.hours
      )}) — crew rotation & snacks.`,
    });

  const [h, m] = l.eta?.arr?.split(":").map(Number) ?? [];
  if (h > 18 || (h === 18 && m > 30))
    out.push({
      sev: "warn",
      text: "Arrival near dusk — prepare searchlight & extra crew.",
    });

  return out;
}

/* ========= Main Component ========= */
export default function CaptainCrewToolkit({
  plan,
  startDate,
  yachtType,
  speed,
  lph,
  thumbs = {},
  destWeather = {},
}: {
  plan: DayCard[];
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, SpotWeather>;
}) {
  const summary: { day: number; port?: string; sev: Sev; text: string }[] = [];
  for (const d of plan) {
    const l = d.leg;
    const wx = l ? destWeather[l.to] : undefined;
    const warns = computeWarnings(l, wx);
    if (warns.length) {
      const top = warns.find((w) => w.sev === "alert") ?? warns[0];
      summary.push({ day: d.day, port: l?.to, sev: top.sev, text: top.text });
    }
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="relative h-28 bg-gradient-to-r from-[#001428] via-[#012b55] to-[#001428]">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full flex items-center px-6">
          <div>
            <div className="text-xs uppercase text-neutral-300">
              Navigoplan • Captain & Crew Toolkit
            </div>
            <h2 className="text-2xl font-semibold text-white">Operational Plan</h2>
            <div className="text-neutral-300 text-sm">
              From {formatDate(startDate)} • {plan.length} days • {speed} kn{" "}
              {yachtType === "Motor" ? `• ${lph} L/h` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      {summary.length > 0 && (
        <div className="px-6 pt-4">
          <div className="mb-2 text-sm font-semibold text-neutral-800">
            Key Warnings (auto)
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.map((w) => (
              <div
                key={w.day}
                className={`border rounded-full px-3 py-1 text-sm ${warnClass(
                  w.sev
                )}`}
              >
                <b>Day {w.day}</b>
                {w.port && <> • {w.port}</>} — {w.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="p-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700">
              <th className="px-3 py-2 text-left">Day</th>
              <th className="px-3 py-2 text-left">From → To</th>
              <th className="px-3 py-2 text-left">NM</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-left">Weather</th>
              <th className="px-3 py-2 text-left">Wind / Bft</th>
              <th className="px-3 py-2 text-left">VHF</th>
              <th className="px-3 py-2 text-left">Hazards</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => {
              const l = d.leg;
              const wx = l ? destWeather[l.to] : undefined;
              const bft = ktToBeaufort(wx?.windKts);
              const warns = computeWarnings(l, wx);
              const localHaz = l?.to ? HAZARDS_MAP[l.to] ?? [] : [];

              return (
                <tr key={d.day} className="border-t hover:bg-neutral-50">
                  <td className="px-3 py-2 font-medium">{d.day}</td>
                  <td className="px-3 py-2">
                    {l ? `${l.from} → ${l.to}` : "—"}
                    <div className="text-xs text-slate-500">
                      {l?.eta?.dep && `Dep ${l.eta.dep}`}{" "}
                      {l?.eta?.arr && `Arr ${l.eta.arr}`}
                    </div>
                  </td>
                  <td className="px-3 py-2">{l?.nm ?? "—"}</td>
                  <td className="px-3 py-2">{l ? formatHoursHM(l.hours) : "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {wx
                      ? `${wx.label ?? ""} ${wx.tempC ?? "—"}°C • ☁ ${
                          wx.cloudPct ?? "—"
                        }% • 🌧 ${wx.precipMM ?? "—"}mm`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {wx?.windKts != null
                      ? `${Math.round(wx.windKts)} kt • Bft ${bft} (${bftLabel(
                          bft
                        )})`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {l?.to ? VHF_MAP[l.to] ?? "—" : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {localHaz.length > 0 || warns.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {localHaz.map((h, i) => (
                          <span
                            key={`h-${i}`}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${
                              h.sev >= 2
                                ? "bg-amber-100 border-amber-200"
                                : "bg-slate-100 border-slate-200"
                            }`}
                            title={h.note}
                          >
                            ⚠ {h.label}
                          </span>
                        ))}
                        {warns.map((w, i) => (
                          <span
                            key={`w-${i}`}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${warnClass(
                              w.sev
                            )}`}
                          >
                            {w.text}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="border-t bg-neutral-50 px-6 py-4 text-sm text-neutral-600">
        ⚓ Οι πληροφορίες προορίζονται για επιχειρησιακή καθοδήγηση και δεν
        αντικαθιστούν επίσημες Notice to Mariners ή forecast bulletins.
      </div>
    </div>
  );
}
