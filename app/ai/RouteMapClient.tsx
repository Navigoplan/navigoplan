"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

/* ===== react-leaflet (dynamic για SSR) ===== */
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

/* ===== types & consts ===== */
export type Point = { name: string; lat: number; lon: number };

/** GeoJSON coordinate helpers (lon,lat) */
type Coord      = [number, number];
type GJRing     = Coord[];          // LinearRing
type GJPolygon  = GJRing[];         // Polygon: [ring, ring, ...]
type GJMultiPol = GJPolygon[];      // MultiPolygon: [polygon, polygon, ...]

const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* === Tunables === */
const CELL_DEG = 0.05;
const GRID_MARGIN_DEG = 0.30;
const NEAR_LAND_PENALTY = 0.25;

/* ===== μικρές γεω-συναρτήσεις ===== */
function toRad(x: number) { return (x * Math.PI) / 180; }
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ===== Point in (Multi)Polygon (lon,lat) — even-odd rule ===== */
function pointInRing(pt: Coord, ring: GJRing): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function pointInPolygon(pt: Coord, poly: GJPolygon): boolean {
  // even-odd με holes (κάθε ring flip-άρει)
  let inside = false;
  for (const ring of poly) {
    if (pointInRing(pt, ring)) inside = !inside;
  }
  return inside;
}

/** Μαζεύει **όλα** τα Polygon (GJPolygon) από οποιοδήποτε valid GeoJSON */
function collectPolygons(geo: any): GJPolygon[] {
  const out: GJPolygon[] = [];
  if (!geo) return out;

  // FeatureCollection
  if (geo.type === "FeatureCollection" && Array.isArray(geo.features)) {
    for (const f of geo.features) out.push(...collectPolygons(f));
    return out;
  }

  // Feature
  if (geo.type === "Feature" && geo.geometry) {
    out.push(...collectPolygons(geo.geometry));
    return out;
  }

  // Geometry
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
    out.push(geo.coordinates as GJPolygon);
    return out;
  }
  if (geo.type === "MultiPolygon" && Array.isArray(geo.coordinates)) {
    for (const poly of geo.coordinates as GJMultiPol) out.push(poly);
    return out;
  }

  return out;
}

/* ======== Water-grid router (A*) ======== */
type GridNode = { r: number; c: number; lat: number; lon: number; walkable: boolean; nearLand: boolean };

function buildGridForLeg(a: Point, b: Point, coastGeojson: any) {
  const minLat = Math.min(a.lat, b.lat) - GRID_MARGIN_DEG;
  const maxLat = Math.max(a.lat, b.lat) + GRID_MARGIN_DEG;
  const minLon = Math.min(a.lon, b.lon) - GRID_MARGIN_DEG;
  const maxLon = Math.max(a.lon, b.lon) + GRID_MARGIN_DEG;

  const rows = Math.max(8, Math.ceil((maxLat - minLat) / CELL_DEG));
  const cols = Math.max(8, Math.ceil((maxLon - minLon) / CELL_DEG));

  const polygons: GJPolygon[] = collectPolygons(coastGeojson);

  const grid: GridNode[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols);
    const lat = minLat + (r + 0.5) * (maxLat - minLat) / rows;
    for (let c = 0; c < cols; c++) {
      const lon = minLon + (c + 0.5) * (maxLon - minLon) / cols;
      const pt: Coord = [lon, lat]; // ΣΗΜΑΝΤΙΚΟ: (lon, lat) για polygons

      // Αν μέσα σε οποιοδήποτε polygon => στεριά
      let onLand = false;
      for (const poly of polygons) {
        if (pointInPolygon(pt, poly)) { onLand = true; break; }
      }

      grid[r][c] = { r, c, lat, lon, walkable: !onLand, nearLand: false };
    }
  }

  // nearLand flag (γειτονιά μη walkable)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (!cell.walkable) continue;
      let near = false;
      for (const [dr, dc] of dirs) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        if (!grid[rr][cc].walkable) { near = true; break; }
      }
      cell.nearLand = near;
    }
  }

  function nodeFor(lat: number, lon: number) {
    const r = Math.min(rows - 1, Math.max(0, Math.floor((lat - minLat) / ((maxLat - minLat) / rows))));
    const c = Math.min(cols - 1, Math.max(0, Math.floor((lon - minLon) / ((maxLon - minLon) / cols))));
    return grid[r][c];
  }

  return { grid, start: nodeFor(a.lat, a.lon), goal: nodeFor(b.lat, b.lon) };
}

