"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, useTexture } from "@react-three/drei";
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
      : undefined
  }));
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ========= 3D components ========= */

function Water() {
  const [n1, n2] = useTexture([
    "/textures/water-normal-1.jpg",
    "/textures/water-normal-2.jpg",
  ]) as [THREE.Texture, THREE.Texture];

  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useMemo(() => {
    [n1, n2].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 8);
    });
  }, [n1, n2]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speed = 0.04;
    n1.offset.x = (t * speed) % 1;
    n1.offset.y = (t * speed * 0.6) % 1;
    n2.offset.x = (t * speed * 0.7) % 1;
    n2.offset.y = (t * speed * 0.4) % 1;

    if (matRef.current) {
      const base = 0.4 + Math.sin(t * 0.35) * 0.03;
      matRef.current.color.setHSL(0.55, 0.6, base); // μπλε-πράσινο με ζεστή απόχρωση
      matRef.current.roughness = 0.85;
      matRef.current.metalness = 0.18;
    }
  });

  const onBeforeCompile = (shader: THREE.Shader) => {
    shader.uniforms.uNormal2 = { value: n2 };
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `
      #ifdef USE_NORMALMAP
        vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
      #else
        vec3 mapN = vec3(0.0,0.0,1.0);
      #endif

      vec3 mapN2 = texture2D( uNormal2, vUv * 1.3 ).xyz * 2.0 - 1.0;
      mapN2.xy *= normalScale * 0.7;

      vec3 blended = normalize(mix(mapN, mapN2, 0.55));
      normal = normalize( tbn * blended );
      `
    );
    shader.uniforms.normalMap.value = n1;
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[500, 500, 64, 64]} />
      <meshStandardMaterial
        ref={matRef}
        color="#145b8a"
        roughness={0.85}
        metalness={0.18}
        normalMap={n1}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  );
}

