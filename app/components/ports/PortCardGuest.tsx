"use client";

export default function PortCardGuest({ p }: { p: any }) {
  const g = p.guest || {};
  return (
    <article className="rounded-xl border p-4 shadow-sm">
      <header className="mb-2">
        <h3 className="text-lg font-semibold">{p.name_en || p.name_gr}</h3>
        <p className="text-xs opacity-70">{p.area} • {p.region}</p>
      </header>

      {g.highlight_photo && (
        <img src={g.highlight_photo} alt={p.name_en} className="mb-3 h-40 w-full rounded-lg object-cover" />
      )}

      {Array.isArray(g.vibe) && g.vibe.length > 0 && (
        <p className="mb-1 text-sm"><span className="font-medium">Vibe:</span> {g.vibe.join(", ")}</p>
      )}
      {typeof g.luxury_score === "number" && (
        <p className="mb-1 text-sm"><span className="font-medium">Luxury score:</span> {g.luxury_score}/10</p>
      )}
      {g.experience_notes && (
        <p className="mb-1 text-sm">{g.experience_notes}</p>
      )}
      {Array.isArray(g.recommended_spots) && g.recommended_spots.length > 0 && (
        <p className="text-sm"><span className="font-medium">Don’t miss:</span> {g.recommended_spots.join(", ")}</p>
      )}
    </article>
  );
}
