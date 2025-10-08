"use client";

import { useEffect, useMemo, useState } from "react";
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
const Marker       = dynamic(() => import("react-leaflet").then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });

/* auto fit-bounds (χωρίς Leaflet αντικείμενα) */
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

/* μικρό helper για flyTo */
const FlyTo = dynamic(async () => {
  const RL = await import("react-leaflet");
  const { useEffect } = await import("react");
  function Cmp({ target, zoom }: { target: LatLngExpression | null; zoom: number }) {
    const map = RL.useMap();
    useEffect(() => {
      if (!target) return;
      map.flyTo(target as any, zoom, { duration: 0.8 });
    }, [map, target, zoom]);
    return null;
  }
  return Cmp;
}, { ssr: false });

/* ---- types & consts ---- */
export type Point = { name: string; lat: number; lon: number };
type PortExtra = { island?: string; region?: string; category?: "harbor" | "marina" | "anchorage" | "spot" };

const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* Tunables */
const CELL_DEG = 0.05;          // ~5–6km
const GRID_MARGIN_DEG = 0.30;   // γύρω από bbox κάθε leg
const NEAR_LAND_PENALTY = 0.25; // “κόστος” κοντά σε στεριά
const CLEARANCE_CELLS = 1;      // buffer γύρω από στεριά
const SIMPLIFY_EPS = 0.008;     // ~0.8km

/* ---- geo helpers ---- */
const toRad = (x: number) => (x * Math.PI) / 180;
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---- Point in Polygon (lon,lat) ---- */
type Ring = [number, number][];
type Poly = Ring[];

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
function pointInPoly(pt: [number, number], poly: Poly): boolean {
  let inside = false;
  for (const ring of poly) if (pointInRing(pt, ring)) inside = !inside;
  return inside;
}
function collectPolys(geo: any): Poly[] {
  const polys: Poly[] = [];
  if (!geo) return polys;

  if (geo.type === "FeatureCollection") {
    for (const f of (geo.features ?? [])) {
      const g = f?.geometry;
      if (!g) continue;
      if (g.type === "Polygon") {
        polys.push(g.coordinates as Poly);
      } else if (g.type === "MultiPolygon") {
        for (const poly of g.coordinates as Poly[]) polys.push(poly);
      }
    }
  } else if (geo.type === "Polygon") {
    polys.push(geo.coordinates as Poly);
  } else if (geo.type === "MultiPolygon") {
    for (const poly of (geo.coordinates as Poly[])) polys.push(poly);
  }
  return polys;
}

/* ---- Water-grid (A*) ---- */
type GridNode = { r: number; c: number; lat: number; lon: number; walkable: boolean; nearLand: boolean };

