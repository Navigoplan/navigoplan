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

/* -------- types & consts -------- */
export type Point = { name: string; lat: number; lon: number };

const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* === Tunables (routing) === */
const CELL_DEG = 0.05;
const GRID_MARGIN_DEG = 0.30;
const NEAR_LAND_PENALTY = 0.25;

/* ======== small geo helpers ======== */
function toRad(x: number) { return (x * Math.PI) / 180; }
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ======== Point in (Multi)Polygon (lon,lat) — even-odd rule ======== */
type Ring = [number, number][];
type Poly = Ring[];          // ένα Polygon = array από rings (exterior + holes)
type MultiPoly = Poly[];     // ένα MultiPolygon = array από Poly

function pointInRing(pt: [number, number], ring: Ring): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function pointInPoly(pt: [number, number], poly: Poly): boolean {
  let inside = false;
  for (const ring of poly) {
    if (pointInRing(pt, ring)) inside = !inside;
  }
  return inside;
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

  // ✅ κρατάμε ΛΙΣΤΑ από Poly (όχι MultiPoly)
  const polys: Poly[] = [];

  if (coastGeojson?.type === "FeatureCollection") {
    for (const f of coastGeojson.features) {
      const g = f?.geometry;
      if (!g) continue;
      if (g.type === "Polygon") {
        polys.push(g.coordinates as Poly);
      } else if (g.type === "MultiPolygon") {
        for (const poly of (g.coordinates as MultiPoly)) polys.push(poly); // κάθε στοιχείο είναι Poly
      }
    }
  } else if (coastGeojson?.type === "Polygon") {
    polys.push(coastGeojson.coordinates as Poly);
  } else if (coastGeojson?.type === "MultiPolygon") {
    for (const poly of (coastGeojson.coordinates as MultiPoly)) polys.push(poly);
  }

  const grid: GridNode[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols);
    const lat = minLat + (r + 0.5) * (maxLat - minLat) / rows;
    for (let c = 0; c < cols; c++) {
      const lon = minLon + (c + 0.5) * (maxLon - minLon) / cols;
      const pt: [number, number] = [lon, lat]; // lon,lat για polygons
      let onLand = false;
      for (const poly of polys) {
        if (pointInPoly(pt, poly)) { onLand = true; break; }
      }
      grid[r][c] = { r, c, lat, lon, walkable: !onLand, nearLand: false };
    }
  }

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

  return { grid, rows, cols, start: nodeFor(a.lat, a.lon), goal: nodeFor(b.lat, b.lon) };
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

/* ======== RDP simplify ======== */
function perpendicularDistance(p: [number, number], a: [number, number], b: [number, number]) {
  const x0 = p[1], y0 = p[0];
  const x1 = a[1], y1 = a[0];
  const x2 = b[1], y2 = b[0];
  const num = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1);
  const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2) + 1e-9;
  return num / den;
}
function simplifyRDP(path: [number, number][], epsilonDeg = 0.01): [number, number][] {
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

/* =======================================================
 * RouteMapClient
 * ======================================================= */
export default function RouteMapClient({ points }: { points: Point[] }) {
  const [coast, setCoast] = useState<any | null>(null);

  /* load coastlines */
  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

  const inputLatLngs = useMemo<LatLngExpression[]>(
    () => points.map(p => [p.lat, p.lon] as LatLngExpression),
    [points]
  );

  /* water-avoiding polyline for all legs */
  const waterLatLngs = useMemo<LatLngExpression[]>(() => {
    if (!coast || points.length < 2) return inputLatLngs;
    const result: [number, number][] = [];

    function pushPath(path: GridNode[] | null, a: Point, b: Point) {
      if (!path) {
        if (result.length === 0) result.push([a.lat, a.lon]);
        result.push([b.lat, b.lon]);
        return;
      }
      const seg: [number, number][] = path.map(n => [n.lat, n.lon]);
      const simplified = simplifyRDP(seg, 0.008);
      if (result.length === 0) {
        result.push(...simplified);
      } else {
        result.push(...simplified.slice(1));
      }
    }

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const { grid, start, goal } = buildGridForLeg(a, b, coast);
      const path = aStarWater(grid, start, goal);
      pushPath(path, a, b);
    }

    return result as LatLngExpression[];
  }, [coast, points, inputLatLngs]);

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
        /* GEBCO tint */
        .leaflet-tile[src*="tiles.gebco.net"] {
          filter: sepia(1) hue-rotate(190deg) saturate(4) brightness(1.04) contrast(1.06);
        }
        /* labels boost */
        .leaflet-pane.pane-labels img.leaflet-tile {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          filter: brightness(0.9) contrast(1.35);
        }
        .leaflet-pane.pane-labels img[src*="voyager_labels_over"]{
          filter: brightness(0.88) contrast(1.45);
        }
        /* land raster (fallback) — αποχρωματισμένο για να μην «βαραίνει» */
        .leaflet-pane.pane-land-raster img.leaflet-tile {
          filter: saturate(0) brightness(1.12) contrast(1.15);
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

        {/* NEW: land raster fallback για να φαίνονται και μικρά νησιά (π.χ. Αγκίστρι) */}
        <Pane name="pane-land-raster" style={{ zIndex: 305 }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors, &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
            opacity={0.85}
          />
        </Pane>

        {/* Vector land από το GeoJSON (λευκό γεμίσμα & σκουρό περίγραμμα) */}
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (
            <GeoJSON
              data={coast}
              style={() => ({ color: "#0b1220", weight: 2, opacity: 1, fillColor: "#ffffff", fillOpacity: 1 })}
            />
          )}
        </Pane>

        {/* LABELS (μεγαλύτερα + outline + extra layer για περισσότερα τοπωνύμια) */}
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

          {points[0] && (
            <CircleMarker
              pane="pane-route"
              center={[points[0].lat, points[0].lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0b1220", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                Start: {points[0].name}
              </Tooltip>
            </CircleMarker>
          )}

          {points.slice(1, -1).map((p) => (
            <CircleMarker
              key={`${p.name}-${p.lat}-${p.lon}`}
              pane="pane-route"
              center={[p.lat, p.lon] as LatLngExpression}
              radius={6}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0b1220", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                {p.name}
              </Tooltip>
            </CircleMarker>
          ))}

          {points.length > 1 && (
            <CircleMarker
              pane="pane-route"
              center={[points.at(-1)!.lat, points.at(-1)!.lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0b1220", fillOpacity: 1 }}
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
