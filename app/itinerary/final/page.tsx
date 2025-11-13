"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ========= Types από itinerary ========= */
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
type Payload = { dayCards: DayCard[]; tripTitle?: string };

/* ========= Helpers ========= */

function formatHM(h?: number) {
  const v = h ?? 0;
  const H = Math.floor(v);
  const M = Math.round((v - H) * 60);
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
  return [...stops]
    .sort((a, b) => a.day - b.day)
    .map((s, i) => ({
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
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ========= 3D components ========= */

/** 3D θάλασσα από ocean-water.glb */
function OceanGLB() {
  const gltf = useGLTF("/models/ocean-water.glb") as any;

  return (
    <primitive
      object={gltf.scene}
      // θα χρειαστεί να πειραματιστείς με αυτά τα 3:
      scale={10}
      position={[0, 0, 0]}
      rotation={[-Math.PI / 2, 0, 0]} // συνήθως τα ocean meshes είναι “όρθια”
      receiveShadow
    />
  );
}
useGLTF.preload("/models/ocean-water.glb");

/** GLB yacht από super-yacht.glb */
function YachtGLB() {
  const gltf = useGLTF("/models/super-yacht.glb") as any;
  return <primitive object={gltf.scene} scale={0.7} castShadow receiveShadow />;
}
useGLTF.preload("/models/super-yacht.glb");

/* ========= YachtRig: κίνηση σκάφους ========= */

type YachtRigProps = {
  days: DayCard[];
  dayIndex: number;
  phase: "sail" | "stop" | "done";
  onArrive: () => void;
  onFinish: () => void;
};

function YachtRig({
  days,
  dayIndex,
  phase,
  onArrive,
  onFinish,
}: YachtRigProps) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const tRef = useRef(0);
  const [startZ, setStartZ] = useState(20);
  const [endZ, setEndZ] = useState(12);
  const arrivedRef = useRef(false);

  useEffect(() => {
    if (!group.current) return;
    const zStart = group.current.position.z || 20;
    const zEnd = zStart - 8;
    setStartZ(zStart);
    setEndZ(zEnd);
    tRef.current = 0;
    arrivedRef.current = false;
  }, [dayIndex]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;

    const t = clock.getElapsedTime();
    g.position.y = 0.25 + Math.sin(t * 1.8) * 0.05; // bobbing

    if (phase === "sail") {
      const h = days[dayIndex]?.leg?.hours ?? 1;
      const duration = Math.max(2.5, Math.min(6, h * 0.8));
      tRef.current = Math.min(1, tRef.current + delta / duration);

      const p = easeInOut(tRef.current);
      const z = THREE.MathUtils.lerp(startZ, endZ, p);
      g.position.z = z;

      // camera follow από πίσω
      camera.position.lerp(new THREE.Vector3(0, 4, z + 10), 0.08);
      camera.lookAt(g.position.x, g.position.y + 0.6, g.position.z);

      if (tRef.current >= 1 && !arrivedRef.current) {
        arrivedRef.current = true;
        if (dayIndex < days.length - 1) onArrive();
        else onFinish();
      }
    } else if (phase === "stop") {
      camera.position.lerp(new THREE.Vector3(0, 4, g.position.z + 10), 0.08);
      camera.lookAt(g.position.x, g.position.y + 0.6, g.position.z);
    } else if (phase === "done") {
      camera.position.lerp(new THREE.Vector3(0, 15, g.position.z + 40), 0.04);
      camera.lookAt(g.position.x, g.position.y, g.position.z);
    }
  });

  return (
    <group ref={group} position={[0, 0, 20]}>
      <YachtGLB />
    </group>
  );
}

/* ========= ScenePlayer (UI + 3D) ========= */

function ScenePlayer({ data }: { data: Payload }) {
  const [dayIndex, setDayIndex] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("sail");

  const days: DayCard[] = useMemo(() => {
    if (data.dayCards?.length) return data.dayCards;
    return [
      {
        day: 1,
        date: "Day 1",
        leg: { from: "Alimos", to: "Hydra", nm: 37, hours: 2.2, fuelL: 320 },
        notes: "Demo: Alimos → Hydra",
      },
      {
        day: 2,
        date: "Day 2",
        leg: { from: "Hydra", to: "Spetses", nm: 20, hours: 1.2, fuelL: 160 },
        notes: "Demo: Hydra → Spetses",
      },
    ];
  }, [data]);

  const totals = useMemo(() => {
    const nm = days.reduce((a, d) => a + (d.leg?.nm ?? 0), 0);
    const hr = days.reduce((a, d) => a + (d.leg?.hours ?? 0), 0);
    const fuel = days.reduce((a, d) => a + (d.leg?.fuelL ?? 0), 0);
    return { nm, hr, fuel };
  }, [days]);

  const title =
    data.tripTitle ??
    (days[0]?.leg
      ? `${days[0].leg.from} → ${
          days[days.length - 1]?.leg?.to ?? days[0].leg.to
        }`
      : "VIP Final Itinerary");

  const current = days[dayIndex];

  return (
    <div className="relative w-full">
      {/* SUMMARY CARD */}
      <div className="flex justify-center mb-4">
        <div className="max-w-4xl w-full bg-white/95 border rounded-2xl shadow px-6 py-4">
          <div className="text-xs uppercase text-gray-500">
            Final Itinerary
          </div>
          <div className="text-lg font-semibold mt-1">{title}</div>
          <div className="mt-3 grid grid-cols-3 text-sm text-center">
            <div>
              <div className="text-xs text-gray-500">Total NM</div>
              <div className="font-semibold">{totals.nm.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Hours</div>
              <div className="font-semibold">{totals.hr.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Fuel (L)</div>
              <div className="font-semibold">{totals.fuel.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D + overlay */}
      <div className="relative w-full h-[540px] rounded-2xl border overflow-hidden">
        {/* Day card πάνω από 3D */}
        {phase !== "done" && current && (
          <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2 z-10 bg-white/95 rounded-2xl shadow-lg border px-5 py-4 w-[92%] max-w-md">
            <div className="text-xs uppercase text-gray-500">
              VIP Day {current.day}
            </div>
            <div className="text-xl font-semibold mt-1">
              {current.leg
                ? `${current.leg.from} → ${current.leg.to}`
                : current.title ?? "Cruising"}
            </div>
            <div className="mt-2 text-sm text-gray-700">
              📅 {current.date ?? "-"}
              {current.leg && (
                <>
                  <br />
                  NM: {(current.leg.nm ?? 0).toFixed(1)} • Time:{" "}
                  {formatHM(current.leg.hours)} • Fuel:{" "}
                  {(current.leg.fuelL ?? 0).toFixed(0)} L
                </>
              )}
            </div>
            {current.notes && (
              <div className="mt-2 text-sm whitespace-pre-wrap">
                📝 {current.notes}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 bg-black text-white rounded-xl text-sm"
                onClick={() => {
                  if (dayIndex < days.length - 1) {
                    setPhase("sail");
                    setDayIndex((d) => d + 1);
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

        {/* Canvas */}
        <Canvas shadows camera={{ position: [0, 4, 14], fov: 45 }}>
          <color attach="background" args={["#020617"]} />
          <ambientLight intensity={0.45} />
          <directionalLight
            castShadow
            intensity={1.4}
            color="#f97316"
            position={[10, 12, -6]}
          />
          <Sky sunPosition={[10, 12, -6]} turbidity={7} />
          <Environment preset="sunset" />

          {/* 3D θάλασσα από GLB */}
          <Suspense fallback={null}>
            <OceanGLB />
          </Suspense>

          {/* Yacht + rig */}
          <Suspense fallback={null}>
            <YachtRig
              days={days}
              dayIndex={dayIndex}
              phase={phase}
              onArrive={() => setPhase("stop")}
              onFinish={() => setPhase("done")}
            />
          </Suspense>
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
      if (decoded?.stops?.length) {
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
      } catch {
        // ignore
      }
    }

    // fallback demo
    setPayload({
      dayCards: [],
      tripTitle: "VIP Final Itinerary",
    });
  }, []);

  if (!payload) return null;

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
        Final Itinerary (3D Yacht – GLB)
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        3D GLB yacht πάνω σε ocean GLB • κάρτες ανά ημέρα • συνολικό summary
      </p>
      <ScenePlayer data={payload} />
    </main>
  );
}
