// app/ai/page.tsx
"use client";

import RouteMapClient from "./RouteMapClient";
import { Suspense, useMemo, useState, useEffect, useId, useRef } from "react";
import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { usePorts } from "../../lib/ports";

// split views
import CaptainCrewToolkit from "./components/CaptainCrewToolkit";
import VipGuestsView from "./components/VipGuestsView";
// NEW: import button
import GenerateFinalItineraryButton from "../components/GenerateFinalItineraryButton";

export const dynamic = "force-dynamic";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Yacht = { type: YachtType; speed: number; lph: number };
type Leg = {
  from: string;
  to: string;
  nm: number;
  hours: number;
  fuelL: number;
  cost?: number;
  eta?: { dep: string; arr: string; window: string };
};
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
type PortCoord = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  aliases?: string[];
};

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
  const hours = (nm / yacht.speed) * 1.15;
  const fuelL = yacht.type === "Motor" ? hours * yacht.lph : 0;
  return { hours: +hours.toFixed(2), fuelL: Math.round(fuelL) };
}
function addDaysISO(iso: string, plus: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
}
function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
function addHoursToTime(startHHmm: string, hoursFloat: number) {
  const [hh, mm] = startHHmm.split(":").map((x) => parseInt(x, 10));
  const totalMin = Math.round(hh * 60 + mm + hoursFloat * 60);
  const h2 = Math.floor((totalMin / 60) % 24);
  const m2 = totalMin % 60;
  return `${pad2(h2)}:${pad2(m2)}`;
}
function asArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/\n|•|·|\u2022/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [String(v)];
}

/* ========= Regions ========= */
type RegionRing = Record<RegionKey, string[]>;
const BANK: RegionRing = {
  Saronic: [
    "Alimos",
    "Aegina",
    "Agistri",
    "Poros",
    "Hydra",
    "Spetses",
    "Ermioni",
    "Porto Cheli",
    "Alimos",
  ],
  Cyclades: [
    "Lavrio",
    "Kea",
    "Kythnos",
    "Syros",
    "Mykonos",
    "Paros",
    "Naxos",
    "Ios",
    "Santorini",
    "Milos",
    "Sifnos",
    "Serifos",
    "Lavrio",
  ],
  Ionian: [
    "Corfu",
    "Paxos",
    "Antipaxos",
    "Lefkada",
    "Meganisi",
    "Kalamos",
    "Kastos",
    "Ithaca",
    "Kefalonia",
    "Zakynthos",
    "Lefkada",
  ],
  Dodecanese: ["Rhodes", "Symi", "Kos", "Kalymnos", "Patmos", "Rhodes"],
  Sporades: ["Volos", "Skiathos", "Skopelos", "Alonissos", "Volos"],
  NorthAegean: [
    "Thessaloniki",
    "Nea Moudania",
    "Sani Marina",
    "Nikiti",
    "Vourvourou",
    "Ormos Panagias",
    "Ouranoupoli",
    "Kavala",
    "Thassos",
    "Samothraki",
    "Lemnos",
    "Lesvos",
    "Chios",
    "Samos",
    "Ikaria",
  ],
  Crete: ["Chania", "Rethymno", "Heraklion", "Agios Nikolaos", "Chania"],
};
function autoPickRegion(start: string, end: string): RegionKey {
  const s = (start + " " + end).toLowerCase();
  if (
    s.includes("lefka") ||
    s.includes("corfu") ||
    s.includes("paxos") ||
    s.includes("preveza") ||
    s.includes("zakynthos")
  )
    return "Ionian";
  if (
    s.includes("aegina") ||
    s.includes("hydra") ||
    s.includes("poros") ||
    s.includes("spetses") ||
    s.includes("alimos")
  )
    return "Saronic";
  if (
    s.includes("skiathos") ||
    s.includes("skopelos") ||
    s.includes("alonissos") ||
    s.includes("volos")
  )
    return "Sporades";
  if (s.includes("rhodes") || s.includes("kos") || s.includes("patmos"))
    return "Dodecanese";
  if (
    s.includes("lesvos") ||
    s.includes("chios") ||
    s.includes("samos") ||
    s.includes("thessaloniki")
  )
    return "NorthAegean";
  if (s.includes("chania") || s.includes("heraklion") || s.includes("crete"))
    return "Crete";
  return "Cyclades";
}

