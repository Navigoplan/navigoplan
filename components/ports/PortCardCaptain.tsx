import type { PortEntry } from "@/lib/ports/usePorts";
export default function PortCardCaptain({ p }: { p: PortEntry }) {
  const c = p.crew;
  const fac = Object.entries(c.facilities||{}).filter(([,v])=>v).map(([k])=>k.replace(/_/g," ")).join(", ");
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-lg font-semibold">{p.name_en} <span className="text-slate-500">({p.name_gr})</span></div>
      <div className="text-xs text-slate-500">{c.type} • {p.area} • {c.vhf ?? ""}</div>
      <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
        <div>
          <div><b>Lat/Lon:</b> {c.lat ?? "-"}, {c.lon ?? "-"} (WGS84)</div>
          <div><b>Depths:</b> {c.min_depth_m ?? "-"}–{c.max_depth_m ?? "-"} m</div>
          <div><b>Shelter:</b> {(c.shelter_from||[]).join(", ") || "-"}</div>
          <div><b>Mooring:</b> {c.mooring || "-"}</div>
          <div><b>Holding:</b> {c.holding || "-"}</div>
        </div>
        <div>
          <div><b>Approach:</b> {c.approach_notes || "-"}</div>
          <div><b>Dangers:</b> {c.dangers || "-"}</div>
          <div><b>Facilities:</b> {fac || "-"}</div>
        </div>
      </div>
    </div>
  );
}
