"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Leg = { from: string; to: string; nm?: number; hours?: number; fuelL?: number; eta?: { dep?: string; arr?: string; window?: string } };
type DayCard = { day: number; date?: string; leg?: Leg; notes?: string; title?: string };
type DayInfo = { day: number; date?: string; title?: string; notes?: string; port?: string; activities?: string[]; eta?: { dep?: string; arr?: string; window?: string }; leg?: { from: string; to: string; nm?: number; hours?: number; fuelL?: number } };
type Stop = { id: string; name: string; pos: [number, number]; day: number; info: DayInfo };
type FinalData = { title?: string; stops: Stop[] };
type Payload = { dayCards: DayCard[]; yacht?: { type: YachtType; speed: number; lph: number }; tripTitle?: string };

/* ========= Helpers ========= */
function formatHM(h:number){const H=Math.floor(h||0);const M=Math.round(((h||0)-H)*60);return `${H}h ${M}m`;}

/** Unicode-safe base64 decode */
function safeAtobToJSON<T = unknown>(s: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json) as T;
  } catch { return null; }
}

function buildDayCardsFromStops(stops: Stop[]): DayCard[] {
  const arr = [...(stops || [])].sort((a,b)=>a.day-b.day);
  return arr.map((s,i)=>({
    day: s.day ?? i+1,
    date: s.info?.date,
    title: s.info?.title,
    notes: s.info?.notes,
    leg: s.info?.leg ? {
      from: s.info.leg.from,
      to: s.info.leg.to,
      nm: s.info.leg.nm,
      hours: s.info.leg.hours,
      fuelL: s.info.leg.fuelL,
      eta: s.info?.eta
    } : undefined
  }));
}

