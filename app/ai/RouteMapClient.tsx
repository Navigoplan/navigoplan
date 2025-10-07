"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

/* -------- react-leaflet (dynamic to avoid SSR) -------- */
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer),     { ssr: false });
const Polyline      = dynamic(() => import("react-leaflet").then(m => m.Polyline),      { ssr: false });
const CircleMarker  = dynamic(() => import("react-leaflet").then(m => m.CircleMarker),  { ssr: false });
const Tooltip       = dynamic(() => import("react-leaflet").then(m => m.Tooltip),       { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),       { ssr: false });
const Pane          = dynamic(() => import("react-leaflet").then(m => m.Pane),          { ssr: false });
const Rectangle     = dynamic(() => import("react-leaflet").then(m => m.Rectangle),     { ssr: false });

/* FitBounds helper */
const FitBounds = dynamic(async () => {
  const RL = await import("react-leaflet");
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

/* -------- types & consts -------- */
export type Point = { name: string; lat: number; lon: number };

const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* =======================================================
 * RouteMapClient
 * ======================================================= */
export default function RouteMapClient({ points }: { points: Point[] }) {
  const [coast, setCoast] = useState<any | null>(null);

  /* load coastlines GeoJSON once */
  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

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
    <div className="w-full h-[420px] overflow-hidden rounded-2xl border border-slate-200 relative">
      {/* Global CSS tweaks */}
      <style jsx global>{`
        /* Ελαφρύ tint στα GEBCO για να δένει με το overlay νερού */
        .leaflet-tile[src*="tiles.gebco.net"] {
          filter: sepia(1) hue-rotate(190deg) saturate(4) brightness(1.04) contrast(1.06);
        }
        /* Πιο έντονα labels γενικά */
        .leaflet-pane.pane-labels img.leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          filter: brightness(0.9) contrast(1.35);
        }
        /* Λίγο παραπάνω contrast μόνο στα voyager_labels */
        .leaflet-pane.pane-labels img[src*="voyager_labels_over"]{
          filter: brightness(0.88) contrast(1.45);
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={7}
        minZoom={3}
        maxZoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* GEBCO base */}
        <Pane name="pane-gebco" style={{ zIndex: 200 }}>
          <TileLayer
            attribution="&copy; GEBCO"
            url="https://tiles.gebco.net/data/tiles/{z}/{x}/{y}.png"
            opacity={0.9}
          />
        </Pane>

        {/* light blue water overlay */}
        <Pane name="pane-water" style={{ zIndex: 305 }}>
          <Rectangle
            bounds={WORLD_BOUNDS}
            pathOptions={{ color: "transparent", weight: 0, fillColor: "#7fa8d8", fillOpacity: 0.35 }}
            interactive={false}
          />
        </Pane>

        {/* land polygons from GeoJSON (white land, dark outline) */}
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (
            <GeoJSON
              data={coast}
              style={() => ({ color: "#0b1220", weight: 2, opacity: 1, fillColor: "#ffffff", fillOpacity: 1 })}
            />
          )}
        </Pane>

        {/* LABELS: βασικό @2x + outline + extra voyager για περισσότερα τοπωνύμια */}
        <Pane name="pane-labels" style={{ zIndex: 360 }}>
          {/* βασικά μεγάλα ονόματα (light) */}
          <TileLayer
            attribution="&copy; OpenStreetMap contributors, &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png"
            tileSize={512}
            zoomOffset={-1}
            detectRetina={false}
            opacity={0.75}
            errorTileUrl={TRANSPARENT_1PX}
            pane="pane-labels"
          />
          {/* outline (dark) για καλύτερη αναγνωσιμότητα */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png"
            tileSize={512}
            zoomOffset={-1}
            detectRetina={false}
            opacity={0.25}
            errorTileUrl={TRANSPARENT_1PX}
            pane="pane-labels"
          />
          {/* επιπλέον, πιο "πυκνά" labels */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_over/{z}/{x}/{y}.png"
            tileSize={256}
            zoomOffset={0}
            detectRetina={true}
            opacity={0.55}
            errorTileUrl={TRANSPARENT_1PX}
            pane="pane-labels"
          />
        </Pane>

        {/* seamarks */}
        <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
          <TileLayer
            attribution="&copy; OpenSeaMap"
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.5}
          />
        </Pane>

        {/* route + markers πάνω από όλα */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {latlngs.length >= 2 && (
            <Polyline
              pane="pane-route"
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

          {/* start */}
          {points[0] && (
            <CircleMarker
              pane="pane-route"
              center={[points[0].lat, points[0].lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                Start: {points[0].name}
              </Tooltip>
            </CircleMarker>
          )}

          {/* middle points */}
          {points.slice(1, -1).map((p) => (
            <CircleMarker
              key={`${p.name}-${p.lat}-${p.lon}`}
              pane="pane-route"
              center={[p.lat, p.lon] as LatLngExpression}
              radius={5}
              pathOptions={{ color: "#0b1220", fillColor: "#0b1220", fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                {p.name}
              </Tooltip>
            </CircleMarker>
          ))}

          {/* end */}
          {points.length > 1 && (
            <CircleMarker
              pane="pane-route"
              center={[points.at(-1)!.lat, points.at(-1)!.lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                End: {points.at(-1)!.name}
              </Tooltip>
            </CircleMarker>
          )}
        </Pane>

        {/* auto-fit στην διαδρομή */}
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