function buildGridForBounds(minLat: number, maxLat: number, minLon: number, maxLon: number, coastPolys: Poly[]) {
  const rows = Math.max(8, Math.ceil((maxLat - minLat) / CELL_DEG));
  const cols = Math.max(8, Math.ceil((maxLon - minLon) / CELL_DEG));

  const grid: GridNode[][] = new Array(rows);
  for (let r = 0; r < rows; r++) {
    grid[r] = new Array(cols);
    const lat = minLat + (r + 0.5) * (maxLat - minLat) / rows;
    for (let c = 0; c < cols; c++) {
      const lon = minLon + (c + 0.5) * (maxLon - minLon) / cols;
      const pt: [number, number] = [lon, lat]; // (lon,lat)
      let onLand = false;
      for (const poly of coastPolys) { if (pointInPoly(pt, poly)) { onLand = true; break; } }
      grid[r][c] = { r, c, lat, lon, walkable: !onLand, nearLand: false };
    }
  }
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = grid[r][c]; if (!cell.walkable) continue;
    let near = false;
    for (const [dr, dc] of dirs) {
      const rr = r + dr, cc = c + dc;
      if (rr<0||cc<0||rr>=rows||cc>=cols) continue;
      if (!grid[rr][cc].walkable) { near = true; break; }
    }
    cell.nearLand = near;
  }

  if (CLEARANCE_CELLS > 0) {
    const toBlock: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!grid[r][c].walkable) {
        for (let dr = -CLEARANCE_CELLS; dr <= CLEARANCE_CELLS; dr++) {
          for (let dc = -CLEARANCE_CELLS; dc <= CLEARANCE_CELLS; dc++) {
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
function buildGridForLeg(a: Point, b: Point, coastPolys: Poly[]) {
  const minLat = Math.min(a.lat, b.lat) - GRID_MARGIN_DEG;
  const maxLat = Math.max(a.lat, b.lat) + GRID_MARGIN_DEG;
  const minLon = Math.min(a.lon, b.lon) - GRID_MARGIN_DEG;
  const maxLon = Math.max(a.lon, b.lon) + GRID_MARGIN_DEG;
  const { grid, nodeFor } = buildGridForBounds(minLat, maxLat, minLon, maxLon, coastPolys);
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

/* ---- Ramer–Douglas–Peucker ---- */
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

/* ======= Icons για dataset markers (divIcon-like χωρίς leaflet import) ======= */
function markerHtml(active: boolean) {
  return `<div style="
    width:12px;height:12px;border-radius:50%;
    border:2px solid ${active ? '#0f172a' : '#64748b'};
    background:${active ? '#facc15' : 'white'};
    box-shadow:0 1px 3px rgba(0,0,0,.3);
  "></div>`;
}

/* ===================================================== */
export default function RouteMapClient({
  points,
  markers,
  activeNames,
  onMarkerClick,
}: {
  points: Point[];
  markers?: (Point & PortExtra)[];
  activeNames?: string[];
  onMarkerClick?: (name: string) => void;
}) {
  const [coast, setCoast] = useState<any | null>(null);
  const [focus, setFocus] = useState<LatLngExpression | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/coastlines-gr.geojson")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("GeoJSON fetch failed"))))
      .then(j => { if (!cancelled) setCoast(j); })
      .catch(() => { if (!cancelled) setCoast(null); });
    return () => { cancelled = true; };
  }, []);

  const coastPolys = useMemo(() => collectPolys(coast), [coast]);

  /* === route που ΠΕΡΝΑ ΑΠΟ ΑΚΡΙΒΩΣ τα input waypoints === */
  const waterLatLngs = useMemo<LatLngExpression[]>(() => {
    if (!coastPolys.length || points.length < 2) {
      return points.map(p => [p.lat, p.lon] as LatLngExpression);
    }
    const out: [number, number][][] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const { grid, start, goal } = buildGridForLeg(a, b, coastPolys);
      const path = aStarWater(grid, start, goal);

      if (!path) { out.push([[a.lat, a.lon], [b.lat, b.lon]]); continue; }

      const middle = path.map(n => [n.lat, n.lon] as [number, number]);
      const middleS = simplifyRDP(middle, SIMPLIFY_EPS);

      const seg: [number, number][] = [[a.lat, a.lon], ...middleS, [b.lat, b.lon]];
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
    for (const leg of out) {
      if (!joined.length) joined.push(...leg);
      else joined.push(...leg.slice(1));
    }
    return joined as LatLngExpression[];
  }, [points, coastPolys]);

  /* markers: στα input points */
  const markerStart = points[0] ?? null;
  const markerMids  = points.slice(1, -1);
  const markerEnd   = points.at(-1) ?? null;

  /* bounds/center — ΥΠΟΛΟΓΙΣΜΟΣ ΧΩΡΙΣ Leaflet */
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const arr = (waterLatLngs as [number, number][]);
    if (arr.length < 2) return null;
    let minLat = +Infinity, maxLat = -Infinity, minLon = +Infinity, maxLon = -Infinity;
    for (const [lat, lon] of arr) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    const padLat = (maxLat - minLat) * 0.08 || 0.05;
    const padLon = (maxLon - minLon) * 0.08 || 0.05;
    return [[minLat - padLat, minLon - padLon], [maxLat + padLat, maxLon + padLon]] as LatLngBoundsExpression;
  }, [waterLatLngs]);

  const center: LatLngExpression = (waterLatLngs[0] as LatLngExpression) ?? ([37.97, 23.72] as LatLngExpression);
  const activeSet = useMemo(() => new Set((activeNames ?? []).map(s => s.toLowerCase())), [activeNames]);

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

        {/* στεριά από GeoJSON */}
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
            detectRetina={true}
            opacity={0.55}
            errorTileUrl={TRANSPARENT_1PX}
            pane="pane-labels"
          />
        </Pane>

        {/* seamarks */}
        <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
          <TileLayer attribution="&copy; OpenSeaMap" url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.5} />
        </Pane>

        {/* route + markers (για τα waypoints του πλάνου) */}
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

          {markerStart && (
            <CircleMarker
              pane="pane-route"
              center={[markerStart.lat, markerStart.lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                Start: {points[0]?.name}
              </Tooltip>
            </CircleMarker>
          )}

          {markerMids.map((p, i) => (
            <CircleMarker
              key={`${p.name}-${i}`}
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

          {markerEnd && (
            <CircleMarker
              pane="pane-route"
              center={[markerEnd.lat, markerEnd.lon] as LatLngExpression}
              radius={8}
              pathOptions={{ color: "#c4a962", fillColor: "#c4a962", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent>
                End: {points.at(-1)?.name}
              </Tooltip>
            </CircleMarker>
          )}
        </Pane>

        {/* 🔵 DATASET PORT MARKERS (click → focus + planner) */}
        <Pane name="pane-ports" style={{ zIndex: 470 }}>
          {(markers ?? []).map((m) => {
            const active = activeSet.has(m.name.toLowerCase());
            const icon = (typeof window !== "undefined")
              ? (window as any).L?.divIcon?.({ className: "np-marker", html: markerHtml(active), iconSize: [12,12], iconAnchor: [6,6] })
              : undefined;

            return (
              <Marker
                key={`${m.name}-${m.lat.toFixed(4)}-${m.lon.toFixed(4)}`}
                position={[m.lat, m.lon]}
                pane="pane-ports"
                // @ts-ignore icon μπορεί να είναι undefined μέχρι να φορτώσει leaflet client-side
                icon={icon}
                eventHandlers={{
                  click: () => {
                    setFocus([m.lat, m.lon]);       // zoom/pan στον χάρτη
                    onMarkerClick?.(m.name);        // ενημέρωση planner
                  }
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold text-brand-navy">{m.name}</div>
                    <div className="text-xs text-slate-600">
                      {m.island ? <>Island: <b>{m.island}</b><br/></> : null}
                      {m.region ? <>Region: <b>{m.region}</b><br/></> : null}
                      {m.category ? <>Type: <b>{m.category}</b></> : null}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </Pane>

        {bounds && <FitBounds bounds={bounds} />}
        {focus && <FlyTo target={focus} zoom={10} />}
      </MapContainer>
    </div>
  );
}
