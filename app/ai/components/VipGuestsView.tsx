"use client";
import React from "react";

/* Local types so we don't import from ../page */
export type Leg = {
  from: string; to: string; nm: number; hours: number; fuelL: number;
  cost?: number; eta?: { dep: string; arr: string; window: string };
};
export type DayCard = {
  day: number; date: string; leg?: Leg; notes?: string;
};

type Props = {
  plan: DayCard[];
  mode: "Region" | "Custom";
  startDate: string;
  start?: string;
  end?: string;
};

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return d || "—"; }
}

export default function VipGuestsView({ plan, mode, startDate, start, end }: Props) {
  const title = mode === "Region" ? `${start ?? "—"} → ${end ?? "—"}` : "Custom Cruise";
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="relative h-28 bg-gradient-to-r from-black via-neutral-800 to-black">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full px-6 flex items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-300">Navigoplan • VIP Itinerary</div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <div className="text-neutral-300 text-sm">
              From {formatDate(startDate)} • {plan.length} days
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {plan.map((d: DayCard) => (
          <div key={d.day} className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="grid sm:grid-cols-[120px_1fr_220px] gap-0">
              <div className="bg-neutral-50 p-4 flex flex-col items-start justify-center">
                <div className="text-3xl font-semibold leading-none">{d.day}</div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
              </div>

              <div className="p-4">
                <div className="text-sm text-neutral-500">{formatDate(d.date)}</div>
                {d.leg ? (
                  <>
                    <div className="text-lg font-semibold">{d.leg.from} → {d.leg.to}</div>
                    <div className="text-sm text-neutral-600">
                      {Math.round(d.leg.nm)} nm • {d.leg.hours.toFixed(1)} h cruise
                      {d.leg.eta ? <> • Depart {d.leg.eta.dep} • Arrive {d.leg.eta.arr} ({d.leg.eta.window})</> : null}
                    </div>
                  </>
                ) : (
                  <div className="text-lg font-semibold">Leisure day</div>
                )}
                {d.notes && <p className="mt-2 text-neutral-700">{d.notes}</p>}
              </div>

              <div className="p-4 border-l bg-neutral-50">
                <div className="text-sm font-medium mb-1">Highlights</div>
                <ul className="text-sm text-neutral-700 space-y-1 list-disc pl-5">
                  {d.leg ? (
                    <>
                      <li>Swim stop at a sheltered cove</li>
                      <li>Reservations for dinner ashore</li>
                      <li>Golden-hour cruise & photos</li>
                    </>
                  ) : (
                    <>
                      <li>Beach club & water toys</li>
                      <li>Private walking tour</li>
                      <li>Chef’s tasting menu onboard</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border bg-neutral-50 p-5 text-center">
          <div className="text-sm text-neutral-600">
            Θέλεις premium PDF brochure με φωτογραφίες & route map;
          </div>
          <div className="mt-3">
            <button className="px-4 py-2 rounded-2xl bg-black text-white text-sm font-medium hover:opacity-90">
              Export VIP Brochure (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
