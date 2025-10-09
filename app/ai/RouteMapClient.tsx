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

/* Παίρνουμε το map instance */
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

type Ring = [number, number][]; // [lon, lat]
type PolyRings = { outer: Ring; holes: Ring[] };

/* ---- consts ---- */
const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* Tunables (A* + simplify + animation/UI) */
const BASE_CELL_DEG = 0.05;
const GRID_MARGIN_DEG = 0.50;      // αρκετό περιθώριο γύρω από κάθε leg
const NEAR_LAND_PENALTY = 1.0;     // αυξημένο κόστος κοντά στην ακτή
const SIMPLIFY_EPS = 0.006;

/* Animation */
const DRAW_POINTS_PER_SEC = 3;
const DRAW_INTERVAL_MS = Math.max(20, Math.round(1000 / DRAW_POINTS_PER_SEC));
const FOLLOW_ZOOM_MIN = 9;
const LEG_VIEW_ZOOM_MAX = 10;
const MARKER_FADE_MS = 280;

/* ---- helpers ---- */
const toRad = (x: number) => (x * Math.PI) / 180;
const sin2 = (x: number) => Math.sin(x) * Math.sin(x);
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = sin2(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sin2(dLon/2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---- Point-In-Polygon (outer + holes) ---- */
function pointInRing(pt: [number, number], ring: Ring): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function pointInPoly(pt: [number, number], poly: PolyRings): boolean {
  if (!pointInRing(pt, poly.outer)) return false;
  for (const hole of poly.holes) if (pointInRing(pt, hole)) return false;
  return true;
}
function collectPolys(geo: any): PolyRings[] {
  const polys: PolyRings[] = [];
  if (!geo) return polys;

  const pushPolygon = (coords: Ring[]) => {
    if (!coords?.length) return;
    const outer = coords[0];
    const holes = coords.slice(1);
    polys.push({ outer, holes });
  };

  const pushFromGeom = (g: any) => {
    if (!g) return;
    if (g.type === "Polygon") pushPolygon(g.coordinates as Ring[]);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates as Ring[][]) pushPolygon(p);
  };

  if (geo.type === "FeatureCollection") {
    for (const f of (geo.features ?? [])) pushFromGeom(f?.geometry);
  } else {
    pushFromGeom(geo);
  }
  return polys;
}

/* ---- Extra “land” barrier πάνω από τον Ισθμό (μπλοκάρει το πέρασμα) ---- */
function rectPoly(lonMin: number, latMin: number, lonMax: number, latMax: number): PolyRings {
  const outer: Ring = [
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
    [lonMin, latMin],
  ];
  return { outer, holes: [] };
}
// Καλύπτει ένα μικρό παραλληλόγραμμο πάνω από τον Ισθμό Κορίνθου
const EXTRA_LAND_BARRIERS: PolyRings[] = [
  rectPoly(22.93, 37.90, 23.08, 38.04),  //  ~15km “στεριά” για να μην περνάει εκτός αν το επιτρέψουμε ρητά
];

/* ---- Adaptive cell size ---- */
function pickCellDegForLeg(a: Point, b: Point) {
  const dLat = Math.abs(a.lat - b.lat);
  const dLon = Math.abs(a.lon - b.lon);
  const span = Math.max(dLat, dLon);
  let cell = Math.min(BASE_CELL_DEG, Math.max(0.01, span / 180));
  if (span < 1.20) cell = 0.020;
  if (span < 0.60) cell = 0.015;
  if (span < 0.35) cell = 0.012;
  if (span < 0.22) cell = 0.010;
  if (span < 0.12) cell = 0.008;
  return cell;
}

/* ---- Grid + A* ---- */
type GridNode = { r: number; c: number; lat: number; lon: number; walkable: boolean; nearLand: boolean };

function buildGridForBounds(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  coastPolys: PolyRings[],
  cellDeg: number
) {
  const rows = Math.max(12, Math.ceil((maxLat - minLat) / cellDeg));
  const cols = Math.max(12, Math.ceil((maxLon - minLon) / cellDeg));
  const grid: GridNode[][] = new Array(rows);

  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols);
    const lat = minLat + (r + 0.5) * (maxLat - minLat) / rows;
    for (let c = 0; c < cols; c++) {
      const lon = minLon + (c + 0.5) * (maxLon - minLon) / cols;
      const pt: [number, number] = [lon, lat];
      let onLand = false;
      for (const poly of coastPolys) { if (pointInPoly(pt, poly)) { onLand = true; break; } }
      grid[r][c] = { r, c, lat, lon, walkable: !onLand, nearLand: false };
    }
  }
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = grid[r][c]; if (!cell.walkable) continue;
    for (const [dr, dc] of dirs) {
      const rr = r + dr, cc = c + dc;
      if (rr<0||cc<0||rr>=rows||cc>=cols) continue;
      if (!grid[rr][cc].walkable) { cell.nearLand = true; break; }
    }
  }

  // γενναιόδωρο clearance γύρω από στεριά
  const clearanceCells = Math.max(1, Math.round(0.10 / cellDeg)); // ~0.10° ≈ 11 km
  if (clearanceCells > 0) {
    const toBlock: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!grid[r][c].walkable) {
        for (let dr = -clearanceCells; dr <= clearanceCells; dr++) {
          for (let dc = -clearanceCells; dc <= clearanceCells; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr<0||cc<0||rr>=rows||cc>=cols) continue;
            toBlock.push([rr, cc]);
          }
        }
      }
    }
    for (const [rr, cc] of toBlock) grid[rr][cc].walkable = false;
  }

  function nodeFor(lat: number, lon: number) {
    const r = Math.min(rows - 1, Math.max(0, Math.floor((lat - minLat) / ((maxLat - minLat) / rows))));
    const c = Math.min(cols - 1, Math.max(0, Math.floor((lon - minLon) / ((maxLon - minLon) / cols))));
    return grid[r][c];
  }
  return { grid, nodeFor };
}

