"use client";
import React from "react";

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
type Wx = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

type Props = {
  plan: DayCard[];
  mode: "Region" | "Custom";
  startDate: string;
  start: string;
  end?: string;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, Wx>;
};

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}
function formatHoursHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function VipGuestsView({
  plan,
  mode,
  startDate,
  start,
  end,
  thumbs = {},
  destWeather = {},
}: Props) {
  const title = mode === "Region" && end ? `${start} → ${end}` : (plan?.[0]?.leg?.from ?? start);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="relative h-28 bg-gradient-to-r from-black via-neutral-800 to-black">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full px-6 flex items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-300">
              Navigoplan • VIP Itinerary
            </div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <div className="text-neutral-300 text-sm">
              From {formatDate(startDate)} • {plan.length} days
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="p-6 space-y-4">
        {plan.map((d) => {
          const leg = d.leg;
          if (!leg) return null;
          const dest = leg.to;
          const thumb = thumbs[dest];
          const wx = destWeather[dest];

          return (
            <div
              key={d.day}
              className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
            >
              {/* CARD HEADER */}
              <div className="grid sm:grid-cols-[100px_1fr_280px] gap-0">
                {/* LEFT: DAY */}
                <div className="bg-neutral-50 flex flex-col items-center justify-center py-5 border-r">
                  <div className="text-xl font-semibold text-neutral-800">{d.day}</div>
                  <div className="text-[11px] uppercase text-neutral-500 tracking-wider">
                    Day
                  </div>
                </div>

                {/* CENTER: ROUTE INFO */}
                <div className="p-4 flex flex-col justify-center">
                  <div className="text-sm text-neutral-500">{formatDate(d.date)}</div>
                  <div className="text-lg font-semibold text-brand-navy mb-1">
                    {leg.from} → {leg.to}
                  </div>
                  <div className="text-sm text-neutral-700">
                    {leg.nm} nm • {formatHoursHM(leg.hours)} cruise
                    {" • "}
                    Depart {leg.eta?.dep}  Arrive {leg.eta?.arr}
                  </div>
                  {d.notes && (
                    <p className="mt-1 text-sm text-neutral-600">{d.notes}</p>
                  )}
                </div>

                {/* RIGHT: IMAGE + WEATHER */}
                <div className="relative">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={dest}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                      No image
                    </div>
                  )}

                  {wx && (
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs rounded-lg px-2 py-1 flex flex-wrap gap-1">
                      {wx.label && <span>{wx.label}</span>}
                      {wx.tempC != null && <span>🌡{wx.tempC}°C</span>}
                      {wx.cloudPct != null && <span>☁️{wx.cloudPct}%</span>}
                      {wx.precipMM != null && <span>🌧{wx.precipMM} mm</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* HIGHLIGHTS */}
              <div className="px-4 py-3 bg-neutral-50 border-t grid md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-medium text-neutral-500 uppercase">
                    Highlights
                  </div>
                  <ul className="text-sm text-neutral-700 list-disc pl-4 space-y-1">
                    <li>Swim stop at a sheltered cove</li>
                    <li>Reservations for dinner ashore</li>
                    <li>Golden-hour cruise & photos</li>
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-neutral-500 uppercase">
                    Live Conditions
                  </div>
                  {wx ? (
                    <ul className="text-sm text-neutral-700 list-disc pl-4 space-y-1">
                      <li>Weather: {wx.label || "—"}</li>
                      {wx.tempC != null && <li>Temperature: {wx.tempC} °C</li>}
                      {wx.cloudPct != null && <li>Clouds: {wx.cloudPct}%</li>}
                      {wx.precipMM != null && <li>Rain: {wx.precipMM} mm/h</li>}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