/* ========= Player (photo-matched backplate) ========= */
function easeInOut(t:number){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function useLegTimer(hours:number,onDone:()=>void,playing:boolean){
  const [t,setT]=useState(0);
  useEffect(()=>{
    if(!playing){ setT(0); return; }
    const dur = Math.min(6,Math.max(1,(hours||1)*0.9))*1000;
    const start = performance.now();
    let af:number;
    const loop=(now:number)=>{
      const p = Math.min(1,(now-start)/dur);
      setT(p);
      if(p<1) af=requestAnimationFrame(loop); else onDone();
    };
    af=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(af);
  },[hours,playing,onDone]);
  return t;
}

function ScenePlayer({ data }: { data: Payload }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("sail");
  const [zoomOut, setZoomOut] = useState(false);

  const days: DayCard[] = useMemo(()=> data.dayCards?.length ? data.dayCards : [
    { day:1, date:"Day 1", leg:{ from:"Alimos", to:"Hydra", nm:37, hours:2.2, fuelL:320 } },
    { day:2, date:"Day 2", leg:{ from:"Hydra", to:"Spetses", nm:20, hours:1.2, fuelL:160 } },
    { day:3, date:"Day 3", leg:{ from:"Spetses", to:"Poros", nm:35, hours:2.0, fuelL:290 } },
  ], [data]);

  const hours = days[idx]?.leg?.hours ?? 1;
  const t = useLegTimer(hours, ()=>setPhase("stop"), phase==="sail");

  const totals = useMemo(()=>{
    const nm = days.reduce((a,d)=>a+(d.leg?.nm||0),0);
    const hr = days.reduce((a,d)=>a+(d.leg?.hours||0),0);
    const fuel = days.reduce((a,d)=>a+(d.leg?.fuelL||0),0);
    return {nm, hr, fuel};
  },[days]);

  const title = data.tripTitle || "VIP Final Itinerary";

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200">
        <div className="relative aspect-[2/3] sm:aspect-[16/9]">
          {/* backplate: η δική σου φωτογραφία, σε PNG */}
          <img
            src="/images/navigoplan-sunset.png"
            alt="Navigoplan sunset"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${1 + (zoomOut ? 0.1 : 0.04*(1-easeInOut(t)))}) translateY(${(1-easeInOut(t))*2}%)`,
              transition: "transform 600ms ease"
            }}
          />
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_40%_at_70%_35%,rgba(255,170,60,0.18),transparent)]" />

          {/* Overlay UI (cards) */}
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
            {phase==="stop" && days[idx] && (
              <div className="pointer-events-auto max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/92 backdrop-blur border border-white/60 shadow-xl p-5">
                <div className="text-xs uppercase tracking-wide text-gray-500">VIP Day {days[idx].day}</div>
                <div className="text-2xl font-semibold mt-1">{days[idx].leg?.to ?? days[idx].title ?? "Destination"}</div>
                <div className="mt-2 text-sm text-gray-700">
                  <div>📅 {days[idx].date || "-"}</div>
                  {days[idx].leg && (
                    <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">NM</div><div className="font-semibold">{(days[idx].leg!.nm??0).toFixed(1)}</div></div>
                      <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">Hours</div><div className="font-semibold">{formatHM(days[idx].leg!.hours ?? 0)}</div></div>
                      <div className="rounded-lg bg-gray-50 p-2"><div className="text-xs text-gray-500">Fuel (L)</div><div className="font-semibold">{(days[idx].leg!.fuelL??0).toFixed(0)}</div></div>
                    </div>
                  )}
                  {days[idx].notes && <div className="mt-3 whitespace-pre-wrap">📝 {days[idx].notes}</div>}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    className="rounded-xl px-4 py-2 bg-black text-white font-medium shadow hover:shadow-lg"
                    onClick={()=>{
                      if (idx < days.length - 1) { setIdx(idx+1); setPhase("sail"); }
                      else { setPhase("done"); setZoomOut(true); }
                    }}
                  >
                    {idx < days.length - 1 ? "Continue" : "Finish"}
                  </button>
                </div>
              </div>
            )}

            {phase==="done" && (
              <div className="pointer-events-auto max-w-3xl w-[96vw] rounded-2xl bg-white/92 backdrop-blur border border-white/60 shadow-xl p-6">
                <div className="text-xs uppercase tracking-wide text-gray-500">Final Itinerary</div>
                <div className="text-3xl font-semibold mt-1">{title}</div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total NM</div><div className="font-semibold text-lg">{totals.nm.toFixed(1)}</div></div>
                  <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total Hours</div><div className="font-semibold text-lg">{totals.hr.toFixed(1)}</div></div>
                  <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Total Fuel (L)</div><div className="font-semibold text-lg">{totals.fuel.toFixed(0)}</div></div>
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />
        </div>
      </div>
    </div>
  );
}

/* ========= Page ========= */
export default function FinalItineraryPage() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) Προσπάθησε από ?data=
    const sp = new URLSearchParams(window.location.search);
    const dataParam = sp.get("data");
    if (dataParam) {
      const decoded = safeAtobToJSON<FinalData>(dataParam);
      if (decoded?.stops?.length) {
        const dayCards = buildDayCardsFromStops(decoded.stops);
        setPayload({ dayCards, tripTitle: decoded.title || "VIP Final Itinerary" });
        return;
      }
    }

    // 2) Fallback: sessionStorage
    const raw = sessionStorage.getItem("navigoplan.finalItinerary");
    if (raw) {
      try {
        const j = JSON.parse(raw);
        setPayload({ dayCards: j.dayCards || [], yacht: j.yacht, tripTitle: j.tripTitle });
        return;
      } catch {}
    }

    // 3) Τελευταίο fallback: demo
    setPayload({ dayCards: [] , tripTitle: "VIP Final Itinerary" });
  }, []);

  if (!payload) return null;

  return (
    <main className="p-4 sm:p-8">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Final Itinerary (Photo-Matched)</h1>
        <p className="text-sm text-gray-500">Backplate όπως η φωτογραφία • VIP flow με κάρτες</p>
      </div>
      <ScenePlayer data={payload} />
    </main>
  );
}