function buildGridForLeg(a: Point, b: Point, coastPolys: PolyRings[]) {
  const minLat = Math.min(a.lat, b.lat) - GRID_MARGIN_DEG;
  const maxLat = Math.max(a.lat, b.lat) + GRID_MARGIN_DEG;
  const minLon = Math.min(a.lon, b.lon) - GRID_MARGIN_DEG;
  const maxLon = Math.max(a.lon, b.lon) + GRID_MARGIN_DEG;
  const cellDeg = pickCellDegForLeg(a, b);
  const { grid, nodeFor } = buildGridForBounds(minLat, maxLat, minLon, maxLon, coastPolys, cellDeg);
  return { grid, start: nodeFor(a.lat, a.lon), goal: nodeFor(b.lat, b.lon) };
}

function nearestWaterNode(grid: GridNode[][], start: GridNode) {
  if (start.walkable) return start;
  const q: GridNode[] = [start];
  const seen = new Set<string>([`${start.r},${start.c}`]);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  while (q.length) {
    const cur = q.shift()!;
    for (const [dr, dc] of dirs) {
      const rr = cur.r + dr, cc = cur.c + dc;
      if (rr<0||cc<0||rr>=grid.length||cc>=grid[0].length) continue;
      const nb = grid[rr][cc];
      const key = `${rr},${cc}`; if (seen.has(key)) continue; seen.add(key);
      if (nb.walkable) return nb;
      q.push(nb);
    }
  }
  return start;
}

function aStarWater(grid: GridNode[][], start: GridNode, goal: GridNode) {
  start = nearestWaterNode(grid, start);
  goal  = nearestWaterNode(grid, goal);

  const key = (n: GridNode) => `${n.r},${n.c}`;
  const open: GridNode[] = [start];
  const came = new Map<string, GridNode>();
  const gScore = new Map<string, number>([[key(start), 0]]);
  const fScore = new Map<string, number>([[key(start), haversineMeters(start.lat, start.lon, goal.lat, goal.lon)]]);
  const inOpen = new Set<string>([key(start)]);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];

  while (open.length) {
    open.sort((a, b) => (fScore.get(key(a))! - fScore.get(key(b))!));
    const current = open.shift()!; inOpen.delete(key(current));

    if (current.r === goal.r && current.c === goal.c) {
      const path: GridNode[] = [current];
      let curKey = key(current);
      while (came.has(curKey)) { const prev = came.get(curKey)!; path.push(prev); curKey = key(prev); }
      return path.reverse();
    }
    for (const [dr, dc] of dirs) {
      const rr = current.r + dr, cc = current.c + dc;
      if (rr<0||cc<0||rr>=grid.length||cc>=grid[0].length) continue;
      const nb = grid[rr][cc]; if (!nb.walkable) continue;

      const step = haversineMeters(current.lat, current.lon, nb.lat, nb.lon);
      const tentative = (gScore.get(key(current)) ?? Infinity) + step * (1 + (nb.nearLand ? NEAR_LAND_PENALTY : 0));

      const nbKey = key(nb);
      if (tentative < (gScore.get(nbKey) ?? Infinity)) {
        came.set(nbKey, current);
        gScore.set(nbKey, tentative);
        fScore.set(nbKey, tentative + haversineMeters(nb.lat, nb.lon, goal.lat, goal.lon));
        if (!inOpen.has(nbKey)) { open.push(nb); inOpen.add(nbKey); }
      }
    }
  }
  return null;
}

/* ---- Simplify ---- */
function perpendicularDistance(p: [number, number], a: [number, number], b: [number, number]) {
  const x0 = p[1], y0 = p[0], x1 = a[1], y1 = a[0], x2 = b[1], y2 = b[0];
  const num = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1);
  const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2) + 1e-9;
  return num / den;
}
function simplifyRDP(path: [number, number][], epsilonDeg = SIMPLIFY_EPS): [number, number][] {
  if (path.length <= 2) return path;
  let dmax = 0, index = 0;
  const end = path.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(path[i], path[0], path[end]);
    if (d > dmax) { index = i; dmax = d; }
  }
  if (dmax > epsilonDeg) {
    const rec1 = simplifyRDP(path.slice(0, index + 1), epsilonDeg);
    const rec2 = simplifyRDP(path.slice(index, path.length), epsilonDeg);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [path[0], path[end]];
  }
}

