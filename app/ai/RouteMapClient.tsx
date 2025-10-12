"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";

/* ---- react-leaflet dynamic (no SSR) ---- */
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const Polyline     = dynamic(() => import("react-leaflet").then(m => m.Polyline),     { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Tooltip      = dynamic(() => import("react-leaflet").then(m => m.Tooltip),      { ssr: false });
const GeoJSON      = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),      { ssr: false });
const Pane         = dynamic(() => import("react-leaflet").then(m => m.Pane),         { ssr: false });
const Rectangle    = dynamic(() => import("react-leaflet").then(m => m.Rectangle),    { ssr: false });

/* Παιδί που μας δίνει το map instance */
const CaptureMap = dynamic(async () => {
  const RL = await import("react-leaflet");
  const { useEffect } = await import("react");
  function Cmp({ onReady }: { onReady: (map: import("leaflet").Map) => void }) {
    const map = RL.useMap();
    useEffect(() => { onReady(map); }, [map, onReady]);
    return null;
  }
  return Cmp;
}, { ssr: false });

/* FitBounds helper */
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

/* ---- types ---- */
export type Point = { name: string; lat: number; lon: number };
export type Marker = { name: string; lat: number; lon: number };

/* ---- consts ---- */
const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* -------- Animation speed -------- */
const DRAW_POINTS_PER_SEC = 3;
const DRAW_INTERVAL_MS = Math.max(20, Math.round(1000 / DRAW_POINTS_PER_SEC));

const FOLLOW_ZOOM_MIN = 9;
const LEG_VIEW_ZOOM_MAX = 10;
const MARKER_FADE_MS = 280;

