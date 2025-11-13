"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment } from "@react-three/drei";
import * as THREE from "three";

/* ========= TYPES ========= */
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
  tripTitle?: string;
};

/* ========= HELPERS ========= */
function formatHM(h?: number) {
  const v = h ?? 0;
  const H = Math.floor(v);
  const M = Math.round((v - H) * 60);
  return `${H}h ${M}m`;
}

function safeAtobToJSON<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  } catch {
    return null;
  }
}

function buildDayCardsFromStops(stops: Stop[]): DayCard[] {
  const arr = [...stops].sort((a, b) => a.day - b.day);
  return arr.map((s) => ({
    day: s.day,
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
          eta: s.info.eta,
        }
      : undefined,
  }));
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ========= 3D SCENE ========= */

function Water() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) {
      const base = 0.45 + Math.sin(t * 0.6) * 0.03;
      matRef.current.color.setHSL(0.56, 0.5, base);
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial ref={matRef} color="#2978b5" roughness={0.85} metalness={0.1} />
    </mesh>
  );
}

function YachtModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.6, 2.4, 32]} />
        <meshStandardMaterial color="white" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.9, -0.05]}>
        <boxGeometry args={[1.0, 0.35, 1.6]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0.15]}>
        <boxGeometry args={[0.6, 0.32, 0.6]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      <mesh castShadow position={[0, 1.75, 0.18]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}

function YachtRig({
  days,
  dayIndex,
  phase,
  onArrive,
  onFinish,
}: {
  days: DayCard[];
  dayIndex: number;
  phase: "sail" | "stop" | "done";
  onArrive: () => void;
  onFinish: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const tRef = useRef(0);
  const [startZ, setStartZ] = useState(20);
  const [endZ, setEndZ] = useState(10);

  useEffect(() => {
    if (!group.current) return;
    const zStart = group.current.position.z;
    const zEnd = zStart - 8;
    setStartZ(zStart);
    setEndZ(zEnd);
    tRef.current = 0;
  }, [dayIndex]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    g.position.y = 0.2 + Math.sin(Date.now() * 0.0015) * 0.05;

    if (phase === "sail") {
      const speed = Math.max(0.25, Math.min(1, (days[dayIndex]?.leg?.hours ?? 1) / 4));
      const duration = 3 + speed * 4;

      tRef.current = Math.min(1, tRef.current + delta / duration);
      const p = easeInOut(tRef.current);
      const z = THREE.MathUtils.lerp(startZ, endZ, p);
      g.position.z = z;

      camera.position.lerp(new THREE.Vector3(0, 3, z + 6), 0.08);
      camera.lookAt(g.position.x, g.position.y + 0.4, g.position.z);

      if (tRef.current >= 1) {
        if (dayIndex < days.length - 1) onArrive();
        else onFinish();
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, 20]}>
      <YachtModel />
    </group>
  );
}

/* ========= UI + 3D CONTAINER ========= */

function ScenePlayer({ data }: { data: Payload }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("sail");

  const days = useMemo(() => data.dayCards, [data]);

  const totals = useMemo(() => {
    const nm = days.reduce((a, d) => a + (d.leg?.nm ?? 0), 0);
    const hr = days.reduce((a, d) => a + (d.leg?.hours ?? 0), 0);
    const fuel = days.reduce((a, d) => a + (d.leg?.fuelL ?? 0), 0);
    return { nm, hr, fuel };
  }, [days]);

  const title = data.tripTitle ?? "VIP Final Itinerary";

  return (
    <div className="relative">
      {/* SUMMARY */}
      <div className="flex justify-center mb-4">
        <div className="max-w-4xl w-full bg-white/95 shadow rounded-xl p-5 border">
          <div className="text-xs uppercase">Final Itinerary</div>
          <div className="text-lg font-semibold mt-1">{title}</div>
          <div className="grid grid-cols-3 text-center mt-3">
            <div>
              <div className="text-xs text-gray-500">Total NM</div>
              <div className="font-semibold">{totals.nm.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Hours</div>
              <div className="font-semibold">{totals.hr.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Fuel</div>
              <div className="font-semibold">{totals.fuel.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* CANVAS */}
      <div className="relative w-full h-[550px] rounded-2xl overflow-hidden border">
        {/* overlay day card */}
        {phase !== "done" && (
          <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2 z-10 bg-white/95 rounded-xl shadow-lg border p-4 w-[90%] max-w-md">
            <div className="text-xs text-gray-500 uppercase">
              Day {days[dayIndex].day}
            </div>
            <div className="font-semibold text-xl mt-1">
              {days[dayIndex].leg
                ? `${days[dayIndex].leg?.from} → ${days[dayIndex].leg?.to}`
                : days[dayIndex].title}
            </div>
            <div className="text-sm mt-2">
              📅 {days[dayIndex].date}
              <br />
              NM: {(days[dayIndex].leg?.nm ?? 0).toFixed(1)} • Time:{" "}
              {formatHM(days[dayIndex].leg?.hours)}
            </div>
            {days[dayIndex].notes && (
              <div className="text-sm mt-2 whitespace-pre-wrap">
                📝 {days[dayIndex].notes}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 bg-black text-white rounded-xl"
                onClick={() => {
                  if (dayIndex < days.length - 1) {
                    setPhase("sail");
                    setDayIndex(dayIndex + 1);
                  } else {
                    setPhase("done");
                  }
                }}
              >
                {dayIndex < days.length - 1 ? "Continue" : "Finish"}
              </button>
            </div>
          </div>
        )}

        <Canvas shadows camera={{ position: [0, 3, 10], fov: 45 }}>
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, -5]} intensity={1.6} color="#f97316" castShadow />
          <Sky sunPosition={[10, 10, -5]} turbidity={8} />
          <Environment preset="sunset" />

          <Water />

          <YachtRig
            days={days}
            dayIndex={dayIndex}
            phase={phase}
            onArrive={() => setPhase("stop")}
            onFinish={() => setPhase("done")}
          />
        </Canvas>
      </div>
    </div>
  );
}

/* ========= PAGE ========= */

export default function FinalItineraryPage() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dataParam = sp.get("data");

    if (dataParam) {
      const decoded = safeAtobToJSON<FinalData>(dataParam);
      if (decoded?.stops) {
        setPayload({
          dayCards: buildDayCardsFromStops(decoded.stops),
          tripTitle: decoded.title ?? "VIP Final Itinerary",
        });
        return;
      }
    }

    const raw = sessionStorage.getItem("navigoplan.finalItinerary");
    if (raw) {
      try {
        const j = JSON.parse(raw);
        setPayload({
          dayCards: j.dayCards ?? [],
          tripTitle: j.tripTitle,
        });
        return;
      } catch {}
    }
  }, []);

  if (!payload) return null;

  return (
    <main className="p-6">
      <ScenePlayer data={payload} />
    </main>
  );
}
