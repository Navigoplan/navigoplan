"use client";

import React, { useEffect, useRef, useState } from "react";

/* ========= Types ========= */
type Leg = {
  from: string;
  to: string;
  nm?: number;
  hours?: number;
  fuelL?: number;
};

export type DayCard = {
  day: number;
  date?: string;
  leg?: Leg;
  notes?: string;
};

type Step =
  | "idle"          // Start the journey
  | "video1"        // Μαρίνα → ανοιχτά (μόνο στην αρχή)
  | "video2"        // Ανοιχτά → νησί
  | "video3"        // Νησί → ανοιχτά
  | "video4"        // Ανοιχτά → μαρίνα (μόνο στο τέλος)
  | "video5"        // Zoom-out μαρίνα
  | "dayCard"       // κάρτα τρέχουσας ημέρας
  | "summaryCard";  // τελικό full itinerary

type Props = {
  days: DayCard[];      // όλες οι μέρες από VIP Guests (τελευταία = άφιξη μαρίνα)
  video1Url: string;    // 1) Μαρίνα → ανοιχτά
  video2Url: string;    // 2) Ανοιχτά → νησί
  video3Url: string;    // 3) Νησί → ανοιχτά
  video4Url: string;    // 4) Ανοιχτά → μαρίνα
  video5Url: string;    // 5) Zoom-out μαρίνα
};

/* ========= Helpers ========= */
function formatHM(h?: number) {
  const v = h ?? 0;
  const H = Math.floor(v);
  const M = Math.round((v - H) * 60);
  return `${H}h ${M}m`;
}

