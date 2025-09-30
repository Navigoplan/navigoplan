"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Point = { name: string; lat: number; lon: number };

export default function RouteMap({ points }: { points: Point[] }) {
  if (!points.length) return null;

  const latlngs = points.map((p) => [p.lat, p.lon]) as [number, number][];
  const center = [
    latlngs.reduce((a, b) => a + b[0], 0) / latlngs.length,
    latlngs.reduce((a, b) => a + b[1], 0) / latlngs.length,
  ] as [number, number];

  function routeBounds() {
    const lats = latlngs.map(([la]) => la);
    const lons = latlngs.map(([, lo]) => lo);
    return [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ] as [[number, number], [number, number]];
  }

  function FitToRouteControl() {
    const map = useMap();
    useEffect(() => {
      if (latlngs.length >= 2) {
        map.fitBounds(routeBounds(), { padding: [30, 30] });
      } else {
        map.setView(center, 7);
      }
    }, [latlngs, map]);
    return null;
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TileLayer attribution="&copy; OpenSeaMap" url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.45} />

        {latlngs.length >= 2 && (
          <Polyline positions={latlngs} pathOptions={{ color: "#0b1220", weight: 3, dashArray: "6 8" }} />
        )}

        {points[0] && (
          <CircleMarker center={[points[0].lat, points[0].lon]} radius={8} pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              Start: {points[0].name}
            </Tooltip>
          </CircleMarker>
        )}

        {points.slice(1, -1).map((p) => (
          <CircleMarker key={p.name} center={[p.lat, p.lon]} radius={5} pathOptions={{ color: "#0b1220", fillColor: "#0b1220", fillOpacity: 0.9 }}>
            <Tooltip>{p.name}</Tooltip>
          </CircleMarker>
        ))}

        {points.length > 1 && (
          <CircleMarker center={[points.at(-1)!.lat, points.at(-1)!.lon]} radius={8} pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              End: {points.at(-1)!.name}
            </Tooltip>
          </CircleMarker>
        )}

        <FitToRouteControl />
      </MapContainer>
    </div>
  );
}