function aStarWater(grid: GridNode[][], start: GridNode, goal: GridNode) {
  function nearestWater(node: GridNode): GridNode {
    if (node.walkable) return node;
    const q: GridNode[] = [node];
    const seen = new Set<string>([`${node.r},${node.c}`]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    while (q.length) {
      const cur = q.shift()!;
      for (const [dr, dc] of dirs) {
        const rr = cur.r + dr, cc = cur.c + dc;
        if (rr < 0 || cc < 0 || rr >= grid.length || cc >= grid[0].length) continue;
        const nb = grid[rr][cc];
        const key = `${rr},${cc}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (nb.walkable) return nb;
        q.push(nb);
      }
    }
    return node;
  }

  start = nearestWater(start);
  goal  = nearestWater(goal);

  const key = (n: GridNode) => `${n.r},${n.c}`;
  const open: GridNode[] = [start];
  const came = new Map<string, GridNode>();
  const gScore = new Map<string, number>([[key(start), 0]]);
  const fScore = new Map<string, number>([[key(start), haversineMeters(start.lat, start.lon, goal.lat, goal.lon)]]);
  const inOpen = new Set<string>([key(start)]);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];

  while (open.length) {
    open.sort((a, b) => (fScore.get(key(a))! - fScore.get(key(b))!));
    const current = open.shift()!;
    inOpen.delete(key(current));

    if (current === goal || (current.r === goal.r && current.c === goal.c)) {
      const path: GridNode[] = [current];
      let curKey = key(current);
      while (came.has(curKey)) {
        const prev = came.get(curKey)!;
        path.push(prev);
        curKey = key(prev);
      }
      return path.reverse();
    }

    for (const [dr, dc] of dirs) {
      const rr = current.r + dr, cc = current.c + dc;
      if (rr < 0 || cc < 0 || rr >= grid.length || cc >= grid[0].length) continue;
      const nb = grid[rr][cc];
      if (!nb.walkable) continue;

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

/* ===== Ramer–Douglas–Peucker ===== */
function perpendicularDistance(p: Coord, a: Coord, b: Coord) {
  const x0 = p[1], y0 = p[0];
  const x1 = a[1], y1 = a[0];
  const x2 = b[1], y2 = b[0];
  const num = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1);
  const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2) + 1e-9;
  return num / den;
}
function simplifyRDP(path: Coord[], epsilonDeg = 0.01): Coord[] {
  if (path.length <= 2) return path;
  let dmax = 0, index = 0;
  const end = path.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(path[i], path[0], path[end]);
    if (d > dmax) { index = i; dmax = d; }
  }
  if (dmax > epsilonDeg) {
    const rec1 = simplifyRDP(path.slice(0, index + 1), epsilonDeg);
    const rec2 = simplifyRDP(path.slice(index), epsilonDeg);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [path[0], path[end]];
  }
}

/* =======================================================
 * RouteMapClient
 * ======================================================= */
export default function RouteMapClient({ points }: { points: Point[] }) {
  const [coast, setCoast] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

  const straightLatLngs = useMemo<LatLngExpression[]>(
    () => points.map(p => [p.lat, p.lon] as LatLngExpression),
    [points]
  );

  const waterLatLngs = useMemo<LatLngExpression[]>(() => {
    if (!coast || points.length < 2) return straightLatLngs;

    const out: Coord[] = [];
    function addPath(path: GridNode[] | null, a: Point, b: Point) {
      if (!path) {
        if (out.length === 0) out.push([a.lat, a.lon]);
        out.push([b.lat, b.lon]);
        return;
      }
      const seg: Coord[] = path.map(n => [n.lat, n.lon]);
      const simplified = simplifyRDP(seg, 0.008);
      if (out.length === 0) out.push(...simplified);
      else out.push(...simplified.slice(1));
    }

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const { grid, start, goal } = buildGridForLeg(a, b, coast);
      const path = aStarWater(grid, start, goal);
      addPath(path, a, b);
    }
    return out as unknown as LatLngExpression[];
  }, [coast, points, straightLatLngs]);

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (waterLatLngs.length < 2) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(waterLatLngs as any).pad(0.08);
  }, [waterLatLngs]);

  const center: LatLngExpression =
    (waterLatLngs[0] as LatLngExpression) ?? ([37.97, 23.72] as LatLngExpression);

  return (
    <div className="w-full h-[420px] overflow-hidden rounded-2xl border border-slate-200 relative">
      <style jsx global>{`
        .leaflet-tile[src*="tiles.gebco.net"] {
          filter: sepia(1) hue-rotate(190deg) saturate(4) brightness(1.04) contrast(1.06);
        }
        .leaflet-pane.pane-labels img.leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          filter: brightness(0.9) contrast(1.35);
        }
        .leaflet-pane.pane-labels img[src*="voyager_labels_over"] {
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

        {/* land polygons */}
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (
            <GeoJSON
              data={coast}
              style={() => ({ color: "#0b1220", weight: 2, opacity: 1, fillColor: "#ffffff", fillOpacity: 1 })}
            />
          )}
        </Pane>

        {/* LABELS */}
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

        {/* seamarks */}
        <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
          <TileLayer
            attribution="&copy; OpenSeaMap"
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            opacity={0.5}
          />
        </Pane>

        {/* route + markers */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {waterLatLngs.length >= 2 && (
            <Polyline
              pane="pane-route"
              positions={waterLatLngs}
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

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
