"use client";

import type { Port } from "@/lib/ports/ports";

export default function PortCardCaptain({ p }: { p: Port }) {
  const c = p.crew ?? {};
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{p.name_en ?? p.name_gr}</h3>
        {c.type && <span className="rounded-full border px-2 py-0.5 text-xs capitalize">{c.type}</span>}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          {c.vhf_ch && (
            <p>
              <span className="font-medium">VHF:</span> {c.vhf_ch}
            </p>
          )}
          {c.lat != null && c.lon != null && (
            <p>
              <span className="font-medium">Pos:</span> {c.lat}, {c.lon} ({c.datum ?? "WGS84"})
            </p>
          )}
          {(c.min_depth_m != null || c.max_depth_m != null) && (
            <p>
              <span className="font-medium">Depths:</span> {c.min_depth_m ?? "?"}–{c.max_depth_m ?? "?"} m
            </p>
          )}
          {c.shelter_from && (
            <p>
              <span className="font-medium">Shelter:</span>{" "}
              {Array.isArray(c.shelter_from) ? c.shelter_from.join(", ") : c.shelter_from}
            </p>
          )}
          {c.mooring && (
            <p>
              <span className="font-medium">Mooring:</span> {c.mooring}
            </p>
          )}
          {c.holding && (
            <p>
              <span className="font-medium">Holding:</span> {c.holding}
            </p>
          )}
        </div>

        <div>
          {c.dangers && (
            <p>
              <span className="font-medium">Dangers:</span> {c.dangers}
            </p>
          )}
          {c.approach_notes && (
            <p>
              <span className="font-medium">Approach:</span> {c.approach_notes}
            </p>
          )}
          <p className="mt-1">
            <span className="font-medium">Facilities:</span>{" "}
            {[
              c.water && "water",
              c.electricity && "electricity",
              c.fuel_diesel && "diesel",
              c.fuel_gasoline && "gasoline",
              c.wifi && "wifi",
              c.wc && "wc",
              c.showers && "showers",
              c.laundry && "laundry",
              c.atm && "atm",
              c.supermarket && "supermarket",
              c.pharmacy && "pharmacy",
              c.haul_out && "haul-out",
              c.repair && "repair",
              c.waste_oil && "waste-oil",
              c.pump_out && "pump-out",
              c.anchorage_only && "anchorage-only",
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </div>
      </div>

      {p.guest?.vibe && p.guest.vibe.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">Vibe: {p.guest.vibe.join(" · ")}</p>
      )}
    </article>
  );
}