function Islands() {
  return (
    <group position={[0, 0, -60]}>
      <mesh position={[-22, 0, 15]} rotation={[-Math.PI / 2, 0.1, 0]} receiveShadow>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial color="#111827" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[24, 0, 0]} rotation={[-Math.PI / 2, -0.1, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color="#020617" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function SunSphere() {
  return (
    <mesh position={[0, 18, -80]}>
      <sphereGeometry args={[3.5, 32, 32]} />
      <meshBasicMaterial color="#f97316" />
    </mesh>
  );
}

function YachtModel() {
  return (
    <group>
      {/* hull */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.6, 2.4, 32]} />
        <meshStandardMaterial color="#fefefe" metalness={0.3} roughness={0.3} />
      </mesh>
      {/* main deck */}
      <mesh castShadow position={[0, 0.8, -0.05]}>
        <boxGeometry args={[1.0, 0.32, 1.6]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
      </mesh>
      {/* upper deck / bridge */}
      <mesh castShadow position={[0, 1.2, 0.15]}>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color="#d1d5db" />
      </mesh>
      {/* mast */}
      <mesh castShadow position={[0, 1.7, 0.18]}>
        <cylinderGeometry args={[0.035, 0.035, 0.8, 16]} />
        <meshStandardMaterial color="#f9fafb" />
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
    const dist = zoomOut ? 22 : 10;
    const height = zoomOut ? 7.5 : 4;
    const desired = obj.position.clone().addScaledVector(dir, -dist);
    desired.y += height;
    camera.position.lerp(desired, 0.08);
    camera.lookAt(obj.position.x, obj.position.y + 0.6, obj.position.z - 1.5);
  });
  return null;
}

/* ========= YachtMover ========= */

type YachtMoverProps = {
  yachtRef: React.MutableRefObject<THREE.Object3D | null>;
  pathPoints: THREE.Vector3[];
  days: DayCard[];
  idx: number;
  phase: "sail" | "stop" | "done";
  setPhase: React.Dispatch<React.SetStateAction<"sail" | "stop" | "done">>;
  setIdx: React.Dispatch<React.SetStateAction<number>>;
  setZoomOut: React.Dispatch<React.SetStateAction<boolean>>;
};

function YachtMover({
  yachtRef,
  pathPoints,
  days,
  idx,
  phase,
  setPhase,
  setIdx,
  setZoomOut,
}: YachtMoverProps) {
  const progressRef = useRef(0);
  const durationRef = useRef(3.5); // δευτερόλεπτα πλεύσης ανά μέρα

  useEffect(() => {
    if (phase === "sail") {
      const h = days[idx]?.leg?.hours ?? 1;
      const base = 3; // ελάχιστο 3s για να προλάβουν να δουν το ταξίδι
      const extra = Math.min(5, (h || 1) * 1.2);
      durationRef.current = base + extra * 0.7;
      progressRef.current = 0;
    }
  }, [phase, idx, days]);

  useFrame(() => {
    const yacht = yachtRef.current;
    if (!yacht) return;

    // πάντα λίγο bobbing
    yacht.position.y = 0.2 + Math.sin(Date.now() * 0.002) * 0.06;

    if (phase === "sail") {
      const N = pathPoints.length - 1;
      const s = Math.min(idx, N - 1);
      const e = Math.min(idx + 1, N);
      const start = pathPoints[s];
      const end = pathPoints[e];

      progressRef.current = Math.min(
        1,
        progressRef.current + 1 / (60 * durationRef.current)
      );
      const tt = easeInOut(progressRef.current);

      const pos = start.clone().lerp(end, tt);
      yacht.position.lerp(pos, 0.25);

      const dir = new THREE.Vector3().subVectors(end, start).normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );
      yacht.quaternion.slerp(targetQuat, 0.12);

      if (progressRef.current >= 1) {
        if (idx < days.length - 1) {
          setIdx((i) => i + 1);
          setPhase("stop");
        } else {
          setPhase("done");
          setZoomOut(true);
        }
      }
    } else {
      const p = pathPoints[Math.min(idx, pathPoints.length - 1)];
      yacht.position.lerp(p.clone().setY(yacht.position.y), 0.12);
    }
  });

  return null;
}

/* ========= Main 3D Scene ========= */

function ScenePlayer({ data }: { data: Payload }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"sail" | "stop" | "done">("sail"); // ξεκινάει να πλέει
  const [zoomOut, setZoomOut] = useState(false);

  const days: DayCard[] = useMemo(
    () =>
      data.dayCards?.length ? data.dayCards : [
        { day: 1, date: "Day 1", leg: { from: "Alimos", to: "Hydra", nm: 37, hours: 2.2, fuelL: 320 }, notes: "Demo route Alimos → Hydra" },
        { day: 2, date: "Day 2", leg: { from: "Hydra", to: "Spetses", nm: 20, hours: 1.2, fuelL: 160 }, notes: "Demo route Hydra → Spetses" },
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

  const pathPoints = useMemo(() => {
    const N = Math.max(days.length, 2);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const t = N === 1 ? 0 : i / (N - 1);
      const z = THREE.MathUtils.lerp(18, -22, t);
      const x = Math.sin(t * Math.PI * 0.7) * 7; // απαλή καμπυλωτή πορεία
      pts.push(new THREE.Vector3(x, 0, z));
    }
    return pts;
  }, [days.length]);

  const yachtRef = useRef<THREE.Object3D>(null);

  return (
    <div className="relative w-full">
      {/* Overlay UI */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
        {/* κάρτα για την τρέχουσα μέρα όταν έχει σταματήσει */}
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
                <div className="mt-3 whitespace-pre-wrap">📝 {days[idx].notes}</div>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-xl px-4 py-2 bg-black text-white font-medium shadow hover:shadow-lg"
                onClick={() => {
                  if (idx < days.length - 1) {
                    setPhase("sail");
                  } else {
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

        {/* Summary στο τέλος */}
        {phase === "done" && (
          <div className="pointer-events-auto max-w-3xl w-[96vw] rounded-2xl bg-white/95 backdrop-blur border border-white/60 shadow-xl p-6">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Final Itinerary
            </div>
            <div className="text-3xl font-semibold mt-1">{title}</div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total NM</div>
                <div className="font-semibold text-lg">{totals.nm.toFixed(1)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total Hours</div>
                <div className="font-semibold text-lg">{totals.hr.toFixed(1)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Total Fuel (L)</div>
                <div className="font-semibold text-lg">{totals.fuel.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D καμβάς */}
      <Canvas
        shadows
        camera={{ position: [0, 4, 10], fov: 45 }}
        className="aspect-[16/9] w-full rounded-2xl border border-slate-200 bg-black"
      >
        {/* Sunset lighting */}
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          intensity={1.35}
          color={"#f97316"}
          position={[10, 14, -6]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight intensity={0.35} color={"#60a5fa"} position={[-8, 6, 10]} />

        <Sky
          sunPosition={[10, 12, -6]}
          turbidity={8}
          rayleigh={3}
          mieCoefficient={0.02}
          mieDirectionalG={0.95}
          azimuth={0.3}
        />
        <Environment preset="sunset" />

        <Water />
        <Islands />
        <SunSphere />

        <group ref={yachtRef} position={[0, 0, 18]}>
          <YachtModel />
        </group>

        <YachtMover
          yachtRef={yachtRef}
          pathPoints={pathPoints}
          days={days}
          idx={idx}
          phase={phase}
          setPhase={setPhase}
          setIdx={setIdx}
          setZoomOut={setZoomOut}
        />

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
        setPayload({
          dayCards,
          tripTitle: decoded.title || "VIP Final Itinerary",
        });
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

    setPayload({
      dayCards: [],
      tripTitle: "VIP Final Itinerary",
    });
  }, []);

  if (!payload) return null;

  return (
    <main className="p-4 sm:p-8">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">Final Itinerary (3D Yacht)</h1>
        <p className="text-sm text-gray-500">
          Cinematic 3D yacht σε ηλιοβασίλεμα • κάρτες ανά ημέρα • zoom-out στο τέλος
        </p>
      </div>
      <ScenePlayer data={payload} />
    </main>
  );
}
