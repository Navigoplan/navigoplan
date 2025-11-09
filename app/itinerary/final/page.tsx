"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";

/* ========= Local minimal UI (χωρίς shadcn) ========= */
function UIButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "w-full rounded-xl px-4 py-3 bg-white text-black font-medium shadow hover:bg-white/90 transition " +
        className
      }
    />
  );
}
function UICard({
  title,
  children,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-white/40">
          <div className="text-lg font-semibold">{title}</div>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* ================= Types ================= */
type DayInfo = {
  day: number;
  date?: string;
  title?: string;
  notes?: string;
  port?: string;
  activities?: string[];
  eta?: { dep?: string; arr?: string; window?: string };
  leg?: { from: string; to: string; nm?: number; hours?: number; fuelL?: number };
};
type Stop = {
  id: string;
  name: string;
  pos: [number, number]; // 0..100
  day: number;
  info: DayInfo;
};
type FinalData = { title?: string; stops: Stop[] };

/* ========== Helpers ========== */
function decodeFromQuery(sp: URLSearchParams): FinalData | null {
  const encoded = sp.get("data");
  if (!encoded) return null;
  try {
    const json = atob(encoded);
    return JSON.parse(json) as FinalData;
  } catch {
    return null;
  }
}

/* ========== Demo αν λείπουν δεδομένα ========== */
const DEMO: FinalData = {
  title: "Cyclades Sunset Demo",
  stops: [
    {
      id: "athens",
      name: "Athens",
      pos: [18, 66],
      day: 1,
      info: {
        day: 1,
        title: "Embarkation – Athens",
        port: "Alimos Marina",
        notes: "Welcome on board. Sunset cruise & dinner on deck.",
        eta: { dep: "17:30" },
        leg: { from: "Athens", to: "Kea", nm: 37, hours: 2.2, fuelL: 380 },
      },
    },
    {
      id: "kea",
      name: "Kea",
      pos: [35, 48],
      day: 2,
      info: {
        day: 2,
        title: "Kea – Kolona Bay",
        port: "Kolona Anchorage",
        notes: "Morning swim, lunch on board, sunset at Kolona.",
        eta: { dep: "10:00", arr: "12:15" },
        leg: { from: "Kea", to: "Syros", nm: 32, hours: 1.9, fuelL: 330 },
      },
    },
    {
      id: "syros",
      name: "Syros",
      pos: [58, 40],
      day: 3,
      info: {
        day: 3,
        title: "Syros – Hermoupolis",
        port: "Hermoupolis",
        notes: "Town stroll & fine dining.",
        eta: { dep: "11:00", arr: "13:00" },
        leg: { from: "Syros", to: "Mykonos", nm: 20, hours: 1.2, fuelL: 200 },
      },
    },
    {
      id: "mykonos",
      name: "Mykonos",
      pos: [82, 44],
      day: 4,
      info: {
        day: 4,
        title: "Mykonos – Ornos",
        port: "Ornos Bay",
        notes: "Beach clubs & farewell dinner.",
        eta: { dep: "09:30", arr: "11:00" },
      },
    },
  ],
};

/* ========== Visual Layers ========== */
function Islands({ target }: { target: Stop | null }) {
  const v = target ? target.id.length % 3 : 0;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g opacity={0.35}>
        <path d="M0,70 Q20,60 40,68 T100,66 L100,100 L0,100 Z" fill="#1f2937" />
      </g>
      {v === 0 && <path d="M10,78 Q22,74 28,78 T44,80 L44,100 L10,100 Z" fill="#111827" opacity={0.6} />}
      {v === 1 && <path d="M60,78 Q68,73 76,76 T90,80 L90,100 L60,100 Z" fill="#111827" opacity={0.6} />}
      {v === 2 && (
        <>
          <path d="M8,79 Q14,75 22,78 T30,81 L30,100 L8,100 Z" fill="#111827" opacity={0.6} />
          <path d="M58,78 Q66,74 72,76 T86,81 L86,100 L58,100 Z" fill="#111827" opacity={0.6} />
        </>
      )}
    </svg>
  );
}
function Waves() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#0b1226" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sea)" />
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M0 650 Q 240 620 480 650 T 960 650 T 1440 650 L 1440 900 L 0 900 Z"
          fill="rgba(255,255,255,0.05)"
          initial={{ y: i * 8 }}
          animate={{ y: [i * 8, i * 8 + 10, i * 8] }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
function YachtStern({ label = "NAVIGOPLAN" }: { label?: string }) {
  return (
    <svg viewBox="0 0 200 220" className="w-[180px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
      <path d="M20 190 Q100 205 180 190 L165 210 Q100 220 35 210 Z" fill="#0e1116" />
      <rect x="30" y="120" width="140" height="70" rx="8" fill="#1a1f27" />
      <rect x="40" y="95" width="120" height="40" rx="8" fill="#222733" />
      <rect x="40" y="92" width="120" height="4" rx="2" fill="#a0a6b3" />
      <path d="M28 188 Q100 200 172 188 L168 196 Q100 206 32 196 Z" fill="#8a623d" />
      <text x="100" y="160" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="20" fill="#d0a84b" style={{ letterSpacing: "1px" }}>
        {label}
      </text>
      <path d="M60 215 Q100 210 140 215" stroke="rgba(255,255,255,0.6)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ========== HUD ========== */
function DayCardHUD({
  info,
  onContinue,
  isLast,
}: {
  info: DayInfo;
  onContinue: () => void;
  isLast: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute left-6 bottom-6 max-w-[520px] z-30">
      <UICard
        title={
          <div className="flex items-center gap-3">
            <span className="text-xl">Day {info.day}</span>
            {info.title && <span className="text-neutral-600">— {info.title}</span>}
          </div>
        }
      >
        <div className="space-y-2 text-sm">
          {info.eta && (
            <div>
              {info.eta.dep && <span className="mr-3">Dep: {info.eta.dep}</span>}
              {info.eta.arr && <span className="mr-3">Arr: {info.eta.arr}</span>}
              {info.eta.window && <span>Window: {info.eta.window}</span>}
            </div>
          )}
          {info.port && <div>Port: {info.port}</div>}
          {info.leg && (info.leg.nm || info.leg.hours || info.leg.fuelL) && (
            <div>
              {info.leg.nm != null && <span className="mr-3">{info.leg.nm} nm</span>}
              {info.leg.hours != null && <span className="mr-3">{info.leg.hours} h</span>}
              {info.leg.fuelL != null && <span>{info.leg.fuelL} L</span>}
            </div>
          )}
          {info.activities && info.activities.length > 0 && (
            <div>Activities: {info.activities.join(" • ")}</div>
          )}
          {info.notes && <p>{info.notes}</p>}
          <div className="pt-3">
            <UIButton onClick={onContinue}>{isLast ? "Finish & Show Overview" : "Continue"}</UIButton>
          </div>
        </div>
      </UICard>
    </motion.div>
  );
}

/* ========== Page ========== */
export default function FinalItineraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const data = useMemo<FinalData>(() => {
    const decoded = decodeFromQuery(searchParams as unknown as URLSearchParams);
    return decoded && decoded.stops?.length ? decoded : DEMO;
  }, [searchParams]);

  const stops = useMemo(() => [...data.stops].sort((a, b) => a.day - b.day), [data.stops]);

  const [idx, setIdx] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [overview, setOverview] = useState(false);

  const curr = stops[idx] ?? null;
  const next = stops[idx + 1] ?? null;

  const yachtControls = useAnimation();

  useEffect(() => {
    if (!curr) return;
    setArrived(false);

    const dest = (next ?? curr).pos;
    const hours = curr.info.leg?.hours ?? 1.2;
    const duration = Math.max(2.8, Math.min(10, hours * 6));

    yachtControls
      .start({
        left: `${dest[0]}%`,
        top: `${dest[1]}%`,
        transition: { duration, ease: "easeInOut" },
      })
      .then(() => setArrived(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, curr?.pos[0], curr?.pos[1]]);

  function handleContinue() {
    if (idx >= stops.length - 1) {
      setOverview(true);
      return;
    }
    setIdx((s) => s + 1);
  }

  const sky = (
    <div className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff7a3d] via-[#f16e54] to-[#0f172a]" />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.18 }}
        animate={{ opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(800px 400px at 70% 55%, rgba(255,200,120,0.45), transparent 60%)",
        }}
      />
    </div>
  );

  const overviewLayer = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative w-[92vw] h-[78vh] rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1226] to-[#030712]" />
          <Waves />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={stops.map((s) => `${s.pos[0]},${s.pos[1]}`).join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="0.8"
              strokeDasharray="2 1"
            />
            {stops.map((s) => (
              <g key={s.id}>
                <circle cx={s.pos[0]} cy={s.pos[1]} r={1.8} fill="#d0a84b" />
                <text x={s.pos[0] + 1.5} y={s.pos[1] - 1.5} fontSize="3" fill="#f8fafc">
                  {`D${s.day}: ${s.name}`}
                </text>
              </g>
            ))}
          </svg>
          <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between text-white">
            <div>
              <div className="text-lg font-semibold">{data.title ?? "Final Itinerary"}</div>
              <div className="text-sm opacity-80">
                {stops.length} days • {stops[0]?.name} → {stops[stops.length - 1]?.name}
              </div>
            </div>
            <UIButton onClick={() => router.push("/ai")} className="w-auto px-4">
              Back to Planner
            </UIButton>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {sky}
      {/* Sun */}
      <motion.div
        className="absolute right-[12%] top-[22%] rounded-full"
        initial={{ scale: 0.95, opacity: 0.9 }}
        animate={{ scale: [0.95, 1, 0.95], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 140,
          height: 140,
          background:
            "radial-gradient(circle at 50% 50%, #ffd08a 0%, #ffb45f 35%, rgba(255,114,58,0.0) 70%)",
          filter: "blur(0.3px)",
        }}
      />
      <Waves />
      <Islands target={stops[idx] ?? null} />
      {/* Yacht */}
      <motion.div
        className="absolute z-20"
        initial={{
          left: `${stops[0]?.pos[0] ?? 20}%`,
          top: `${stops[0]?.pos[1] ?? 70}%`,
        }}
        animate={yachtControls}
      >
        <YachtStern label="NAVIGOPLAN" />
      </motion.div>

      {/* HUD */}
      {stops[idx] && !overview && (
        <DayCardHUD
          info={stops[idx].info}
          isLast={idx >= stops.length - 1}
          onContinue={handleContinue}
        />
      )}

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white z-30">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 py-2 rounded-full bg-white/10 border border-white/30 backdrop-blur-md"
        >
          <span className="font-semibold tracking-wide">
            {data.title ?? "Final Itinerary"}
          </span>
        </motion.div>
      </div>

      {overview && overviewLayer}
    </div>
  );
}
