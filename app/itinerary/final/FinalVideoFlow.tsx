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
  days: DayCard[];
  video1Url: string;
  video2Url: string;
  video3Url: string;
  video4Url: string;
  video5Url: string;
};

function formatHM(h?: number) {
  const v = h ?? 0;
  const H = Math.floor(v);
  const M = Math.round((v - H) * 60);
  return `${H}h ${M}m`;
}

export function FinalVideoFlow({
  days,
  video1Url,
  video2Url,
  video3Url,
  video4Url,
  video5Url,
}: Props) {
  const [mode, setMode] = useState<"idle" | "video" | "card" | "summaryCard">(
    "idle"
  );
  const [activeDay, setActiveDay] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);
  const [queue, setQueue] = useState<VideoId[]>([]);
  const [nextStep, setNextStep] = useState<"card" | "summaryCard" | null>(null);
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

  const isVideoStep =
    mode === "video" &&
    (currentVideo === "v1" ||
      currentVideo === "v2" ||
      currentVideo === "v3" ||
      currentVideo === "v4" ||
      currentVideo === "v5");

  /* ========= Auto play όταν αλλάζει video ========= */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isVideoStep && videoSrc) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el?.pause();
    }
  }, [isVideoStep, videoSrc, currentVideo, mode]);

  /* ========= Helper: ξεκινά μια σειρά videos ========= */
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

  /* ========= Start Journey ========= */
  function handleStartJourney() {
    if (!days.length) return;
    setActiveDay(0);
    // 1) Μαρίνα→ανοιχτά, 2) ανοιχτά→νησί, μετά κάρτα Day1
    startVideoSequence(["v1", "v2"], "card", 0);
  }

  /* ========= Video ended ========= */
  function handleVideoEnded() {
    setQueue((prevQueue) => {
      if (prevQueue.length <= 1) {
        // Τελείωσε το τελευταίο video της σειράς
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
        const newQueue = prevQueue.slice(1);
        setCurrentVideo(newQueue[0]);
        return newQueue;
      }
    });
  }

  /* ========= Continue / Summary από κάρτα ημέρας ========= */
  function handleDayCardButton() {
    if (isLastDay) {
      // τελευταία μέρα → μόνο v5 & μετά summaryCard
      startVideoSequence(["v5"], "summaryCard", activeDay);
      return;
    }

    if (isPenultimateDay) {
      // προτελευταία μέρα:
      // v3 (φεύγει από νησί) → v4 (δέσιμο μαρίνα) → Card τελευταίας μέρας
      startVideoSequence(["v3", "v4"], "card", activeDay + 1);
      return;
    }

    // ενδιάμεσες μέρες:
    // v3 (φεύγει από νησί) → v2 (φτάνει στο επόμενο νησί) → Card Day+1
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
          and follow each day of your VIP itinerary.
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
      <div className="max-w-3xl w-[92vw] rounded-2xl bg白/96 backdrop-blur border border-white/70 shadow-xl px-6 py-5">
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

  /* ========= UI ========= */

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-black min-h-[360px]">
        {/* VIDEO */}
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            playsInline
            onEnded={handleVideoEnded}
          />
        )}

        {/* OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && (
            <div className="mt-6">{renderStartOverlay()}</div>
          )}

          {mode === "card" && (
            <div className="mt-6">{renderDayCard()}</div>
          )}

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
