"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  GeoJSON,
  Pane,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

/* ========= Types ========= */
type Point = { name: string; lat: number; lon: number };

/* ========= Consts ========= */
const ATHENS: LatLngExpression = [37.975, 23.734];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

/* ========= Fit helper ========= */
function FitOnChange({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [28, 28] });
    const onResize = () => map.fitBounds(bounds, { padding: [28, 28] });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map, bounds]);
  return null;
}

/* ========= Component ========= */
export default function RouteMapClient({ points }: { points: Point[] }) {
  const [coastlines, setCoastlines] = useState<any | null>(null);

  // load coastlines once
  useEffect(() => {
    let alive = true;
    fetch("/data/coastlines-gr.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((gj) => {
        if (alive) setCoastlines(gj);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const latlngs = useMemo<LatLngExpression[]>(
    () => points.map((p) => [p.lat, p.lon] as LatLngExpression),
    [points]
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (latlngs.length < 2) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(latlngs as any).pad(0.08);
  }, [latlngs]);

  const center: LatLngExpression = latlngs[0] ?? ATHENS;

  const routeStyle: PathOptions = {
    color: "#0b1220",
    weight: 3,
    opacity: 0.95,
    dashArray: "6 8",
    lineJoin: "round",
    lineCap: "round",
  };

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={7}
        minZoom={3}
        maxZoom={16}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        {/* ==== Basemap (κάτω-κάτω) ==== */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ==== Coastlines (λευκή ξηρά / σκούρο περίγραμμα) ==== */}
        {coastlines && (
          <Pane name="pane-coast" style={{ zIndex: 610 }}>
            <GeoJSON
              data={coastlines as any}
              style={() => ({
                color: "#0b1220",
                weight: 2,
                fillColor: "#ffffff",
                fillOpacity: 1,
              })}
            />
          </Pane>
        )}

        {/* ==== Seamarks πάνω από το basemap αλλά κάτω από labels/route ==== */}
        <Pane name="pane-seamarks" style={{ zIndex: 620 }}>
          <TileLayer
            attribution="&copy; OpenSeaMap"
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.5}
          />
        </Pane>

        {/* ==== Labels overlay (light + dark outline) για ισχυρότερο contrast ==== */}
        <Pane name="pane-labels" style={{ zIndex: 640 }}>
          {/* Light labels (κύριο) */}
          <TileLayer
            attribution="&copy; OSM & CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png"
            subdomains={["a", "b", "c", "d"]}
            tileSize={256}
            zoomOffset={-1}          // μεγαλύτερη γραμματοσειρά, χωρίς να «χάνονται» tiles
            detectRetina={false}
            opacity={0.88}
            crossOrigin={true as any}
            errorTileUrl={TRANSPARENT_1PX}
          />
          {/* Dark labels outline για ευκρίνεια */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png"
            subdomains={["a", "b", "c", "d"]}
            tileSize={256}
            zoomOffset={-1}
            detectRetina={false}
            opacity={0.36}
            crossOrigin={true as any}
            errorTileUrl={TRANSPARENT_1PX}
          />
        </Pane>

        {/* ==== Route (πάνω-πάνω) ==== */}
        {latlngs.length >= 2 && (
          <Pane name="pane-route" style={{ zIndex: 650 }}>
            <Polyline positions={latlngs} pathOptions={routeStyle} />
          </Pane>
        )}

        {/* ==== Markers ==== */}
        <Pane name="pane-markers" style={{ zIndex: 660 }}>
          {points[0] && (
            <CircleMarker
              center={[points[0].lat, points[0].lon] as LatLngExpression}
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
              center={[p.lat, p.lon] as LatLngExpression}
              radius={5}
              pathOptions={{
                color: "#0b1220",
                fillColor: "#0b1220",
                fillOpacity: 0.95,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                {p.name}
              </Tooltip>
            </CircleMarker>
          ))}

          {points.length > 1 && (
            <CircleMarker
              center={[
                points[points.length - 1].lat,
                points[points.length - 1].lon,
              ] as LatLngExpression}
              radius={8}
              pathOptions={{
                color: "#c4a962",
                fillColor: "#c4a962",
                fillOpacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                End: {points[points.length - 1].name}
              </Tooltip>
            </CircleMarker>
          )}
        </Pane>

        {/* Auto-fit στα bounds */}
        {bounds && <FitOnChange bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
