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

/* Map instance helper */
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
export type Point  = { name: string; lat: number; lon: number };
export type Marker = { name: string; lat: number; lon: number };

type Ring = [number, number][]; // [lon,lat]
type PolyRings = { outer: Ring; holes: Ring[] };

type WeatherCell = { lat: number; lon: number; wind: number; wave: number };
type WeatherField = { get(lat:number, lon:number): { wind:number; wave:number } | null };

/* ---- consts ---- */
const WORLD_BOUNDS: LatLngBoundsExpression = [[-85, -180], [85, 180]];
const TRANSPARENT_1PX = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/* Tunables */
const BASE_CELL_DEG = 0.03;
const GRID_MARGIN_DEG = 0.75;
const NEAR_LAND_PENALTY = 1.2;
const SIMPLIFY_EPS = 0.003;

/* Weather impact (penalty) */
const WEATHER_WIND_REF = 12;
const WEATHER_WAVE_REF = 2.0;
const WEATHER_PENALTY  = 0.45;

/* Animation */
const DRAW_POINTS_PER_SEC = 3;
const DRAW_INTERVAL_MS = Math.max(20, Math.round(1000 / DRAW_POINTS_PER_SEC));
const FOLLOW_ZOOM_MIN = 9;
const LEG_VIEW_ZOOM_MAX = 10;
const MARKER_FADE_MS = 280;

/* ---- geo helpers ---- */
const toRad = (x: number) => (x * Math.PI) / 180;
function sin2(x: number) { return Math.sin(x) * Math.sin(x); }
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = sin2(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sin2(dLon/2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ---- Point-In-Polygon ---- */
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
  function pushPolygon(coords: Ring[]) {
    if (!coords?.length) return;
    const outer = coords[0];
    const holes = coords.slice(1);
    polys.push({ outer, holes });
  }
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

/* -------- Adaptive cell size -------- */
function pickCellDegForLeg(a: Point, b: Point) {
  const dLat = Math.abs(a.lat - b.lat);
  const dLon = Math.abs(a.lon - b.lon);
  const span = Math.max(dLat, dLon);
  let cell = Math.min(BASE_CELL_DEG, Math.max(0.006, span / 180));
  if (span < 2.5) cell = 0.016;
  if (span < 1.5) cell = 0.012;
  if (span < 0.90) cell = 0.009;
  if (span < 0.50) cell = 0.007;
  if (span < 0.25) cell = 0.006;
  return cell;
}

/* ---- Grid + A* ---- */
type GridNode = {
  r: number; c: number; lat: number; lon: number;
  walkable: boolean; nearLand: boolean;
};

function buildGridForBounds(minLat:number,maxLat:number,minLon:number,maxLon:number,coastPolys: PolyRings[],cellDeg:number) {
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
      grid[r][c] = { r, c, lat, lon, walkable:!onLand, nearLand:false };
    }
  }
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){
    const cell = grid[r][c]; if (!cell.walkable) continue;
    for (const [dr,dc] of dirs) {
      const rr=r+dr, cc=c+dc;
      if (rr<0||cc<0||rr>=rows||cc>=cols) continue;
      if (!grid[rr][cc].walkable) { cell.nearLand = true; break; }
    }
  }
  function nodeFor(lat:number,lon:number){
    const r = Math.min(rows-1, Math.max(0, Math.floor((lat - minLat) / ((maxLat - minLat) / rows))));
    const c = Math.min(cols-1, Math.max(0, Math.floor((lon - minLon) / ((maxLon - minLon) / cols))));
    return grid[r][c];
  }
  return { grid, nodeFor };
}

/* ---- Weather (Open-Meteo Marine) ---- */
const _weatherCache = new Map<string, WeatherField>();

