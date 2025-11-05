"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "leaflet/dist/leaflet.css";

import RouteMapClient from "./RouteMapClient";
import CaptainCrewToolkit from "./components/CaptainCrewToolkit";
import VipGuestsView from "./components/VipGuestsView";
import { usePorts } from "../../lib/ports";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Yacht = { type: YachtType; speed: number; lph: number };
type Leg = {
  from: string; to: string; nm: number; hours: number; fuelL: number;
  cost?: number; eta?: { dep: string; arr: string; window: string }
};
type DayCard = {
  day: number; date: string; leg?: Leg; notes?: string;
  userNotes?: { marina?: string; food?: string; beach?: string };
};
type PlannerMode = "Region" | "Custom";
type RegionKey = "Saronic" | "Cyclades" | "Ionian" | "Dodecanese" | "Sporades" | "NorthAegean" | "Crete";
type PortCoord = { id?: string; name: string; lat: number; lon: number; aliases?: string[] };
type SpotWeather = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

/* ========= Small utils ========= */
function normalize(s: string) { return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); }
function haversineNM(a: PortCoord, b: PortCoord) {
  const R = 3440.065, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function legStats(nm: number, yacht: Yacht) {
  const hours = (nm / yacht.speed) * 1.15;
  const fuelL = yacht.type === "Motor" ? hours * yacht.lph : 0;
  return { hours: +hours.toFixed(2), fuelL: Math.round(fuelL) };
}
function addDaysISO(iso: string, plus: number) { const d = new Date(iso); d.setDate(d.getDate() + plus); return d.toISOString().slice(0,10); }
function pad2(n: number) { return n.toString().padStart(2,"0"); }
function addHoursToTime(hhmm: string, hours: number) {
  const [hh, mm] = hhmm.split(":").map(n=>parseInt(n,10));
  const total = Math.round(hh*60 + mm + hours*60);
  return `${pad2(Math.floor((total/60)%24))}:${pad2(total%60)}`;
}
function formatHoursHM(hours: number) { const h = Math.floor(hours), m = Math.round((hours-h)*60); return `${h}h ${m}m`; }
function formatDate(d?: string) {
  if (!d) return "—"; try { return new Date(d).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});} catch { return d||"—"; }
}

