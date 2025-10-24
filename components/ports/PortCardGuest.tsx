import type { PortEntry } from "@/lib/ports/usePorts";
export default function PortCardGuest({ p }: { p: PortEntry }) {
  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm">
      {p.guest.highlight_photo && (
        <div className="h-40 w-full bg-cover bg-center" style={{backgroundImage:`url(${p.guest.highlight_photo})`}} />
      )}
      <div className="p-4">
        <div className="text-lg font-semibold">{p.name_en} <span className="text-slate-500">({p.name_gr})</span></div>
        <div className="text-sm text-slate-600">{p.area} • {p.guest.vibe?.join(" • ")}</div>
        {p.guest.experience_notes && <p className="mt-2 text-sm">{p.guest.experience_notes}</p>}
      </div>
    </div>
  );
}
