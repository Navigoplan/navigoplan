"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

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
type DayCard = { day: number; date: string; leg?: Leg; notes?: string };
type Payload = { dayCards: DayCard[]; yacht?: Yacht; tripTitle?: string; createdAt?: number };

/* ====== helpers ====== */
function useRectSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1200, h: 650 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

type Pt = { x: number; y: number };
function catmullRomToBezier(points: Pt[], tension = 0.9): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    const [p0, p1] = points;
    return `M ${p0.x},${p0.y} L ${p1.x},${p1.y}`;
  }
  const path: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1] || p1;
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    if (i === 0) path.push(`M ${p1.x},${p1.y}`);
    path.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return path.join(" ");
}

function usePathSampler(d: string, w: number, h: number) {
  const ref = useRef<SVGPathElement | null>(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    try { setLen(ref.current.getTotalLength()); } catch { setLen(0); }
  }, [d, w, h]);
  function pointAt(t: number) {
    if (!ref.current || len === 0) return { x: 0, y: 0 };
    const pt = ref.current.getPointAtLength(t * len);
    return { x: pt.x, y: pt.y };
  }
  return { ref, len, pointAt };
}

function buildWaypoints(days: DayCard[], w: number, h: number): Pt[] {
  const pad = Math.max(48, Math.min(96, Math.floor(w * 0.07)));
  const N = Math.max(days.length, 2);
  return days.map((d, i) => {
    const t = N === 1 ? 0 : i / (N - 1);
    const x = pad + t * (w - pad * 2);
    const y = h * 0.42 + Math.sin(t * Math.PI * 1.15) * h * 0.22;
    return { x, y };
  });
}
function heading(a: Pt, b: Pt) { return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI; }

/* ====== visuals ====== */
function YachtIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-11 h-11 drop-shadow-[0_3px_8px_rgba(0,0,0,.25)]">
      <path d="M10 38l12-8 18-2 8 6-4 4H10Z" fill="white" stroke="#0b1220" strokeWidth="2" />
      <path d="M24 24l10-6 8 6-18 2v-2Z" fill="#d1d5db" stroke="#0b1220" strokeWidth="2" />
      <circle cx="38" cy="26" r="1.5" fill="#0b1220" />
    </svg>
  );
}

function IslandsLayer({ w, h, depth = 1 }: { w: number; h: number; depth: 1 | 2 | 3 }) {
  const baseOpacity = depth === 1 ? 0.35 : depth === 2 ? 0.22 : 0.16;
  const scale = depth === 1 ? 1.0 : depth === 2 ? 0.8 : 0.65;
  const drift = depth === 1 ? 48 : depth === 2 ? 36 : 28;
  const dur = depth === 1 ? 26 : depth === 2 ? 38 : 52;

  const S = Math.min(w, h) * scale;
  const IS = [
    { x: 0.18, y: 0.55, sx: 0.085, sy: 0.038, r: 12 },
    { x: 0.32, y: 0.30, sx: 0.065, sy: 0.030, r: -8 },
    { x: 0.48, y: 0.58, sx: 0.095, sy: 0.042, r: 5 },
    { x: 0.62, y: 0.34, sx: 0.072, sy: 0.031, r: -16 },
    { x: 0.74, y: 0.52, sx: 0.055, sy: 0.024, r: 9 },
    { x: 0.86, y: 0.28, sx: 0.062, sy: 0.027, r: -5 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ animation: `drift${depth} ${dur}s ease-in-out infinite alternate` }}>
      <svg className="absolute inset-0 w-full h-full">
        {IS.map((is, i) => (
          <g key={`${depth}-${i}`} transform={`translate(${w * is.x},${h * is.y}) rotate(${is.r})`}>
            <ellipse cx={0} cy={0} rx={S * is.sx} ry={S * is.sy} fill="#075985" opacity={baseOpacity * 0.6} />
            <ellipse cx={0} cy={0} rx={S * is.sx * 0.82} ry={S * is.sy * 0.82} fill="#0ea5e9" opacity={baseOpacity * 0.45} />
            <ellipse cx={0} cy={0} rx={S * is.sx * 0.62} ry={S * is.sy * 0.62} fill="#38bdf8" opacity={baseOpacity * 0.4} />
          </g>
        ))}
      </svg>
      <style>{`
        @keyframes drift1 { 0% { transform: translateX(-${drift}px) } 100% { transform: translateX(${drift}px) } }
        @keyframes drift2 { 0% { transform: translateX(-${drift}px) } 100% { transform: translateX(${drift}px) } }
        @keyframes drift3 { 0% { transform: translateX(-${drift}px) } 100% { transform: translateX(${drift}px) } }
      `}</style>
    </div>
  );
}

