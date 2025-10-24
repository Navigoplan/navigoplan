"use client";

import type { Port } from "@/lib/ports/ports";

export default function PortCardGuest({ p }: { p: Port }) {
  const g = p.guest ?? {};
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{p.name_en ?? p.name_gr}</h3>
        {g.luxury_score != null && (
          <span className="rounded-full border px-2 py-0.5 text-xs">Luxury {g.luxury_score}/10</span>
        )}
      </div>

      {g.highlight_photo && (
        <img
          src={g.highlight_photo}
          alt={p.name_en ?? ""}
          className="mt-2 h-40 w-full rounded-xl object-cover"
        />
      )}

      {g.vibe && g.vibe.length > 0 && (
        <p className="mt-2 text-sm text-gray-600">Vibe: {g.vibe.join(" · ")}</p>
      )}

      {g.experience_notes && <p className="mt-2 text-sm">{g.experience_notes}</p>}

      {g.recommended_spots && g.recommended_spots.length > 0 && (
        <p className="mt-2 text-sm text-gray-700">
          <span className="font-medium">Don't miss:</span> {g.recommended_spots.join(", ")}
        </p>
      )}

      <div className="mt-3 text-xs text-gray-500">
        {p.area && <span className="rounded bg-gray-100 px-2 py-1">{p.area}</span>}
        {p.crew?.type && (
          <span className="ml-2 rounded bg-gray-100 px-2 py-1 capitalize">{p.crew.type}</span>
        )}
      </div>
    </article>
  );
}
