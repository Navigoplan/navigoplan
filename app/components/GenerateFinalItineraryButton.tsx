"use client";

import { useRouter } from "next/navigation";
import React from "react";

export type YachtType = "Motor" | "Sailing";
export type Yacht = { type: YachtType; speed: number; lph: number };
export type Leg = {
  from: string;
  to: string;
  nm: number;
  hours: number;
  fuelL: number;
  cost?: number;
  eta?: { dep: string; arr: string; window: string };
};
export type DayCard = { day: number; date: string; leg?: Leg; notes?: string };

export default function GenerateFinalItineraryButton({
  dayCards,
  yacht,
  tripTitle,
}: {
  dayCards: DayCard[];
  yacht?: Yacht;
  tripTitle?: string;
}) {
  const router = useRouter();

  function handleClick() {
    try {
      const payload = {
        dayCards,
        yacht,
        tripTitle: tripTitle || "VIP Final Itinerary",
        createdAt: Date.now(),
        version: 1,
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem("navigoplan.finalItinerary", JSON.stringify(payload));
      }
      router.push("/itinerary/final");
    } catch (e) {
      console.error("Failed to cache final itinerary:", e);
      alert("Couldn't prepare the final itinerary. Please try again.");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold py-3 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all"
      aria-label="Generate Final Itinerary"
    >
      Generate Final Itinerary
    </button>
  );
}