function StopCard({ d, onContinue }: { d: DayCard; onContinue: () => void }) {
  return (
    <div className="max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-xl p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">VIP Day {d.day}</div>
      <div className="text-2xl font-semibold mt-1">{d.leg?.to ?? "Destination"}</div>
      <div className="mt-2 text-sm text-gray-700">
        <div>📅 {d.date}</div>
        {d.leg && (
          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">NM</div><div className="font-semibold">{d.leg.nm.toFixed(1)}</div></div>
            <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">Hours</div><div className="font-semibold">{d.leg.hours.toFixed(1)}</div></div>
            <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">Fuel (L)</div><div className="font-semibold">{d.leg.fuelL.toFixed(0)}</div></div>
          </div>
        )}
        {d.notes && <div className="mt-3 whitespace-pre-wrap">📝 {d.notes}</div>}
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onContinue} className="rounded-xl px-4 py-2 bg-black text-white font-medium shadow hover:shadow-lg">
          Continue
        </button>
      </div>
    </div>
  );
}

function SummaryView({ days, title }: { days: DayCard[]; title: string }) {
  const totalNm = days.reduce((a, d) => a + (d.leg?.nm || 0), 0);
  const totalHours = days.reduce((a, d) => a + (d.leg?.hours || 0), 0);
  const totalFuel = days.reduce((a, d) => a + (d.leg?.fuelL || 0), 0);

  return (
    <div className="max-w-3xl w-[96vw] rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-xl p-6">
      <div className="text-xs uppercase tracking-wide text-gray-500">Final Itinerary</div>
      <div className="text-3xl font-semibold mt-1">{title}</div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total NM</div><div className="font-semibold text-lg">{totalNm.toFixed(1)}</div></div>
        <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total Hours</div><div className="font-semibold text-lg">{totalHours.toFixed(1)}</div></div>
        <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total Fuel (L)</div><div className="font-semibold text-lg">{totalFuel.toFixed(0)}</div></div>
      </div>
      <div className="mt-6 max-h-[40vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Day</th><th>Date</th><th>From → To</th>
              <th className="text-right">NM</th><th className="text-right">Hours</th><th className="text-right">Fuel (L)</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-t border-gray-100">
                <td className="py-2">{d.day}</td>
                <td>{d.date}</td>
                <td>{d.leg ? `${d.leg.from} → ${d.leg.to}` : "—"}</td>
                <td className="text-right">{d.leg ? d.leg.nm.toFixed(1) : "—"}</td>
                <td className="text-right">{d.leg ? d.leg.hours.toFixed(1) : "—"}</td>
                <td className="text-right">{d.leg ? d.leg.fuelL.toFixed(0) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ====== Player ====== */
function FinalItineraryPlayer({ data }: { data: Payload }) {
  const { ref, w, h } = useRectSize<HTMLDivElement>();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("sail");

  const days = data.dayCards?.length
    ? data.dayCards
    : [
        { day: 1, date: "Day 1", leg: { from: "Alimos", to: "Hydra", nm: 37, hours: 2.2, fuelL: 320 } },
        { day: 2, date: "Day 2", leg: { from: "Hydra", to: "Spetses", nm: 20, hours: 1.2, fuelL: 160 }, notes: "Lunch at old harbor" },
        { day: 3, date: "Day 3", leg: { from: "Spetses", to: "Poros", nm: 35, hours: 2.0, fuelL: 290 } },
      ];

  const title = data.tripTitle || "VIP Final Itinerary";

  const waypoints = useMemo(() => buildWaypoints(days, w, h), [days, w, h]);
  const pathD = useMemo(() => catmullRomToBezier(waypoints, 0.9), [waypoints]);
  const { ref: pathRef, pointAt } = usePathSampler(pathD, w, h);

  const t = useMotionValue(0);
  const [seg, setSeg] = useState<{ start: number; end: number }>({ start: 0, end: waypoints.length > 1 ? 1 / (waypoints.length - 1) : 1 });

  useEffect(() => {
    if (phase !== "sail" || waypoints.length < 2) return;
    const N = waypoints.length - 1;
    const start = idx / N;
    const end = (idx + 1) / N;
    setSeg({ start, end });

    const hours = days[idx]?.leg?.hours ?? 1;
    const dur = Math.max(0.9, Math.min(5.5, hours * 0.9));
    t.set(start);
    const controls = animate(t, end, {
      duration: dur,
      ease: [0.45, 0.05, 0.2, 1],
      onComplete: () => setPhase("stop"),
    });
    return () => controls.stop();
  }, [idx, phase, t, waypoints.length, days]);

  const [trail, setTrail] = useState<Pt[]>([]);
  useEffect(() => {
    const unsub = t.on("change", (tv) => {
      const p = pointAt(tv);
      setTrail((old) => {
        const next = old.concat(p);
        return next.length > 40 ? next.slice(next.length - 40) : next;
      });
    });
    return () => unsub();
  }, [pointAt, t]);

  const bob = useMotionValue(0);
  const yaw = useMotionValue(0);
  useEffect(() => {
    const a = animate(bob, 1, { duration: 2.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" });
    const b = animate(yaw, 1, { duration: 3.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" });
    return () => { a.stop(); b.stop(); };
  }, [bob, yaw]);
  const bobPx = useTransform(bob, [0, 1], [-3, 3]);
  const yawDeg = useTransform(yaw, [0, 1], [-3, 3]);

  return (
    <div className="w-full">
      <div ref={ref} className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl border bg-sky-300/60 backdrop-blur shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500" />
        <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(800px_240px_at_20%_10%,rgba(255,255,255,0.25),transparent_60%),radial-gradient(900px_300px_at_80%_30%,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 animate-[swell_7s_ease-in-out_infinite] bg-[radial-gradient(40px_8px_at_20%_8px,rgba(255,255,255,0.45),transparent_70%)] [mask-image:linear-gradient(to_top,black,transparent)]" />
        <style>{`@keyframes swell{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`}</style>

        <IslandsLayer w={w} h={h} depth={3} />
        <IslandsLayer w={w} h={h} depth={2} />
        <IslandsLayer w={w} h={h} depth={1} />

        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="trailGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={pathD} ref={pathRef} fill="none" stroke="white" strokeOpacity="0.2" strokeWidth={0} />
          <path d={pathD} fill="none" stroke="white" strokeOpacity="0.9" strokeWidth={3} strokeDasharray="12 9" />
          {waypoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="white" />)}
          {trail.length > 1 && (
            <polyline points={trail.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="url(#trailGrad)" strokeWidth={4} strokeOpacity={0.9} />
          )}
        </svg>

        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            x: useTransform(t, (tv) => pointAt(tv).x),
            y: useTransform(t, (tv) => pointAt(tv).y + bobPx.get()),
            rotate: useTransform(t, (tv) => {
              const p = pointAt(tv);
              const pPrev = pointAt(Math.max(0, tv - 0.001));
              return heading(pPrev, p) + (yawDeg.get() as number);
            }),
          }}
        >
          <YachtIcon />
        </motion.div>

        {phase === "stop" && days[idx] && (
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <StopCard
              d={days[idx]}
              onContinue={() => {
                if (idx < days.length - 1) { setIdx((i) => i + 1); setPhase("sail"); }
                else { setPhase("done"); }
              }}
            />
          </div>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="scale-95 md:scale-100">
              <SummaryView
                days={days}
                title={title}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====== Page ====== */
export default function FinalItineraryPage() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("navigoplan.finalItinerary");
    if (raw) {
      try { setData(JSON.parse(raw)); } catch { setData(null); }
    } else {
      setData(null);
    }
  }, []);

  return (
    <main className="p-4 sm:p-8">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Final Itinerary (Animated)</h1>
        <p className="text-sm text-gray-500">Premium animated presentation for VIP Guests</p>
      </div>
      <FinalItineraryPlayer data={data ?? { dayCards: [], tripTitle: "VIP Final Itinerary" }} />
    </main>
  );
}
