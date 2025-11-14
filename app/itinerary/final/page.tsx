"use client";

import React, { useEffect, useState } from "react";
import { FinalVideoFlow, DayCard as VideoDayCard } from "./FinalVideoFlow";

type YachtType = "Motor" | "Sailing";

type LegFull = {
  from: string;
  to: string;
  nm?: number;
  hours?: number;
  fuelL?: number;
};

type DayCardFull = {
  day: number;
  date?: string;
  leg?: LegFull;
  notes?: string;
};

type StoredPayload = {
  dayCards: DayCardFull[];
  yacht?: { type: YachtType; speed: number; lph: number };
  tripTitle?: string;
};

const STORAGE_KEY = "navigoplan.finalItinerary";

export default function FinalItineraryPage() {
  const [days, setDays] = useState<VideoDayCard[] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredPayload;

      const mapped: VideoDayCard[] = (parsed.dayCards || []).map((d) => ({
        day: d.day,
        date: d.date,
        leg: d.leg
          ? {
              from: d.leg.from,
              to: d.leg.to,
              nm: d.leg.nm,
              hours: d.leg.hours,
              fuelL: d.leg.fuelL,
            }
          : undefined,
        notes: d.notes,
      }));

      setDays(mapped);
    } catch (e) {
      console.error("Failed to load itinerary from sessionStorage:", e);
    }
  }, []);

  if (!days || days.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
          Final Journey
        </h1>
        <p className="text-sm text-gray-600">
          No itinerary data found. Please generate an itinerary from the AI
          Planner (VIP Guests) first.
        </p>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
        Final Journey – Cinematic Itinerary
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Watch your yacht depart the marina, visit each island day by day, and
        return, then view your full VIP itinerary.
      </p>

      <FinalVideoFlow
        days={days}
        video1Url="/videos/01_depart_marina.mp4"
        video2Url="/videos/02_open_to_island.mp4"
        video3Url="/videos/03_leave_island.mp4"
        video4Url="/videos/04_open_to_marina.mp4"
        video5Url="/videos/05_marina_zoom_out.mp4"
      />
    </main>
  );
}
