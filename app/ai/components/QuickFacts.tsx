"use client";
import React from "react";
import {
  getPortFacts,
  type PortFact,
  type PortHazard,
} from "../../../lib/ports/portfacts"; // <-- σωστό path

/* ====== Local weather type (ό,τι χρειαζόμαστε εδώ) ====== */
type SpotWeather = {
  tempC?: number;
  precipMM?: number;
  cloudPct?: number;
  label?: string;
  windKts?: number;
  gustKts?: number;
};

/* ====== Helpers ====== */
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
    "Calm","Light air","Light breeze","Gentle breeze","Moderate breeze",
    "Fresh breeze","Strong breeze","Near gale","Gale","Strong gale",
    "Storm","Violent storm","Hurricane",
  ][b] || "";
}
function sevBadge(sev?: 0 | 1 | 2) {
  if (sev === 2) return "bg-rose-100 text-rose-800 border-rose-200";
  if (sev === 1) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-sky-200";
}

/* ====== Props ====== */
type Props = { name: string; wx?: SpotWeather };

/* ====== Component ====== */
export default function QuickFacts({ name, wx }: Props) {
  const facts: PortFact | undefined = getPortFacts(name);
  const bft = ktToBeaufort(wx?.windKts);
  if (!facts && !wx) return null;

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-1 text-sm font-semibold">Quick facts</div>

      {/* VHF / Shelter / Exposure */}
      <div className="flex flex-wrap gap-2 text-xs">
        {facts?.vhf && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <b>VHF:</b> {facts.vhf}
          </span>
        )}
        {facts?.anchorage?.holding && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <b>Holding:</b> {facts.anchorage.holding}
          </span>
        )}
        {facts?.shelter && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <b>Shelter:</b> {facts.shelter}
          </span>
        )}
        {facts?.exposure && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <b>Exposure:</b> {facts.exposure}
          </span>
        )}
        {wx && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
            <b>WX:</b> {wx.label ?? "—"}
            {wx.tempC != null && <> • {wx.tempC}°C</>}
            {wx.windKts != null && (
              <> • {Math.round(wx.windKts)} kt (Bft {bft}{bftLabel(bft) ? `, ${bftLabel(bft)}` : ""})</>
            )}
          </span>
        )}
      </div>

      {facts?.anchorage?.notes && (
        <p className="mt-2 text-xs text-neutral-700">
          <b>Anchorage:</b> {facts.anchorage.notes}
        </p>
      )}

      {facts?.hazards?.length ? (
        <div className="mt-2">
          <div className="text-xs font-medium text-neutral-700 mb-1">Hazards</div>
          <div className="flex flex-wrap gap-1">
            {facts.hazards.map((h: PortHazard, i: number) => (
              <span
                key={`h-${i}`}
                className={`inline-block border rounded-full px-2 py-0.5 text-xs ${sevBadge(h.sev)}`}
                title={h.note || ""}
              >
                {h.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {facts?.notes?.length ? (
        <div className="mt-2">
          <ul className="list-disc pl-5 text-xs text-neutral-700">
            {facts.notes.map((t: string, i: number) => (
              <li key={`n-${i}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
