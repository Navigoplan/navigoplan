"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

// SSR-safe react-leaflet
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer),     { ssr: false });
const Polyline      = dynamic(() => import("react-leaflet").then(m => m.Polyline),      { ssr: false });
const CircleMarker  = dynamic(() => import("react-leaflet").then(m => m.CircleMarker),  { ssr: false });
const Tooltip       = dynamic(() => import("react-leaflet").then(m => m.Tooltip),       { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),       { ssr: false });
const Pane          = dynamic(() => import("react-leaflet").then(m => m.Pane),          { ssr: false });

const FitBounds = dynamic(async () => {
  const RL = await import("react-leaflet");
  const { useEffect } = await import("react");
  function Cmp({ bounds }: { bounds: LatLngBoundsExpression }) {
    const map = RL.useMap();
    useEffect(() => {
      map.fitBounds(bounds, { padding: [30, 30] });
      const onResize = () => map.fitBounds(bounds, { padding: [30, 30] });
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [map, bounds]);
    return null;
  }
  return Cmp;
}, { ssr: false });

export type Point = { name: string; lat: number; lon: number };

export default function RouteMapClient({
  points,
  viaCanal,
}: {
  points: Point[];
  viaCanal?: boolean;
}) {
  // Land/Coast GeoJSON
  const [coast, setCoast] = useState<any | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

  // Route & bounds
  const latlngs = useMemo<LatLngExpression[]>(
    () => points.map(p => [p.lat, p.lon] as LatLngExpression),
    [points]
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (latlngs.length < 2) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(latlngs as any).pad(0.08);
  }, [latlngs]);

  const center: LatLngExpression = latlngs[0] ?? ([37.97, 23.72] as LatLngExpression);

  return (
    <div className="w-full h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      {/* Σωστό selector για το pane του GEBCO – tint μόνο εκεί */}
      <style jsx global>{`
        .leaflet-gebco-pane {
          filter: hue-rotate(200deg) saturate(1.6) brightness(1.05) contrast(1.08);
        }
      `}</style>

      <MapContainer center={center} zoom={6} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        {/* === Panes & Layers (κάτω → πάνω) === */}

        {/* 1) GEBCO bathymetry με μπλε tint (pane class + zIndex μέσω style) */}
        <Pane name="gebco" className="leaflet-gebco-pane" style={{ zIndex: 200 }}>
          <TileLayer
            attribution="&copy; GEBCO"
            url="https://tiles.gebco.net/data/tiles/{z}/{x}/{y}.png"
            opacity={0.9}
          />
        </Pane>

        {/* 2) Labels-only overlay (Carto) — διακριτικό, πάνω από GEBCO */}
        <Pane name="labels" style={{ zIndex: 360 }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors, &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
            opacity={0.22}   // 0.16–0.30 ανάλογα με προτίμηση
          />
        </Pane>

        {/* 3) Seamarks — πάνω από labels */}
        <Pane name="seamarks" style={{ zIndex: 400 }}>
          <TileLayer
            attribution="&copy; OpenSeaMap"
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.5}
          />
        </Pane>

        {/* 4) Στεριά: λευκό fill με μαύρο περίγραμμα */}
        {coast && (
          <GeoJSON
            data={coast}
            style={() => ({
              color: "#0b1220",
              weight: 2,
              opacity: 1,
              fillColor: "#ffffff",
              fillOpacity: 1,
            })}
          />
        )}

        {/* 5) Route polyline */}
        {latlngs.length >= 2 && (
          <Polyline
            positions={latlngs}
            pathOptions={{
              color: "#0b1220",
              weight: 3,
              opacity: 0.9,
              dashArray: "6 8",
              lineJoin: "round",
              lineCap: "round",
            }}
          />
        )}

        {/* 6) Markers */}
        {points[0] && (
          <CircleMarker
            center={[points[0].lat, points[0].lon] as LatLngExpression}
            radius={8}
            pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              Start: {points[0].name}
            </Tooltip>
          </CircleMarker>
        )}
        {points.slice(1, -1).map((p) => (
          <CircleMarker
            key={`${p.name}-${p.lat}-${p.lon}`}
            center={[p.lat, p.lon] as LatLngExpression}
            radius={5}
            pathOptions={{ color: "#0b1220", fillColor: "#0b1220", fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {p.name}
            </Tooltip>
          </CircleMarker>
        ))}
        {points.length > 1 && (
          <CircleMarker
            center={[points.at(-1)!.lat, points.at(-1)!.lon] as LatLngExpression}
            radius={8}
            pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              End: {points.at(-1)!.name}
            </Tooltip>
          </CircleMarker>
        )}

        {/* Fit */}
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
