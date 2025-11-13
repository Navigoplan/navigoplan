"use client";

import type React from "react";

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
  port?: string;
  notes?: string;
  activities?: string[];
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
  pos: [number, number];
  day: number;
  info: DayInfo;
};

type FinalData = { title?: string; stops: Stop[] };

/* ===== Unicode-safe Base64 helpers ===== */
function safeBtoa(obj: unknown) {
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)));
}

export default function GenerateFinalItineraryButton({
  dayCards,
  yacht,
  tripTitle,
  disabled,
  label = "Generate Final Itinerary",
}: {
  dayCards: DayCard[];
  yacht?: { type: YachtType; speed: number; lph: number };
  tripTitle?: string;
  disabled?: boolean;
  label?: string;
}) {
  function buildStopsFromPlan(plan: DayCard[]): Stop[] {
    const N = plan.length;
    const x0 = 12;
    const x1 = 85;
    const yTop = 38;
    const yBottom = 66;
    const wiggle = 6;

    return (plan || []).map((d, i) => {
      const t = N > 1 ? i / (N - 1) : 0.5;
      const x = x0 + (x1 - x0) * t;
      const yBase = i % 2 === 0 ? yBottom : yTop;
      const y = yBase + ((i % 3) - 1) * (wiggle * 0.6);

      const name =
        d.leg?.to ??
        d.port ??
        d.title ??
        (i === 0 ? d.leg?.from ?? "Start" : `Stop ${i + 1}`);

      const info: DayInfo = {
        day: d.day ?? i + 1,
        date: d.date,
        title:
          d.title ??
          (d.leg?.from && d.leg?.to ? `${d.leg.from} → ${d.leg.to}` : name),
        notes: d.notes,
        port: d.port ?? d.leg?.to,
        activities: d.activities,
        eta: d.leg?.eta,
        leg: d.leg
          ? {
              from: d.leg.from,
              to: d.leg.to,
              nm: d.leg.nm,
              hours: d.leg.hours,
              fuelL: d.leg.fuelL,
            }
          : undefined,
      };

      return {
        id: `${i + 1}-${name}`.toLowerCase().replace(/\s+/g, "-"),
        name,
        pos: [x, y],
        day: info.day,
        info,
      };
    });
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    try {
      const plan = Array.isArray(dayCards) ? dayCards : [];
      const stops = buildStopsFromPlan(plan);
      const title = tripTitle || "Final Itinerary";

      if (typeof window !== "undefined") {
        // 1) Σώζω πλήρες plan στο sessionStorage (fallback)
        const payload = {
          dayCards: plan,
          yacht,
          tripTitle: title,
          createdAt: Date.now(),
        };
        sessionStorage.setItem(
          "navigoplan.finalItinerary",
          JSON.stringify(payload)
        );

        // 2) Compact data για το URL της νέας σελίδας
        const data: FinalData = { title, stops };
        const encoded = encodeURIComponent(safeBtoa(data));
        const url = `/itinerary/final?data=${encoded}`;

        // 3) Ανοίγω ΜΟΝΟ νέα καρτέλα (η /ai δεν αλλάζει)
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win) {
          alert(
            "Ο browser μπλόκαρε το νέο παράθυρο.\n" +
              "Επιτρέψτε pop-ups για το navigoplan.com ή αντιγράψτε το link χειροκίνητα."
          );
        }
      }
    } catch (err) {
      console.error("GenerateFinalItineraryButton error:", err);
      alert("Κάτι πήγε στραβά στο άνοιγμα του Final Itinerary. Δοκίμασε ξανά.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-xl px-5 py-3 bg-black text-white hover:bg-black/85 disabled:opacity-40 shadow-md transition"
    >
      {label}
    </button>
  );
}
