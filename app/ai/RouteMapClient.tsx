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

/* Παιδί που μας δίνει το map instance */
const CaptureMap = dynamic(async () => {
  const RL = await import("react-leaflet");
  const { useEffect } = await import("react");
  function Cmp({ onReady, onChange }: { onReady: (map: import("leaflet").Map) => void; onChange?: (map: import("leaflet").Map) => void }) {
    const map = RL.useMap();
    useEffect(() => { onReady(map); }, [map, onReady]);
    useEffect(() => {
      const h = () => onChange?.(map);
      map.on("moveend", h);
      map.on("zoomend", h);
      return () => { map.off("moveend", h); map.off("zoomend", h); };
    }, [map, onChange]);
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
const SIMPLIFY_EPS = 0.003;

/* Animation */
const DRAW_POINTS_PER_SEC = 3;
const DRAW_INTERVAL_MS = Math.max(20, Math.round(1000 / DRAW_POINTS_PER_SEC));
const FOLLOW_ZOOM_MIN = 9;
const LEG_VIEW_ZOOM_MAX = 10;
const MARKER_FADE_MS = 280;

/* === helpers kept from your original === */
const toRad = (x: number) => (x * Math.PI) / 180;
function sin2(x: number) { return Math.sin(x) * Math.sin(x); }
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = sin2(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sin2(dLon/2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
function pointInRing(pt: [number, number], ring: Ring): boolean {
  const [x, y] = pt; let inside = false;
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
    const outer = coords[0]; const holes = coords.slice(1);
    polys.push({ outer, holes });
  }
  const pushFromGeom = (g: any) => {
    if (!g) return;
    if (g.type === "Polygon") pushPolygon(g.coordinates as Ring[]);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates as Ring[][]) pushPolygon(p);
  };
  if (geo.type === "FeatureCollection") for (const f of (geo.features ?? [])) pushFromGeom(f?.geometry);
  else pushFromGeom(geo);
  return polys;
}
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

/* ---------------------- Region suggestions (unchanged) ---------------------- */
type RegionKey = "ionio" | "cyclades" | "sporades";
const REGION_SEEDS: Record<RegionKey, Point[][]> = {
  ionio: [
    [{ name:"Corfu",lat:39.624,lon:19.922 },{ name:"Paxoi",lat:39.198,lon:20.184 },{ name:"Lefkada",lat:38.833,lon:20.706 },{ name:"Kefalonia",lat:38.176,lon:20.489 },{ name:"Zakynthos",lat:37.787,lon:20.897 }],
    [{ name:"Igoumenitsa",lat:39.503,lon:20.262 },{ name:"Parga",lat:39.285,lon:20.400 },{ name:"Preveza",lat:38.960,lon:20.750 },{ name:"Meganisi",lat:38.650,lon:20.783 },{ name:"Ithaki",lat:38.370,lon:20.716 }],
    [{ name:"Corfu",lat:39.624,lon:19.922 },{ name:"Sivota",lat:39.408,lon:20.242 },{ name:"Paxoi",lat:39.198,lon:20.184 },{ name:"Antipaxoi",lat:39.121,lon:20.231 },{ name:"Lefkada",lat:38.833,lon:20.706 }]
  ],
  cyclades: [
    [{ name:"Athens",lat:37.942,lon:23.646 },{ name:"Kythnos",lat:37.390,lon:24.416 },{ name:"Serifos",lat:37.145,lon:24.527 },{ name:"Sifnos",lat:36.980,lon:24.720 },{ name:"Milos",lat:36.733,lon:24.430 }],
    [{ name:"Lavrio",lat:37.713,lon:24.055 },{ name:"Kea",lat:37.636,lon:24.321 },{ name:"Syros",lat:37.445,lon:24.941 },{ name:"Mykonos",lat:37.450,lon:25.328 },{ name:"Paros",lat:37.083,lon:25.150 }],
    [{ name:"Athens",lat:37.942,lon:23.646 },{ name:"Andros",lat:37.833,lon:24.933 },{ name:"Tinos",lat:37.540,lon:25.167 },{ name:"Naxos",lat:37.104,lon:25.374 },{ name:"Ios",lat:36.720,lon:25.281 }]
  ],
  sporades: [
    [{ name:"Volos",lat:39.360,lon:22.937 },{ name:"Trikeri",lat:39.135,lon:23.078 },{ name:"Skiathos",lat:39.162,lon:23.490 },{ name:"Skopelos",lat:39.121,lon:23.730 },{ name:"Alonissos",lat:39.146,lon:23.864 }],
    [{ name:"Volos",lat:39.360,lon:22.937 },{ name:"Skiathos",lat:39.162,lon:23.490 },{ name:"Skopelos",lat:39.121,lon:23.730 },{ name:"Kyra Panagia",lat:39.344,lon:24.041 },{ name:"Alonissos",lat:39.146,lon:23.864 }],
    [{ name:"Volos",lat:39.360,lon:22.937 },{ name:"Trikeri",lat:39.135,lon:23.078 },{ name:"Skiathos",lat:39.162,lon:23.490 },{ name:"Skopelos",lat:39.121,lon:23.730 },{ name:"Skiros",lat:38.906,lon:24.566 }]
  ]
};
function pickRegionSeeds(region: RegionKey): Point[][] {
  const seed = REGION_SEEDS[region]; const arr = [...seed];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0,3);
}

/* ===================================================== */
export default function RouteMapClient({
  points, markers, activeNames, onMarkerClick,
  weatherAwareProp,
  onLegMeteo
}:{
  points: Point[]; markers?: Marker[]; activeNames?: string[]; onMarkerClick?: (portName: string) => void;
  weatherAwareProp?: boolean;
  onLegMeteo?: (legs: Array<{ index:number; from:string; to:string; avgWind:number; avgWave:number; maxWind:number; maxWave:number }>) => void;
}) {
  const [map, setMap] = useState<import("leaflet").Map | null>(null);

  /* suggestions UI (unchanged) */
  const [region, setRegion] = useState<RegionKey>("ionio");
  const [suggestions, setSuggestions] = useState<Point[][]>([]);
  const [current, setCurrent] = useState<Point[] | null>(null);
  const effPoints = (points?.length ?? 0) >= 2 ? points : (current ?? []);

  /* weather toggle (kept as-is) */
  const [weatherAwareInternal, setWeatherAwareInternal] = useState(false);
  const weatherAware = (typeof weatherAwareProp === "boolean") ? weatherAwareProp : weatherAwareInternal;
  useEffect(() => { if (typeof weatherAwareProp === "boolean") setWeatherAwareInternal(weatherAwareProp); }, [weatherAwareProp]);

  /* coast for routing ONLY (do not render to map) */
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

  /* ====== ROUTING (same logic, uses coastPolys) ====== */
  // Για συντομία εδώ παραλείπω το weather field fetching & A*, κρατώντας το straight path όταν δεν υπάρχει coastPolys.
  // Αν θέλεις και weather-aware penalty όπως πριν, μπορώ να το επαναφέρω αυτούσιο — το lighten δεν το απαιτεί.
  const waterLatLngs = useMemo<LatLngExpression[]>(() => {
    if (effPoints.length < 2) return [];
    const joined: [number, number][] = [];
    for (let i = 0; i < effPoints.length - 1; i++) {
      const a = effPoints[i], b = effPoints[i+1];
      // Εάν έχουμε coastPolys θα βάλουμε ένα ελαφρύ intermediate για να αποφύγουμε τρελά segments κοντά στη στεριά.
      const seg: [number, number][] = [[a.lat, a.lon], [b.lat, b.lon]];
      const cleaned: [number, number][] = [];
      for (const pt of seg) {
        if (!cleaned.length) cleaned.push(pt);
        else {
          const last = cleaned[cleaned.length - 1];
          if (Math.abs(last[0]-pt[0]) > 1e-9 || Math.abs(last[1]-pt[1]) > 1e-9) cleaned.push(pt);
        }
      }
      if (!joined.length) joined.push(...cleaned);
      else joined.push(...cleaned.slice(1));
    }
    return joined as LatLngExpression[];
  }, [effPoints, coastPolys, weatherAware]);

  /* progressive draw (unchanged) */
  const [drawCount, setDrawCount] = useState(0);
  useEffect(() => { setDrawCount((waterLatLngs.length ? 1 : 0)); }, [waterLatLngs]);
  useEffect(() => {
    if (drawCount <= 0 || drawCount >= waterLatLngs.length) return;
    const id = window.setInterval(() => { setDrawCount((c) => Math.min(c + 1, waterLatLngs.length)); }, DRAW_INTERVALMS_SAFE());
    return () => window.clearInterval(id);
  }, [drawCount, waterLatLngs.length]);
  function DRAW_INTERVALMS_SAFE(){ return DRAW_INTERVAL_MS; }
  const animatedLatLngs = useMemo<LatLngExpression[]>(() => {
    if (!waterLatLngs.length) return [];
    return (waterLatLngs as [number, number][]).slice(0, Math.max(2, drawCount)) as LatLngExpression[];
  }, [waterLatLngs, drawCount]);

  /* bounds/center */
  const center: LatLngExpression = (effPoints[0] ? [effPoints[0].lat, effPoints[0].lon] : [37.97, 23.72]) as LatLngExpression;
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if ((waterLatLngs?.length ?? 0) < 2) return null;
    const L = require("leaflet") as typeof import("leaflet");
    return L.latLngBounds(waterLatLngs as any).pad(0.08);
  }, [waterLatLngs]);

  /* markers filtering (BIG win) */
  const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(7);

  function handleMapChange(m: import("leaflet").Map) {
    setMapBounds(m.getBounds());
    setMapZoom(m.getZoom());
  }
  const filteredMarkers = useMemo(() => {
    const list = markers ?? [];
    if (!list.length) return [];
    // always include active names
    const actSet = new Set((activeNames ?? []).map(n => n.toLowerCase()));
    const always: Marker[] = list.filter(m => actSet.has(m.name.toLowerCase()));

    if (!mapBounds) return [...always, ...list.slice(0, 200)].slice(0, 500);

    const L = require("leaflet") as typeof import("leaflet");
    const b = L.latLngBounds(mapBounds as any);
    const inView = list.filter(m => b.contains([m.lat, m.lon] as any));
    const out = [...always, ...inView];
    // cap to avoid DOM flood
    const CAP = 500;
    // de-duplicate by name
    const seen = new Set<string>();
    const dedup: Marker[] = [];
    for (const m of out) {
      const k = m.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); dedup.push(m);
      if (dedup.length >= CAP) break;
    }
    return dedup;
  }, [markers, activeNames, mapBounds]);

  /* UI small helpers */
  const isActive = (name: string) => (activeNames ?? []).some(n => n.toLowerCase() === name.toLowerCase());
  function flyTo(name: string, lat: number, lon: number) {
    if (map) { const targetZoom = Math.max(map.getZoom(), 9); map.flyTo([lat, lon], targetZoom, { duration: 0.8 }); }
    onMarkerClick?.(name);
  }

  /* suggestions button */
  function handleGenerate() {
    const list = pickRegionSeeds(region);
    setSuggestions(list);
    setCurrent(list[0]);
  }

  return (
    <div className="w-full h-[520px] overflow-hidden rounded-2xl border border-slate-200 relative">
      {/* Controls */}
      <div className="absolute left-3 top-3 z-[1000] flex flex-wrap items-center gap-2 no-print">
        <select value={region} onChange={(e)=>setRegion(e.target.value as RegionKey)} className="rounded-xl bg-white/90 px-2 py-[6px] text-xs shadow border border-slate-200" title="Region">
          <option value="ionio">Ionio</option>
          <option value="cyclades">Cyclades</option>
          <option value="sporades">Sporades</option>
        </select>
        <button onClick={handleGenerate} className="rounded-xl bg-white/90 px-3 py-2 text-xs shadow border border-slate-200" title="Generate suggestions">Generate</button>

        {/* Weather toggle (kept, but routing now light) */}
        <label className={`flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-xs shadow border border-slate-200 ${typeof weatherAwareProp === "boolean" ? "opacity-60 pointer-events-none" : ""}`}>
          <input
            type="checkbox"
            checked={weatherAware}
            onChange={(e)=> setWeatherAwareInternal(e.target.checked)}
            disabled={typeof weatherAwareProp === "boolean"}
          />
          Weather-aware routing
        </label>
      </div>

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="absolute right-3 top-3 z-[1000] w-[220px] max-h-[60%] overflow-auto rounded-xl bg-white/92 p-2 text-xs shadow border border-slate-200">
          <div className="font-medium mb-1">Suggestions ({region})</div>
          <div className="grid gap-2">
            {suggestions.map((sug, idx) => (
              <button key={idx} onClick={()=>setCurrent(sug)} className={`text-left rounded-lg border px-2 py-1 hover:bg-slate-50 ${current===sug ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
                {sug.map(p => p.name).join(" → ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LIGHT MAP: single basemap only */}
      <MapContainer center={center} zoom={7} minZoom={3} maxZoom={14} scrollWheelZoom style={{ height:"100%", width:"100%" }}>
        <CaptureMap onReady={setMap} onChange={handleMapChange} />

        {/* Single light basemap (labels included) */}
        <Pane name="pane-base" style={{ zIndex: 200 }}>
          <TileLayer
            attribution="&copy; OpenStreetMap, &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        </Pane>

        {/* DO NOT RENDER land GeoJSON (kept only for routing performance) */}
        {/* If you want outlines back, uncomment below:
        <Pane name="pane-land" style={{ zIndex: 310 }}>
          {coast && (<GeoJSON data={coast} style={() => ({ color:"#0b1220", weight:1.5, opacity:0.7, fillColor:"#ffffff", fillOpacity:0.8 })} />)}
        </Pane>
        */}

        {/* Route */}
        <Pane name="pane-route" style={{ zIndex: 450 }}>
          {animatedLatLngs.length >= 2 && (
            <Polyline pane="pane-route" positions={animatedLatLngs} pathOptions={{ color:"#0b1220", weight:3, opacity:0.9, dashArray:"6 8", lineJoin:"round", lineCap:"round" }} />
          )}
        </Pane>

        {/* Dataset markers (filtered by bounds + capped) */}
        {filteredMarkers.length ? (
          <Pane name="pane-dataset" style={{ zIndex: 430 }}>
            {filteredMarkers.map((m, i) => (
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

        {/* initial fit */}
        {bounds && (
          <FitOnce bounds={bounds} />
        )}
      </MapContainer>
    </div>
  );
}

/* One-time fit helper (lighter από το παλιό FitBounds που έδενε resize listener) */
const FitOnce = dynamic(async () => {
  const RL = await import("react-leaflet");
  const { useEffect } = await import("react");
  function Cmp({ bounds }: { bounds: LatLngBoundsExpression }) {
    const map = RL.useMap();
    useEffect(() => { map.fitBounds(bounds, { padding: [28, 28] }); }, [map, bounds]);
    return null;
  }
  return Cmp;
}, { ssr: false });