/* ========= Region helper ========= */
const BANK: Record<RegionKey, string[]> = {
  Saronic: ["Alimos","Aegina","Agistri","Poros","Hydra","Spetses","Ermioni","Porto Cheli","Alimos"],
  Cyclades: ["Lavrio","Kea","Kythnos","Syros","Mykonos","Paros","Naxos","Ios","Santorini","Milos","Sifnos","Serifos","Lavrio"],
  Ionian: ["Corfu","Paxos","Antipaxos","Lefkada","Meganisi","Kalamos","Kastos","Ithaca","Kefalonia","Zakynthos","Lefkada"],
  Dodecanese: ["Rhodes","Symi","Kos","Kalymnos","Patmos","Rhodes"],
  Sporades: ["Volos","Skiathos","Skopelos","Alonissos","Volos"],
  NorthAegean: ["Thessaloniki","Nea Moudania","Sani Marina","Nikiti","Vourvourou","Ormos Panagias","Ouranoupoli","Kavala","Thassos","Samothraki","Lemnos","Lesvos","Chios","Samos","Ikaria"],
  Crete: ["Chania","Rethymno","Heraklion","Agios Nikolaos","Chania"],
};
function autoPickRegion(start: string, end: string): RegionKey {
  const s=(start+" "+end).toLowerCase();
  if (s.match(/lefka|corfu|paxos|preveza|zakynthos/)) return "Ionian";
  if (s.match(/aegina|hydra|poros|spetses|alimos/)) return "Saronic";
  if (s.match(/skiathos|skopelos|alonissos|volos/)) return "Sporades";
  if (s.match(/rhodes|kos|patmos/)) return "Dodecanese";
  if (s.match(/lesvos|chios|samos|thessaloniki/)) return "NorthAegean";
  if (s.match(/chania|heraklion|crete/)) return "Crete";
  return "Cyclades";
}
function nearestIndexInRing(ring: string[], target: PortCoord, findPort: (name: string)=>PortCoord|null) {
  let best=0, bestD=Infinity; for (let i=0;i<ring.length;i++){ const p=findPort(ring[i]); if(!p) continue; const d=haversineNM(target,p); if(d<bestD){bestD=d; best=i;}}
  return best;
}
function buildRouteRegion(start: string, end: string, days: number, region: RegionKey, vias: string[], findPort: (name: string)=>PortCoord|null) {
  const ring=BANK[region]??[]; const startC=findPort(start); const endName=(end&&end.trim())?end:start;
  if(!ring.length||!startC){ const seq=[start,...vias.filter(Boolean),endName]; while(seq.length<days+1) seq.splice(seq.length-1,0,endName); return seq.slice(0,days+1); }
  const path=[start]; let remaining=days;
  for(const raw of vias){ const v=(raw||"").trim(); if(!v||!findPort(v)||remaining<=0) continue; if(path[path.length-1].toLowerCase()===v.toLowerCase()) continue; path.push(v); remaining--; }
  const entry=nearestIndexInRing(ring, findPort(path[path.length-1])||startC, findPort);
  const rotated=[...ring.slice(entry), ...ring.slice(0,entry)]; const extended: string[]=[]; while(extended.length<days+20) extended.push(...rotated);
  let k=0; if(extended[0]?.toLowerCase()===path[path.length-1].toLowerCase()) k=1;
  while(remaining>1 && k<extended.length){ const c=extended[k++]; if(!c) continue; if(c.toLowerCase()===path[path.length-1].toLowerCase()) continue; path.push(c); remaining--; }
  const last=endName;
  if(path[path.length-1]?.toLowerCase()===last.toLowerCase()){ const tailMinus1=path.length>=2 ? path[path.length-2].toLowerCase() : ""; const alt=extended.find(x=>x && x.toLowerCase()!==last.toLowerCase() && x.toLowerCase()!==tailMinus1); if(alt) path[path.length-1]=alt; }
  if(remaining>=1) path.push(last);
  if(path.length>days+1) path.length=days+1; while(path.length<days+1) path.push(last); return path;
}
function buildRouteCustomByDays(start: string, dayStops: string[], findPort: (name:string)=>PortCoord|null) {
  const seq=[start, ...dayStops].map(s=>s.trim()).filter(Boolean); const ok=seq.every(s=>!!findPort(s)); if(!ok || seq.length<2) return null; return seq;
}
function suggestWindow(region: RegionKey, hours: number, wxAware: boolean) {
  if (region==="Cyclades") return wxAware ? "07:30–11:00" : (hours<=2.5?"08:00–11:00":"08:00–12:30");
  if (region==="Saronic"||region==="Ionian") return wxAware ? "08:00–10:30" : (hours<=1.8?"09:00–10:45":"09:00–12:00");
  return wxAware ? "08:00–12:00" : (hours<=2?"09:00–11:00":"09:00–12:30");
}

