"use client";

import { useRouter } from "next/navigation";

/* ======= Types συμβατά με το AI planner σου ======= */
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
  pos: [number, number]; // 0..100 %
  day: number;
  info: DayInfo;
};

type FinalData = {
  title?: string;
  stops: Stop[];
};

export default function GenerateFinalItineraryButton({
  dayCards,
  yacht,
  tripTitle,   // <- camelCase
  triptitle,   // <- παλιό prop, το κρατάμε για συμβατότητα
  disabled,
  label = "Generate Final Itinerary",
}: {
  dayCards: DayCard[];
  yacht: { type: YachtType; speed: number; lph: number };
  tripTitle?: string;
  triptitle?: string;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();

  // Δημιουργεί “εικονικές” θέσεις για το cinematic (όχι πραγματικός χάρτης)
  function buildStopsFromPlan(plan: DayCard[]): Stop[] {
    const N = plan.length;
    const x0 = 12, x1 = 85;               // από αριστερά προς δεξιά
    const yTop = 38, yBottom = 66;        // κυματισμός πάνω/κάτω
    const wiggle = 6;                     // μικρό variance

    return plan.map((d, i) => {
      const t = N > 1 ? i / (N - 1) : 0.5;
      const x = x0 + (x1 - x0) * t;
      const yBase = i % 2 === 0 ? yBottom : yTop;
      const y = yBase + ((i % 3) - 1) * (wiggle * 0.6);

      const name =
        d.leg?.to ??
        d.port ??
        d.title ??
        (i === 0 ? (d.leg?.from ?? "Start") : `Stop ${i + 1}`);

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

  function openFinal() {
    const stops = buildStopsFromPlan(dayCards || []);
    const title = tripTitle ?? triptitle ?? "Final Itinerary";
    const data: FinalData = { title, stops };
    const encoded = btoa(JSON.stringify(data));
    router.push(`/itinerary_final?data=${encodeURIComponent(encoded)}`);
  }

  // Απλό button (χωρίς shadcn) με Tailwind
  return (
    <button
      type="button"
      onClick={openFinal}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-xl px-5 py-3 bg-black text-white hover:bg-black/85 disabled:opacity-40 shadow-md transition"
    >
      {label}
    </button>
  );
}