/* ---- Animated circle marker ---- */
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

  /* coast */
  const [coast, setCoast] = useState<any | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

  // Συγχώνευση ακτογραμμής + τεχνητό blocker Ισθμού
  const coastPolys = useMemo(() => {
    const base = collectPolys(coast);
    return base.concat(EXTRA_LAND_BARRIERS);
  }, [coast]);

  /* ---- compute water path + breakpoints ανά leg ---- */
  const { waterLatLngs, legEndIdx } = useMemo(() => {
    const result: { waterLatLngs: LatLngExpression[]; legEndIdx: number[] } = { waterLatLngs: [], legEndIdx: [] };
    if (points.length < 2) {
      result.waterLatLngs = points.map(p => [p.lat, p.lon] as LatLngExpression);
      return result;
    }
    const out: [number, number][][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      let seg: [number, number][] | null = null;
      if (coastPolys.length) {
        const { grid, start, goal } = buildGridForLeg(a, b, coastPolys);
        const path = aStarWater(grid, start, goal);
        if (path) {
          const mid = path.map(n => [n.lat, n.lon] as [number, number]);
          const midS = simplifyRDP(mid, SIMPLIFY_EPS);
          seg = [[a.lat, a.lon], ...midS, [b.lat, b.lon]];
        }
      }
      if (!seg) seg = [[a.lat, a.lon], [b.lat, b.lon]];

      // dedup
      const cleaned: [number, number][] = [];
      for (const pt of seg) {
        if (!cleaned.length) cleaned.push(pt);
        else {
          const last = cleaned[cleaned.length - 1];
          if (Math.abs(last[0]-pt[0]) > 1e-9 || Math.abs(last[1]-pt[1]) > 1e-9) cleaned.push(pt);
        }
      }
      out.push(cleaned);
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
  }, [points, coastPolys]);

  /* progressive draw */
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

  /* current leg index */
  const currentLegIndex = useMemo(() => {
    if (!legEndIdx.length) return -1;
    for (let i = 0; i < legEndIdx.length; i++) {
      if (drawCount - 1 <= legEndIdx[i]) return i;
    }
    return legEndIdx.length - 1;
  }, [drawCount, legEndIdx]);

  /* follow ship */
  const [followShip, setFollowShip] = useState(false);
  const lastFollowedPointRef = useRef<string>("");

  /* auto-zoom per leg */
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

  /* follow ship camera */
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
      {/* Follow ship toggle */}
      <div className="absolute right-3 top-3 z-[1000] no-print">
        <label className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs shadow border border-slate-200">
          <input type="checkbox" checked={followShip} onChange={(e) => setFollowShip(e.target.checked)} />
          Follow ship
        </label>
      </div>

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
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <CaptureMap onReady={setMap} />

        {/* GEBCO */}
        <Pane name="pane-gebco" style={{ zIndex: 200 }}>
          <TileLayer attribution="&copy; GEBCO" url="https://tiles.gebco.net/data/tiles/{z}/{x}/{y}.png" opacity={0.9} />
        </Pane>

        {/* light blue νερό */}
        <Pane name="pane-water" style={{ zIndex: 305 }}>
          <Rectangle
            bounds={WORLD_BOUNDS}
            pathOptions={{ color: "transparent", weight: 0, fillColor: "#7fa8d8", fillOpacity: 0.35 }}
            interactive={false}
          />
        </Pane>

        {/* στεριά (GeoJSON) */}
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (
            <GeoJSON
              data={coast}
              style={() => ({ color: "#0b1220", weight: 2, opacity: 1, fillColor: "#ffffff", fillOpacity: 1 })}
            />
          )}
        </Pane>

        {/* labels */}
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
            detectRetina
            opacity={0.55}
            errorTileUrl={TRANSPARENT_1PX}
            pane="pane-labels"
          />
        </Pane>

        {/* seamarks */}
        <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
          <TileLayer attribution="&copy; OpenSeaMap" url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.5} />
        </Pane>

        {/* full route (σκιά) */}
        <Pane name="pane-route-shadow" style={{ zIndex: 440 }}>
          {waterLatLngs.length >= 2 && (
            <Polyline
              pane="pane-route-shadow"
              positions={waterLatLngs}
              pathOptions={{ color: "#9aa3b2", weight: 2, opacity: 0.6, lineJoin: "round", lineCap: "round" }}
            />
          )}
        </Pane>

        {/* progressive dashed route */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {animatedLatLngs.length >= 2 && (
            <Polyline
              pane="pane-route"
              positions={animatedLatLngs}
              pathOptions={{ color: "#0b1220", weight: 3, opacity: 0.95, dashArray: "6 8", lineJoin: "round", lineCap: "round" }}
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
            const appearWhenIdx = legEndIdx[i] ?? 0;
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

        {/* αρχικό fit */}
        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
