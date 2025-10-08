"use client";

import RouteMapClient from "./RouteMapClient";
import { Suspense, useMemo, useState, useEffect, useId } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ canonical ports hook (dataset + aliases + search)
import { usePorts } from "../../lib/ports";

// αποτρέπει prerender/SSG της σελίδας /ai (απαιτείται στο Vercel)
export const dynamic = "force-dynamic";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Yacht = { type: YachtType; speed: number; lph: number };
type Leg = { from: string; to: string; nm: number; hours: number; fuelL: number };
type DayCard = { day: number; date: string; leg?: Leg; notes?: string };
type RegionKey =
  | "Saronic"
  | "Cyclades"
  | "Ionian"
  | "Dodecanese"
  | "Sporades"
  | "NorthAegean"
  | "Crete";
type PlannerMode = "Region" | "Custom";

// minimal Port type expected from lib/ports.ts
type PortCoord = { id?: string; name: string; lat: number; lon: number; aliases?: string[] };

/* ========= Helpers (dataset-aware) ========= */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function haversineNM(a: PortCoord, b: PortCoord) {
  const R = 3440.065; // nm
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function legStats(nm: number, yacht: Yacht) {
  const hours = (nm / yacht.speed) * 1.15; // +15% buffer
  const fuelL = yacht.type === "Motor" ? hours * yacht.lph : 0;
  return { hours: +hours.toFixed(2), fuelL: Math.round(fuelL) };
}
function addDaysISO(iso: string, plus: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
}

/* ========= Region rings (by canonical names from dataset) ========= */
type RegionRing = Record<RegionKey, string[]>;
const BANK: RegionRing = {
  Saronic: [
    "Alimos", "Aegina", "Agistri", "Poros", "Hydra",
    "Spetses", "Ermioni", "Porto Cheli", "Alimos",
  ],
  Cyclades: [
    "Lavrio", "Kea", "Kythnos", "Syros", "Mykonos",
    "Paros", "Naxos", "Ios", "Santorini", "Milos",
    "Sifnos", "Serifos", "Lavrio",
  ],
  Ionian: [
    "Corfu", "Paxos", "Antipaxos", "Lefkada", "Meganisi",
    "Kalamos", "Kastos", "Ithaca", "Kefalonia", "Zakynthos",
    "Lefkada",
  ],
  Dodecanese: ["Rhodes", "Symi", "Kos", "Kalymnos", "Patmos", "Rhodes"],
  Sporades: ["Volos", "Skiathos", "Skopelos", "Alonissos", "Volos"],
  NorthAegean: [
    // incl. Halkidiki ring entries (dataset should include these)
    "Thessaloniki", "Nea Moudania", "Sani Marina", "Nikiti", "Vourvourou",
    "Ormos Panagias", "Ouranoupoli", "Kavala", "Thassos", "Samothraki",
    "Lemnos", "Lesvos", "Chios", "Samos", "Ikaria",
  ],
  Crete: ["Chania", "Rethymno", "Heraklion", "Agios Nikolaos", "Chania"],
};

function autoPickRegion(start: string, end: string): RegionKey {
  const s = (start + " " + end).toLowerCase();
  if (s.includes("lefka") || s.includes("corfu") || s.includes("paxos") || s.includes("preveza") || s.includes("zakynthos")) return "Ionian";
  if (s.includes("aegina") || s.includes("hydra") || s.includes("poros") || s.includes("spetses") || s.includes("alimos")) return "Saronic";
  if (s.includes("skiathos") || s.includes("skopelos") || s.includes("alonissos") || s.includes("volos")) return "Sporades";
  if (s.includes("rhodes") || s.includes("kos") || s.includes("patmos")) return "Dodecanese";
  if (s.includes("lesvos") || s.includes("chios") || s.includes("samos") || s.includes("thessaloniki")) return "NorthAegean";
  if (s.includes("chania") || s.includes("heraklion") || s.includes("crete")) return "Crete";
  return "Cyclades";
}

/* ========= Autocomplete (generic) ========= */
function AutoCompleteInput({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const filtered = useMemo(() => {
    const v = value.trim().toLowerCase();
    if (showAll) return options.slice(0, 300);
    if (!v) return options.filter(Boolean).slice(0, 8);
    return options.filter((o) => o.toLowerCase().includes(v)).slice(0, 12);
  }, [value, options, showAll]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setShowAll(false);
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (e.key === "ArrowDown") setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    else if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) pick(filtered[highlight]); }
    else if (e.key === "Escape") { setOpen(false); setShowAll(false); }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setShowAll(false); setHighlight(0); }}
          onFocus={() => { setHasFocus(true); setOpen(true); }}
          onBlur={() => { setHasFocus(false); setTimeout(() => { if (!hasFocus) { setOpen(false); setShowAll(false); } }, 120); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
          autoComplete="off"
        />
        <button
          type="button"
          aria-label="Show all options"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setOpen((o) => !o || !showAll); setShowAll((s) => !s || !open); setHighlight(0); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
        >
          ▼
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          style={{ maxHeight: 280 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-3 py-1 text-[11px] text-slate-500">
            <span>{showAll ? "Showing all ports (type to filter)" : "Type to filter"}</span>
            {showAll ? (
              <button type="button" className="underline" onClick={() => setShowAll(false)}>Search mode</button>
            ) : (
              <button type="button" className="underline" onClick={() => setShowAll(true)}>Show all</button>
            )}
          </div>

          {filtered.map((o, i) => (
            <button
              type="button"
              key={`${o}-${i}`}
              onClick={() => pick(o)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${i === highlight ? "bg-slate-100" : ""}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========= Map Adapter (keeps your RouteMapClient integration) ========= */
function hashPoints(points: { lat: number; lon: number }[]) {
  return points.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join("|");
}
function MapAdapter({ points }: { points: { name: string; lat: number; lon: number }[] }) {
  if (!points.length) return null;
  const key = useMemo(() => hashPoints(points), [points]);
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
      <RouteMapClient
        key={key}
        points={points}
        // viaCanal={viaCanal} // hook up if your RouteMapClient supports it
      />
    </div>
  );
}

/* ========= Query helpers (Share/Load) ========= */
function encodeArr(arr: string[]) { return arr.map((s) => encodeURIComponent(s)).join(","); }
function decodeArr(s: string | null): string[] { if (!s) return []; return s.split(",").map((x) => decodeURIComponent(x)).filter(Boolean); }
function buildQueryFromState(state: {
  mode: PlannerMode; startDate: string; yachtType: YachtType; speed: number; lph: number;
  start: string; end: string; days: number; regionMode: "Auto" | RegionKey; vias: string[]; viaCanal: boolean;
  customStart: string; customDays: number; customDayStops: string[];
}) {
  const q = new URLSearchParams();
  q.set("mode", state.mode);
  q.set("date", state.startDate || "");
  q.set("yt", state.yachtType);
  q.set("speed", String(state.speed));
  if (state.yachtType === "Motor") q.set("lph", String(state.lph));
  if (state.mode === "Region") {
    q.set("start", state.start);
    q.set("end", state.end);
    q.set("days", String(state.days));
    q.set("region", state.regionMode);
    if (state.vias.length) q.set("vias", encodeArr(state.vias));
    if (state.viaCanal) q.set("canal", "1");
  } else {
    q.set("cstart", state.customStart);
    q.set("cdays", String(state.customDays));
    if (state.customDayStops.length) q.set("cstops", encodeArr(state.customDayStops));
  }
  q.set("autogen", "1");
  return q.toString();
}
function loadStateFromQuery(sp: URLSearchParams, setters: {
  setMode: (v: PlannerMode) => void; setStartDate: (v: string) => void;
  setYachtType: (v: YachtType) => void; setSpeed: (v: number) => void; setLph: (v: number) => void;
  setStart: (v: string) => void; setEnd: (v: string) => void; setDays: (v: number) => void;
  setRegionMode: (v: "Auto" | RegionKey) => void; setVias: (v: string[]) => void; setViaCanal: (v: boolean) => void;
  setCustomStart: (v: string) => void; setCustomDays: (v: number) => void; setCustomDayStops: (v: string[]) => void;
}) {
  const mode = (sp.get("mode") as PlannerMode) || "Region";
  setters.setMode(mode);

  const date = sp.get("date") || "";
  if (date) setters.setStartDate(date);

  const yt = (sp.get("yt") as YachtType) || "Motor";
  setters.setYachtType(yt);

  const speed = Number(sp.get("speed") || 20);
  setters.setSpeed(speed);

  const lph = Number(sp.get("lph") || 180);
  setters.setLph(lph);

  if (mode === "Region") {
    const start = sp.get("start") || "Alimos";
    const end = sp.get("end") || start;
    const days = Number(sp.get("days") || 7);
    const region = (sp.get("region") as "Auto" | RegionKey) || "Auto";
    const vias = decodeArr(sp.get("vias"));
    const canal = sp.get("canal") === "1";

    setters.setStart(start);
    setters.setEnd(end);
    setters.setDays(days);
    setters.setRegionMode(region);
    setters.setVias(vias);
    setters.setViaCanal(canal);
  } else {
    const cstart = sp.get("cstart") || "Alimos";
    const cdays = Number(sp.get("cdays") || 7);
    const cstops = decodeArr(sp.get("cstops"));

    setters.setCustomStart(cstart);
    setters.setCustomDays(cdays);
    if (cstops.length) setters.setCustomDayStops(cstops);
  }

  const autogen = sp.get("autogen") === "1";
  return { mode, autogen };
}

/* ========= Dataset-aware builders ========= */
function nearestIndexInRing(
  ring: string[],
  target: PortCoord,
  findPortStrict: (name: string) => PortCoord | null
) {
  let best = 0, bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i++) {
    const p = findPortStrict(ring[i]); if (!p) continue;
    const d = haversineNM(target, p);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function buildRouteRegion(
  start: string,
  end: string,
  days: number,
  region: RegionKey,
  vias: string[],
  findPortStrict: (name: string) => PortCoord | null
) {
  const ring = BANK[region] ?? [];
  const startCoord = findPortStrict(start);
  const endName = (end && end.trim()) ? end : start;

  // Fallback: just chain what we have if ring/ports missing
  if (!ring.length || !startCoord) {
    const seq = [start, ...vias.filter(Boolean), endName];
    while (seq.length < days + 1) seq.splice(seq.length - 1, 0, endName);
    return seq.slice(0, days + 1);
  }

  const path: string[] = [start];
  let remainingLegs = days;

  // VIA chain
  for (const raw of vias) {
    const v = (raw || "").trim();
    if (!v || !findPortStrict(v) || remainingLegs <= 0) continue;
    if (path[path.length - 1].toLowerCase() === v.toLowerCase()) continue;
    path.push(v); remainingLegs--;
  }

  // Enter ring from closest
  const current = findPortStrict(path[path.length - 1]) || startCoord;
  const entryIdx = nearestIndexInRing(ring, current, findPortStrict);
  const rotated = [...ring.slice(entryIdx), ...ring.slice(0, entryIdx)];
  const extended: string[] = [];
  while (extended.length < days + 20) extended.push(...rotated);

  let k = 0;
  if (extended[0] && extended[0].toLowerCase() === path[path.length - 1].toLowerCase()) k = 1;

  while (remainingLegs > 1 && k < extended.length) {
    const c = extended[k++]; if (!c) continue;
    if (c.toLowerCase() === path[path.length - 1].toLowerCase()) continue;
    path.push(c); remainingLegs--;
  }

  const last = endName;
  if (path.length >= 1 && path[path.length - 1].toLowerCase() === last.toLowerCase()) {
    const tailMinus1 = path.length >= 2 ? path[path.length - 2].toLowerCase() : "";
    const alt = extended.find(x => x && x.toLowerCase() !== last.toLowerCase() && x.toLowerCase() !== tailMinus1);
    if (alt) path[path.length - 1] = alt;
  }
  if (remainingLegs >= 1) path.push(last);

  if (path.length > days + 1) path.length = days + 1;
  while (path.length < days + 1) path.push(last);
  return path;
}

function buildRouteCustomByDays(
  start: string,
  dayStops: string[],
  findPortStrict: (name: string) => PortCoord | null
) {
  const seq = [start, ...dayStops].map(s => s.trim()).filter(Boolean);
  const allValid = seq.every(s => !!findPortStrict(s));
  if (!allValid || seq.length < 2) return null;
  return seq;
}

function formatHoursHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/* ========= Inner (uses useSearchParams + usePorts) ========= */
function AIPlannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🔗 load canonical dataset
  const { ready, names, aliasNames, findByName, search } = usePorts();

  // helper to resolve any user input (aliases included)
  const findPort = (input: string): PortCoord | null => {
    if (!input) return null;
    const p = findByName(input); // should resolve aliases internally
    return p ?? null;
  };

  // Options for inputs (canonical names + aliases for discoverability)
  const PORT_OPTIONS = useMemo(() => {
    const all = new Set<string>();
    names.forEach(n => all.add(n));
    aliasNames.forEach(a => all.add(a));
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [names, aliasNames]);

  const [mode, setMode] = useState<PlannerMode>("Region");

  // Common
  const [startDate, setStartDate] = useState<string>("");
  useEffect(() => { const d = new Date(); setStartDate(d.toISOString().slice(0, 10)); }, []);
  const [yachtType, setYachtType] = useState<YachtType>("Motor");
  const [speed, setSpeed] = useState<number>(20);
  const [lph, setLph] = useState<number>(180);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [plan, setPlan] = useState<DayCard[] | null>(null);
  const yacht: Yacht = { type: yachtType, speed, lph };

  // Region mode
  const [start, setStart] = useState<string>("Alimos");
  const [end, setEnd] = useState<string>("Alimos");
  const [days, setDays] = useState<number>(7);
  const [regionMode, setRegionMode] = useState<"Auto" | RegionKey>("Auto");
  const autoRegion = useMemo(() => autoPickRegion(start, end), [start, end]);
  const region: RegionKey = regionMode === "Auto" ? autoRegion : (regionMode as RegionKey);

  const [vias, setVias] = useState<string[]>([]);
  const [viaCanal, setViaCanal] = useState<boolean>(false);
  const effectiveVias = useMemo(() => {
    const list = [...vias].filter(Boolean);
    // Ensure canal prepends if toggled and exists in dataset
    if (viaCanal && !list.some(v => normalize(v) === normalize("Corinth Canal (Isthmia)"))) {
      list.unshift("Corinth Canal (Isthmia)");
    }
    // Avoid duplicating start/end
    return list.filter(v => normalize(v) !== normalize(start) && normalize(v) !== normalize(end));
  }, [vias, viaCanal, start, end]);

  // Custom mode
  const [customStart, setCustomStart] = useState<string>("Alimos");
  const [customDays, setCustomDays] = useState<number>(7);
  const [customDayStops, setCustomDayStops] = useState<string[]>(Array.from({ length: 7 }, (_, i) => (i === 0 ? "Aegina" : "")));
  useEffect(() => {
    setCustomDayStops((old) => {
      const next = [...old];
      if (next.length < customDays) while (next.length < customDays) next.push("");
      else if (next.length > customDays) next.length = customDays;
      return next;
    });
  }, [customDays]);

  // Load from URL once (after dataset is ready so aliases resolve)
  useEffect(() => {
    if (!searchParams || !ready) return;
    const { autogen } = loadStateFromQuery(searchParams, {
      setMode, setStartDate, setYachtType, setSpeed, setLph,
      setStart, setEnd, setDays, setRegionMode, setVias, setViaCanal,
      setCustomStart, setCustomDays, setCustomDayStops,
    });
    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (hasParams && autogen) {
      try { document.getElementById("generate-btn")?.dispatchEvent(new Event("click", { bubbles: true })); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function onTogglePref(value: string) {
    setPrefs((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }
  function addVia() { setVias((v) => [...v, ""]); }
  function setViaAt(i: number, val: string) { setVias((v) => v.map((x, idx) => (idx === i ? val : x))); }
  function removeVia(i: number) { setVias((v) => v.filter((_, idx) => idx !== i)); }
  function setCustomStopAt(i: number, val: string) { setCustomDayStops((arr) => arr.map((x, idx) => (idx === i ? val : x))); }

  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!ready) { alert("Ports still loading—try again in a moment."); return; }

    let namesSeq: string[] | null = null;

    if (mode === "Region") {
      if (!findPort(start) || !findPort(end)) { alert("Please select valid Start/End from the suggestions."); return; }
      namesSeq = buildRouteRegion(start, end, days, region, effectiveVias, findPort);
    } else {
      if (!findPort(customStart)) { alert("Please select a valid Start (custom)."); return; }
      const seq = buildRouteCustomByDays(customStart, customDayStops, findPort);
      if (!seq) { alert("Please fill valid ports for each day (use suggestions)."); return; }
      namesSeq = seq;
    }

    const coords = (namesSeq ?? []).map((n) => findPort(n)).filter(Boolean) as PortCoord[];
    if (coords.length < 2) { setPlan([]); return; }

    const legs: Leg[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const nm = Math.max(1, Math.round(haversineNM(coords[i], coords[i + 1])));
      const { hours, fuelL } = legStats(nm, yacht);
      legs.push({ from: namesSeq![i], to: namesSeq![i + 1], nm, hours, fuelL });
    }

    const totalDays = (namesSeq?.length ?? 1) - 1;
    const cards: DayCard[] = [];
    for (let d = 0; d < totalDays; d++) {
      const date = startDate ? addDaysISO(startDate, d) : "";
      const leg = legs[d];
      const notes = [
        mode === "Region" && region === "Cyclades"   ? "Meltemi possible; prefer morning hops." : "",
        mode === "Region" && region === "Saronic"    ? "Sheltered waters; ideal for families." : "",
        mode === "Region" && region === "Ionian"     ? "Green shores & calm channels; great anchorages." : "",
        mode === "Region" && region === "Dodecanese" ? "Historic harbors & culture; longer open-sea legs." : "",
        mode === "Region" && region === "Sporades"   ? "Marine park & pine-clad islands; clear waters." : "",
        mode === "Region" && region === "NorthAegean"? "Authentic ports incl. Halkidiki; larger gaps in places." : "",
        mode === "Region" && region === "Crete"      ? "Longer hops; stunning coves, plan fuel & berths." : "",
        prefs.includes("nightlife") ? "Consider later arrival for dining/nightlife." : "",
        prefs.includes("family")    ? "Favor sandy coves & shorter hops." : "",
        prefs.includes("gastronomy")? "Reserve seaside taverna early." : "",
      ].filter(Boolean).join(" ");
      cards.push({ day: d + 1, date, leg, notes });
    }
    setPlan(cards);

    // Update URL for share
    const qs = buildQueryFromState({
      mode, startDate, yachtType, speed, lph,
      start, end, days, regionMode, vias, viaCanal,
      customStart, customDays, customDayStops,
    });
    router.replace(`/ai?${qs}`, { scroll: false });
  }

  function handlePrint() { window.print(); }

  async function handleCopyLink() {
    const qs = buildQueryFromState({
      mode, startDate, yachtType, speed, lph,
      start, end, days, regionMode, vias, viaCanal,
      customStart, customDays, customDayStops,
    });
    const url = `${window.location.origin}/ai?${qs}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    } catch {
      const tmp = document.createElement("textarea");
      tmp.value = url;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      alert("Link copied!");
    }
  }

  const totals = useMemo(() => {
    if (!plan?.length) return null;
    const nm = plan.reduce((sum, d) => sum + (d.leg?.nm || 0), 0);
    const hrsNum = plan.reduce((sum, d) => sum + (d.leg?.hours || 0), 0);
    const fuel = plan.reduce((sum, d) => sum + (d.leg?.fuelL || 0), 0);
    const hh = Math.floor(hrsNum);
    const mm = Math.round((hrsNum - hh) * 60);
    return { nm, hrs: `${hh}h ${mm}m`, fuel };
  }, [plan]);

  const mapPoints = useMemo(() => {
    if (!plan?.length) return [] as PortCoord[];
    const namesSeq: string[] = [];
    const first = plan[0]?.leg?.from;
    if (first) namesSeq.push(first);
    for (const d of plan) if (d.leg?.to) namesSeq.push(d.leg.to);
    return namesSeq
      .map((n) => findPort(n))
      .filter(Boolean) as PortCoord[];
  }, [plan]);

  return (
    <div className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy no-print">AI Itinerary Draft</h1>
        <p className="mt-2 max-w-2xl text-slate-600 no-print">
          Region-guided or fully Custom itineraries. Enter dates & yacht specs, add stops, and generate.
        </p>

        {/* FORM */}
        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 gap-4 no-print">
          {/* Mode selector */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-brand-navy">Planner Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as PlannerMode)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="Region">Region-guided</option>
              <option value="Custom">Custom (day-by-day)</option>
            </select>
            {!ready && <span className="text-xs text-slate-500">Loading ports…</span>}
          </div>

          {/* Common controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input type="date" value={startDate || ""} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" />
            <select value={yachtType} onChange={(e) => setYachtType(e.target.value as YachtType)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold">
              <option value="Motor">Motor</option><option value="Sailing">Sailing</option>
            </select>
            <input type="number" min={4} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value || "10"))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="Cruise speed (kn)" />
            {yachtType === "Motor" && (
              <input type="number" min={5} value={lph} onChange={(e) => setLph(parseFloat(e.target.value || "120"))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="Fuel burn (L/h)" />
            )}
          </div>

          {/* REGION MODE */}
          {mode === "Region" && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <AutoCompleteInput value={start} onChange={setStart} placeholder="Start port (e.g. Alimos / Αλιμος)" options={PORT_OPTIONS} />
                <AutoCompleteInput value={end} onChange={setEnd} placeholder="End port (default: same as start)" options={PORT_OPTIONS} />
                <select value={regionMode} onChange={(e) => setRegionMode(e.target.value as any)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold">
                  <option value="Auto">Region: Auto</option>
                  <option value="Saronic">Region: Saronic</option>
                  <option value="Cyclades">Region: Cyclades</option>
                  <option value="Ionian">Region: Ionian</option>
                  <option value="Dodecanese">Region: Dodecanese</option>
                  <option value="Sporades">Region: Sporades</option>
                  <option value="NorthAegean">Region: North Aegean</option>
                  <option value="Crete">Region: Crete</option>
                </select>
                <input type="number" min={2} max={21} value={days} onChange={(e) => setDays(parseInt(e.target.value || "7", 10))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="Days (legs)" />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-brand-navy">Optional passages / stops (in order)</div>
                  <button type="button" onClick={addVia} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">+ Add Stop</button>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={viaCanal} onChange={(e) => setViaCanal(e.target.checked)} />
                  <span>Via <b>Corinth Canal (Isthmia)</b></span>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {vias.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AutoCompleteInput value={v} onChange={(val) => setViaAt(i, val)} placeholder={`Stop ${i + 1}`} options={PORT_OPTIONS} />
                      <button type="button" onClick={() => removeVia(i)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50" title="Remove stop">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CUSTOM MODE */}
          {mode === "Custom" && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <AutoCompleteInput value={customStart} onChange={setCustomStart} placeholder="Start (Day 0)" options={PORT_OPTIONS} />
                <input type="number" min={1} max={30} value={customDays} onChange={(e) => setCustomDays(parseInt(e.target.value || "7", 10))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="Number of days" />
              </div>
              <div className="mt-4">
                <div className="text-sm font-medium text-brand-navy">Destinations by day</div>
                <p className="mt-1 text-xs text-slate-500">Συμπλήρωσε τον προορισμό <b>κάθε ημέρας</b> (τέλος ημέρας). Θα υπολογιστούν αυτόματα τα legs.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {customDayStops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-20 text-xs text-slate-500">Day {i + 1}</div>
                      <AutoCompleteInput value={stop} onChange={(val) => setCustomStopAt(i, val)} placeholder={`Destination for Day ${i + 1}`} options={PORT_OPTIONS} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="flex flex-wrap gap-2">
            {["family", "nightlife", "gastronomy"].map((p) => (
              <button key={p} type="button" onClick={() => onTogglePref(p)} className={`rounded-full border px-3 py-1 text-sm ${prefs.includes(p) ? "border-brand-navy bg-brand-navy text-white" : "border-slate-300 hover:bg-slate-50"}`}>{p}</button>
            ))}
          </div>

          <button id="generate-btn" type="submit" disabled={!ready} className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-gold hover:text-brand-navy disabled:opacity-50">
            Generate Itinerary
          </button>
        </form>

        {/* ====== OUTPUT ====== */}
        {plan && (
          <div className="mt-8" id="print-root">
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between no-print">
              <div className="text-sm text-slate-500">
                Mode: <span className="font-medium text-brand-navy">{mode}</span>
                {mode === "Region" && <> • Region: <span className="font-medium text-brand-navy">{regionMode === "Auto" ? `${autoPickRegion(start, end)} (auto)` : region}</span></>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleCopyLink} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                  Copy link
                </button>
                <button type="button" onClick={handlePrint} className="rounded-xl border border-brand-navy bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-gold hover:text-brand-navy">
                  Export PDF
                </button>
              </div>
            </div>

            {/* MAP */}
            {mapPoints.length >= 1 && (
              <div className="no-print mb-6">
                <MapAdapter points={mapPoints} />
                <div className="mt-2 text-xs text-slate-500">
                  * Map preview for planning. The dashed line is an estimate, not nautical routing.
                </div>
              </div>
            )}

            {/* SUMMARY */}
            {totals && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-brand-navy">Trip summary</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div><div className="text-xs print-subtle">Route</div><div className="font-medium">{mode === "Region" ? `${start} → ${end}` : `${customStart}`}</div></div>
                  <div><div className="text-xs print-subtle">Region</div><div className="font-medium">{mode === "Region" ? (regionMode === "Auto" ? `${autoPickRegion(start, end)} (auto)` : region) : "Custom"}</div></div>
                  <div><div className="text-xs print-subtle">Distance</div><div className="font-medium">{totals.nm} nm</div></div>
                  <div><div className="text-xs print-subtle">Underway</div><div className="font-medium">{totals.hrs}</div></div>
                </div>
                {yachtType === "Motor" && (
                  <div className="mt-2 text-sm print-subtle">
                    Estimated fuel: <b>~{totals.fuel} L</b> (speed {speed} kn • {lph} L/h)
                  </div>
                )}
              </div>
            )}

            {/* DAY CARDS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print-grid">
              {plan.map((d) => (
                <div key={d.day} className="rounded-2xl bg-white p-4 shadow-sm print-card">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">Day {d.day} • {d.date}</div>
                    {d.leg && <div className="text-xs rounded-full bg-brand-gold/20 px-2 py-1 text-brand-navy">{d.leg.nm} nm</div>}
                  </div>
                  {d.leg ? (
                    <>
                      <div className="mt-1 text-lg font-semibold text-brand-navy">{d.leg.from} → {d.leg.to}</div>
                      <p className="mt-1 text-sm text-slate-600">
                        ~{formatHoursHM(d.leg.hours)} underway
                        {yachtType === "Motor" && <> • ~{d.leg.fuelL} L fuel</>} • {speed} kn
                      </p>
                    </>
                  ) : (
                    <div className="mt-1 text-lg font-semibold text-brand-navy">Leisure / Lay Day</div>
                  )}
                  {d.notes && <p className="mt-2 text-sm text-slate-600">{d.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ========= Page wrapper: Suspense γύρω από useSearchParams ========= */
export default function AIPlannerPage() {
  return (
    <Suspense fallback={null}>
      <AIPlannerInner />
    </Suspense>
  );
}
