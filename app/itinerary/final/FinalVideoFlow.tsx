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

type VideoId = "v1" | "v2" | "v3" | "v4" | "v5";

type Props = {
  days: DayCard[];      // όλες οι μέρες από VIP Guests (τελευταία = άφιξη μαρίνα)
  video1Url: string;    // v1: Μαρίνα → ανοιχτά
  video2Url: string;    // v2: Ανοιχτά → νησί
  video3Url: string;    // v3: Νησί → ανοιχτά
  video4Url: string;    // v4: Ανοιχτά → μαρίνα
  video5Url: string;    // v5: Zoom-out μαρίνα
};

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
  // mode ελέγχει αν παίζει video / κάρτα κλπ
  const [mode, setMode] = useState<"idle" | "video" | "card" | "summaryCard">(
    "idle"
  );
  const [activeDay, setActiveDay] = useState(0); // index 0..N-1

  // ποιο video παίζει τώρα
  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);
  // ουρά επόμενων videos που θα παίξουν
  const [queue, setQueue] = useState<VideoId[]>([]);
  // τι θα γίνει όταν τελειώσουν ΟΛΑ τα videos της ουράς
  const [nextStep, setNextStep] = useState<"card" | "summaryCard" | null>(null);
  // ποια ημέρα θα δείξει μετά τα videos (για card)
  const [nextDayIndex, setNextDayIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isLastDay = activeDay === days.length - 1;
  const isPenultimateDay = activeDay === days.length - 2;
  const currentDay = days[activeDay];

  /* ========= Map VideoId -> URL ========= */
  const videoSrc: string | undefined =
    currentVideo === "v1"
      ? video1Url
      : currentVideo === "v2"
      ? video2Url
      : currentVideo === "v3"
      ? video3Url
      : currentVideo === "v4"
      ? video4Url
      : currentVideo === "v5"
      ? video5Url
      : undefined;

  /* ========= Auto-play όταν αλλάζει currentVideo ========= */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (mode === "video" && currentVideo && videoSrc) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el?.pause();
    }
  }, [currentVideo, mode, videoSrc]);

  /* ========= Helper για να ξεκινήσει ένα sequence videos ========= */
  function startVideoSequence(
    vids: VideoId[],
    after: "card" | "summaryCard",
    dayIndex: number
  ) {
    if (!vids.length) return;
    setQueue(vids);
    setCurrentVideo(vids[0]);
    setNextStep(after);
    setNextDayIndex(dayIndex);
    setMode("video");
  }

  /* ========= Start Journey button ========= */
  function handleStartJourney() {
    if (!days.length) return;
    // Day 0, στην αρχή:
    // 1) Μαρίνα → ανοιχτά
    // 2) Ανοιχτά → νησί
    // μετά → Card Day1
    setActiveDay(0);
    startVideoSequence(["v1", "v2"], "card", 0);
  }

  /* ========= Όταν τελειώνει ένα video ========= */
  function handleVideoEnded() {
    setQueue((prevQueue) => {
      if (prevQueue.length <= 1) {
        // Μόλις τελείωσε το ΤΕΛΕΥΤΑΙΟ video αυτού του sequence
        setCurrentVideo(null);

        if (nextStep === "card") {
          setActiveDay(nextDayIndex);
          setMode("card");
        } else if (nextStep === "summaryCard") {
          setMode("summaryCard");
        } else {
          setMode("idle");
        }

        return [];
      } else {
        // Υπάρχουν κι άλλα videos στη σειρά → πάμε στο επόμενο
        const newQueue = prevQueue.slice(1);
        setCurrentVideo(newQueue[0]);
        return newQueue;
      }
    });
  }

  /* ========= Κουμπί Continue / Summary από Day Card ========= */
  function handleDayCardButton() {
    if (isLastDay) {
      // Τελευταία μέρα → παίζει ΜΟΝΟ v5 (zoom-out) → summaryCard
      startVideoSequence(["v5"], "summaryCard", activeDay);
      return;
    }

    if (isPenultimateDay) {
      // Προτελευταία μέρα:
      // 3) Νησί→ανοιχτά, μετά 4) ανοιχτά→μαρίνα → μετά Card τελευταίας μέρας
      startVideoSequence(["v3", "v4"], "card", activeDay + 1);
      return;
    }

    // Ενδιάμεσες μέρες:
    // 3) Νησί→ανοιχτά, 2) ανοιχτά→επόμενο νησί → μετά Card Day+1
    startVideoSequence(["v3", "v2"], "card", activeDay + 1);
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
          Press <b>Start the journey</b> to watch your yacht leaving the marina
          and follow each day of your itinerary.
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
              NM: {(leg.nm ?? 0).toFixed(1)} • Time: {formatHM(leg.hours)} •
              Fuel: {(leg.fuelL ?? 0).toFixed(0)} L
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
          {mode === "idle" && <div className="mt-6">{renderStartOverlay()}</div>}
          {mode === "card" && <div className="mt-6">{renderDayCard()}</div>}
          {mode === "summaryCard" && (
            <div className="mt-6 flex justify-center w-full">
              {renderSummaryCard()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
