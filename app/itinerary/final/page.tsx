"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
type Leg = {
  from: string;
  to: string;
  nm?: number;
  hours?: number;
  fuelL?: number;
  eta?: { dep?: string; arr?: string; window?: string };
};
type DayCard = {
  day: number;
  date?: string;
  leg?: Leg;
  notes?: string;
  title?: string;
};
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
type Stop = { id: string; name: string; pos: [number, number]; day: number; info: DayInfo };
type FinalData = { title?: string; stops: Stop[] };
type Payload = {
  dayCards: DayCard[];
  yacht?: { type: YachtType; speed: number; lph: number };
  tripTitle?: string;
};

/* ========= Helpers ========= */
function formatHM(h: number) {
  const H = Math.floor(h || 0);
  const M = Math.round(((h || 0) - H) * 60);
  return `${H}h ${M}m`;
}

function safeAtobToJSON<T = unknown>(s: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function buildDayCardsFromStops(stops: Stop[]): DayCard[] {
  const arr = [...(stops || [])].sort((a, b) => a.day - b.day);
  return arr.map((s, i) => ({
    day: s.day ?? i + 1,
    date: s.info?.date,
    title: s.info?.title,
    notes: s.info?.notes,
    leg: s.info?.leg
      ? {
          from: s.info.leg.from,
          to: s.info.leg.to,
          nm: s.info.leg.nm,
          hours: s.info.leg.hours,
          fuelL: s.info.leg.fuelL,
          eta: s.info?.eta,
        }
      : undefined,
  }));
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* μικρός timer για “sail” phase */
function useLegTimer(hours: number, onDone: () => void, playing: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) {
      setT(0);
      return;
    }
    const dur = Math.min(6, Math.max(1, (hours || 1) * 0.9)) * 1000;
    const start = performance.now();
    let af: number;
    const loop = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setT(p);
      if (p < 1) af = requestAnimationFrame(loop);
      else onDone();
    };
    af = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(af);
  }, [hours, playing, onDone]);
  return t;
}

/* ========= 3D Components ========= */

function Water() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      const base = 0.5 + Math.sin(t * 0.3) * 0.02;
      matRef.current.color.setHSL(0.57, 0.5, base);
      matRef.current.roughness = 0.8;
      matRef.current.metalness = 0.1;
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[500, 500, 64, 64]} />
      <meshStandardMaterial ref={matRef} color="#1f6aa5" />
    </mesh>
  );
}

function YachtModel() {
  return (
    <group>
      {/* hull */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.5, 2.4, 20]} />
        <meshStandardMaterial color="#f4f6f7" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* deck */}
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[0.7, 0.25, 1.3]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      {/* bridge */}
      <mesh castShadow position={[0, 1.0, 0.15]}>
        <boxGeometry args={[0.4, 0.22, 0.45]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
}

function FollowCam({
  target,
  zoomOut,
}: {
  target: React.MutableRefObject<THREE.Object3D | null>;
  zoomOut: boolean;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const obj = target.current;
    if (!obj) return;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(obj.quaternion);
    const dist = zoomOut ? 14 : 7;
    const height = zoomOut ? 5 : 2.5;
    const desired = obj.position.clone().addScaledVector(dir, -dist);
    desired.y += height;
    camera.position.lerp(desired, 0.08);
    camera.lookAt(obj.position.x, obj.position.y + 0.4, obj.position.z);
  });
  return null;
}

