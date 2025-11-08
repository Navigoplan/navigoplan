"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // δεν θέλουμε submit συμπεριφορά αν ποτέ βρεθεί μέσα σε <form>
    e.preventDefault();

    const payload = {
      dayCards,
      yacht,
      tripTitle: tripTitle || "VIP Final Itinerary",
      createdAt: Date.now(),
      version: 1,
    };

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("navigoplan.finalItinerary", JSON.stringify(payload));
      }
      // 1η απόπειρα: Next router
      router.push("/itinerary/final");
    } catch (err) {
      console.error("GenerateFinalItinerary: push failed, falling back to hard navigation.", err);
      // Fallback: “σκληρή” πλοήγηση για να ανοίξει οπωσδήποτε
      if (typeof window !== "undefined") window.location.href = "/itinerary/final";
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold py-3 shadow-lg hover:shadow-xl active:scale-[0.99] transition-all"
        aria-label="Generate Final Itinerary"
      >
        Generate Final Itinerary
      </button>

      {/* Link fallback (αν για κάποιο λόγο το onClick εμποδίζεται, μπορείς να πατήσεις κι εδώ) */}
      <div className="mt-2 text-center">
        <Link
          href="/itinerary/final"
          className="text-xs underline text-slate-600 hover:text-slate-900"
          onClick={() => {
            try {
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  "navigoplan.finalItinerary",
                  JSON.stringify({
                    dayCards,
                    yacht,
                    tripTitle: tripTitle || "VIP Final Itinerary",
                    createdAt: Date.now(),
                    version: 1,
                  })
                );
              }
            } catch {}
          }}
        >
          Open /itinerary/final directly
        </Link>
      </div>
    </div>
  );
}