/* ========= Main component ========= */
export function FinalVideoFlow({
  days,
  video1Url,
  video2Url,
  video3Url,
  video4Url,
  video5Url,
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [activeDay, setActiveDay] = useState(0); // index 0..N-1
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isLastDay = activeDay === days.length - 1;
  const isPenultimateDay = activeDay === days.length - 2;
  const currentDay = days[activeDay];

  /* ========= Επιλογή video src ανά step ========= */
  let videoSrc: string | undefined;
  if (step === "video1") videoSrc = video1Url;
  else if (step === "video2") videoSrc = video2Url;
  else if (step === "video3") videoSrc = video3Url;
  else if (step === "video4") videoSrc = video4Url;
  else if (step === "video5") videoSrc = video5Url;
  else videoSrc = undefined;

  const isVideoStep =
    step === "video1" ||
    step === "video2" ||
    step === "video3" ||
    step === "video4" ||
    step === "video5";

  /* ========= Auto play on step change ========= */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isVideoStep && videoSrc) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      // στις κάρτες/idle/summary, αφήνουμε το τελευταίο frame
      el?.pause();
    }
  }, [step, videoSrc, isVideoStep]);

  /* ========= HANDLERS ========= */

  function handleStartJourney() {
    if (!days.length) return;
    setActiveDay(0);
    // 1) Μαρίνα → ανοιχτά
    setStep("video1");
  }

  function handleVideoEnded() {
    // περιγραφή flow:

    /*
     * ΣΤΗΝ ΑΡΧΗ:
     *  video1 (μαρίνα→ανοιχτά) => video2 (ανοιχτά→νησί) => κάρτα Day 1
     *
     * ΓΙΑ ΕΝΔΙΑΜΕΣΕΣ ΜΕΡΕΣ (όχι προτελευταία/τελευταία):
     *  Κάρτα Day i (Continue) => video3 (νησί→ανοιχτά) => video2 (ανοιχτά→επόμενο νησί) => Κάρτα Day i+1
     *
     * ΠΡΟΤΕΛΕΥΤΑΙΑ ΜΕΡΑ:
     *  Κάρτα Day N-1 (Continue) => video3 (νησί→ανοιχτά) => video4 (ανοιχτά→μαρίνα) => Κάρτα Day N
     *
     * ΤΕΛΕΥΤΑΙΑ ΜΕΡΑ:
     *  Κάρτα Day N (Summary) => video5 (zoom-out μαρίνα) => SummaryCard
     */

    if (step === "video1") {
      // μόλις φύγουμε από τη μαρίνα → ανοίγουμε 2) για Day1
      setStep("video2");
    } else if (step === "video2") {
      // όταν τελειώνει 2) ΠΑΝΤΑ ανοίγουμε κάρτα της τρέχουσας ημέρας
      setStep("dayCard");
    } else if (step === "video3") {
      // 3) τελείωσε:
      if (isPenultimateDay) {
        // αν είμαστε προτελευταία μέρα: μετά το 3) παίζει 4) (άφιξη μαρίνα)
        setStep("video4");
      } else {
        // αν είμαστε σε ενδιάμεση μέρα: μετά το 3) παίζει 2) για επόμενο νησί
        // & όταν τελειώσει, θα αυξηθεί activeDay (+1) στην κάρτα
        // (θα το κάνουμε εδώ)
        setActiveDay((prev) => Math.min(prev + 1, days.length - 1));
        setStep("video2");
      }
    } else if (step === "video4") {
      // άφιξη μαρίνα → κάρτα τελευταίας μέρας
      setActiveDay(days.length - 1);
      setStep("dayCard");
    } else if (step === "video5") {
      // zoom out → τελικό summary
      setStep("summaryCard");
    }
  }

  function handleDayCardButton() {
    if (isLastDay) {
      // τελευταία ημέρα → Summary: παίζει 5) (zoom-out) και μετά summaryCard
      setStep("video5");
      return;
    }

    if (isPenultimateDay) {
      // προτελευταία ημέρα:
      // Continue → Video3 (φεύγει από νησί) → Video4 (δέσιμο μαρίνα) → Κάρτα τελευταίας ημέρας
      setStep("video3");
      return;
    }

    // ενδιάμεσες ημέρες:
    // Continue → Video3 (φεύγει από τωρινό νησί) → Video2 (φτάνει στο επόμενο νησί) → Κάρτα Day+1
    setStep("video3");
  }

  /* ========= RENDER HELPERS ========= */

  function renderStartOverlay() {
    return (
      <div className="pointer-events-auto max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-5 py-4 text-center">
        <div className="text-xs uppercase text-gray-500">
          Navigoplan • Virtual Journey
        </div>
        <div className="mt-2 text-xl font-semibold">
          Start your Aegean journey
        </div>
        <p className="mt-2 text-sm text-gray-700">
          Press <b>Start the journey</b> to watch your yacht departing from the
          marina and follow your itinerary, day by day.
        </p>
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleStartJourney}
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/85"
          >
            Start the journey
          </button>
        </div>
      </div>
    );
  }

  function renderDayCard() {
    if (!currentDay) return null;
    const { day, date, leg, notes } = currentDay;

    return (
      <div className="pointer-events-auto max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-5 py-4">
        <div className="text-xs uppercase text-gray-500">
          VIP Day {day}
        </div>
        <div className="text-xl font-semibold mt-1">
          {leg ? `${leg.from} → ${leg.to}` : "Leisure Day"}
        </div>
        <div className="mt-2 text-sm text-gray-700">
          {date && (
            <>
              📅 {date}
              <br />
            </>
          )}
          {leg && (
            <>
              NM: {(leg.nm ?? 0).toFixed(1)} • Time: {formatHM(leg.hours)} • Fuel:{" "}
              {(leg.fuelL ?? 0).toFixed(0)} L
            </>
          )}
        </div>
        {notes && (
          <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
            📝 {notes}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleDayCardButton}
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/85"
          >
            {isLastDay ? "Summary" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  function renderSummaryCard() {
    return (
      <div className="max-w-3xl w-[92vw] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-6 py-5">
        <div className="text-xs uppercase text-gray-500">
          Final VIP Itinerary
        </div>
        <div className="text-xl font-semibold mt-1 mb-3">
          {days[0]?.leg
            ? `${days[0].leg!.from} → ${
                days[days.length - 1]?.leg?.to ?? days[0].leg!.to
              }`
            : "Custom Cruise"}
        </div>
        <div className="space-y-2 text-sm text-gray-800 max-h-[380px] overflow-auto">
          {days.map((d) => (
            <div
              key={d.day}
              className="rounded-lg border border-gray-200 px-3 py-2"
            >
              <div className="font-semibold text-gray-900">
                Day {d.day}{" "}
                {d.leg ? `– ${d.leg.from} → ${d.leg.to}` : "– Leisure"}
              </div>
              <div className="text-xs text-gray-500">
                {d.date && <>📅 {d.date}</>}
              </div>
              {d.leg && (
                <div className="text-xs mt-1">
                  NM: {(d.leg.nm ?? 0).toFixed(1)} • Time:{" "}
                  {formatHM(d.leg.hours)} • Fuel:{" "}
                  {(d.leg.fuelL ?? 0).toFixed(0)} L
                </div>
              )}
              {d.notes && (
                <div className="mt-1 text-xs whitespace-pre-wrap">
                  📝 {d.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-black">
        {/* VIDEO */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-auto"
            playsInline
            onEnded={handleVideoEnded}
          />
        )}

        {/* OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {step === "idle" && <div className="mt-6">{renderStartOverlay()}</div>}

          {step === "dayCard" && (
            <div className="mt-6">{renderDayCard()}</div>
          )}

          {step === "summaryCard" && (
            <div className="mt-6 flex justify-center w-full">
              {renderSummaryCard()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