function closestTimeIndex(times: any[], nowMs: number) {
  if (!Array.isArray(times) || !times.length) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < times.length; i++) {
    const ms = Date.parse(String(times[i]));
    if (!Number.isFinite(ms)) continue;
    const d = Math.abs(ms - nowMs);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

async function fetchWeatherField(minLat:number,maxLat:number,minLon:number,maxLon:number): Promise<WeatherField|null> {
  const step = 0.3;
  const lats:number[] = []; const lons:number[] = [];
  for (let lat = Math.floor(minLat/step)*step; lat <= maxLat; lat += step) lats.push(parseFloat(lat.toFixed(2)));
  for (let lon = Math.floor(minLon/step)*step; lon <= maxLon; lon += step) lons.push(parseFloat(lon.toFixed(2)));

  const latParam = lats.join(","); const lonParam = lons.join(",");

  // ✅ timezone fixed to UTC for stable parsing
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latParam}&longitude=${lonParam}&hourly=wave_height,wind_speed_10m&length_unit=metric&windspeed_unit=ms&timezone=UTC`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const entries: WeatherCell[] = [];
    const results = data?.results ?? [data];
    const nowMs = Date.now();

    for (let i=0;i<results.length;i++){
      const r = results[i];
      const lat = Array.isArray(data.latitude) ? data.latitude[i] : (r?.latitude ?? data.latitude);
      const lon = Array.isArray(data.longitude)? data.longitude[i] : (r?.longitude ?? data.longitude);

      const times: any[] = r?.hourly?.time ?? data?.hourly?.time ?? [];
      const idx = closestTimeIndex(times, nowMs);

      const windArr = (r?.hourly?.wind_speed_10m ?? data?.hourly?.wind_speed_10m) ?? [];
      const waveArr = (r?.hourly?.wave_height ?? data?.hourly?.wave_height) ?? [];

      const wind = Array.isArray(windArr?.[0]) ? windArr?.[i]?.[idx] : windArr?.[idx];
      const wave = Array.isArray(waveArr?.[0]) ? waveArr?.[i]?.[idx] : waveArr?.[idx];

      if (wind!=null && wave!=null && Number.isFinite(Number(wind)) && Number.isFinite(Number(wave))) {
        entries.push({ lat:Number(lat), lon:Number(lon), wind:Number(wind), wave:Number(wave) });
      }
    }
    if (!entries.length) return null;

    const get = (lat:number, lon:number) => {
      let best = entries[0], bestD = Infinity;
      for (const e of entries) {
        const d = Math.hypot(lat - e.lat, lon - e.lon);
        if (d < bestD) { bestD = d; best = e; }
      }
      return { wind: best.wind, wave: best.wave };
    };
    return { get };
  } catch {
    return null;
  }
}

/* ---- A* water routing ---- */
function nearestWaterNode(grid: GridNode[][], start: GridNode) {
  if (start.walkable) return start;
  const q: GridNode[] = [start];
  const seen = new Set<string>([`${start.r},${start.c}`]);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  while (q.length) {
    const cur = q.shift()!;
    for (const [dr,dc] of dirs){
      const rr = cur.r+dr, cc = cur.c+dc;
      if (rr<0||cc<0||rr>=grid.length||cc>=grid[0].length) continue;
      const nb = grid[rr][cc];
      const key = `${rr},${cc}`; if (seen.has(key)) continue; seen.add(key);
      if (nb.walkable) return nb;
      q.push(nb);
    }
  }
  return start;
}

function aStarWater(grid:GridNode[][], start:GridNode, goal:GridNode, weather:WeatherField|null, weatherAware:boolean){
  start = nearestWaterNode(grid, start);
  goal  = nearestWaterNode(grid, goal);

  const key = (n:GridNode)=>`${n.r},${n.c}`;
  const open: GridNode[] = [start];
  const came = new Map<string, GridNode>();
  const gScore = new Map<string, number>([[key(start), 0]]);
  const fScore = new Map<string, number>([[key(start), haversineMeters(start.lat, start.lon, goal.lat, goal.lon)]]);
  const inOpen = new Set<string>([key(start)]);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];

  while (open.length){
    open.sort((a,b)=> (fScore.get(key(a))! - fScore.get(key(b))!));
    const current = open.shift()!; inOpen.delete(key(current));

    if (current.r===goal.r && current.c===goal.c){
      const path: GridNode[] = [current];
      let curKey = key(current);
      while (came.has(curKey)){ const prev = came.get(curKey)!; path.push(prev); curKey = key(prev); }
      return path.reverse();
    }

    for (const [dr,dc] of dirs){
      const rr=current.r+dr, cc=current.c+dc;
      if (rr<0||cc<0||rr>=grid.length||cc>=grid[0].length) continue;
      const nb = grid[rr][cc]; if (!nb.walkable) continue;

      const step = haversineMeters(current.lat, current.lon, nb.lat, nb.lon);
      let costFactor = 1 + (nb.nearLand ? NEAR_LAND_PENALTY : 0);

      if (weatherAware && weather){
        const w = weather.get(nb.lat, nb.lon);
        if (w){
          const windN = Math.max(0, (w.wind - WEATHER_WIND_REF) / WEATHER_WIND_REF);
          const waveN = Math.max(0, (w.wave - WEATHER_WAVE_REF) / WEATHER_WAVE_REF);
          const meteo = Math.min(2.5, windN + waveN);
          costFactor *= (1 + WEATHER_PENALTY * meteo);
        }
      }

      const tentative = (gScore.get(key(current)) ?? Infinity) + step * costFactor;
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
function perpendicularDistance(p:[number,number], a:[number,number], b:[number,number]){
  const x0=p[1], y0=p[0], x1=a[1], y1=a[0], x2=b[1], y2=b[0];
  const num = Math.abs((y2 - y1)*x0 - (x2 - x1)*y0 + x2*y1 - y2*x1);
  const den = Math.sqrt((y2 - y1)**2 + (x2 - x1)**2) + 1e-9;
  return num/den;
}
function simplifyRDP(path:[number,number][], epsilonDeg=SIMPLIFY_EPS): [number,number][]{
  if (path.length<=2) return path;
  let dmax=0, index=0; const end=path.length-1;
  for (let i=1;i<end;i++){ const d=perpendicularDistance(path[i], path[0], path[end]); if (d>dmax){ index=i; dmax=d; } }
  if (dmax>epsilonDeg){
    const rec1 = simplifyRDP(path.slice(0, index+1), epsilonDeg);
    const rec2 = simplifyRDP(path.slice(index, path.length), epsilonDeg);
    return rec1.slice(0,-1).concat(rec2);
  } else {
    return [path[0], path[end]];
  }
}

/* ---- Animated Dot ---- */
function useNow(){ const [,setTick]=useState(0); useEffect(()=>{ let raf=0; const loop=()=>{ setTick(t=>t+1); raf=requestAnimationFrame(loop); }; raf=requestAnimationFrame(loop); return ()=>cancelAnimationFrame(raf); },[]); }
function AnimatedDot({ center,label,active,onClick,appearAtMs,baseRadius=5 }:{
  center:LatLngExpression; label?:string; active?:boolean; onClick?:()=>void; appearAtMs:number; baseRadius?:number;
}){
  useNow();
  const [start] = useState<number>(()=>performance.now());
  const now = performance.now();
  const t = Math.max(0, Math.min(1, (now - appearAtMs - start) / MARKER_FADE_MS));
  const radius = (t <= 0 ? 0 : baseRadius * (0.66 + 0.34 * t));
  const opacity = t <= 0 ? 0 : 0.25 + 0.75 * t;

  return (
    <CircleMarker
      center={center}
      radius={radius}
      eventHandlers={onClick ? { click: onClick } : undefined}
      pathOptions={{ color: active ? "#c4a962" : "#0b1220", fillColor: active ? "#c4a962" : "#0b1220", fillOpacity: opacity, opacity, weight: active ? 2 : 1.5 }}
    >
      {!!label && (<Tooltip direction="top" offset={[0,-6]} opacity={0.95}>{label}</Tooltip>)}
    </CircleMarker>
  );
}

/* ===================================================== */
export default function RouteMapClient({
  points, markers, activeNames, onMarkerClick,
  weatherAwareProp,
  followShipProp,
  onLegMeteo
}:{
  points: Point[];
  markers?: Marker[];
  activeNames?: string[];
  onMarkerClick?: (portName: string) => void;
  weatherAwareProp?: boolean;
  followShipProp?: boolean;
  onLegMeteo?: (legs: Array<{ index:number; from:string; to:string; avgWind:number; avgWave:number; maxWind:number; maxWave:number }>) => void;
}) {
  const [map, setMap] = useState<import("leaflet").Map | null>(null);

  const effPoints = (points?.length ?? 0) >= 2 ? points : [];

  const [weatherAwareInternal, setWeatherAwareInternal] = useState(false);
  const weatherAware = (typeof weatherAwareProp === "boolean") ? weatherAwareProp : weatherAwareInternal;
  useEffect(() => {
    if (typeof weatherAwareProp === "boolean") setWeatherAwareInternal(weatherAwareProp);
  }, [weatherAwareProp]);

  const [followShipInternal, setFollowShipInternal] = useState(false);
  const followShip = (typeof followShipProp === "boolean") ? followShipProp : followShipInternal;
  useEffect(() => {
    if (typeof followShipProp === "boolean") setFollowShipInternal(followShipProp);
  }, [followShipProp]);

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
  const coastPolys = useMemo(() => collectPolys(coast), [coast]);

  /* weather prefetch per leg */
  const [weatherFieldsForLeg, setWeatherFieldsForLeg] = useState<(WeatherField|null)[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!weatherAware || effPoints.length < 2) { setWeatherFieldsForLeg([]); return; }
      const fields: (WeatherField|null)[] = [];
      for (let i = 0; i < effPoints.length - 1; i++) {
        const a = effPoints[i], b = effPoints[i+1];
        const minLat = Math.min(a.lat, b.lat) - GRID_MARGIN_DEG;
        const maxLat = Math.max(a.lat, b.lat) + GRID_MARGIN_DEG;
        const minLon = Math.min(a.lon, b.lon) - GRID_MARGIN_DEG;
        const maxLon = Math.max(a.lon, b.lon) + GRID_MARGIN_DEG;
        const cacheKey = `${minLat.toFixed(2)}|${maxLat.toFixed(2)}|${minLon.toFixed(2)}|${maxLon.toFixed(2)}`;
        if (_weatherCache.has(cacheKey)) {
          fields.push(_weatherCache.get(cacheKey)!);
        } else {
          const field = await fetchWeatherField(minLat, maxLat, minLon, maxLon);
          if (cancelled) return;
          if (field) _weatherCache.set(cacheKey, field);
          fields.push(field);
        }
      }
      if (!cancelled) setWeatherFieldsForLeg(fields);
    })();
    return () => { cancelled = true; };
  }, [weatherAware, effPoints]);

  /* === Route compute === */
  const { waterLatLngs, legEndIdx, legSegments } = useMemo(() => {
    const result: { waterLatLngs: LatLngExpression[]; legEndIdx: number[]; legSegments: [number,number][][] } = { waterLatLngs: [], legEndIdx: [], legSegments: [] };
    const pts = effPoints;
    if (pts.length < 2) return result;

    const perLeg: [number, number][][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      let seg: [number, number][] | null = null;

      if (coastPolys.length) {
        const cellDeg = pickCellDegForLeg(a, b);
        const minLat = Math.min(a.lat, b.lat) - GRID_MARGIN_DEG;
        const maxLat = Math.max(a.lat, b.lat) + GRID_MARGIN_DEG;
        const minLon = Math.min(a.lon, b.lon) - GRID_MARGIN_DEG;
        const maxLon = Math.max(a.lon, b.lon) + GRID_MARGIN_DEG;
        const { grid, nodeFor } = buildGridForBounds(minLat, maxLat, minLon, maxLon, coastPolys, cellDeg);
        const start = nodeFor(a.lat, a.lon);
        const goal  = nodeFor(b.lat, b.lon);
        const field = weatherAware ? (weatherFieldsForLeg[i] ?? null) : null;

        const path = aStarWater(grid, start, goal, field, weatherAware);
        if (path) {
          const mid = path.map(n => [n.lat, n.lon] as [number, number]);
          const midS = simplifyRDP(mid, SIMPLIFY_EPS);
          seg = [[a.lat, a.lon], ...midS, [b.lat, b.lon]];
        }
      }
      if (!seg) seg = [[a.lat, a.lon], [b.lat, b.lon]];

      const cleaned: [number, number][] = [];
      for (const pt of seg) {
        if (!cleaned.length) cleaned.push(pt);
        else {
          const last = cleaned[cleaned.length - 1];
          if (Math.abs(last[0]-pt[0]) > 1e-9 || Math.abs(last[1]-pt[1]) > 1e-9) cleaned.push(pt);
        }
      }
      perLeg.push(cleaned);
    }

    const joined: [number, number][] = [];
    const endIdx: number[] = [];
    for (let i = 0; i < perLeg.length; i++) {
      const leg = perLeg[i];
      if (!joined.length) joined.push(...leg);
      else joined.push(...leg.slice(1));
      endIdx.push(joined.length - 1);
    }
    result.waterLatLngs = joined as LatLngExpression[];
    result.legEndIdx = endIdx;
    result.legSegments = perLeg;
    return result;
  }, [effPoints, coastPolys, weatherAware, weatherFieldsForLeg]);

  /* === Meteo metrics emit === */
  useEffect(() => {
    if (!onLegMeteo) return;
    if (!effPoints.length || !legSegments.length) { onLegMeteo([]); return; }
    const out: Array<{ index:number; from:string; to:string; avgWind:number; avgWave:number; maxWind:number; maxWave:number }> = [];

    for (let i = 0; i < legSegments.length; i++) {
      const seg = legSegments[i];
      const field = weatherFieldsForLeg[i] ?? null;
      if (!seg?.length || !field) {
        out.push({ index:i, from: effPoints[i].name, to: effPoints[i+1].name, avgWind: NaN, avgWave: NaN, maxWind: NaN, maxWave: NaN });
        continue;
      }
      let windSum = 0, waveSum = 0, n = 0, maxW = -Infinity, maxH = -Infinity;

      for (let k = 0; k < seg.length; k += 3) {
        const [lat, lon] = seg[k];
        const w = field.get(lat, lon);
        if (!w) continue;
        windSum += w.wind;
        waveSum += w.wave;
        n++;
        if (w.wind > maxW) maxW = w.wind;
        if (w.wave > maxH) maxH = w.wave;
      }

      if (n === 0) {
        out.push({ index:i, from: effPoints[i].name, to: effPoints[i+1].name, avgWind: NaN, avgWave: NaN, maxWind: NaN, maxWave: NaN });
      } else {
        out.push({
          index:i,
          from: effPoints[i].name,
          to: effPoints[i+1].name,
          avgWind: +(windSum / n).toFixed(2),
          avgWave: +(waveSum / n).toFixed(2),
          maxWind: +maxW.toFixed(2),
          maxWave: +maxH.toFixed(2),
        });
      }
    }
    onLegMeteo(out);
  }, [onLegMeteo, legSegments, weatherFieldsForLeg, effPoints, weatherAware]);

  /* progressive draw */
  const [drawCount, setDrawCount] = useState(0);
  useEffect(() => { setDrawCount((waterLatLngs.length ? 1 : 0)); }, [waterLatLngs]);
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

  /* current leg */
  const currentLegIndex = useMemo(() => {
    if (!legEndIdx.length) return -1;
    for (let i = 0; i < legEndIdx.length; i++) {
      if (drawCount - 1 <= legEndIdx[i]) return i;
    }
    return legEndIdx.length - 1;
  }, [drawCount, legEndIdx]);

  /* follow ship / auto-zoom (controlled by followShip) */
  const lastFollowedPointRef = useRef<string>("");
  const prevLegRef = useRef<number>(-999);

  useEffect(() => {
    if (!map) return;
    if (followShip) return;
    if (currentLegIndex < 0) return;
    if (currentLegIndex === prevLegRef.current) return;
    prevLegRef.current = currentLegIndex;

    if (effPoints[currentLegIndex] && effPoints[currentLegIndex + 1]) {
      const a = effPoints[currentLegIndex];
      const b = effPoints[currentLegIndex + 1];
      const L = require("leaflet") as typeof import("leaflet");
      const bnds = L.latLngBounds([a.lat, a.lon], [b.lat, b.lon]).pad(0.18);
      map.flyToBounds(bnds, { padding: [28, 28] });
      setTimeout(() => {
        if (!map) return;
        if (map.getZoom() > LEG_VIEW_ZOOM_MAX) map.setZoom(LEG_VIEW_ZOOM_MAX);
      }, 500);
    }
  }, [map, currentLegIndex, effPoints, followShip]);

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
  const markerStart = effPoints[0] ?? null;
  const markerMids  = effPoints.slice(1, -1);
  const markerEnd   = effPoints.at(-1) ?? null;

  /* bounds/center */
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if ((waterLatLngs?.length ?? 0) < 2) return null;
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(waterLatLngs as any).pad(0.08);
  }, [waterLatLngs]);
  const center: LatLngExpression = (effPoints[0] ? [effPoints[0].lat, effPoints[0].lon] : [37.97, 23.72]) as LatLngExpression;

  const isActive = (name: string) => (activeNames ?? []).some(n => n.toLowerCase() === name.toLowerCase());
  function flyTo(name: string, lat: number, lon: number) {
    if (map) { const targetZoom = Math.max(map.getZoom(), 9); map.flyTo([lat, lon], targetZoom, { duration: 0.8 }); }
    onMarkerClick?.(name);
  }

  return (
    <div className="w-full h-[520px] overflow-hidden rounded-2xl border border-slate-200 relative">
      <style jsx global>{`
        .leaflet-tile[src*="tiles.gebco.net"] { filter: sepia(1) hue-rotate(190deg) saturate(4) brightness(1.04) contrast(1.06); }
        .leaflet-pane.pane-labels img.leaflet-tile { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; filter: brightness(0.9) contrast(1.35); }
        .leaflet-pane.pane-labels img[src*="voyager_labels_over"]{ filter: brightness(0.88) contrast(1.45); }
      `}</style>

      <MapContainer center={center} zoom={7} minZoom={3} maxZoom={14} scrollWheelZoom style={{ height:"100%", width:"100%" }}>
        <CaptureMap onReady={setMap} />

        {/* GEBCO */}
        <Pane name="pane-gebco" style={{ zIndex: 200 }}>
          <TileLayer attribution="&copy; GEBCO" url="https://tiles.gebco.net/data/tiles/{z}/{x}/{y}.png" opacity={0.9} />
        </Pane>

        {/* water tint */}
        <Pane name="pane-water" style={{ zIndex: 305 }}>
          <Rectangle bounds={WORLD_BOUNDS} pathOptions={{ color:"transparent", weight:0, fillColor:"#7fa8d8", fillOpacity:0.35 }} interactive={false} />
        </Pane>

        {/* land */}
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (<GeoJSON data={coast} style={() => ({ color:"#0b1220", weight:2, opacity:1, fillColor:"#ffffff", fillOpacity:1 })} />)}
        </Pane>

        {/* labels */}
        <Pane name="pane-labels" style={{ zIndex: 360 }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors, &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png" tileSize={512} zoomOffset={-1} detectRetina={false} opacity={0.75} errorTileUrl={TRANSPARENT_1PX} pane="pane-labels" />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}@2x.png" tileSize={512} zoomOffset={-1} detectRetina={false} opacity={0.25} errorTileUrl={TRANSPARENT_1PX} pane="pane-labels" />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_over/{z}/{x}/{y}.png" tileSize={256} zoomOffset={0} detectRetina opacity={0.55} errorTileUrl={TRANSPARENT_1PX} pane="pane-labels" />
        </Pane>

        {/* seamarks */}
        <Pane name="pane-seamarks" style={{ zIndex: 400 }}>
          <TileLayer attribution="&copy; OpenSeaMap" url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png" opacity={0.5} />
        </Pane>

        {/* full route shadow */}
        <Pane name="pane-route-shadow" style={{ zIndex: 440 }}>
          {waterLatLngs.length >= 2 && (
            <Polyline pane="pane-route-shadow" positions={waterLatLngs} pathOptions={{ color:"#9aa3b2", weight:2, opacity:0.6, lineJoin:"round", lineCap:"round" }} />
          )}
        </Pane>

        {/* progressive dashed route */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {animatedLatLngs.length >= 2 && (
            <Polyline pane="pane-route" positions={animatedLatLngs} pathOptions={{ color:"#0b1220", weight:3, opacity:0.95, dashArray:"6 8", lineJoin:"round", lineCap:"round" }} />
          )}

          {markerStart && (
            <AnimatedDot center={[markerStart.lat, markerStart.lon] as LatLngExpression} label={`Start: ${effPoints[0]?.name}`} active appearAtMs={0} baseRadius={8} />
          )}

          {markerMids.map((p, i) => {
            const legIdx = i;
            const appearWhenIdx = legEndIdx[legIdx] ?? 0;
            const appearAt = (appearWhenIdx + 1) * DRAW_INTERVAL_MS;
            const active = isActive(p.name);
            return (
              <AnimatedDot key={`${p.name}-${i}`} center={[p.lat, p.lon] as LatLngExpression} label={p.name} active={active} appearAtMs={appearAt} onClick={() => flyTo(p.name, p.lat, p.lon)} baseRadius={5} />
            );
          })}

          {markerEnd && (
            <AnimatedDot center={[markerEnd.lat, markerEnd.lon] as LatLngExpression} label={`End: ${effPoints.at(-1)?.name}`} active appearAtMs={(legEndIdx[legEndIdx.length - 1] ?? 0) * DRAW_INTERVAL_MS} onClick={() => flyTo(markerEnd.name, markerEnd.lat, markerEnd.lon)} baseRadius={8} />
          )}
        </Pane>

        {/* dataset markers */}
        {markers?.length ? (
          <Pane name="pane-dataset" style={{ zIndex: 430 }}>
            {markers.map((m, i) => (
              <CircleMarker
                key={`${m.name}-${i}`}
                pane="pane-dataset"
                center={[m.lat, m.lon] as LatLngExpression}
                radius={3.5}
                eventHandlers={{ click: () => flyTo(m.name, m.lat, m.lon) }}
                pathOptions={{ color: isActive(m.name) ? "#c4a962" : "#0b122033", fillColor: isActive(m.name) ? "#c4a962" : "#0b122033", fillOpacity: isActive(m.name) ? 0.95 : 0.5, weight: isActive(m.name) ? 2 : 1 }}
              >
                {isActive(m.name) && (<Tooltip direction="top" offset={[0,-6]} opacity={0.95}>{m.name}</Tooltip>)}
              </CircleMarker>
            ))}
          </Pane>
        ) : null}

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