/* ========= Main 3D Scene ========= */
function Scene3D({ data }: { data: Payload }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("stop");
  const [zoomOut, setZoomOut] = useState(false);

  const days: DayCard[] = useMemo(
    () =>
      data.dayCards?.length
        ? data.dayCards
        : [
            {
              day: 1,
              date: "Day 1",
              leg: { from: "Alimos", to: "Hydra", nm: 37, hours: 2.2, fuelL: 320 },
            },
            {
              day: 2,
              date: "Day 2",
              leg: { from: "Hydra", to: "Spetses", nm: 20, hours: 1.2, fuelL: 160 },
            },
          ],
    [data]
  );

  const totals = useMemo(() => {
    const nm = days.reduce((a, d) => a + (d.leg?.nm || 0), 0);
    const hr = days.reduce((a, d) => a + (d.leg?.hours || 0), 0);
    const fuel = days.reduce((a, d) => a + (d.leg?.fuelL || 0), 0);
    return { nm, hr, fuel };
  }, [days]);

  const title = data.tripTitle || "VIP Final Itinerary";

  const points = useMemo(() => {
    const N = Math.max(days.length, 2);
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const t = N === 1 ? 0 : i / (N - 1);
      const x = THREE.MathUtils.lerp(-20, 20, t);
      const z = THREE.MathUtils.lerp(15, -15, t) + Math.sin(t * Math.PI * 1.3) * 4;
      arr.push(new THREE.Vector3(x, 0, z));
    }
    return arr;
  }, [days.length]);

  const yachtRef = useRef<THREE.Object3D>(null);

  const hours = days[idx]?.leg?.hours ?? 1;
  const t = useLegTimer(
    hours,
    () => {
      if (idx < days.length - 1) {
        setIdx((i) => i + 1);
        setPhase("stop");
      } else {
        setPhase("done");
        setZoomOut(true);
      }
    },
    phase === "sail"
  );

  useFrame(() => {
    if (!yachtRef.current) return;
    let pos: THREE.Vector3;
    if (phase === "sail") {
      const N = points.length - 1;
      const startIndex = Math.min(idx, N - 1);
      const endIndex = Math.min(idx + 1, N);
      const start = points[startIndex];
      const end = points[endIndex];
      const tt = easeInOut(t);
      pos = start.clone().lerp(end, tt);
      const dir = end.clone().sub(start).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );
      yachtRef.current.quaternion.slerp(q, 0.1);
    } else {
      pos = points[Math.min(idx, points.length - 1)].clone();
    }
    yachtRef.current.position.lerp(pos, 0.2);
    yachtRef.current.position.y = 0.2 + Math.sin(Date.now() * 0.0015) * 0.05;
  });

  return (
    <div className="relative w-full">
      {/* Overlay UI πάνω από το 3D */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
        {phase === "stop" && days[idx] && (
          <div className="pointer-events-auto max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/95 backdrop-blur border border-white/60 shadow-xl p-5">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              VIP Day {days[idx].day}
            </div>
            <div className="text-2xl font-semibold mt-1">
              {days[idx].leg?.to ?? days[idx].title ?? "Destination"}
            </div>
            <div className="mt-2 text-sm text-gray-700">
              <div>📅 {days[idx].date || "-"}</div>
              {days[idx].leg && (
                <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xs text-gray-500">NM</div>
                    <div className="font-semibold">
                      {(days[idx].leg!.nm ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xs text-gray-500">Hours</div>
                    <div className="font-semibold">
                      {formatHM(days[idx].leg!.hours ?? 0)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <div className="text-xs text-gray-500">Fuel (L)</div>
                    <div className="font-semibold">
                      {(days[idx].leg!.fuelL ?? 0).toFixed(0)}
                    </div>
                  </div>
                </div>
              )}
              {days[idx].notes && (
                <div className="mt-3 whitespace-pre-wrap">
                  📝 {days[idx].notes}
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl px-4 py-2 bg-black text-white font-medium shadow hover:shadow-lg"
                onClick={() => {
                  if (idx < days.length - 1) setPhase("sail");
                  else {
                    setPhase("done");
                    setZoomOut(true);
                  }
                }}
              >
                {idx < days.length - 1 ? "Continue" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="pointer-events-auto max-w-3xl w-[96vw] rounded-2xl bg-white/95 backdrop-blur border border-white/60 shadow-xl p-6">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Final Itinerary
            </div>
            <div className="text-3xl font-semibold mt-1">{title}</div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total NM</div>
                <div className="font-semibold text-lg">
                  {totals.nm.toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total Hours</div>
                <div className="font-semibold text-lg">
                  {totals.hr.toFixed(1)}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total Fuel (L)</div>
                <div className="font-semibold text-lg">
                  {totals.fuel.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 3, 8], fov: 45 }}
        className="aspect-[16/9] w-full rounded-2xl border border-slate-200 bg-black"
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          intensity={1.2}
          position={[10, 12, 6]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Sky
          sunPosition={[10, 15, -10]}
          turbidity={6}
          rayleigh={2}
          mieCoefficient={0.02}
          mieDirectionalG={0.9}
        />
        <Environment preset="sunset" />
        <Water />
        <group ref={yachtRef} position={[-20, 0, 15]}>
          <YachtModel />
        </group>
        <FollowCam target={yachtRef} zoomOut={zoomOut} />
      </Canvas>
    </div>
  );
}

/* ========= Page ========= */
export default function FinalItineraryPage() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
    const raw = sessionStorage.getItem("navigoplan.finalItinerary");
    if (raw) {
      try {
        const j = JSON.parse(raw);
        setPayload({
          dayCards: j.dayCards || [],
          yacht: j.yacht,
          tripTitle: j.tripTitle,
        });
        return;
      } catch {}
    }
    setPayload({ dayCards: [], tripTitle: "VIP Final Itinerary" });
  }, []);

  if (!payload) return null;

  return (
    <main className="p-4 sm:p-8">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">
          Final Itinerary (3D Sea)
        </h1>
        <p className="text-sm text-gray-500">
          3D yacht που πλέει σε ηλιοβασίλεμα • Day-by-day VIP cards
        </p>
      </div>
      <Scene3D data={payload} />
    </main>
  );
}
