"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ========= Types ========= */
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

type Stop = {
  id: string;
  name: string;
  day: number;
  info: DayInfo;
  lat?: number;
  lon?: number;
  pos?: [number, number];
};

type FinalData = { title?: string; stops: Stop[] };
type Payload = { dayCards: DayCard[]; tripTitle?: string; stops?: Stop[] };

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

/* ========= Map helpers ========= */

type LatLng = [number, number];

function stopToLatLng(stop: Stop): LatLng | null {
  if (typeof stop.lat === "number" && typeof stop.lon === "number") {
    return [stop.lat, stop.lon];
  }
  if (stop.pos && stop.pos.length === 2) {
    const [x, y] = stop.pos;
    const lon = 19 + (x / 100) * 10;
    const lat = 34 + (y / 100) * 8;
    return [lat, lon];
  }
  return null;
}

function AutoFitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const L = require("leaflet");
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.18));
  }, [map, points]);

  return null;
}

/* ========= Route Map ========= */

function FinalRouteMap({
  stops,
  focusIndex,
}: {
  stops?: Stop[];
  focusIndex: number;
}) {
  const points: LatLng[] = useMemo(() => {
    if (!stops?.length) return [];
    const arr: LatLng[] = [];
    for (const s of stops) {
      const ll = stopToLatLng(s);
      if (ll) arr.push(ll);
    }
    return arr;
  }, [stops]);

  const defaultCenter: LatLng = [37.9, 23.7];
  const shipPoint: LatLng | null = useMemo(() => {
    if (!points.length) return null;
    const idx = Math.min(focusIndex, points.length - 1);
    return points[idx];
  }, [points, focusIndex]);

  if (!points.length) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-200 text-sm">
        No geo data for this itinerary yet.
      </div>
    );
  }

  const completed =
    focusIndex > 0 ? points.slice(0, Math.min(focusIndex + 1, points.length)) : [];

  return (
    <MapContainer
      center={shipPoint ?? defaultCenter}
      zoom={7}
      scrollWheelZoom={false}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Polyline positions={points} pathOptions={{ color: "#38bdf8", weight: 3, opacity: 0.4 }} />

      {completed.length > 1 && (
        <Polyline
          positions={completed}
          pathOptions={{ color: "#f97316", weight: 5, opacity: 0.9 }}
        />
      )}

      {stops?.map((s, i) => {
        const ll = stopToLatLng(s);
        if (!ll) return null;
        const focus = i === Math.min(focusIndex, stops.length - 1);
        return (
          <CircleMarker
            key={s.id}
            center={ll}
            radius={focus ? 9 : 6}
            pathOptions={{
              color: focus ? "#f97316" : "#e5e7eb",
              fillColor: focus ? "#f97316" : "#0f172a",
              fillOpacity: focus ? 0.9 : 0.7,
              weight: focus ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <div className="text-xs">
                <div className="font-semibold">
                  Day {s.day}: {s.name}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      <AutoFitBounds points={points} />
    </MapContainer>
  );
}

/* ========= ScenePlayer ========= */

function ScenePlayer({ data }: { data: Payload }) {
  const [dayIndex, setDayIndex] = useState(0);

  const days = data.dayCards;

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
          <div className="text-xs uppercase text-gray-500">Final Itinerary</div>
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

      {/* MAP */}
      <div className="relative w-full h-[540px] rounded-2xl border overflow-hidden bg-slate-900">
        <FinalRouteMap stops={data.stops} focusIndex={dayIndex} />

        {/* Day card */}
        {current && (
          <div className="pointer-events-auto absolute left-4 top-4 z-10 bg-white/95 rounded-2xl shadow-lg border px-5 py-4 w-[92%] max-w-md">
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
                  if (dayIndex < days.length - 1) setDayIndex((d) => d + 1);
                  else setDayIndex(0);
                }}
              >
                {dayIndex < days.length - 1 ? "Next Day" : "Back to Day 1"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========= PAGE ========= */

export default function FinalItineraryPage() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    const load = () => {
      if (typeof window === "undefined") return;

      const sp = new URLSearchParams(window.location.search);
      const dataParam = sp.get("data");

      if (dataParam) {
        const decoded = safeAtobToJSON<FinalData>(dataParam);
        if (decoded?.stops?.length) {
          setPayload({
            dayCards: buildDayCardsFromStops(decoded.stops),
            tripTitle: decoded.title ?? "VIP Final Itinerary",
            stops: decoded.stops,
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
            stops: j.stops ?? [],
          });
          return;
        } catch {}
      }

      setPayload({
        dayCards: [],
        tripTitle: "VIP Final Itinerary",
        stops: [],
      });
    };

    load();
  }, []);

  if (!payload) return null;

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
        Final Itinerary – Greece Route Map
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Real διαδρομή πάνω στον χάρτη Ελλάδας • κάρτες ανά ημέρα • συνολικό summary
      </p>

      <ScenePlayer data={payload} />
    </main>
  );
}