/* ---- Μικρό animated circle marker για fade-in ---- */
function useNow() {
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setTick(t => t + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
function AnimatedDot({
  center,
  label,
  active,
  onClick,
  appearAtMs,
  baseRadius = 5,
}: {
  center: LatLngExpression;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  appearAtMs: number;
  baseRadius?: number;
}) {
  useNow();
  const [start] = useState<number>(() => performance.now());
  const now = performance.now();
  const t = Math.max(0, Math.min(1, (now - appearAtMs - start) / MARKER_FADE_MS));
  const radius = (t <= 0 ? 0 : baseRadius * (0.66 + 0.34 * t));
  const opacity = t <= 0 ? 0 : 0.25 + 0.75 * t;

  return (
    <CircleMarker
      center={center}
      radius={radius}
      eventHandlers={onClick ? { click: onClick } : undefined}
      pathOptions={{
        color: active ? "#c4a962" : "#0b1220",
        fillColor: active ? "#c4a962" : "#0b1220",
        fillOpacity: opacity,
        opacity,
        weight: active ? 2 : 1.5,
      }}
    >
      {!!label && (
        <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
          {label}
        </Tooltip>
      )}
    </CircleMarker>
  );
}

/* ===================================================== */
export default function RouteMapClient({
  points,
  markers,
  activeNames,
  onMarkerClick,
}: {
  points: Point[];
  markers?: Marker[];
  activeNames?: string[];
  onMarkerClick?: (portName: string) => void;
}) {
  const [map, setMap] = useState<import("leaflet").Map | null>(null);

  /* ---------- Base map toggle & layer readiness ---------- */
  const [base, setBase] = useState<"gebco" | "osm">("gebco");
  const [baseReady, setBaseReady] = useState(false);
  const [deferOverlay, setDeferOverlay] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDeferOverlay(true), 200);
    return () => clearTimeout(id);
  }, []);

  /* ---------- ΑΠΕΝΕΡΓΟΠΟΙΗΣΗ coast (για τώρα) ---------- */
  // Δεν κάνουμε fetch του GeoJSON — μηδενίζουμε τα πάντα για να μην κολλάει
  const coast: any = null;
  const coastPolys: any[] = []; // σημαντικό: κενό => δεν τρέχει “αποφυγή στεριάς”

  /* ---- route points (χωρίς A* — ευθείες ανά leg) ---- */
  const { waterLatLngs, legEndIdx } = useMemo(() => {
    const result: { waterLatLngs: LatLngExpression[]; legEndIdx: number[] } = { waterLatLngs: [], legEndIdx: [] };
    if (points.length < 2) {
      result.waterLatLngs = points.map(p => [p.lat, p.lon] as LatLngExpression);
      return result;
    }
    const out: [number, number][][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const seg: [number, number][] = [[a.lat, a.lon], [b.lat, b.lon]];
      out.push(seg);
    }
    const joined: [number, number][] = [];
    const endIdx: number[] = [];
    for (let i = 0; i < out.length; i++) {
      const leg = out[i];
      if (!joined.length) joined.push(...leg);
      else joined.push(...leg.slice(1));
      endIdx.push(joined.length - 1);
    }
    result.waterLatLngs = joined as LatLngExpression[];
    result.legEndIdx = endIdx;
    return result;
  }, [points, coastPolys]); // coastPolys κενό => δεν θα ανα-υπολογίζει

  /* ---- progressive draw ---- */
  const [drawCount, setDrawCount] = useState(0);
  useEffect(() => { setDrawCount(waterLatLngs.length ? 1 : 0); }, [waterLatLngs]);
  useEffect(() => {
    if (drawCount <= 0 || drawCount >= waterLatLngs.length) return;
    const id = window.setInterval(() => {
      setDrawCount((c) => Math.min(c + 1, waterLatLngs.length));
    }, DRAW_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [drawCount, waterLatLngs.length]);

  const animatedLatLngs = useMemo<LatLngExpression[]>(() => {
    if (!waterLatLngs.length) return [];
    return (waterLatLngs as [number, number][]).slice(0, Math.max(2, drawCount)) as LatLngExpression[];
  }, [waterLatLngs, drawCount]);

  /* τρέχον leg index με βάση drawCount */
  const currentLegIndex = useMemo(() => {
    if (!legEndIdx.length) return -1;
    for (let i = 0; i < legEndIdx.length; i++) {
      if (drawCount - 1 <= legEndIdx[i]) return i;
    }
    return legEndIdx.length - 1;
  }, [drawCount, legEndIdx]);

  /* follow ship toggle + UI */
  const [followShip, setFollowShip] = useState(false);
  const lastFollowedPointRef = useRef<string>("");

  /* auto-zoom ανά leg */
  const prevLegRef = useRef<number>(-999);
  useEffect(() => {
    if (!map) return;
    if (followShip) return;
    if (currentLegIndex < 0) return;
    if (currentLegIndex === prevLegRef.current) return;
    prevLegRef.current = currentLegIndex;

    if (points[currentLegIndex] && points[currentLegIndex + 1]) {
      const a = points[currentLegIndex];
      const b = points[currentLegIndex + 1];
      const L = require("leaflet") as typeof import("leaflet");
      const bnds = L.latLngBounds([a.lat, a.lon], [b.lat, b.lon]).pad(0.18);
      map.flyToBounds(bnds, { padding: [28, 28] });
      setTimeout(() => { if (map && map.getZoom() > LEG_VIEW_ZOOM_MAX) map.setZoom(LEG_VIEW_ZOOM_MAX); }, 500);
    }
  }, [map, currentLegIndex, points, followShip]);

  /* follow ship */
  useEffect(() => {
    if (!map || !followShip || animatedLatLngs.length < 2) return;
    const tip = animatedLatLngs[animatedLatLngs.length - 1] as [number, number];
    const key = `${tip[0].toFixed(5)},${tip[1].toFixed(5)}`;
    if (lastFollowedPointRef.current === key) return;
    lastFollowedPointRef.current = key;
    const targetZoom = Math.max(map.getZoom(), FOLLOW_ZOOM_MIN);
    map.flyTo(tip as any, targetZoom, { duration: 0.5 });
  }, [animatedLatLngs, followShip, map]);

  /* markers */
  const markerStart = points[0] ?? null;
  const markerMids  = points.slice(1, -1);
  const markerEnd   = points.at(-1) ?? null;

  /* bounds/center */
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if ((waterLatLngs?.length ?? 0) < 2) return null;
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(waterLatLngs as any).pad(0.08);
  }, [waterLatLngs]);

  const center: LatLngExpression =
    (points[0] ? [points[0].lat, points[0].lon] : [37.97, 23.72]) as LatLngExpression;

  const isActive = (name: string) =>
    (activeNames ?? []).some(n => n.toLowerCase() === name.toLowerCase());

  function flyTo(name: string, lat: number, lon: number) {
    if (map) {
      const targetZoom = Math.max(map.getZoom(), 9);
      map.flyTo([lat, lon], targetZoom, { duration: 0.8 });
    }
    onMarkerClick?.(name);
  }

  const drawMs = drawCount * DRAW_INTERVAL_MS;

  return (
    <div className="w-full h-[420px] overflow-hidden rounded-2xl border border-slate-200 relative">
      {/* UI: Base toggle + Follow */}
      <div className="absolute right-3 top-3 z-[1000] flex gap-2 no-print">
        <label className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs shadow border border-slate-200">
          <input type="checkbox" checked={followShip} onChange={(e) => setFollowShip(e.target.checked)} />
          Follow ship
        </label>
        <button
          onClick={() => { setBaseReady(false); setBase(b => (b === "gebco" ? "osm" : "gebco")); }}
          className="rounded-xl bg-white/90 px-3 py-2 text-xs shadow border border-slate-200"
          title="Toggle base map"
        >
          Base: {base.toUpperCase()}
        </button>
      </div>

      {/* Loader overlay μέχρι να φορτώσει το base layer */}
      {!baseReady && (
        <div className="absolute inset-0 z-[1500] grid place-items-center bg-white/40 backdrop-blur-[1px]">
          <div className="animate-pulse text-[13px] px-3 py-2 rounded-md bg-white shadow border border-slate-200">
            Loading map…
          </div>
        </div>
      )}

      <style jsx global>{`
        .leaflet-tile[src*="tiles.gebco.net"] {
          filter: sepia(1) hue-rotate(190deg) saturate(4) brightness(1.04) contrast(1.06);
        }
        .leaflet-pane.pane-labels img.leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          filter: brightness(0.9) contrast(1.35);
        }
        .leaflet-pane.pane-labels img[src*="voyager_labels_over"]{
          filter: brightness(0.88) contrast(1.45);
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={7}
        minZoom={3}
        maxZoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <CaptureMap onReady={setMap} />

        {/* Base map */}
        <Pane name="pane-base" style={{ zIndex: 200 }}>
          {base === "gebco" ? (
            <TileLayer
              attribution="&copy; GEBCO"
              url="https://tiles.gebco.net/data/tiles/{z}/{x}/{y}.png"
              opacity={0.9}
              eventHandlers={{ load: () => setBaseReady(true), tileerror: () => setBaseReady(true) }}
            />
          ) : (
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{ load: () => setBaseReady(true), tileerror: () => setBaseReady(true) }}
            />
          )}
        </Pane>

        {/* light blue νερό */}
        <Pane name="pane-water" style={{ zIndex: 305 }}>
          <Rectangle
            bounds={WORLD_BOUNDS}
            pathOptions={{ color: "transparent", weight: 0, fillColor: "#7fa8d8", fillOpacity: 0.35 }}
            interactive={false}
          />
        </Pane>

        {/* στεριά — ΑΠΕΝΕΡΓΟΠΟΙΗΜΕΝΗ επίτηδες */}
        {/* {coast && (
          <Pane name="pane-land" style={{ zIndex: 310 }}>
            <GeoJSON data={coast} style={() => ({ color: "#0b1220", weight: 2, opacity: 1, fillColor: "#ffffff", fillOpacity: 1 })} />
          </Pane>
        )} */}

        {/* labels (deferred) */}
        {deferOverlay && (
          <Pane name="pane-labels" style={{ zIndex: 360 }}>
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
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png"
              tileSize={512}
              zoomOffset={-1}
              detectRetina={false}
              opacity={0.25}
              errorTileUrl={TRANSPARENT_1PX}
              pane="pane-labels"
            />
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
        )}

        {/* seamarks (deferred) */}
        {deferOverlay && (
          <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
            <TileLayer attribution="&copy; OpenSeaMap" url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.5} />
          </Pane>
        )}

        {/* full route (σκιά) */}
        <Pane name="pane-route-shadow" style={{ zIndex: 440 }}>
          {waterLatLngs.length >= 2 && (
            <Polyline
              pane="pane-route-shadow"
              positions={waterLatLngs}
              pathOptions={{
                color: "#9aa3b2",
                weight: 2,
                opacity: 0.6,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          )}
        </Pane>

        {/* progressive dashed route */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {animatedLatLngs.length >= 2 && (
            <Polyline
              pane="pane-route"
              positions={animatedLatLngs}
              pathOptions={{
                color: "#0b1220",
                weight: 3,
                opacity: 0.95,
                dashArray: "6 8",
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          )}

          {/* start */}
          {markerStart && (
            <AnimatedDot
              center={[markerStart.lat, markerStart.lon] as LatLngExpression}
              label={`Start: ${points[0]?.name}`}
              active
              appearAtMs={0}
              baseRadius={8}
            />
          )}

          {/* mids */}
          {markerMids.map((p, i) => {
            const legIdx = i;
            const appearWhenIdx = legEndIdx[legIdx] ?? 0;
            const appearAt = (appearWhenIdx + 1) * DRAW_INTERVAL_MS;
            const active = isActive(p.name);
            return (
              <AnimatedDot
                key={`${p.name}-${i}`}
                center={[p.lat, p.lon] as LatLngExpression}
                label={p.name}
                active={active}
                appearAtMs={appearAt}
                onClick={() => flyTo(p.name, p.lat, p.lon)}
                baseRadius={5}
              />
            );
          })}

          {/* end */}
          {markerEnd && (
            <AnimatedDot
              center={[markerEnd.lat, markerEnd.lon] as LatLngExpression}
              label={`End: ${points.at(-1)?.name}`}
              active
              appearAtMs={(legEndIdx[legEndIdx.length - 1] ?? 0) * DRAW_INTERVAL_MS}
              onClick={() => flyTo(markerEnd.name, markerEnd.lat, markerEnd.lon)}
              baseRadius={8}
            />
          )}
        </Pane>

        {/* dataset markers (προαιρετικά) */}
        {markers?.length ? (
          <Pane name="pane-dataset" style={{ zIndex: 430 }}>
            {markers.map((m, i) => (
              <CircleMarker
                key={`${m.name}-${i}`}
                pane="pane-dataset"
                center={[m.lat, m.lon] as LatLngExpression}
                radius={3.5}
                eventHandlers={{ click: () => flyTo(m.name, m.lat, m.lon) }}
                pathOptions={{
                  color: isActive(m.name) ? "#c4a962" : "#0b122033",
                  fillColor: isActive(m.name) ? "#c4a962" : "#0b122033",
                  fillOpacity: isActive(m.name) ? 0.95 : 0.5,
                  weight: isActive(m.name) ? 2 : 1,
                }}
              >
                {isActive(m.name) && (
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    {m.name}
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
          </Pane>
        ) : null}

        {/* αρχικό fit σε όλη τη διαδρομή */}
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