/* ========= Weather (client) ========= */
const weatherCache = new Map<string, SpotWeather>();
function labelFromWx(precip?: number, cloud?: number) {
  if ((precip ?? 0) > 0.1) return "Rain";
  if ((cloud ?? 0) >= 70) return "Cloudy";
  if ((cloud ?? 0) >= 30) return "Partly cloudy";
  return "Clear";
}
async function fetchSpotWeather(lat: number, lon: number): Promise<SpotWeather | null> {
  const key=`${lat.toFixed(3)},${lon.toFixed(3)}`; if(weatherCache.has(key)) return weatherCache.get(key)!;
  const url1=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,cloud_cover&timezone=auto`;
  try{
    const r=await fetch(url1); if(!r.ok) throw new Error("wx"); const j=await r.json();
    const out: SpotWeather = {
      tempC: j?.current?.temperature_2m!=null? Math.round(j.current.temperature_2m):undefined,
      precipMM: j?.current?.precipitation!=null? +Number(j.current.precipitation).toFixed(1):undefined,
      cloudPct: j?.current?.cloud_cover!=null? Math.round(j.current.cloud_cover):undefined,
    };
    out.label=labelFromWx(out.precipMM,out.cloudPct); weatherCache.set(key,out); return out;
  }catch{ return null; }
}

/* ========= Query helpers (compact) ========= */
const safeEncode = (obj: unknown) => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj)))));
const safeDecode = <T,>(s: string | null): T | null => { if(!s) return null; try{ return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s))))) as T; }catch{return null;} };
function encodeArr(arr: string[]) { return arr.map(encodeURIComponent).join(","); }
function decodeArr(s: string | null) { return s ? s.split(",").map(decodeURIComponent).filter(Boolean) : []; }
function buildQueryFromState(state: any) {
  const q = new URLSearchParams();
  Object.entries(state).forEach(([k,v])=>{
    if (v==null) return;
    if (Array.isArray(v)) q.set(k, encodeArr(v as string[]));
    else q.set(k, String(v));
  });
  if (state.notesPayload) q.set("notes", safeEncode(state.notesPayload));
  q.set("autogen","1");
  return q.toString();
}

/* ========= Component ========= */
export const dynamic = "force-dynamic";

function AIPlannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, error, ports, options, findPort: findPortRaw } = usePorts();

  const findPort = (input: string): PortCoord | null => {
    if (!input) return null;
    const p = findPortRaw(input);
    return p ? ({ id: (p as any).id, name: p.name, lat: p.lat, lon: p.lon, aliases: (p as any).aliases }) : null;
  };

  const PORT_OPTIONS = useMemo(() => {
    const arr = Array.isArray(options) ? options.slice() : [];
    arr.sort((a: string, b: string) => a.localeCompare(b));
    return arr;
  }, [options]);

  // Common state
  const [mode, setMode] = useState<PlannerMode>("Region");
  const [startDate, setStartDate] = useState<string>("");
  useEffect(()=>{ setStartDate(new Date().toISOString().slice(0,10)); },[]);
  const [yachtType, setYachtType] = useState<YachtType>("Motor");
  const [speed, setSpeed] = useState<number>(20);
  const [lph, setLph] = useState<number>(180);
  const [fuelPrice, setFuelPrice] = useState<number>(1.8);
  const [depTime, setDepTime] = useState<string>("09:00");
  const [weatherAwareWin, setWeatherAwareWin] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [plan, setPlan] = useState<DayCard[] | null>(null);
  const yacht: Yacht = { type: yachtType, speed, lph };

  // thumbs + live weather (these θα περάσουν στο VIP tab)
  const [thumbs, setThumbs] = useState<Record<string, string | undefined>>({});
  const [destWeather, setDestWeather] = useState<Record<string, SpotWeather>>({});

  // Region
  const [start, setStart] = useState("Alimos");
  const [end, setEnd] = useState("Alimos");
  const [days, setDays] = useState(7);
  const [regionMode, setRegionMode] = useState<"Auto"|RegionKey>("Auto");
  const autoRegion = useMemo(()=>autoPickRegion(start,end),[start,end]);
  const region: RegionKey = regionMode==="Auto" ? autoRegion : regionMode;
  const [vias, setVias] = useState<string[]>([]);
  const effectiveVias = useMemo(()=>[...vias].filter(Boolean).filter(v=>normalize(v)!==normalize(start)&&normalize(v)!==normalize(end)),[vias,start,end]);

  // Custom
  const [customStart, setCustomStart] = useState("Alimos");
  const [customDays, setCustomDays] = useState(7);
  const [customDayStops, setCustomDayStops] = useState<string[]>(Array.from({length:7},(_,i)=> (i===0?"Aegina":"")));
  useEffect(()=>{ setCustomDayStops(old=>{ const n=[...old]; if(n.length<customDays) while(n.length<customDays) n.push(""); else if(n.length>customDays) n.length=customDays; return n; }); },[customDays]);

  // Map pick
  type MapPick = "Start" | "End" | "Via" | "Custom";
  const [mapPickMode, setMapPickMode] = useState<MapPick>("Via");
  const [customPickIndex, setCustomPickIndex] = useState<number>(1);

  // Tabs
  const [showTabs, setShowTabs] = useState(false);
  const [activeTab, setActiveTab] = useState<"crew"|"vip">("crew");

  // Pending notes from URL
  const pendingNotesRef = useRef<any|null>(null);

  // Load from URL
  useEffect(()=>{
    if(!searchParams || !ready) return;
    const sp = searchParams;
    const modeQ = (sp.get("mode") as PlannerMode) || "Region"; setMode(modeQ);
    const date = sp.get("date") || ""; if(date) setStartDate(date);
    const yt = (sp.get("yt") as YachtType) || "Motor"; setYachtType(yt);
    setSpeed(Number(sp.get("speed")||20)); setLph(Number(sp.get("lph")||180));
    setFuelPrice(Number(sp.get("fuel")||1.8)); setDepTime(sp.get("dep")||"09:00");
    setWeatherAwareWin(sp.get("wx")==="1");

    if (modeQ==="Region") {
      setStart(sp.get("start")||"Alimos");
      setEnd(sp.get("end")||sp.get("start")||"Alimos");
      setDays(Number(sp.get("days")||7));
      setRegionMode((sp.get("region") as any) || "Auto");
      setVias(decodeArr(sp.get("vias")));
    } else {
      setCustomStart(sp.get("cstart")||"Alimos");
      setCustomDays(Number(sp.get("cdays")||7));
      const cstops = decodeArr(sp.get("cstops")); if(cstops.length) setCustomDayStops(cstops);
    }

    pendingNotesRef.current = safeDecode<any>(sp.get("notes"));
    const autogen = sp.get("autogen")==="1";
    if (autogen) { try { document.getElementById("generate-btn")?.dispatchEvent(new Event("click",{bubbles:true})); } catch {} }
  },[ready,searchParams]);

  function onTogglePref(v: string) { setPrefs(prev => prev.includes(v) ? prev.filter(x=>x!==v) : [...prev, v]); }
  function addVia() { setVias(v=>[...v,""]); }
  function setViaAt(i:number,val:string){ setVias(v=>v.map((x,idx)=> idx===i?val:x)); }
  function removeVia(i:number){ setVias(v=>v.filter((_,idx)=>idx!==i)); }
  function setCustomStopAt(i:number,val:string){ setCustomDayStops(a=>a.map((x,idx)=> idx===i?val:x)); }

  /* ======= Generate ======= */
  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!ready) { alert("Φορτώνω ports… δοκίμασε ξανά σε λίγο."); return; }

    let namesSeq: string[] | null = null;
    if (mode==="Region") {
      if (!findPort(start) || !findPort(end)) { alert("Επίλεξε έγκυρο Start/End από τη λίστα."); return; }
      namesSeq = buildRouteRegion(start, end, days, region, effectiveVias, findPort);
    } else {
      if (!findPort(customStart)) { alert("Επίλεξε έγκυρο Start (custom)."); return; }
      const seq = buildRouteCustomByDays(customStart, customDayStops, findPort);
      if (!seq) { alert("Συμπλήρωσε έγκυρους προορισμούς για κάθε ημέρα."); return; }
      namesSeq = seq;
    }

    const coords = (namesSeq ?? []).map(n=>findPort(n)).filter(Boolean) as PortCoord[];
    if (coords.length < 2) { setPlan([]); return; }

    const yachtObj: Yacht = { type: yachtType, speed, lph };
    const legs: Leg[] = [];
    for (let i=0;i<coords.length-1;i++){
      const nm = Math.max(1, Math.round(haversineNM(coords[i], coords[i+1])));
      const { hours, fuelL } = legStats(nm, yachtObj);
      const window = suggestWindow(region, hours, weatherAwareWin);
      const dep = depTime || "09:00"; const arr = addHoursToTime(dep, hours);
      const cost = yachtType==="Motor" ? Math.round(fuelL * fuelPrice) : 0;
      legs.push({ from: namesSeq![i], to: namesSeq![i+1], nm, hours, fuelL, cost, eta: { dep, arr, window } });
    }

    const totalDays = (namesSeq?.length ?? 1) - 1;
    const cards: DayCard[] = [];
    for (let d=0; d<totalDays; d++){
      const date = startDate ? addDaysISO(startDate, d) : "";
      const leg = legs[d];
      const notes = [
        mode==="Region" && region==="Cyclades"   ? "Meltemi possible· προτίμησε πρωινές μετακινήσεις." : "",
        mode==="Region" && region==="Saronic"    ? "Προστατευμένα νερά· ιδανικό για οικογένειες." : "",
        mode==="Region" && region==="Ionian"     ? "Ήρεμα κανάλια & πράσινες ακτές· εξαιρετικά αγκυροβόλια." : "",
      ].filter(Boolean).join(" ");
      cards.push({ day:d+1, date, leg, notes, userNotes:{} });
    }

    const pending = pendingNotesRef.current as Record<string, any> | null;
    if (pending && cards.length) {
      cards.forEach((c, idx) => { const k=String(idx+1); if (pending[k]) c.userNotes = { ...(c.userNotes??{}), ...pending[k] }; });
      pendingNotesRef.current = null;
    }

    setPlan(cards);
    setShowTabs(true);
    setActiveTab("crew");

    // Prefetch thumbs
    (async ()=>{
      const uniq = Array.from(new Set(legs.map(l=>l.to)));
      const next: Record<string, string|undefined> = {};
      for (const t of uniq) {
        try {
          // απλό fallback σε Wikipedia thumb μέσω summary endpoint
          const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`, { headers: { accept: "application/json" } });
          const j = r.ok ? await r.json() : null;
          next[t] = j?.thumbnail?.source;
        } catch { next[t] = undefined; }
      }
      setThumbs(next);
    })();

    // Prefetch live weather
    (async ()=>{
      const uniq = Array.from(new Set(legs.map(l=>l.to)));
      const next: Record<string, SpotWeather> = {};
      for (const name of uniq) {
        const p = findPort(name); if (!p) continue;
        const wx = await fetchSpotWeather(p.lat, p.lon); if (wx) next[name]=wx;
      }
      setDestWeather(next);
    })();

    // Update URL
    const qs = buildQueryFromState({
      mode, date:startDate, yt:yachtType, speed, lph,
      fuel:fuelPrice, dep:depTime, wx: weatherAwareWin ? 1 : 0,
      ...(mode==="Region" ? { start, end, days, region: regionMode, vias } : { cstart: customStart, cdays: customDays, cstops: customDayStops }),
      autogen: 1
    });
    router.replace(`/ai?${qs}`, { scroll: false });
  }

  // Map derived
  const mapPoints = useMemo(()=>{
    if (!plan?.length) return [] as PortCoord[];
    const names: string[] = []; const first = plan[0]?.leg?.from; if (first) names.push(first);
    for (const d of plan) if (d.leg?.to) names.push(d.leg.to);
    return names.map(n=>findPort(n)).filter(Boolean) as PortCoord[];
  },[plan]);
  const markers = useMemo(()=> !ready||!ports?.length ? [] : ports.map((p:any)=>({name:p.name, lat:p.lat, lon:p.lon})),[ready,ports]);
  const activeNames = useMemo(()=>{
    const set = new Set<string>();
    if (mode==="Region"){ if(start) set.add(start); effectiveVias.forEach(v=>set.add(v)); if(end) set.add(end); }
    else { if(customStart) set.add(customStart); customDayStops.forEach(v=>v&&set.add(v)); }
    return Array.from(set);
  },[mode,start,end,effectiveVias,customStart,customDayStops]);
  function handleMarkerClick(portName: string){
    if (mode==="Region"){
      if (mapPickMode==="Start"){ setStart(portName); return; }
      if (mapPickMode==="End"){ setEnd(portName); return; }
      const idx = vias.findIndex(v=>!v);
      if (mapPickMode==="Via"){ if(idx>=0) setViaAt(idx,portName); else setVias(v=>[...v,portName]); return; }
    } else {
      if (mapPickMode==="Start"){ setCustomStart(portName); return; }
      if (mapPickMode==="Custom"){ const i=Math.max(1,Math.min(customDays,customPickIndex))-1; setCustomStopAt(i,portName); return; }
      if (mapPickMode==="End"){ const i=customDays-1; setCustomStopAt(i,portName); return; }
      if (mapPickMode==="Via"){ const i=customDayStops.findIndex(x=>!x); setCustomStopAt(i>=0?i:customDayStops.length-1,portName); return; }
    }
  }

  // Totals
  const totals = useMemo(()=>{
    if(!plan?.length) return null;
    const nm = plan.reduce((s,d)=> s + (d.leg?.nm||0), 0);
    const hrsNum = plan.reduce((s,d)=> s + (d.leg?.hours||0), 0);
    const fuel = plan.reduce((s,d)=> s + (d.leg?.fuelL||0), 0);
    const cost = plan.reduce((s,d)=> s + (d.leg?.cost||0), 0);
    const hh = Math.floor(hrsNum), mm = Math.round((hrsNum-hh)*60);
    return { nm, hrs: `${hh}h ${mm}m`, fuel, cost };
  },[plan]);

  return (
    <div className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy no-print">AI Itinerary Draft</h1>
        <p className="mt-2 max-w-2xl text-slate-600 no-print">
          <b>Auto AI Planner</b> ή πλήρως Custom. Βάλε ημερομηνία & στοιχεία σκάφους, πρόσθεσε στάσεις και κάνε generate.
        </p>

        {/* --- FORM (συνοπτικό – ίδιος χειρισμός με πριν) --- */}
        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 gap-4 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-brand-navy">Planner Mode</label>
            <select value={mode} onChange={(e)=>setMode(e.target.value as PlannerMode)} className="rounded-xl border px-3 py-2 text-sm">
              <option value="Region">Auto AI Planner</option>
              <option value="Custom">Custom (day-by-day)</option>
            </select>
            {!ready && <span className="text-xs text-slate-500">Φορτώνω ports…</span>}
            {error && <span className="text-xs text-red-600">Σφάλμα dataset</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            <div className="flex flex-col md:col-span-2">
              <label htmlFor="date" className="mb-1 text-xs font-medium text-gray-600">Ημερομηνία αναχώρησης</label>
              <input id="date" type="date" value={startDate||""} onChange={(e)=>setStartDate(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="yt" className="mb-1 text-xs font-medium text-gray-600">Τύπος σκάφους</label>
              <select id="yt" value={yachtType} onChange={(e)=>setYachtType(e.target.value as YachtType)} className="rounded-xl border px-4 py-3 text-sm">
                <option value="Motor">Motor</option><option value="Sailing">Sailing</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="speed" className="mb-1 text-xs font-medium text-gray-600">Ταχύτητα (kn)</label>
              <input id="speed" type="number" min={4} value={speed} onChange={(e)=>setSpeed(parseFloat(e.target.value||"10"))} className="rounded-xl border px-4 py-3 text-sm" />
            </div>
            {yachtType==="Motor" && (
              <>
                <div className="flex flex-col">
                  <label htmlFor="lph" className="mb-1 text-xs font-medium text-gray-600">Κατανάλωση (L/h)</label>
                  <input id="lph" type="number" min={5} value={lph} onChange={(e)=>setLph(parseFloat(e.target.value||"120"))} className="rounded-xl border px-4 py-3 text-sm" />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="fuel" className="mb-1 text-xs font-medium text-gray-600">Τιμή καυσίμου (€/L)</label>
                  <input id="fuel" type="number" step="0.01" min={0} value={fuelPrice} onChange={(e)=>setFuelPrice(parseFloat(e.target.value||"1.8"))} className="rounded-xl border px-4 py-3 text-sm" />
                </div>
              </>
            )}
            <div className="flex flex-col">
              <label htmlFor="dep" className="mb-1 text-xs font-medium text-gray-600">Ώρα αναχώρησης</label>
              <input id="dep" type="time" value={depTime} onChange={(e)=>setDepTime(e.target.value||"09:00")} className="rounded-xl border px-4 py-3 text-sm" />
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={weatherAwareWin} onChange={(e)=>setWeatherAwareWin(e.target.checked)} />
              Weather-aware window
            </label>
          </div>

          {/* Region controls (συνοπτικά) */}
          {mode==="Region" && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Start</label>
                  <input className="rounded-xl border px-4 py-3 text-sm" value={start} onChange={e=>setStart(e.target.value)} placeholder="Alimos" />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">End</label>
                  <input className="rounded-xl border px-4 py-3 text-sm" value={end} onChange={e=>setEnd(e.target.value)} placeholder="Alimos" />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Region</label>
                  <select value={regionMode} onChange={(e)=>setRegionMode(e.target.value as any)} className="rounded-xl border px-4 py-3 text-sm">
                    <option value="Auto">Auto</option>
                    <option value="Saronic">Saronic</option><option value="Cyclades">Cyclades</option>
                    <option value="Ionian">Ionian</option><option value="Dodecanese">Dodecanese</option>
                    <option value="Sporades">Sporades</option><option value="NorthAegean">North Aegean</option>
                    <option value="Crete">Crete</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Days</label>
                  <input type="number" min={2} max={21} className="rounded-xl border px-4 py-3 text-sm" value={days} onChange={(e)=>setDays(parseInt(e.target.value||"7",10))} />
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-brand-navy">Προαιρετικές διελεύσεις/στάσεις (σειρά)</div>
                  <button type="button" onClick={addVia} className="rounded-lg border px-3 py-1 text-sm">+ Add Stop</button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {vias.map((v,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2 text-sm" value={v} onChange={(e)=>setViaAt(i,e.target.value)} placeholder={`Stop ${i+1}`} />
                      <button type="button" onClick={()=>removeVia(i)} className="rounded-lg border px-3 py-2 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Custom controls */}
          {mode==="Custom" && (
            <div className="rounded-2xl border p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Start (Day 0)</label>
                  <input className="rounded-xl border px-4 py-3 text-sm" value={customStart} onChange={(e)=>setCustomStart(e.target.value)} />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Days</label>
                  <input type="number" min={1} max={30} className="rounded-xl border px-4 py-3 text-sm" value={customDays} onChange={(e)=>setCustomDays(parseInt(e.target.value||"7",10))} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {customDayStops.map((stop,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-20 text-xs text-slate-500">Day {i+1}</div>
                    <input className="flex-1 rounded-xl border px-3 py-2 text-sm" value={stop} onChange={(e)=>setCustomStopAt(i,e.target.value)} placeholder={`Destination for Day ${i+1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="flex flex-wrap gap-2">
            {["family","nightlife","gastronomy"].map(p=>(
              <button key={p} type="button" onClick={()=>onTogglePref(p)} className={`rounded-full border px-3 py-1 text-sm ${prefs.includes(p)?"border-brand-navy bg-brand-navy text-white":"border-slate-300"}`}>{p}</button>
            ))}
          </div>

          <button id="generate-btn" type="submit" disabled={!ready}
            className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm border-[#c4a962] text-[#0b1220] bg-white/90 hover:bg-[#c4a962] hover:text-[#0b1220]">
            Generate
          </button>
        </form>

        {/* ===== OUTPUT ===== */}
        {plan && (
          <div className="mt-8" id="print-root">
            {/* Summary */}
            {totals && (
              <div className="mb-4 rounded-2xl border bg-white p-4">
                <div className="text-sm font-medium text-brand-navy">Trip summary</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div><div className="text-xs">Route</div><div className="font-medium">{mode==="Region" ? `${start} → ${end}` : `${customStart}`}</div></div>
                  <div><div className="text-xs">Region</div><div className="font-medium">{mode==="Region" ? (regionMode==="Auto" ? `${autoPickRegion(start,end)} (auto)` : region) : "Custom"}</div></div>
                  <div><div className="text-xs">Distance</div><div className="font-medium">{totals.nm} nm</div></div>
                  <div><div className="text-xs">Underway</div><div className="font-medium">{totals.hrs}</div></div>
                  {yachtType==="Motor" && <div><div className="text-xs">Fuel / Cost</div><div className="font-medium">~{totals.fuel} L • ~€{totals.cost}</div></div>}
                </div>
              </div>
            )}

            {/* Map */}
            {mapPoints.length>=1 && (
              <div className="no-print mb-6">
                <div className="h-[420px] w-full overflow-hidden rounded-2xl border">
                  <RouteMapClient points={mapPoints} markers={markers} activeNames={activeNames} onMarkerClick={handleMarkerClick} />
                </div>
                <div className="mt-2 text-xs text-slate-500">* Map preview – η διακεκομμένη γραμμή είναι εκτίμηση.</div>
              </div>
            )}

            {/* Tabs */}
            {showTabs && (
              <div className="mb-3 no-print">
                <div className="flex gap-2">
                  <button onClick={()=>setActiveTab("crew")} className={`px-4 py-2 rounded-2xl text-sm font-medium border ${activeTab==="crew"?"bg-black text-white border-black":"bg-white hover:bg-neutral-100"}`}>For Captain & Crew</button>
                  <button onClick={()=>setActiveTab("vip")} className={`px-4 py-2 rounded-2xl text-sm font-medium border ${activeTab==="vip"?"bg-black text-white border-black":"bg-white hover:bg-neutral-100"}`}>For VIP Guests</button>
                </div>
              </div>
            )}

            {/* Crew tab */}
            {showTabs && activeTab==="crew" && plan && (
              <CaptainCrewToolkit
                plan={plan}
                startDate={startDate}
                yachtType={yachtType}
                speed={speed}
                lph={lph}
                thumbs={thumbs}
                destWeather={destWeather}
              />
            )}

            {/* VIP tab  — passes thumbs + destWeather as ζητήθηκε */}
            {showTabs && activeTab==="vip" && plan && (
              <VipGuestsView
                plan={plan}
                mode={mode}
                startDate={startDate}
                start={mode==="Region" ? start : customStart}
                end={mode==="Region" ? end : undefined}
                thumbs={thumbs}
                destWeather={destWeather}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ========= Page wrapper ========= */
export default function AIPlannerPage() {
  return (
    <Suspense fallback={null}>
      <AIPlannerInner />
    </Suspense>
  );
}
