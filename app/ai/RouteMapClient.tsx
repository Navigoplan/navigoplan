"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { name: string; lat: number; lon: number };

type MarineSegment = {
  ok: boolean;
  coords: [number, number][]; // [lat, lon]
};

export default function RouteMapClient({
  points,
  useMarine = true, // αν δεν θέλεις θαλάσσιο routing, βάλε false
}: {
  points: Point[];
  useMarine?: boolean;
}) {
  if (!points?.length) return null;

  // ευθείες (fallback) πάντα διαθέσιμες
  const straightLatLngs = useMemo<LatLngExpression[]>(
    () => points.map((p) => [p.lat, p.lon] as LatLngExpression),
    [points]
  );

  const center: LatLngExpression =
    straightLatLngs[0] ?? ([37.97, 23.72] as LatLngExpression);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (straightLatLngs.length < 2) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet") as typeof import("leaflet");
    const b = L.latLngBounds(straightLatLngs as any);
    return b.pad(0.08);
  }, [straightLatLngs]);

  // ===== Marine routing (Searoutes) =====
  // Ορίζεις το κλειδί σου σε NEXT_PUBLIC_SEAROUTES_KEY
  const apiKey =
    (typeof window !== "undefined" &&
      (window as any)?.__SEAROUTES_KEY__) ||
    process.env.NEXT_PUBLIC_SEAROUTES_KEY ||
    "";

  const [marine, setMarine] = useState<MarineSegment[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!useMarine || !apiKey || points.length < 2) {
        setMarine(null);
        return;
      }
      setLoading(true);
      const segs: MarineSegment[] = [];

      // κάνουμε ένα request ανά leg (Α→Β, Β→Γ, …)
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];

        try {
          // Searoutes v2 sea routing (Mapbox-like params)
          // Προσοχή: το Searoutes συνήθως θέλει lon,lat (όχι lat,lon)
          const url = `https://api.searoutes.com/route/v2/sea/${a.lon},${a.lat};${b.lon},${b.lat}?allowIceAreas=false&continuousCoordinates=true`;
          const res = await fetch(url, {
            headers: { "x-api-key": apiKey },
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();

          // Τα geometry coordinates είναι [lon, lat]; θα τα γυρίσουμε σε [lat, lon]
          const coords: [number, number][] =
            json?.routes?.[0]?.geometry?.coordinates?.map(
              ([lon, lat]: [number, number]) => [lat, lon]
            ) ?? [];

          if (coords.length >= 2) {
            segs.push({ ok: true, coords });
          } else {
            segs.push({ ok: false, coords: [] });
          }
        } catch {
          segs.push({ ok: false, coords: [] });
        }
      }

      if (!cancelled) {
        setMarine(segs);
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [points, apiKey, useMarine]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Βασικά tiles + seamarks */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TileLayer
          attribution="&copy; OpenSeaMap"
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          opacity={0.45}
        />

        {/* Θαλάσσιες γραμμές αν υπάρχουν, αλλιώς fallback dashed */}
        {useMarine && apiKey && marine && marine.some((s) => s.ok) ? (
          <>
            {marine.map((s, i) =>
              s.ok ? (
                <Polyline
                  key={`m-${i}`}
                  positions={s.coords as LatLngExpression[]}
                  pathOptions={{
                    color: "#0b1220",
                    weight: 3,
                    opacity: 0.95,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />
              ) : (
                // fallback για το συγκεκριμένο leg
                <Polyline
                  key={`f-${i}`}
                  positions={
                    [
                      [points[i].lat, points[i].lon],
                      [points[i + 1].lat, points[i + 1].lon],
                    ] as LatLngExpression[]
                  }
                  pathOptions={{
                    color: "#0b1220",
                    weight: 3,
                    opacity: 0.9,
                    dashArray: "6 8",
                  }}
                />
              )
            )}
          </>
        ) : (
          // καθολικό fallback (όλο το route dashed)
          straightLatLngs.length >= 2 && (
            <Polyline
              positions={straightLatLngs}
              pathOptions={{
                color: "#0b1220",
                weight: 3,
                opacity: 0.9,
                dashArray: "6 8",
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          )
        )}

        {/* Σημάδια start / mid / end */}
        {points[0] && (
          <CircleMarker
            center={[points[0].lat, points[0].lon]}
            radius={8}
            pathOptions={{
              color: "#c4a962",
              fillColor: "#c4a962",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              Start: {points[0].name}
            </Tooltip>
          </CircleMarker>
        )}

        {points.slice(1, -1).map((p) => (
          <CircleMarker
            key={`${p.name}-${p.lat}-${p.lon}`}
            center={[p.lat, p.lon]}
            radius={5}
            pathOptions={{
              color: "#0b1220",
              fillColor: "#0b1220",
              fillOpacity: 0.9,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {p.name}
            </Tooltip>
          </CircleMarker>
        ))}

        {points.length > 1 && (
          <CircleMarker
            center={[points.at(-1)!.lat, points.at(-1)!.lon]}
            radius={8}
            pathOptions={{
              color: "#c4a962",
              fillColor: "#c4a962",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              End: {points.at(-1)!.name}
            </Tooltip>
          </CircleMarker>
        )}

        {bounds && <FitToBounds bounds={bounds} />}
      </MapContainer>

      {/* μικρό overlay status αν θες */}
      {useMarine && apiKey && loading && (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          Routing at sea…
        </div>
      )}
      {!apiKey && useMarine && (
        <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          Add NEXT_PUBLIC_SEAROUTES_KEY to use sea routing
        </div>
      )}
    </div>
  );
}

function FitToBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [30, 30] });
    const onResize = () => map.fitBounds(bounds, { padding: [30, 30] });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map, bounds]);
  return null;
}
