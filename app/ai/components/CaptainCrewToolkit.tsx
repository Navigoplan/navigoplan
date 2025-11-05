// app/ai/components/CaptainCrewToolkit.tsx
"use client";
import React from "react";
import type { DayCard, PlanResult, YachtType } from "../page";

/** Αν δεν σταλεί seed από τον γονέα, χρησιμοποιούμε αυτό το μίνι seed */
const DEFAULT_PORT_FACTS: Record<
  string,
  { anchorage?: { holding?: string; notes?: string }; vhf?: string; phone?: string; website?: string; fuel?: boolean; water?: boolean; provisions?: boolean; berth?: boolean }
> = {
  Poros: { anchorage: { holding: "sand/weed", notes: "Καλή προστασία από Β-ΒΔ" }, vhf: "12" },
  Hydra: { anchorage: { holding: "rock/sand", notes: "Στενός λιμένας, surge" } },
  "Porto Cheli": { anchorage: { holding: "mud/sand", notes: "Πολύ καλή κράτηση" } },
  Kythnos: { anchorage: { holding: "sand/weed" } },
};

type SpotWeather = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

function anchorRisk(holding?: string) {
  const h = (holding || "").toLowerCase();
  let level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const hints: string[] = ["Scope 5:1–7:1; verify swing circle & UKC ≥20%.", "Set anchor alarm bearings; record transits."];

  if (h.includes("weed") || h.includes("grass")) { hints.unshift("Weed patches: back-down longer; test set twice."); level = "MEDIUM"; }
  if (h.includes("rock")) { hints.unshift("Rocky bottom: consider trip line & extra scope."); level = "HIGH"; }
  if (h.includes("mud")) { hints.unshift("Mud/sand: good holding; avoid fouling with slow heave."); }

  return { level, hints };
}
function badgeClass(level: "LOW" | "MEDIUM" | "HIGH") {
  const map = {
    LOW: "bg-emerald-100 text-emerald-800",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-rose-100 text-rose-800",
  } as const;
  return `text-xs px-2 py-1 rounded-full font-semibold ${map[level]}`;
}

type Props = {
  plan: PlanResult;
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  thumbs: Record<string, string | undefined>;
  destWeather: Record<string, SpotWeather>;
  /** Προαιρετικό seed από τον γονέα – διορθώνει το error */
  portFactsSeed?: typeof DEFAULT_PORT_FACTS;
};

export default function CaptainCrewToolkit({
  plan,
  startDate,
  yachtType,
  speed,
  lph,
  thumbs,
  destWeather,
  portFactsSeed,
}: Props) {
  const PORT_FACTS = portFactsSeed ?? DEFAULT_PORT_FACTS;

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Voyage Summary */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Captain & Crew Multi-Tool</h3>
          <span className="text-xs text-neutral-500">Auto-built from current plan</span>
        </div>
        <ul className="text-sm leading-6">
          <li><b>Start:</b> {startDate}</li>
          <li><b>Yacht:</b> {yachtType} • {speed} kn • {lph} L/h</li>
          <li><b>Legs:</b> {plan.length}</li>
        </ul>
      </div>

      {/* Anchor Risk Advisor */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <h3 className="font-semibold mb-2">Anchor Risk Advisor (per stop)</h3>
        <div className="space-y-3">
          {plan.map((d, idx) => {
            const name = d.leg?.to ?? d.leg?.from ?? `Stop ${idx + 1}`;
            const pf = PORT_FACTS[name] || {};
            const risk = anchorRisk(pf.anchorage?.holding);
            return (
              <div key={idx} className="rounded-xl border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{name}</h4>
                  <span className={badgeClass(risk.level)}>{risk.level}</span>
                </div>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  {risk.hints.map((h, i) => <li key={i}>{h}</li>)}
                  {pf.anchorage?.notes && <li>{pf.anchorage.notes}</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Port & VHF Quick Facts */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <h3 className="font-semibold mb-2">Port & VHF Quick Facts</h3>
        <div className="space-y-3">
          {plan.map((d, idx) => {
            const name = d.leg?.to ?? d.leg?.from ?? `Stop ${idx + 1}`;
            const pf = PORT_FACTS[name] || {};
            return (
              <div key={idx} className="rounded-xl border p-3 text-sm">
                <div className="font-medium flex items-center gap-2">
                  {thumbs[name] && <img src={thumbs[name]} alt={name} className="h-10 w-16 object-cover rounded" />}
                  <span>{name}</span>
                </div>
                {Object.keys(pf).length ? (
                  <ul className="list-disc pl-5 mt-1">
                    {"vhf" in pf && pf.vhf && <li>VHF: {pf.vhf}</li>}
                    {"phone" in pf && pf.phone && <li>Phone: {pf.phone}</li>}
                    {"website" in pf && pf.website && (
                      <li>
                        Website:{" "}
                        <a href={pf.website} target="_blank" className="underline">
                          {pf.website}
                        </a>
                      </li>
                    )}
                    {pf.fuel && <li>Fuel available</li>}
                    {pf.water && <li>Water available</li>}
                    {pf.provisions && <li>Provisions</li>}
                    {pf.berth && <li>Berths</li>}
                  </ul>
                ) : (
                  <div className="text-neutral-500 italic mt-1">No dataset match.</div>
                )}

                {/* Live weather badges */}
                {(() => {
                  const wx = destWeather[name];
                  if (!wx) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border px-2 py-1">Live weather{wx.label ? `: ${wx.label}` : ""}</span>
                      {wx.tempC != null && <span className="rounded-full border px-2 py-1">🌡 {wx.tempC}°C</span>}
                      {wx.cloudPct != null && <span className="rounded-full border px-2 py-1">☁️ {wx.cloudPct}%</span>}
                      {wx.precipMM != null && <span className="rounded-full border px-2 py-1">🌧 {wx.precipMM} mm/h</span>}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
