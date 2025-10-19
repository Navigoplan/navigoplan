"use client";

import RouteMapClient from "./RouteMapClient";
import { Suspense, useMemo, useState, useEffect, useId } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { usePorts } from "../../lib/ports";

export const dynamic = "force-dynamic";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Yacht = { type: YachtType; speed: number; lph: number };
type Leg = { from: string; to: string; nm: number; hours: number; fuelL: number; cost?: number; eta?: { dep: string; arr: string; window: string } };
type DayCard = {
  day: number;
  date: string;
  leg?: Leg;
  notes?: string;
  userNotes?: { marina?: string; food?: string; beach?: string };
};
type RegionKey =
  | "Saronic"
  | "Cyclades"
  | "Ionian"
  | "Dodecanese"
  | "Sporades"
  | "NorthAegean"
  | "Crete";
type PlannerMode = "Region" | "Custom";

type PortCoord = { id?: string; name: string; lat: number; lon: number; aliases?: string[] };

/* ========= Helpers ========= */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function haversineNM(a: PortCoord, b: PortCoord) {
  const R = 3440.065;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function legStats(nm: number, yacht: Yacht) {
  const hours = (nm / yacht.speed) * 1.15; // +15% περιθώριο
  const fuelL = yacht.type === "Motor" ? hours * yacht.lph : 0;
  return { hours: +hours.toFixed(2), fuelL: Math.round(fuelL) };
}
function addDaysISO(iso: string, plus: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
}
function pad2(n: number) { return n.toString().padStart(2, "0"); }
function addHoursToTime(startHHmm: string, hoursFloat: number) {
  const [hh, mm] = startHHmm.split(":").map((x) => parseInt(x, 10));
  const totalMin = Math.round(hh * 60 + mm + hoursFloat * 60);
  const h2 = Math.floor((totalMin / 60) % 24);
  const m2 = totalMin % 60;
  return `${pad2(h2)}:${pad2(m2)}`;
}

/* ========= Regions ========= */
type RegionRing = Record<RegionKey, string[]>;
const BANK: RegionRing = {
  Saronic: ["Alimos","Aegina","Agistri","Poros","Hydra","Spetses","Ermioni","Porto Cheli","Alimos"],
  Cyclades: ["Lavrio","Kea","Kythnos","Syros","Mykonos","Paros","Naxos","Ios","Santorini","Milos","Sifnos","Serifos","Lavrio"],
  Ionian: ["Corfu","Paxos","Antipaxos","Lefkada","Meganisi","Kalamos","Kastos","Ithaca","Kefalonia","Zakynthos","Lefkada"],
  Dodecanese: ["Rhodes","Symi","Kos","Kalymnos","Patmos","Rhodes"],
  Sporades: ["Volos","Skiathos","Skopelos","Alonissos","Volos"],
  NorthAegean: [
    "Thessaloniki","Nea Moudania","Sani Marina","Nikiti","Vourvourou",
    "Ormos Panagias","Ouranoupoli","Kavala","Thassos","Samothraki",
    "Lemnos","Lesvos","Chios","Samos","Ikaria"
  ],
  Crete: ["Chania","Rethymno","Heraklion","Agios Nikolaos","Chania"],
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

/* ========= Autocomplete ========= */
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

/* ========= Query helpers ========= */
function encodeArr(arr: string[]) { return arr.map((s) => encodeURIComponent(s)).join(","); }
function decodeArr(s: string | null): string[] { if (!s) return []; return s.split(",").map((x) => decodeURIComponent(x)).filter(Boolean); }

function buildQueryFromState(state: {
  mode: PlannerMode; startDate: string; yachtType: YachtType; speed: number; lph: number;
  start: string; end: string; days: number; regionMode: "Auto" | RegionKey; vias: string[];
  customStart: string; customDays: number; customDayStops: string[];
  fuelPrice: number; depTime: string;
}) {
  const q = new URLSearchParams();
  q.set("mode", state.mode);
  q.set("date", state.startDate || "");
  q.set("yt", state.yachtType);
  q.set("speed", String(state.speed));
  if (state.yachtType === "Motor") q.set("lph", String(state.lph));
  q.set("fuel", String(state.fuelPrice));
  q.set("dep", state.depTime);
  if (state.mode === "Region") {
    q.set("start", state.start);
    q.set("end", state.end);
    q.set("days", String(state.days));
    q.set("region", state.regionMode);
    if (state.vias.length) q.set("vias", encodeArr(state.vias));
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
  setRegionMode: (v: "Auto" | RegionKey) => void; setVias: (v: string[]) => void;
  setCustomStart: (v: string) => void; setCustomDays: (v: number) => void; setCustomDayStops: (v: string[]) => void;
  setFuelPrice: (v: number) => void; setDepTime: (v: string) => void;
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

  const fuelPrice = Number(sp.get("fuel") || 1.8);
  setters.setFuelPrice(fuelPrice);

  const dep = sp.get("dep") || "09:00";
  setters.setDepTime(dep);

  if (mode === "Region") {
    const start = sp.get("start") || "Alimos";
    const end = sp.get("end") || start;
    const days = Number(sp.get("days") || 7);
    const region = (sp.get("region") as "Auto" | RegionKey) || "Auto";
    const vias = decodeArr(sp.get("vias"));

    setters.setStart(start);
    setters.setEnd(end);
    setters.setDays(days);
    setters.setRegionMode(region);
    setters.setVias(vias);
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

/* ========= Route builders ========= */
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

  if (!ring.length || !startCoord) {
    const seq = [start, ...vias.filter(Boolean), endName];
    while (seq.length < days + 1) seq.splice(seq.length - 1, 0, endName);
    return seq.slice(0, days + 1);
  }

  const path: string[] = [start];
  let remainingLegs = days;

  for (const raw of vias) {
    const v = (raw || "").trim();
    if (!v || !findPortStrict(v) || remainingLegs <= 0) continue;
    if (path[path.length - 1].toLowerCase() === v.toLowerCase()) continue;
    path.push(v); remainingLegs--;
  }

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
  if (path[path.length - 1]?.toLowerCase() === last.toLowerCase()) {
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

/* ========= Practical facilities (simple seed) ========= */
const PORT_FACTS: Record<string, { fuel?: boolean; water?: boolean; provisions?: boolean; berth?: boolean }> = {
  "Alimos": { fuel: true, water: true, provisions: true, berth: true },
  "Aegina": { fuel: true, water: true, provisions: true, berth: true },
  "Agistri": { fuel: false, water: true, provisions: true, berth: true },
  "Poros": { fuel: true, water: true, provisions: true, berth: true },
  "Hydra": { fuel: false, water: true, provisions: true, berth: true },
  "Spetses": { fuel: true, water: true, provisions: true, berth: true },
  "Ermioni": { fuel: true, water: true, provisions: true, berth: true },
  "Lavrio": { fuel: true, water: true, provisions: true, berth: true },
  "Kea": { fuel: true, water: true, provisions: true, berth: true },
  "Kythnos": { fuel: false, water: true, provisions: true, berth: true },
  "Syros": { fuel: true, water: true, provisions: true, berth: true },
  "Mykonos": { fuel: true, water: true, provisions: true, berth: true },
  "Paros": { fuel: true, water: true, provisions: true, berth: true },
  "Naxos": { fuel: true, water: true, provisions: true, berth: true },
  "Ios": { fuel: true, water: true, provisions: true, berth: true },
  "Milos": { fuel: true, water: true, provisions: true, berth: true },
  "Sifnos": { fuel: false, water: true, provisions: true, berth: true },
  "Serifos": { fuel: false, water: true, provisions: true, berth: true },
};

/* ========= Wikipedia helper (richer) ========= */
type WikiCard = {
  title: string;
  summary: string;
  imageUrl?: string;
  gallery?: string[];
  coords?: { lat: number; lon: number };
  sourceUrl?: string;
  related?: { title: string; thumb?: string }[];
};
async function fetchWikiJSON(url: string) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("wiki fetch");
  return r.json();
}
function encTitle(s: string) {
  return encodeURIComponent(s.replace(/\s+/g, "_"));
}
async function fetchWikiCard(placeName: string): Promise<WikiCard> {
  const langs = ["el", "en"];
  const base = (lang: string) => `https://${lang}.wikipedia.org/api/rest_v1`;

  // summary
  let summaryData: any = null;
  for (const lang of langs) {
    try {
      summaryData = await fetchWikiJSON(`${base(lang)}/page/summary/${encTitle(placeName)}`);
      if (summaryData?.title) break;
    } catch {}
  }

  const card: WikiCard = {
    title: summaryData?.title ?? placeName,
    summary: summaryData?.extract ?? "",
    imageUrl: summaryData?.thumbnail?.source,
    coords: summaryData?.coordinates
      ? { lat: summaryData.coordinates.lat, lon: summaryData.coordinates.lon }
      : undefined,
    sourceUrl: summaryData?.content_urls?.desktop?.page,
    gallery: [],
    related: [],
  };

  // media
  try {
    const lang = summaryData?.lang ?? "en";
    const media = await fetchWikiJSON(`${base(lang)}/page/media/${encTitle(card.title)}`);
    const pics: string[] = [];
    for (const item of media?.items ?? []) {
      if (item?.type === "image") {
        const src =
          item?.srcset?.[item.srcset.length - 1]?.src ||
          item?.src ||
          item?.thumbnail?.source;
        if (src) pics.push(src);
      }
    }
    card.gallery = Array.from(new Set([...(card.imageUrl ? [card.imageUrl] : []), ...pics])).slice(0, 8);
    if (!card.imageUrl && card.gallery?.length) card.imageUrl = card.gallery[0];
  } catch {}

  // related
  try {
    const lang = summaryData?.lang ?? "en";
    const rel = await fetchWikiJSON(`${base(lang)}/page/related/${encTitle(card.title)}`);
    card.related = (rel?.pages ?? [])
      .map((p: any) => ({
        title: p?.titles?.display ?? p?.title,
        thumb: p?.thumbnail?.source,
      }))
      .filter((x: any) => !!x.title)
      .slice(0, 8);
  } catch {}

  return card;
}

/* ========= Best-time & ETA ========= */
function suggestWindow(region: RegionKey, hours: number) {
  // Cyclades: πρωινά λόγω μελτεμιού
  if (region === "Cyclades") return hours <= 2.5 ? "08:00–11:00" : "08:00–12:30";
  // Saronic/Ionian protected
  if (region === "Saronic" || region === "Ionian") return hours <= 1.8 ? "09:00–10:45" : "09:00–12:00";
  // default
  return hours <= 2 ? "09:00–11:00" : "09:00–12:30";
}

/* ========= Main ========= */
function AIPlannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, error, ports, options, findPort: findPortRaw } = usePorts();

  const findPort = (input: string): PortCoord | null => {
    if (!input) return null;
    const p = findPortRaw(input);
    return p
      ? ({ id: (p as any).id, name: p.name, lat: p.lat, lon: p.lon, aliases: (p as any).aliases })
      : null;
  };

  const PORT_OPTIONS = useMemo(() => {
    const arr = Array.isArray(options) ? options.slice() : [];
    arr.sort((a: string, b: string) => a.localeCompare(b));
    return arr;
  }, [options]);

  const [mode, setMode] = useState<PlannerMode>("Region");

  // Common
  const [startDate, setStartDate] = useState<string>("");
  useEffect(() => { const d = new Date(); setStartDate(d.toISOString().slice(0, 10)); }, []);
  const [yachtType, setYachtType] = useState<YachtType>("Motor");
  const [speed, setSpeed] = useState<number>(20);
  const [lph, setLph] = useState<number>(180);
  const [fuelPrice, setFuelPrice] = useState<number>(1.8); // €/L
  const [depTime, setDepTime] = useState<string>("09:00");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [plan, setPlan] = useState<DayCard[] | null>(null);
  const yacht: Yacht = { type: yachtType, speed, lph };

  // thumbs cache (destination -> img)
  const [thumbs, setThumbs] = useState<Record<string, string | undefined>>({});

  // Region mode
  const [start, setStart] = useState<string>("Alimos");
  const [end, setEnd] = useState<string>("Alimos");
  const [days, setDays] = useState<number>(7);
  const [regionMode, setRegionMode] = useState<"Auto" | RegionKey>("Auto");
  const autoRegion = useMemo(() => autoPickRegion(start, end), [start, end]);
  const region: RegionKey = regionMode === "Auto" ? autoRegion : (regionMode as RegionKey);

  const [vias, setVias] = useState<string[]>([]);
  const effectiveVias = useMemo(() => {
    return [...vias]
      .filter(Boolean)
      .filter(v => normalize(v) !== normalize(start) && normalize(v) !== normalize(end));
  }, [vias, start, end]);

  // Custom mode
  const [customStart, setCustomStart] = useState<string>("Alimos");
  const [customDays, setCustomDays] = useState<number>(7);
  const [customDayStops, setCustomDayStops] = useState<string[]>(
    Array.from({ length: 7 }, (_, i) => (i === 0 ? "Aegina" : ""))
  );
  useEffect(() => {
    setCustomDayStops((old) => {
      const next = [...old];
      if (next.length < customDays) while (next.length < customDays) next.push("");
      else if (next.length > customDays) next.length = customDays;
      return next;
    });
  }, [customDays]);

  // Map pick mode
  type MapPick = "Start" | "End" | "Via" | "Custom";
  const [mapPickMode, setMapPickMode] = useState<MapPick>("Via");
  const [customPickIndex, setCustomPickIndex] = useState<number>(1);

  // Load from URL
  useEffect(() => {
    if (!searchParams || !ready) return;
    const { autogen } = loadStateFromQuery(searchParams, {
      setMode, setStartDate, setYachtType, setSpeed, setLph,
      setStart, setEnd, setDays, setRegionMode, setVias,
      setCustomStart, setCustomDays, setCustomDayStops,
      setFuelPrice, setDepTime
    });
    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (hasParams && autogen) {
      try { document.getElementById("generate-btn")?.dispatchEvent(new Event("click", { bubbles: true })); } catch {}
    }
  }, [ready, searchParams]);

  function onTogglePref(value: string) {
    setPrefs((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }
  function addVia() { setVias((v) => [...v, ""]); }
  function setViaAt(i: number, val: string) { setVias((v) => v.map((x, idx) => (idx === i ? val : x))); }
  function removeVia(i: number) { setVias((v) => v.filter((_, idx) => idx !== i)); }
  function setCustomStopAt(i: number, val: string) { setCustomDayStops((arr) => arr.map((x, idx) => (idx === i ? val : x))); }

  /* ======= Generate ======= */
  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!ready) { alert("Φορτώνω ports… δοκίμασε ξανά σε λίγο."); return; }

    let namesSeq: string[] | null = null;

    if (mode === "Region") {
      if (!findPort(start) || !findPort(end)) { alert("Επίλεξε έγκυρο Start/End από τη λίστα."); return; }
      namesSeq = buildRouteRegion(start, end, days, region, effectiveVias, findPort);
    } else {
      if (!findPort(customStart)) { alert("Επίλεξε έγκυρο Start (custom)."); return; }
      const seq = buildRouteCustomByDays(customStart, customDayStops, findPort);
      if (!seq) { alert("Συμπλήρωσε έγκυρους προορισμούς για κάθε ημέρα."); return; }
      namesSeq = seq;
    }

    const coords = (namesSeq ?? []).map((n) => findPort(n)).filter(Boolean) as PortCoord[];
    if (coords.length < 2) { setPlan([]); return; }

    const legs: Leg[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const nm = Math.max(1, Math.round(haversineNM(coords[i], coords[i + 1])));
      const { hours, fuelL } = legStats(nm, yacht);
      const window = suggestWindow(region, hours);
      const dep = depTime || "09:00";
      const arr = addHoursToTime(dep, hours);
      const cost = yachtType === "Motor" ? Math.round(fuelL * fuelPrice) : 0;
      legs.push({
        from: namesSeq![i],
        to: namesSeq![i + 1],
        nm,
        hours,
        fuelL,
        cost,
        eta: { dep, arr, window }
      });
    }

    const totalDays = (namesSeq?.length ?? 1) - 1;
    const cards: DayCard[] = [];
    for (let d = 0; d < totalDays; d++) {
      const date = startDate ? addDaysISO(startDate, d) : "";
      const leg = legs[d];
      const notes = [
        mode === "Region" && region === "Cyclades"   ? "Meltemi possible· προτίμησε πρωινές μετακινήσεις." : "",
        mode === "Region" && region === "Saronic"    ? "Προστατευμένα νερά· ιδανικό για οικογένειες." : "",
        mode === "Region" && region === "Ionian"     ? "Ήρεμα κανάλια & πράσινες ακτές· εξαιρετικά αγκυροβόλια." : "",
        mode === "Region" && region === "Dodecanese" ? "Ιστορικά λιμάνια· πιο μεγάλα ανοικτά σκέλη." : "",
        mode === "Region" && region === "Sporades"   ? "Θαλάσσιο πάρκο & πευκόφυτα νησιά." : "",
        mode === "Region" && region === "NorthAegean"? "Αυθεντικά λιμάνια (incl. Χαλκιδική)." : "",
        mode === "Region" && region === "Crete"      ? "Μεγαλύτερα σκέλη· οργάνωσε καύσιμα & θέσεις." : "",
        prefs.includes("nightlife") ? "Άφιξη αργά για βραδινό/μπαρ." : "",
        prefs.includes("family")    ? "Αμμουδιές & μικρότερα σκέλη." : "",
        prefs.includes("gastronomy")? "Κράτηση σε παραθαλάσσια ταβέρνα." : "",
      ].filter(Boolean).join(" ");
      cards.push({ day: d + 1, date, leg, notes, userNotes: {} });
    }
    setPlan(cards);

    // prefetch thumbs for destinations
    (async () => {
      const uniq = Array.from(new Set(legs.map(l => l.to)));
      const next: Record<string, string | undefined> = {};
      for (const t of uniq) {
        try {
          const c = await fetchWikiCard(t);
          next[t] = c.imageUrl;
        } catch {
          next[t] = undefined;
        }
      }
      setThumbs(next);
    })();

    const qs = buildQueryFromState({
      mode, startDate, yachtType, speed, lph,
      start, end, days, regionMode, vias,
      customStart, customDays, customDayStops,
      fuelPrice, depTime
    });
    router.replace(`/ai?${qs}`, { scroll: false });
  }

  function handlePrint() { window.print(); }

  async function handleCopyLink() {
    const qs = buildQueryFromState({
      mode, startDate, yachtType, speed, lph,
      start, end, days, regionMode, vias,
      customStart, customDays, customDayStops,
      fuelPrice, depTime
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
    const cost = plan.reduce((sum, d) => sum + (d.leg?.cost || 0), 0);
    const hh = Math.floor(hrsNum);
    const mm = Math.round((hrsNum - hh) * 60);
    return { nm, hrs: `${hh}h ${mm}m`, fuel, cost };
  }, [plan]);

  const mapPoints = useMemo(() => {
    if (!plan?.length) return [] as PortCoord[];
    const namesSeq: string[] = [];
    const first = plan[0]?.leg?.from;
    if (first) namesSeq.push(first);
    for (const d of plan) if (d.leg?.to) namesSeq.push(d.leg.to);
    return namesSeq.map((n) => findPort(n)).filter(Boolean) as PortCoord[];
  }, [plan]);

  const markers: { name: string; lat: number; lon: number }[] = useMemo(() => {
    if (!ready || !ports?.length) return [];
    return ports.map((p: any) => ({ name: p.name, lat: p.lat, lon: p.lon }));
  }, [ready, ports]);

  const activeNames = useMemo(() => {
    const set = new Set<string>();
    if (mode === "Region") {
      if (start) set.add(start);
      effectiveVias.forEach(v => set.add(v));
      if (end) set.add(end);
    } else {
      if (customStart) set.add(customStart);
      customDayStops.forEach(v => v && set.add(v));
    }
    return Array.from(set);
  }, [mode, start, end, effectiveVias, customStart, customDayStops]);

  // Click σε marker
  function handleMarkerClick(portName: string) {
    if (mode === "Region") {
      if (mapPickMode === "Start") { setStart(portName); return; }
      if (mapPickMode === "End")   { setEnd(portName); return; }
      const idx = vias.findIndex(v => !v);
      if (mapPickMode === "Via") {
        if (idx >= 0) setViaAt(idx, portName);
        else setVias(v => [...v, portName]);
        return;
      }
    } else {
      if (mapPickMode === "Start") { setCustomStart(portName); return; }
      if (mapPickMode === "Custom") {
        const i = Math.max(1, Math.min(customDays, customPickIndex)) - 1;
        setCustomStopAt(i, portName);
        return;
      }
      if (mapPickMode === "End") {
        const i = customDays - 1;
        setCustomStopAt(i, portName);
        return;
      }
      if (mapPickMode === "Via") {
        const i = customDayStops.findIndex(x => !x);
        setCustomStopAt(i >= 0 ? i : customDayStops.length - 1, portName);
        return;
      }
    }
  }

  /* ======= Wikipedia modal state + open ======= */
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<WikiCard | null>(null);

  async function openPortInfoByName(name: string) {
    const card = await fetchWikiCard(name);
    setInfoData(card);
    setInfoOpen(true);
  }

  // update user notes per day
  function setUserNote(dayIdx: number, key: keyof NonNullable<DayCard["userNotes"]>, value: string) {
    setPlan((old) => {
      if (!old) return old;
      const next = old.map((c) => ({ ...c }));
      const obj = { ...(next[dayIdx].userNotes ?? {}) };
      (obj as any)[key] = value;
      next[dayIdx].userNotes = obj;
      return next;
    });
  }

  return (
    <div className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy no-print">AI Itinerary Draft</h1>
        <p className="mt-2 max-w-2xl text-slate-600 no-print">
          <b>Auto AI Planner</b> ή πλήρως Custom. Βάλε ημερομηνία & στοιχεία σκάφους, πρόσθεσε στάσεις και κάνε generate.
        </p>

        {/* FORM */}
        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 gap-4 no-print">
          {/* Mode selector */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-brand-navy">Planner Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as PlannerMode)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="Region">Auto AI Planner</option>
              <option value="Custom">Custom (day-by-day)</option>
            </select>
            {!ready && <span className="text-xs text-slate-500">Φορτώνω ports…</span>}
            {error && <span className="text-xs text-red-600">Σφάλμα dataset</span>}
          </div>

          {/* Common controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="flex flex-col md:col-span-2">
              <label htmlFor="date" className="mb-1 text-xs font-medium text-gray-600">Ημερομηνία αναχώρησης</label>
              <input id="date" type="date" value={startDate || ""} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" />
            </div>
            <div className="flex flex-col">
              <label htmlFor="yt" className="mb-1 text-xs font-medium text-gray-600">Τύπος σκάφους</label>
              <select id="yt" value={yachtType} onChange={(e) => setYachtType(e.target.value as YachtType)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold">
                <option value="Motor">Motor</option><option value="Sailing">Sailing</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="speed" className="mb-1 text-xs font-medium text-gray-600">Ταχύτητα (kn)</label>
              <input id="speed" type="number" min={4} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value || "10"))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="π.χ. 20" />
            </div>
            {yachtType === "Motor" && (
              <>
                <div className="flex flex-col">
                  <label htmlFor="lph" className="mb-1 text-xs font-medium text-gray-600">Κατανάλωση (L/h)</label>
                  <input id="lph" type="number" min={5} value={lph} onChange={(e) => setLph(parseFloat(e.target.value || "120"))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="π.χ. 180" />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="fuel" className="mb-1 text-xs font-medium text-gray-600">Τιμή καυσίμου (€/L)</label>
                  <input id="fuel" type="number" min={0} step="0.01" value={fuelPrice} onChange={(e) => setFuelPrice(parseFloat(e.target.value || "1.8"))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="π.χ. 1.80" />
                </div>
              </>
            )}
            <div className="flex flex-col">
              <label htmlFor="dep" className="mb-1 text-xs font-medium text-gray-600">Ώρα αναχώρησης</label>
              <input id="dep" type="time" value={depTime} onChange={(e) => setDepTime(e.target.value || "09:00")} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" />
            </div>
          </div>

          {/* REGION MODE */}
          {mode === "Region" && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Αφετηρία (λιμάνι)</label>
                  <AutoCompleteInput value={start} onChange={setStart} placeholder="π.χ. Alimos / Άλιμος" options={PORT_OPTIONS} />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Προορισμός (λιμάνι)</label>
                  <AutoCompleteInput value={end} onChange={setEnd} placeholder="default: ίδιο με start" options={PORT_OPTIONS} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="region" className="mb-1 text-xs font-medium text-gray-600">Περιοχή</label>
                  <select id="region" value={regionMode} onChange={(e) => setRegionMode(e.target.value as any)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold">
                    <option value="Auto">Auto</option>
                    <option value="Saronic">Saronic</option>
                    <option value="Cyclades">Cyclades</option>
                    <option value="Ionian">Ionian</option>
                    <option value="Dodecanese">Dodecanese</option>
                    <option value="Sporades">Sporades</option>
                    <option value="NorthAegean">North Aegean</option>
                    <option value="Crete">Crete</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label htmlFor="days" className="mb-1 text-xs font-medium text-gray-600">Ημέρες ταξιδιού</label>
                  <input id="days" type="number" min={2} max={21} value={days} onChange={(e) => setDays(parseInt(e.target.value || "7", 10))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="π.χ. 7" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-brand-navy">Προαιρετικές διελεύσεις/στάσεις (σειρά)</div>
                  <button type="button" onClick={addVia} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">+ Add Stop</button>
                </div>
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
                <div className="flex flex-col">
                  <label className="mb-1 text-xs font-medium text-gray-600">Αφετηρία (Day 0)</label>
                  <AutoCompleteInput value={customStart} onChange={setCustomStart} placeholder="Start" options={PORT_OPTIONS} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="cdays" className="mb-1 text-xs font-medium text-gray-600">Ημέρες</label>
                  <input id="cdays" type="number" min={1} max={30} value={customDays} onChange={(e) => setCustomDays(parseInt(e.target.value || "7", 10))} className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold" placeholder="π.χ. 7" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-medium text-brand-navy">Προορισμοί ανά ημέρα</div>
                <p className="mt-1 text-xs text-slate-500">Συμπλήρωσε τον προορισμό <b>κάθε ημέρας</b> (τέλος ημέρας). Τα legs υπολογίζονται αυτόματα.</p>
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

          {/* Κουμπί Generate (με id) */}
          <button
            id="generate-btn"
            type="submit"
            disabled={!ready}
            className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm border-[#c4a962] text-[#0b1220] bg-white/90 hover:bg-[#c4a962] hover:text-[#0b1220] focus:outline-none focus:ring-2 focus:ring-[#c4a962]"
            title="Generate itinerary"
          >
            Generate
          </button>
        </form>

        {/* ====== OUTPUT ====== */}
        {plan && (
          <div className="mt-8" id="print-root">
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between no-print">
              <div className="text-sm text-slate-500">
                Mode: <span className="font-medium text-brand-navy">{mode === "Region" ? "Auto AI Planner" : "Custom"}</span>
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
            <div className="no-print mb-2 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-brand-navy">Map Pick Mode:</span>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode==="Start"} onChange={() => setMapPickMode("Start")} />
                Start
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode==="End"} onChange={() => setMapPickMode("End")} />
                End
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode==="Via"} onChange={() => setMapPickMode("Via")} />
                {mode==="Region" ? "Via (Region)" : "Next Stop (Custom)"}
              </label>
              {mode === "Custom" && (
                <>
                  <label className="text-sm flex items-center gap-1">
                    <input type="radio" name="pick" checked={mapPickMode==="Custom"} onChange={() => setMapPickMode("Custom")} />
                    Set Day:
                  </label>
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    value={customPickIndex}
                    onChange={(e) => setCustomPickIndex(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: customDays }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {mapPoints.length >= 1 && (
              <div className="no-print mb-6">
                <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200">
                  <RouteMapClient
                    points={mapPoints}
                    markers={markers}
                    activeNames={activeNames}
                    onMarkerClick={handleMarkerClick}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  * Map preview για σχεδιασμό. Η διακεκομμένη γραμμή είναι εκτίμηση, όχι ναυτικός διάδρομος.
                </div>
              </div>
            )}

            {/* SUMMARY */}
            {totals && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-brand-navy">Trip summary</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div><div className="text-xs print-subtle">Route</div><div className="font-medium">{mode === "Region" ? `${start} → ${end}` : `${customStart}`}</div></div>
                  <div><div className="text-xs print-subtle">Region</div><div className="font-medium">{mode === "Region" ? (regionMode === "Auto" ? `${autoPickRegion(start, end)} (auto)` : region) : "Custom"}</div></div>
                  <div><div className="text-xs print-subtle">Distance</div><div className="font-medium">{totals.nm} nm</div></div>
                  <div><div className="text-xs print-subtle">Underway</div><div className="font-medium">{totals.hrs}</div></div>
                  {yachtType === "Motor" && (
                    <div><div className="text-xs print-subtle">Fuel / Cost</div><div className="font-medium">~{totals.fuel} L • ~€{totals.cost}</div></div>
                  )}
                </div>
              </div>
            )}

            {/* DAY CARDS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print-grid">
              {plan.map((d, idx) => {
                const facilities = PORT_FACTS[d.leg?.to ?? ""] || {};
                const destName = d.leg?.to ?? "";
                return (
                  <div key={d.day} className="rounded-2xl bg-white p-4 shadow-sm print-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-500">Day {d.day} • {d.date}</div>
                        {d.leg && <div className="text-xs rounded-full bg-brand-gold/20 inline-block mt-1 px-2 py-1 text-brand-navy">{d.leg.nm} nm</div>}
                      </div>
                      {thumbs[destName] && (
                        <img src={thumbs[destName]} alt={destName} className="h-16 w-24 rounded-md object-cover" />
                      )}
                    </div>

                    {d.leg ? (
                      <>
                        <div className="mt-2 text-lg font-semibold text-brand-navy">
                          {d.leg.from} →{" "}
                          <button
                            type="button"
                            className="underline decoration-dotted underline-offset-4 hover:text-brand-gold"
                            onClick={() => openPortInfoByName(destName)}
                            title="Πληροφορίες προορισμού (Wikipedia)"
                          >
                            {destName}
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          ~{formatHoursHM(d.leg.hours)} underway
                          {yachtType === "Motor" && <> • ~{d.leg.fuelL} L fuel • ~€{d.leg.cost}</>} • {speed} kn
                        </p>

                        {/* Best window & ETA */}
                        {d.leg.eta && (
                          <div className="mt-2 text-xs text-slate-600">
                            Suggested window: <b>{d.leg.eta.window}</b> • Depart <b>{d.leg.eta.dep}</b> → Arrive <b>{d.leg.eta.arr}</b>
                          </div>
                        )}

                        {/* Facilities chips */}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {facilities.fuel && <span className="rounded-full bg-slate-100 px-2 py-1">⛽ Fuel</span>}
                          {facilities.water && <span className="rounded-full bg-slate-100 px-2 py-1">🚰 Water</span>}
                          {facilities.provisions && <span className="rounded-full bg-slate-100 px-2 py-1">🛒 Provisions</span>}
                          {facilities.berth && <span className="rounded-full bg-slate-100 px-2 py-1">⚓ Berths</span>}
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-lg font-semibold text-brand-navy">Leisure / Lay Day</div>
                    )}

                    {d.notes && <p className="mt-3 text-sm text-slate-600">{d.notes}</p>}

                    {/* Actions/Notes */}
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-28 text-slate-500">Marina booking</span>
                        <input
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1"
                          placeholder="π.χ. call Port Police / marina office"
                          value={d.userNotes?.marina ?? ""}
                          onChange={(e) => setUserNote(idx, "marina", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-28 text-slate-500">Food</span>
                        <input
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1"
                          placeholder="εστιατόριο/ταβέρνα"
                          value={d.userNotes?.food ?? ""}
                          onChange={(e) => setUserNote(idx, "food", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-28 text-slate-500">Beach / POI</span>
                        <input
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1"
                          placeholder="παραλία / αξιοθέατο"
                          value={d.userNotes?.beach ?? ""}
                          onChange={(e) => setUserNote(idx, "beach", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ===== Wikipedia Modal (rich) ===== */}
      {infoOpen && infoData && (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {infoData.imageUrl && (
              <div className="h-56 w-full overflow-hidden bg-slate-100">
                <img
                  src={infoData.imageUrl}
                  alt={infoData.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold">{infoData.title}</h3>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="rounded-md border px-2 py-1 text-sm"
                >
                  Close
                </button>
              </div>

              {infoData.summary && (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {infoData.summary}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {infoData.coords && (
                  <>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {infoData.coords.lat.toFixed(4)}°, {infoData.coords.lon.toFixed(4)}°
                    </span>
                    <a
                      className="rounded-full border px-2 py-1 hover:bg-slate-50"
                      href={`https://www.google.com/maps?q=${infoData.coords.lat},${infoData.coords.lon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on map
                    </a>
                  </>
                )}
                {infoData.sourceUrl && (
                  <a
                    className="rounded-full border px-2 py-1 hover:bg-slate-50"
                    href={infoData.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source: Wikipedia
                  </a>
                )}
              </div>

              {infoData.gallery && infoData.gallery.length > 1 && (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium text-slate-700">Gallery</div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                    {infoData.gallery.slice(0, 8).map((g, i) => (
                      <img
                        key={`${g}-${i}`}
                        src={g}
                        alt={`img-${i}`}
                        className="h-20 w-full rounded-md object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {infoData.related && infoData.related.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium text-slate-700">Nearby / Related</div>
                  <div className="flex flex-wrap gap-2">
                    {infoData.related.map((r, i) => (
                      <button
                        key={`${r.title}-${i}`}
                        onClick={() => openPortInfoByName(r.title)}
                        className="flex items-center gap-2 rounded-full border px-2 py-1 text-sm hover:bg-slate-50"
                        title="Άνοιγμα προεπισκόπησης"
                      >
                        {r.thumb && <img src={r.thumb} alt="" className="h-5 w-5 rounded-full object-cover" />}
                        <span>{r.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
