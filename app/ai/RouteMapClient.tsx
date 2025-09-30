"use client";

import { useEffect, useMemo } from "react";
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

/** ================= Types ================= */
export type Point = { name: string; lat: number; lon: number };

export default function RouteMapClient({
  points,
  viaCanal = false,
}: {
  points: Point[];
  /** αν το routing θέλεις να περάσει από τη Διώρυγα Κορίνθου */
  viaCanal?: boolean;
}) {
  if (!points?.length) return null;

  /** ===== Marine routing heuristic (Greece gates) ===== */
  type Gate = { name: string; lat: number; lon: number };

  const GATES: Gate[] = [
    { name: "Akra Sounio", lat: 37.650, lon: 24.017 },
    { name: "Cavo Doro (Kafireas)", lat: 38.030, lon: 24.533 },
    { name: "Akra Maleas", lat: 36.430, lon: 23.170 },
    { name: "Corinth Canal (Isthmia)", lat: 37.932, lon: 22.993 },
    // Χρήσιμα “κανάλια” στις Κυκλάδες (μαλακώνουν τη γραμμή)
    { name: "Paros–Naxos Channel", lat: 37.085, lon: 25.270 },
    { name: "Milos South Pass", lat: 36.650, lon: 24.500 },
  ];

  const toLL = (x: { lat: number; lon: number }) =>
    [x.lat, x.lon] as [number, number];

  const nearAtticaOrSaronic = (p: [number, number]) =>
    p[0] > 37.2 && p[0] < 38.2 && p[1] > 23.0 && p[1] < 24.2;

  const northernCyclades = (p: [number, number]) =>
    p[0] > 37.1 && p[0] < 38.6 && p[1] > 24.2 && p[1] < 25.8;

  const crossesEviaBox = (a: [number, number], b: [number, number]) => {
    // πρόχειρο κουτί γύρω από Εύβοια/Κάβο Ντόρο
    const west = Math.min(a[1], b[1]);
    const east = Math.max(a[1], b[1]);
    const south = Math.min(a[0], b[0]);
    const north = Math.max(a[0], b[0]);
    const box = { W: 23.5, E: 24.9, S: 37.5, N: 38.7 };
    return west < box.E && east > box.W && south < box.N && north > box.S;
  };

  function marineLeg(
    a: [number, number],
    b: [number, number],
    useCanal = false
  ): [number, number][] {
    const out: [number, number][] = [a];

    // Sounio “ευγενική στροφή” όταν φεύγουμε απ’ Αττική για Κυκλάδες
    if (nearAtticaOrSaronic(a) && b[1] > 24.0) {
      const so = GATES.find((g) => g.name.includes("Sounio"));
      if (so) out.push(toLL(so));
    }

    // Kάβο Ντόρο: Saronic/Attica <-> Β. Κυκλάδες (ή όταν "κόβει" Εύβοια)
    if (
      (nearAtticaOrSaronic(a) && northernCyclades(b)) ||
      (nearAtticaOrSaronic(b) && northernCyclades(a)) ||
      crossesEviaBox(a, b)
    ) {
      const kd = GATES.find((g) => g.name.includes("Cavo Doro"));
      if (kd) out.push(toLL(kd));
    }

    // Maleas: όταν περνάμε άκρα Πελοποννήσου (π.χ. Σαρωνικός -> Κρήτη/Δωδ/νησα)
    if (a[1] < 23.6 && b[1] < 24.2 && (a[0] < 37.1 || b[0] < 37.1)) {
      const ml = GATES.find((g) => g.name.includes("Maleas"));
      if (ml) out.push(toLL(ml));
    }

    // Διώρυγα Κορίνθου (αν ζητηθεί)
    if (useCanal) {
      const cc = GATES.find((g) => g.name.includes("Corinth Canal"));
      if (cc) out.push(toLL(cc));
    }

    out.push(b);
    return out;
  }

  function buildMarinePath(
    raw: { lat: number; lon: number }[],
    useCanal = false
  ): [number, number][] {
    if (raw.length < 2) return raw.map((p) => [p.lat, p.lon]);
    const res: [number, number][] = [];
    for (let i = 0; i < raw.length - 1; i++) {
      const a = [raw[i].lat, raw[i].lon] as [number, number];
      const b = [raw[i + 1].lat, raw[i + 1].lon] as [number, number];
      const seg = marineLeg(a, b, useCanal);
      if (i > 0) seg.shift(); // μην διπλασιάζεις το κοινό σημείο
      res.push(...seg);
    }
    return res;
  }

  /** ===== latlngs (με marine gates) ===== */
  const latlngs = useMemo<LatLngExpression[]>(
    () => buildMarinePath(points, viaCanal),
    [points, viaCanal]
  );

  /** ===== bounds για auto-fit ===== */
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (latlngs.length < 2) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet") as typeof import("leaflet");
    const b = L.latLngBounds(latlngs as any);
    return b.pad(0.10);
  }, [latlngs]);

  const center: LatLngExpression =
    (latlngs[0] as LatLngExpression) ?? ([37.97, 23.72] as LatLngExpression);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Base OSM */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Nautical overlay */}
        <TileLayer
          attribution="&copy; OpenSeaMap"
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          opacity={0.45}
        />

        {/* Dashed route */}
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

        {/* Start */}
        {points[0] && (
          <CircleMarker
            center={[points[0].lat, points[0].lon] as LatLngExpression}
            radius={8}
            pathOptions={{
              color: "#16a34a",
              fillColor: "#16a34a",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              Start: {points[0].name}
            </Tooltip>
          </CircleMarker>
        )}

        {/* Middles */}
        {points.slice(1, -1).map((p) => (
          <CircleMarker
            key={`${p.name}-${p.lat}-${p.lon}`}
            center={[p.lat, p.lon] as LatLngExpression}
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

        {/* End */}
        {points.length > 1 && (
          <CircleMarker
            center={
              [points.at(-1)!.lat, points.at(-1)!.lon] as LatLngExpression
            }
            radius={8}
            pathOptions={{
              color: "#c2410c",
              fillColor: "#c2410c",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
              End: {points.at(-1)!.name}
            </Tooltip>
          </CircleMarker>
        )}

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}

/** μικρό helper component για να γίνει fitBounds όταν αλλάζουν τα δεδομένα */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [30, 30] });
    const onResize = () => map.fitBounds(bounds, { padding: [30, 30] });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map, bounds]);
  return null;
}
