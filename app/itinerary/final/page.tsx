"use client";

import React, { useEffect, useState } from "react";
import { FinalVideoFlow, DayCard as VideoDayCard } from "./FinalVideoFlow";

/* ========= SAFE DECODE FROM URL ========= */
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
  const [days, setDays] = useState<VideoDayCard[]>([]);
  const [ready, setReady] = useState(false);
  const [fullPayload, setFullPayload] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const dataParam = sp.get("data");

    let resolvedDays: VideoDayCard[] = [];

    // 1️⃣ Από URL (?data=)
    if (dataParam) {
      const decoded = safeAtobToJSON<any>(dataParam);
      if (decoded?.stops?.length) {
        resolvedDays = decoded.stops.map((s: any) => ({
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
              }
            : undefined,
        }));
      }
    }

    // 2️⃣ FULL payload από sessionStorage (guest reveal)
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setFullPayload(parsed);

        if (!resolvedDays.length && parsed?.dayCards?.length) {
          resolvedDays = parsed.dayCards.map((d: any) => ({
            day: d.day,
            date: d.date,
            notes: d.notes,
            leg: d.leg
              ? {
                  from: d.leg.from,
                  to: d.leg.to,
                  nm: d.leg.nm,
                  hours: d.leg.hours,
                  fuelL: d.leg.fuelL,
                }
              : undefined,
          }));
        }
      } catch (e) {
        console.error("FinalItineraryPage parse error:", e);
      }
    }

    setDays(resolvedDays);
    setReady(true);
  }, []);

  /* ---------- Loading ---------- */
  if (!ready) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Final Journey</h1>
        <p className="text-sm text-gray-600">Loading your cinematic itinerary…</p>
      </main>
    );
  }

  /* ---------- No data ---------- */
  if (!days.length) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Final Journey</h1>
        <p className="text-sm text-gray-600">
          No itinerary data found. Please generate an itinerary from the AI Planner (VIP Guests).
        </p>
      </main>
    );
  }

  /* ---------- OK ---------- */
  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
        Final Journey – Cinematic Itinerary
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Start the journey, travel between islands, return to berth and reveal the full VIP itinerary.
      </p>

      <FinalVideoFlow
        days={days}

        /* 🎬 ΤΑ 4 ΤΕΛΙΚΑ VIDEO */
        video1Url="/videos/berth-to-island.mp4"
        video2Url="/videos/island-to-island.mp4"
        video3Url="/videos/island-to-berth.mp4"
        video4Url="/videos/berth-zoom-out.mp4"

        /* VIP reveal */
        fullPayload={fullPayload}
      />
    </main>
  );
}
