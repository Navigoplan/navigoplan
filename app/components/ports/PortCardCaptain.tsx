"use client";

export default function PortCardCaptain({ p }: { p: any }) {
  const c = p.crew || {};
  return (
    <article className="rounded-xl border p-4 shadow-sm">
      <header className="mb-2">
        <h3 className="text-lg font-semibold">{p.name_en || p.name_gr}</h3>
        <p className="text-xs opacity-70">{p.area} • {p.region} • {c.type || "-"}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          {typeof c.min_depth_m === "number" && <p>Min depth: {c.min_depth_m} m</p>}
          {typeof c.max_depth_m === "number" && <p>Max depth: {c.max_depth_m} m</p>}
          {c.shelter_from && (
            <p>Shelter: {Array.isArray(c.shelter_from) ? c.shelter_from.join(", ") : c.shelter_from}</p>
          )}
          {c.mooring && <p>Mooring: {c.mooring}</p>}
          {c.holding && <p>Holding: {c.holding}</p>}
          {c.vhf_ch && <p>VHF: {c.vhf_ch}</p>}
        </div>
        <div>
          {c.dangers && <p className="text-red-600">Dangers: {c.dangers}</p>}
          {c.approach_notes && <p>Approach: {c.approach_notes}</p>}
          <p className="mt-1">
            Services:&nbsp;
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
              c.pump_out && "pump-out"
            ].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      </div>
    </article>
  );
}
