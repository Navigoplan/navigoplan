"use client";

import React, { useEffect, useState } from "react";
import { FinalVideoFlow, DayCard as VideoDayCard } from "./FinalVideoFlow";

function safeAtobToJSON<T = unknown>(s: string): T | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

const STORAGE_KEY = "navigoplan.finalItinerary";

export default function FinalItineraryPage() {
  const [days, setDays] = useState<VideoDayCard[] | null>(null);
  const [ready, setReady] = useState(false);
  const [fullPayload, setFullPayload] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const dataParam = sp.get("data");

    if (dataParam) {
      const decoded = safeAtobToJSON<any>(dataParam);
      if (decoded?.stops?.length) {
        const videoDays: VideoDayCard[] = decoded.stops.map((s: any) => ({
          day: s.day,
          date: s.info?.date,
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
          title: s.info?.title,
          activities: s.info?.activities,
          port: s.info?.port,
        }));
        setDays(videoDays);
      }
    }

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setFullPayload(parsed);

        if (!days || days.length === 0) {
          const videoDays: VideoDayCard[] = (parsed.dayCards || []).map((d: any) => ({
            day: d.day,
            date: d.date,
            notes: d.notes,
            leg: d.leg,
            title: d.title,
            activities: d.activities,
            port: d.port,
          }));
          setDays(videoDays);
        }
      } catch (e) {
        console.error("Failed to parse stored itinerary", e);
      }
    }

    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <main className="p-6">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Final Journey</h1>
        <p className="text-sm text-gray-600">Loading your itinerary…</p>
      </main>
    );
  }

  if (!days || days.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Final Journey</h1>
        <p className="text-sm text-gray-600">
          No itinerary data found. Please generate an itinerary from the AI Planner (VIP Guests) first.
        </p>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Final Journey – Cinematic Itinerary</h1>
      <p className="text-sm text-gray-600 mb-4">
        Start the journey, travel between islands, return to berth and reveal the full VIP itinerary.
      </p>

      <FinalVideoFlow
        days={days}
        // ✅ PUBLIC ROOT FILES (must match names in /public)
        video1Url="/berth-to-island.mp4"
        video2Url="/island-to-island.mp4"
        video3Url="/island-to-berth.mp4"
        video4Url="/berth-zoom-out.mp4"
        fullPayload={fullPayload}
      />
    </main>
  );
}