/* ========= CLEAN LABELS ========= */
const BANNED_IN_PARENS = [
  "traffic",
  "change-over",
  "change over",
  "crowd",
  "crowded",
  "meltemi",
  "swell",
  "fuel",
  "water",
  "power",
  "taxi",
  "shops",
  "supermarket",
  "notes",
  "πολύ",
  "παρασκευή",
  "σάββατο",
  "άνεμο",
  "άνεμοι",
  "κύμα",
  "ρηχ",
  "βράχ",
  "τηλέφ",
  "σημείωση",
];
function isCleanParen(inner: string) {
  const s = (inner || "").trim().toLowerCase();
  if (!s) return false;
  if (BANNED_IN_PARENS.some((w) => s.includes(w))) return false;
  if (/[0-9!:;.,/\\#@%&*=_+<>?|]/.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (s.length > 28) return false;
  return true;
}
function sanitizeName(raw: string) {
  let s = (raw || "").trim();
  if (!s) return s;
  const parens = [...s.matchAll(/\(([^)]+)\)/g)];
  if (parens.length === 0) return s;
  const firstClean = parens.find((m) => isCleanParen(m[1]));
  if (!firstClean) return s.replace(/\s*\([^)]+\)/g, "").trim();
  s = s.replace(/\s*\([^)]+\)/g, "").trim();
  const base = s.replace(/\s+/g, " ");
  return `${base} ${firstClean[0]}`.replace(/\s+/g, " ").trim();
}
function isNameLike(raw: string) {
  const s = (raw || "").trim();
  if (!s) return false;
  if (/[0-9.;:!?]/.test(s)) return false;
  if (s.length > 40) return false;
  if (s.split(/\s+/).filter(Boolean).length > 6) return false;
  const badStarts = [
    "Άφιξη",
    "Αφιξη",
    "Είσοδος",
    "Έξοδος",
    "Εξοδος",
    "Βάθη",
    "Καλύτερα",
    "Επικοινωνία",
    "Προσοχή",
    "Σημείωση",
    "Άνεμος",
    "Μελτέμι",
    "Shelter",
    "Depth",
    "Entrance",
    "Better",
    "Call",
    "Arrival",
    "Notes",
  ];
  const lower = s.toLowerCase();
  if (badStarts.some((w) => lower.startsWith(w.toLowerCase()))) return false;
  if (!/^[A-Za-zΑ-Ωα-ωΆ-Ώά-ώ\s'().-]+$/.test(s)) return false;
  return true;
}
function chooseLabelFromPort(p: any): string {
  const name = sanitizeName(p?.name ?? "");
  const aliases: string[] = Array.isArray(p?.aliases) ? p.aliases : [];
  for (const a of aliases) {
    const s = sanitizeName(a);
    if (/\(.+\)/.test(s) && isNameLike(s)) return s;
  }
  return name;
}
function makeOptionsFromPorts(portsList: any[]): string[] {
  const set = new Set<string>();
  for (const p of portsList ?? []) {
    const label = chooseLabelFromPort(p);
    if (label && isNameLike(label)) set.add(label);

    const cleanName = sanitizeName(p?.name ?? "");
    if (cleanName && isNameLike(cleanName)) set.add(cleanName);

    if (Array.isArray(p?.aliases)) {
      for (const a of p.aliases) {
        const s = sanitizeName(a);
        if (s && isNameLike(s)) set.add(s);
      }
    }
  }
  const arr = Array.from(set);
  arr.sort((a, b) => a.localeCompare(b));
  return arr;
}

/* ========= Autocomplete component ========= */
function AutoCompleteInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const CLEAN_OPTIONS = useMemo(() => {
    const set = new Set<string>();
    for (const o of options || []) {
      const cand = sanitizeName(o);
      if (cand && isNameLike(cand)) set.add(cand);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options]);

  const filtered = useMemo(() => {
    const v = value.trim().toLowerCase();
    if (showAll) return CLEAN_OPTIONS.slice(0, 300);
    if (!v) return CLEAN_OPTIONS.filter(Boolean).slice(0, 8);
    return CLEAN_OPTIONS.filter((o) => o.toLowerCase().includes(v)).slice(0, 12);
  }, [value, CLEAN_OPTIONS, showAll]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setShowAll(false);
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    else if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setShowAll(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setShowAll(false);
            setHighlight(0);
          }}
          onFocus={() => {
            setHasFocus(true);
            setOpen(true);
          }}
          onBlur={() => {
            setHasFocus(false);
            setTimeout(() => {
              if (!hasFocus) {
                setOpen(false);
                setShowAll(false);
              }
            }, 120);
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
          autoComplete="off"
        />
        <button
          type="button"
          aria-label="Show all options"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((o) => !o || !showAll);
            setShowAll((s) => !s || !open);
            setHighlight(0);
          }}
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
              <button type="button" className="underline" onClick={() => setShowAll(false)}>
                Search mode
              </button>
            ) : (
              <button type="button" className="underline" onClick={() => setShowAll(true)}>
                Show all
              </button>
            )}
          </div>

          {filtered.map((o, i) => (
            <button
              type="button"
              key={`${o}-${i}`}
              onClick={() => pick(o)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                i === highlight ? "bg-slate-100" : ""
              }`}
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
const safeEncode = (obj: unknown) =>
  encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj)))));
const safeDecode = <T,>(s: string | null): T | null => {
  if (!s) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s))))) as T;
  } catch {
    return null;
  }
};
function encodeArr(arr: string[]) {
  return arr.map((s) => encodeURIComponent(s)).join(",");
}
function decodeArr(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => decodeURIComponent(x))
    .filter(Boolean);
}

function buildQueryFromState(state: {
  mode: PlannerMode;
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  start: string;
  end: string;
  days: number;
  regionMode: "Auto" | RegionKey;
  vias: string[];
  customStart: string;
  customDays: number;
  customDayStops: string[];
  fuelPrice: number;
  depTime: string;
  weatherAwareWin: boolean;
  notesPayload?: any;
}) {
  const q = new URLSearchParams();
  q.set("mode", state.mode);
  q.set("date", state.startDate || "");
  q.set("yt", state.yachtType);
  q.set("speed", String(state.speed));
  if (state.yachtType === "Motor") q.set("lph", String(state.lph));
  q.set("fuel", String(state.fuelPrice));
  q.set("dep", state.depTime);
  q.set("wx", state.weatherAwareWin ? "1" : "0");
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
  if (state.notesPayload) q.set("notes", safeEncode(state.notesPayload));
  q.set("autogen", "1");
  return q.toString();
}

function loadStateFromQuery(
  sp: URLSearchParams,
  setters: {
    setMode: (v: PlannerMode) => void;
    setStartDate: (v: string) => void;
    setYachtType: (v: YachtType) => void;
    setSpeed: (v: number) => void;
    setLph: (v: number) => void;
    setStart: (v: string) => void;
    setEnd: (v: string) => void;
    setDays: (v: number) => void;
    setRegionMode: (v: "Auto" | RegionKey) => void;
    setVias: (v: string[]) => void;
    setCustomStart: (v: string) => void;
    setCustomDays: (v: number) => void;
    setCustomDayStops: (v: string[]) => void;
    setFuelPrice: (v: number) => void;
    setDepTime: (v: string) => void;
    setWeatherAwareWin: (v: boolean) => void;
  }
) {
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
  const wx = sp.get("wx") === "1";
  setters.setWeatherAwareWin(wx);

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
  return { mode, autogen, rawNotes: sp.get("notes") || null };
}

/* ========= Route builders ========= */
function nearestIndexInRing(
  ring: string[],
  target: PortCoord,
  findPortStrict: (name: string) => PortCoord | null
) {
  let best = 0,
    bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i++) {
    const p = findPortStrict(ring[i]);
    if (!p) continue;
    const d = haversineNM(target, p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
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
  const endName = end && end.trim() ? end : start;

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
    path.push(v);
    remainingLegs--;
  }

  const current = findPortStrict(path[path.length - 1]) || startCoord;
  const entryIdx = nearestIndexInRing(ring, current, findPortStrict);
  const rotated = [...ring.slice(entryIdx), ...ring.slice(0, entryIdx)];
  const extended: string[] = [];
  while (extended.length < days + 20) extended.push(...rotated);

  let k = 0;
  if (extended[0] && extended[0].toLowerCase() === path[path.length - 1].toLowerCase()) k = 1;

  while (remainingLegs > 1 && k < extended.length) {
    const c = extended[k++];
    if (!c) continue;
    if (c.toLowerCase() === path[path.length - 1].toLowerCase()) continue;
    path.push(c);
    remainingLegs--;
  }

  const last = endName;
  if (path[path.length - 1]?.toLowerCase() === last.toLowerCase()) {
    const tailMinus1 = path.length >= 2 ? path[path.length - 2].toLowerCase() : "";
    const alt = extended.find(
      (x) => x && x.toLowerCase() !== last.toLowerCase() && x.toLowerCase() !== tailMinus1
    );
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
  const seq = [start, ...dayStops].map((s) => s.trim()).filter(Boolean);
  const allValid = seq.every((s) => !!findPortStrict(s));
  if (!allValid || seq.length < 2) return null;
  return seq;
}

/* ========= LIVE Weather ========= */
type SpotWeather = {
  tempC?: number;
  precipMM?: number;
  cloudPct?: number;
  label?: string;
  windKts?: number;
  gustKts?: number;
};
const weatherCache = new Map<string, SpotWeather>();
function labelFromWx(precipMM?: number, cloudPct?: number) {
  if ((precipMM ?? 0) > 0.1) return "Rain";
  if ((cloudPct ?? 0) >= 70) return "Cloudy";
  if ((cloudPct ?? 0) >= 30) return "Partly cloudy";
  return "Clear";
}
async function fetchSpotWeather(lat: number, lon: number): Promise<SpotWeather | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (weatherCache.has(key)) return weatherCache.get(key)!;

  const url1 =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,precipitation,cloud_cover,is_day,weather_code,wind_speed_10m,wind_gusts_10m` +
    `&windspeed_unit=kn&timezone=auto`;

  const url2 =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true&hourly=precipitation,cloudcover,windspeed_10m,windgusts_10m` +
    `&windspeed_unit=kn&timezone=auto`;

  try {
    let tempC: number | undefined;
    let precipMM: number | undefined;
    let cloudPct: number | undefined;
    let windKts: number | undefined;
    let gustKts: number | undefined;

    let r = await fetch(url1);
    if (r.ok) {
      const j = await r.json();
      tempC = j?.current?.temperature_2m;
      precipMM = j?.current?.precipitation;
      cloudPct = j?.current?.cloud_cover;
      windKts = j?.current?.wind_speed_10m;
      gustKts = j?.current?.wind_gusts_10m;
    } else {
      r = await fetch(url2);
      if (!r.ok) throw new Error("open-meteo fail");
      const j = await r.json();
      tempC = j?.current_weather?.temperature;
      windKts = j?.current_weather?.windspeed;
      gustKts = Array.isArray(j?.hourly?.windgusts_10m) ? j.hourly.windgusts_10m[0] : undefined;
      if (Array.isArray(j?.hourly?.precipitation)) precipMM = j.hourly.precipitation[0];
      if (Array.isArray(j?.hourly?.cloudcover)) cloudPct = j.hourly.cloudcover[0];
    }

    const out: SpotWeather = {
      tempC: tempC != null ? Math.round(tempC) : undefined,
      precipMM: precipMM != null ? +Number(precipMM).toFixed(1) : undefined,
      cloudPct: cloudPct != null ? Math.round(cloudPct) : undefined,
      windKts: windKts != null ? Math.round(windKts) : undefined,
      gustKts: gustKts != null ? Math.round(gustKts) : undefined,
    };
    out.label = labelFromWx(out.precipMM, out.cloudPct);
    weatherCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

/* ========= Best-time & ETA ========= */
function suggestWindow(region: RegionKey, hours: number, weatherAware: boolean) {
  if (region === "Cyclades")
    return weatherAware ? "07:30–11:00" : hours <= 2.5 ? "08:00–11:00" : "08:00–12:30";
  if (region === "Saronic" || region === "Ionian")
    return weatherAware ? "08:00–10:30" : hours <= 1.8 ? "09:00–10:45" : "09:00–12:00";
  return weatherAware ? "08:00–12:00" : hours <= 2 ? "09:00–11:00" : "09:00–12:30";
}

/* ========= SeaGuide globals (schema-aware) ========= */
type SeaGuideEntry = Record<string, any>;
const SEA_GUIDE_URL = "/data/sea_guide_vol3_master.json";

function normalizeWords(s: string) {
  return normalize(s)
    .replace(/[^a-z0-9α-ω\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildSeaGuideIndex(items: SeaGuideEntry[]) {
  const exact = new Map<string, SeaGuideEntry>();
  const tokens = new Map<string, SeaGuideEntry[]>();

  for (const e of items) {
    const names: string[] = [];
    if (e?.id) names.push(String(e.id));

    const nameObj = e?.name;
    if (typeof nameObj === "string") names.push(nameObj);
    else {
      if (nameObj?.el) names.push(String(nameObj.el));
      if (nameObj?.en) names.push(String(nameObj.en));
    }

    for (const nm of names) {
      const k = normalize(nm);
      if (k && !exact.has(k)) exact.set(k, e);

      const ws = normalizeWords(nm);
      for (const w of ws) {
        const arr = tokens.get(w) ?? [];
        arr.push(e);
        tokens.set(w, arr);
      }
    }
  }

  return { exact, tokens };
}

function lookupSeaGuide(stopName: string, port: PortCoord | null, index: { exact: Map<string, SeaGuideEntry>; tokens: Map<string, SeaGuideEntry[]> }) {
  const tries: string[] = [];
  tries.push(stopName);
  tries.push(sanitizeName(stopName));
  if (port?.name) tries.push(port.name);
  if (port?.id) tries.push(port.id);
  if (Array.isArray(port?.aliases)) tries.push(...port.aliases);

  for (const t of tries) {
    const hit = index.exact.get(normalize(t));
    if (hit) return hit;
  }

  const queryTokens = new Set<string>();
  for (const t of tries) normalizeWords(t).forEach((w) => queryTokens.add(w));
  if (!queryTokens.size) return null;

  const score = new Map<SeaGuideEntry, number>();
  for (const tok of queryTokens) {
    const list = index.tokens.get(tok) ?? [];
    for (const e of list) score.set(e, (score.get(e) ?? 0) + 1);
  }

  let best: SeaGuideEntry | null = null;
  let bestScore = 0;
  for (const [e, sc] of score) {
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }
  if (best && bestScore >= 2) return best;
  return null;
}

function pickTextByLang(v: any, lang: "el" | "en" = "el"): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const a = v?.[lang];
    if (typeof a === "string" && a.trim()) return a;
    const b = v?.[lang === "el" ? "en" : "el"];
    if (typeof b === "string" && b.trim()) return b;
  }
  return null;
}
function pickArrByLang(v: any, lang: "el" | "en" = "el"): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") return asArray(v);
  if (typeof v === "object") {
    const a = v?.[lang];
    if (Array.isArray(a)) return a.filter(Boolean).map(String);
    if (typeof a === "string") return asArray(a);
    const b = v?.[lang === "el" ? "en" : "el"];
    if (Array.isArray(b)) return b.filter(Boolean).map(String);
    if (typeof b === "string") return asArray(b);
  }
  return [];
}

function extractSeaGuide(entry: SeaGuideEntry, lang: "el" | "en" = "el") {
  return {
    id: entry.id,
    region: entry.region,
    category: entry.category,
    name_el: entry?.name?.el ?? null,
    name_en: entry?.name?.en ?? null,
    lat: entry?.position?.lat,
    lon: entry?.position?.lon,

    vhf_port_authority: entry?.vhf?.port_authority ?? entry?.vhf,
    contacts_port_authority: entry?.contacts?.port_authority ?? entry?.contacts,

    weather_summer: pickTextByLang(entry?.weather?.summer, lang),
    weather_winter: pickTextByLang(entry?.weather?.winter, lang),

    approach: pickTextByLang(entry?.approach, lang),

    anch_depth_min: entry?.anchorage?.depth_m?.min,
    anch_depth_max: entry?.anchorage?.depth_m?.max,
    anch_bottom: asArray(entry?.anchorage?.bottom),
    anch_holding: pickTextByLang(entry?.anchorage?.holding, lang),
    anch_protection_good: asArray(entry?.anchorage?.protection?.wind_good),
    anch_protection_poor: asArray(entry?.anchorage?.protection?.wind_poor),

    hazards: pickArrByLang(entry?.hazards, lang),
    mooring: pickTextByLang(entry?.mooring, lang),
    captain_tips: pickArrByLang(entry?.captain_tips, lang),
    vip_info: pickTextByLang(entry?.vip_info, lang),
  };
}

declare global {
  interface Window {
    __NAVIGOPLAN_SEAGUIDE__?: { loadedAt: string; count: number };
    __NAVIGOPLAN_SEAGUIDE_LOOKUP__?: (stopName: string, port?: any) => any;
    __NAVIGOPLAN_SEAGUIDE_EXTRACT__?: (entry: any, lang?: "el" | "en") => any;
  }
}

/* ========= Main ========= */
function AIPlannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, error, ports, findPort: findPortRaw } = usePorts();

  // region-aware findPort
  const findPort = (input: string, regionHint?: RegionKey): PortCoord | null => {
    if (!input) return null;
    const all = (ports as any[]) ?? [];
    const n = normalize(input);

    let candidates = all;

    if (regionHint) {
      const byRegion = all.filter((p) => {
        const r = (p.region ?? p.area ?? "").toString();
        return r && normalize(r) === normalize(regionHint as string);
      });
      if (byRegion.length) candidates = byRegion;
    }

    let match: any =
      candidates.find((p) => {
        const names = [p.name, ...(Array.isArray(p.aliases) ? p.aliases : [])].filter(Boolean);
        return names.some((nm: string) => normalize(nm) === n);
      }) ?? null;

    if (!match) {
      const p = findPortRaw(input);
      if (!p) return null;
      match = p;
    }

    return {
      id: (match as any).id,
      name: match.name,
      lat: match.lat,
      lon: match.lon,
      aliases: (match as any).aliases,
    } as PortCoord;
  };

  const PORT_OPTIONS = useMemo(() => makeOptionsFromPorts((ports as any[]) ?? []), [ports]);

  const [mode, setMode] = useState<PlannerMode>("Region");

  // Common
  const [startDate, setStartDate] = useState<string>("");
  useEffect(() => {
    const d = new Date();
    setStartDate(d.toISOString().slice(0, 10));
  }, []);
  const [yachtType, setYachtType] = useState<YachtType>("Motor");
  const [speed, setSpeed] = useState<number>(20);
  const [lph, setLph] = useState<number>(180);
  const [fuelPrice, setFuelPrice] = useState<number>(1.8);
  const [depTime, setDepTime] = useState<string>("09:00");
  const [weatherAwareWin, setWeatherAwareWin] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [plan, setPlan] = useState<DayCard[] | null>(null);
  const yacht: Yacht = { type: yachtType, speed, lph };

  const [thumbs, setThumbs] = useState<Record<string, string | undefined>>({});
  const [destWeather, setDestWeather] = useState<Record<string, SpotWeather>>({});

  const [routeWeatherAware, setRouteWeatherAware] = useState<boolean>(false);
  const [legMeteo, setLegMeteo] = useState<
    Array<{ index: number; from: string; to: string; avgWind: number; avgWave: number; maxWind: number; maxWave: number }>
  >([]);

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
      .filter((v) => normalize(v) !== normalize(start) && normalize(v) !== normalize(end));
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

  type MapPick = "Start" | "End" | "Via" | "Custom";
  const [mapPickMode, setMapPickMode] = useState<MapPick>("Via");
  const [customPickIndex, setCustomPickIndex] = useState<number>(1);

  const pendingNotesRef = useRef<any | null>(null);
  const [activeTab, setActiveTab] = useState<"crew" | "vip">("crew");

  const REGION_PORT_OPTIONS = useMemo(() => {
    if (!ports || mode !== "Region" || regionMode === "Auto") return PORT_OPTIONS;
    const wanted = regionMode;
    const list = (ports as any[]).filter((p) => {
      const r = (p.region ?? p.area ?? "").toString();
      return r && normalize(r) === normalize(wanted as string);
    });
    const opts = makeOptionsFromPorts(list);
    return opts.length ? opts : PORT_OPTIONS;
  }, [ports, mode, regionMode, PORT_OPTIONS]);

  const VIA_OPTIONS = mode === "Region" ? REGION_PORT_OPTIONS : PORT_OPTIONS;

  /* ========= SeaGuide load + register globals ========= */
  const [seaGuideItems, setSeaGuideItems] = useState<SeaGuideEntry[] | null>(null);
  const seaGuideIndex = useMemo(() => {
    if (!seaGuideItems?.length) return null;
    return buildSeaGuideIndex(seaGuideItems);
  }, [seaGuideItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (seaGuideItems?.length) return;
        const r = await fetch(SEA_GUIDE_URL, { cache: "no-store" });
        if (!r.ok) throw new Error("sea guide fetch failed");
        const j = await r.json();
        const list: any[] =
          Array.isArray(j) ? j :
          Array.isArray(j?.items) ? j.items :
          Array.isArray(j?.data) ? j.data :
          Array.isArray(j?.ports) ? j.ports : [];
        if (!cancelled) setSeaGuideItems(list as SeaGuideEntry[]);
      } catch {
        if (!cancelled) setSeaGuideItems([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!seaGuideIndex) return;
    window.__NAVIGOPLAN_SEAGUIDE__ = {
      loadedAt: new Date().toISOString(),
      count: seaGuideItems?.length ?? 0,
    };
    window.__NAVIGOPLAN_SEAGUIDE_LOOKUP__ = (stopName: string, port?: any) => {
      const p: PortCoord | null = port ?? null;
      return lookupSeaGuide(stopName, p, seaGuideIndex);
    };
    window.__NAVIGOPLAN_SEAGUIDE_EXTRACT__ = (entry: any, lang: "el" | "en" = "el") => {
      return extractSeaGuide(entry, lang);
    };
  }, [seaGuideIndex, seaGuideItems]);

  /* ========= Load from URL ========= */
  useEffect(() => {
    if (!searchParams || !ready) return;
    const loaded = loadStateFromQuery(searchParams, {
      setMode,
      setStartDate,
      setYachtType,
      setSpeed,
      setLph,
      setStart,
      setEnd,
      setDays,
      setRegionMode,
      setVias,
      setCustomStart,
      setCustomDays,
      setCustomDayStops,
      setFuelPrice,
      setDepTime,
      setWeatherAwareWin,
    });
    pendingNotesRef.current = safeDecode<any>(loaded.rawNotes || null);
    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (hasParams && loaded.autogen) {
      try {
        document.getElementById("generate-btn")?.dispatchEvent(new Event("click", { bubbles: true }));
      } catch {}
    }
  }, [ready, searchParams]);

  function onTogglePref(value: string) {
    setPrefs((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  }
  function addVia() {
    setVias((v) => [...v, ""]);
  }
  function setViaAt(i: number, val: string) {
    setVias((v) => v.map((x, idx) => (idx === i ? val : x)));
  }
  function removeVia(i: number) {
    setVias((v) => v.filter((_, idx) => idx !== i));
  }
  function setCustomStopAt(i: number, val: string) {
    setCustomDayStops((arr) => arr.map((x, idx) => (idx === i ? val : x)));
  }

  /* ======= Generate ======= */
  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!ready) {
      alert("Φορτώνω ports… δοκίμασε ξανά σε λίγο.");
      return;
    }

    let namesSeq: string[] | null = null;
    if (mode === "Region") {
      if (!findPort(start, region) || !findPort(end, region)) {
        alert("Επίλεξε έγκυρο Start/End από τη λίστα.");
        return;
      }
      namesSeq = buildRouteRegion(start, end, days, region, effectiveVias, (name) => findPort(name, region));
    } else {
      if (!findPort(customStart)) {
        alert("Επίλεξε έγκυρο Start (custom).");
        return;
      }
      const seq = buildRouteCustomByDays(customStart, customDayStops, (name) => findPort(name));
      if (!seq) {
        alert("Συμπλήρωσε έγκυρους προορισμούς για κάθε ημέρα.");
        return;
      }
      namesSeq = seq;
    }

    const coords = (namesSeq ?? [])
      .map((n) => (mode === "Region" ? findPort(n, region) : findPort(n)))
      .filter(Boolean) as PortCoord[];
    if (coords.length < 2) {
      setPlan([]);
      return;
    }

    const legs: Leg[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const nm = Math.max(1, Math.round(haversineNM(coords[i], coords[i + 1])));
      const { hours, fuelL } = legStats(nm, yacht);
      const window = suggestWindow(region, hours, weatherAwareWin);
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
        eta: { dep, arr, window },
      });
    }

    const totalDays = (namesSeq?.length ?? 1) - 1;
    const cards: DayCard[] = [];
    for (let d = 0; d < totalDays; d++) {
      const date = startDate ? addDaysISO(startDate, d) : "";
      const leg = legs[d];
      const notes = [
        mode === "Region" && region === "Cyclades" ? "Meltemi possible· προτίμησε πρωινές μετακινήσεις." : "",
        mode === "Region" && region === "Saronic" ? "Προστατευμένα νερά· ιδανικό για οικογένειες." : "",
        mode === "Region" && region === "Ionian" ? "Ήρεμα κανάλια & πράσινες ακτές· εξαιρετικά αγκυροβόλια." : "",
        mode === "Region" && region === "Dodecanese" ? "Ιστορικά λιμάνια· πιο μεγάλα ανοικτά σκέλη." : "",
        mode === "Region" && region === "Sporades" ? "Θαλάσσιο πάρκο & πευκόφυτα νησιά." : "",
        mode === "Region" && region === "NorthAegean" ? "Αυθεντικά λιμάνια (incl. Χαλκιδική)." : "",
        mode === "Region" && region === "Crete" ? "Μεγαλύτερα σκέλη· οργάνωσε καύσιμα & θέσεις." : "",
        prefs.includes("nightlife") ? "Άφιξη αργά για βραδινό/μπαρ." : "",
        prefs.includes("family") ? "Αμμουδιές & μικρότερα σκέλη." : "",
        prefs.includes("gastronomy") ? "Κράτηση σε παραθαλάσσια ταβέρνα." : "",
      ]
        .filter(Boolean)
        .join(" ");
      cards.push({ day: d + 1, date, leg, notes, userNotes: {} });
    }

    const pending = pendingNotesRef.current as Record<string, any> | null;
    if (pending && cards.length) {
      cards.forEach((c, idx) => {
        const key = String(idx + 1);
        if (pending[key]) c.userNotes = { ...(c.userNotes ?? {}), ...pending[key] };
      });
      pendingNotesRef.current = null;
    }

    setPlan(cards);
    setActiveTab("crew");

    // Prefetch LIVE WX for each destination (to)
    (async () => {
      const uniqNames = Array.from(new Set(legs.map((l) => l.to)));
      const next: Record<string, SpotWeather> = {};
      for (const name of uniqNames) {
        const p = mode === "Region" ? findPort(name, region) : findPort(name);
        if (!p) continue;
        try {
          const w = await fetchSpotWeather(p.lat, p.lon);
          if (w) next[name] = w;
        } catch {}
      }
      setDestWeather(next);
    })();

    const qs = buildQueryFromState({
      mode,
      startDate,
      yachtType,
      speed,
      lph,
      start,
      end,
      days,
      regionMode,
      vias,
      customStart,
      customDays,
      customDayStops,
      fuelPrice,
      depTime,
      weatherAwareWin,
      notesPayload: null,
    });
    router.replace(`/ai?${qs}`, { scroll: false });
  }

  function handlePrint() {
    window.print();
  }
  function buildNotesPayload() {
    if (!plan?.length) return null;
    const obj: Record<string, any> = {};
    plan.forEach((c) => {
      if (c.userNotes && (c.userNotes.marina || c.userNotes.food || c.userNotes.beach)) obj[String(c.day)] = c.userNotes;
    });
    return Object.keys(obj).length ? obj : null;
  }
  async function handleCopyLink() {
    const notesPayload = buildNotesPayload();
    const qs = buildQueryFromState({
      mode,
      startDate,
      yachtType,
      speed,
      lph,
      start,
      end,
      days,
      regionMode,
      vias,
      customStart,
      customDays,
      customDayStops,
      fuelPrice,
      depTime,
      weatherAwareWin,
      notesPayload,
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

  const mapPoints = useMemo(() => {
    if (!plan?.length) return [] as PortCoord[];
    const namesSeq: string[] = [];
    const first = plan[0]?.leg?.from;
    if (first) namesSeq.push(first);
    for (const d of plan) if (d.leg?.to) namesSeq.push(d.leg.to);
    return namesSeq
      .map((n) => (mode === "Region" ? findPort(n, region) : findPort(n)))
      .filter(Boolean) as PortCoord[];
  }, [plan, mode, region]);

  const markers: { name: string; lat: number; lon: number }[] = useMemo(() => {
    if (!ready || !ports?.length) return [];
    let list = ports as any[];
    if (mode === "Region" && regionMode !== "Auto" && mapPickMode === "Via") {
      const wanted = regionMode;
      list = list.filter((p) => {
        const r = (p.region ?? p.area ?? "").toString();
        return r && normalize(r) === normalize(wanted as string);
      });
    }
    return list.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon }));
  }, [ready, ports, mode, regionMode, mapPickMode]);

  const activeNames = useMemo(() => {
    const set = new Set<string>();
    if (mode === "Region") {
      if (start) set.add(start);
      effectiveVias.forEach((v) => set.add(v));
      if (end) set.add(end);
    } else {
      if (customStart) set.add(customStart);
      customDayStops.forEach((v) => v && set.add(v));
    }
    return Array.from(set);
  }, [mode, start, end, effectiveVias, customStart, customDayStops]);

  function handleMarkerClick(portName: string) {
    const pClean = sanitizeName(portName);
    if (mode === "Region") {
      if (mapPickMode === "Start") return void setStart(pClean);
      if (mapPickMode === "End") return void setEnd(pClean);
      const idx = vias.findIndex((v) => !v);
      if (mapPickMode === "Via") {
        if (idx >= 0) setViaAt(idx, pClean);
        else setVias((v) => [...v, pClean]);
        return;
      }
    } else {
      if (mapPickMode === "Start") return void setCustomStart(pClean);
      if (mapPickMode === "Custom") {
        const i = Math.max(1, Math.min(customDays, customPickIndex));
        setCustomStopAt(i - 1, pClean);
        return;
      }
      if (mapPickMode === "End") {
        const i = customDays - 1;
        setCustomStopAt(i, pClean);
        return;
      }
      if (mapPickMode === "Via") {
        const i = customDayStops.findIndex((x) => !x);
        setCustomStopAt(i >= 0 ? i : customDayStops.length - 1, pClean);
        return;
      }
    }
  }

  /* ========= UI ========= */
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
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PlannerMode)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Region">Auto AI Planner</option>
              <option value="Custom">Custom (day-by-day)</option>
            </select>
            {!ready && <span className="text-xs text-slate-500">Φορτώνω ports…</span>}
            {error && <span className="text-xs text-red-600">Σφάλμα dataset</span>}
          </div>

          {/* Common controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
            <div className="flex flex-col md:col-span-2">
              <label htmlFor="date" className="mb-1 text-xs font-medium text-gray-600">
                Ημερομηνία αναχώρησης
              </label>
              <input
                id="date"
                type="date"
                value={startDate || ""}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="yt" className="mb-1 text-xs font-medium text-gray-600">
                Τύπος σκάφους
              </label>
              <select
                id="yt"
                value={yachtType}
                onChange={(e) => setYachtType(e.target.value as YachtType)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="Motor">Motor</option>
                <option value="Sailing">Sailing</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="speed" className="mb-1 text-xs font-medium text-gray-600">
                Ταχύτητα (kn)
              </label>
              <input
                id="speed"
                type="number"
                min={4}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value || "10"))}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="π.χ. 20"
              />
            </div>
            {yachtType === "Motor" && (
              <>
                <div className="flex flex-col">
                  <label htmlFor="lph" className="mb-1 text-xs font-medium text-gray-600">
                    Κατανάλωση (L/h)
                  </label>
                  <input
                    id="lph"
                    type="number"
                    min={5}
                    value={lph}
                    onChange={(e) => setLph(parseFloat(e.target.value || "120"))}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                    placeholder="π.χ. 180"
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="fuel" className="mb-1 text-xs font-medium text-gray-600">
                    Τιμή καυσίμου (€/L)
                  </label>
                  <input
                    id="fuel"
                    type="number"
                    min={0}
                    step={0.01}
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(parseFloat(e.target.value || "1.8"))}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                    placeholder="π.χ. 1.80"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col">
              <label htmlFor="dep" className="mb-1 text-xs font-medium text-gray-600">
                Ώρα αναχώρησης
              </label>
              <input
                id="dep"
                type="time"
                value={depTime}
                onChange={(e) => setDepTime(e.target.value || "09:00")}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={weatherAwareWin} onChange={(e) => setWeatherAwareWin(e.target.checked)} />
              Weather-aware window
            </label>
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
                  <label htmlFor="region" className="mb-1 text-xs font-medium text-gray-600">
                    Περιοχή
                  </label>
                  <select
                    id="region"
                    value={regionMode}
                    onChange={(e) => setRegionMode(e.target.value as any)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                  >
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
                  <label htmlFor="days" className="mb-1 text-xs font-medium text-gray-600">
                    Ημέρες ταξιδιού
                  </label>
                  <input
                    id="days"
                    type="number"
                    min={2}
                    max={21}
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value || "7", 10))}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                    placeholder="π.χ. 7"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-brand-navy">Προαιρετικές διελεύσεις/στάσεις (σειρά)</div>
                  <button
                    type="button"
                    onClick={addVia}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    + Add Stop
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {vias.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AutoCompleteInput value={v} onChange={(val) => setViaAt(i, val)} placeholder={`Stop ${i + 1}`} options={VIA_OPTIONS} />
                      <button
                        type="button"
                        onClick={() => removeVia(i)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs hover:bg-slate-50"
                        title="Remove stop"
                      >
                        ✕
                      </button>
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
                  <label htmlFor="cdays" className="mb-1 text-xs font-medium text-gray-600">
                    Ημέρες
                  </label>
                  <input
                    id="cdays"
                    type="number"
                    min={1}
                    max={30}
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value || "7", 10))}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
                    placeholder="π.χ. 7"
                  />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-medium text-brand-navy">Προορισμοί ανά ημέρα</div>
                <p className="mt-1 text-xs text-slate-500">
                  Συμπλήρωσε τον προορισμό <b>κάθε ημέρας</b> (τέλος ημέρας). Τα legs υπολογίζονται αυτόματα.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {customDayStops.map((stop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-20 text-xs text-slate-500">Day {i + 1}</div>
                      <AutoCompleteInput
                        value={stop}
                        onChange={(val) => setCustomStopAt(i, val)}
                        placeholder={`Destination for Day ${i + 1}`}
                        options={PORT_OPTIONS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="flex flex-wrap gap-2">
            {["family", "nightlife", "gastronomy"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePref(p)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  prefs.includes(p) ? "border-brand-navy bg-brand-navy text-white" : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            id="generate-btn"
            type="submit"
            disabled={!ready}
            className="rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm border-[#c4a962] text-[#0b1220] bg-white/90 hover:bg-[#c4a962] hover:text-[#0b1220] focus:outline-noneroya.focus:ring-2 focus:ring-[#c4a962]"
            title="Generate itinerary"
          >
            Generate
          </button>
        </form>

        {/* OUTPUT */}
        {plan && (
          <div className="mt-8" id="print-root">
            {/* Map toolbar */}
            <div className="no-print mb-2 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-brand-navy">Map Pick Mode:</span>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode === "Start"} onChange={() => setMapPickMode("Start")} />
                Start
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode === "End"} onChange={() => setMapPickMode("End")} />
                End
              </label>
              <label className="text-sm flex items-center gap-1">
                <input type="radio" name="pick" checked={mapPickMode === "Via"} onChange={() => setMapPickMode("Via")} />
                {mode === "Region" ? "Via (Region)" : "Next Stop (Custom)"}{" "}
              </label>

              <label className="text-sm flex items-center gap-2 ml-2">
                <input type="checkbox" checked={routeWeatherAware} onChange={(e) => setRouteWeatherAware(e.target.checked)} />
                In-transit weather (routing)
              </label>

              {mode === "Custom" && (
                <>
                  <label className="text-sm flex items-center gap-1">
                    <input type="radio" name="pick" checked={mapPickMode === "Custom"} onChange={() => setMapPickMode("Custom")} />
                    Set Day:
                  </label>
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    value={customPickIndex}
                    onChange={(e) => setCustomPickIndex(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: customDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
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
                    weatherAwareProp={routeWeatherAware}
                    onLegMeteo={(rows) => setLegMeteo(rows)}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  * Map preview για σχεδιασμό. Η διακεκομμένη γραμμή είναι εκτίμηση, όχι ναυτικός διάδρομος.
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="mb-3 no-print">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("crew")}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium border ${
                    activeTab === "crew" ? "bg-black text-white border-black" : "bg-white hover:bg-neutral-100"
                  }`}
                >
                  For Captain & Crew
                </button>
                <button
                  onClick={() => setActiveTab("vip")}
                  className={`px-4 py-2 rounded-2xl text-sm font-medium border ${
                    activeTab === "vip" ? "bg-black text-white border-black" : "bg-white hover:bg-neutral-100"
                  }`}
                >
                  For VIP Guests
                </button>
              </div>
            </div>

            {/* CREW */}
            {activeTab === "crew" && plan && (
              <CaptainCrewToolkit
                plan={plan}
                startDate={startDate}
                yachtType={yachtType}
                speed={speed}
                lph={lph}
                thumbs={thumbs}
                destWeather={destWeather}
                legMeteo={legMeteo}
              />
            )}

            {/* VIP */}
            {activeTab === "vip" && plan && (
              <>
                <VipGuestsView
                  plan={plan}
                  mode={mode}
                  startDate={startDate}
                  start={mode === "Region" ? start : customStart}
                  end={mode === "Region" ? end : undefined}
                  thumbs={thumbs}
                  destWeather={destWeather}
                />
                <div className="mt-4">
                  <GenerateFinalItineraryButton
                    dayCards={plan}
                    yacht={{ type: yachtType, speed, lph }}
                    tripTitle={mode === "Region" ? `${start} → ${end ?? start} • ${startDate}` : `Custom Cruise • ${startDate}`}
                  />
                </div>
              </>
            )}

            <div className="mb-4 flex items-center justify-between no-print mt-6">
              <div className="text-sm text-slate-500">
                Mode: <span className="font-medium text-brand-navy">{mode === "Region" ? "Auto AI Planner" : "Custom"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-xl border border-brand-navy bg-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-gold hover:text-brand-navy"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ===== Page wrapper ===== */
export default function AIPlannerPage() {
  return (
    <Suspense fallback={null}>
      <AIPlannerInner />
    </Suspense>
  );
}
