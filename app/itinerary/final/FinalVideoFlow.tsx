"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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

type VideoId = "v1" | "v2" | "v3" | "v4";

type Props = {
  days: DayCard[];
  // 4 videos
  video1Url: string; // berth-to-island
  video2Url: string; // island-to-island
  video3Url: string; // island-to-berth
  video4Url: string; // berth-zoom-out (final reveal)
  // full guest payload from sessionStorage
  fullPayload?: any | null;
};

function formatHM(h?: number) {
  const v = h ?? 0;
  const H = Math.floor(v);
  const M = Math.round((v - H) * 60);
  return `${H}h ${M}m`;
}

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export function FinalVideoFlow({
  days,
  video1Url,
  video2Url,
  video3Url,
  video4Url,
  fullPayload,
}: Props) {
  const [mode, setMode] = useState<"idle" | "video" | "card" | "finalReveal">("idle");
  const [activeDay, setActiveDay] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);
  const [queue, setQueue] = useState<VideoId[]>([]);
  const [nextStep, setNextStep] = useState<"card" | "finalReveal" | null>(null);
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
      : undefined;

  const isVideoStep = mode === "video" && !!currentVideo && !!videoSrc;

  /* ========= Auto play όταν αλλάζει video ========= */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isVideoStep && videoSrc) {
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isVideoStep, videoSrc, currentVideo, mode]);

  /* ========= Helper: ξεκινά μια σειρά videos ========= */
  function startVideoSequence(vids: VideoId[], after: "card" | "finalReveal", dayIndex: number) {
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
    // ✅ Start -> berth-to-island -> Day1
    startVideoSequence(["v1"], "card", 0);
  }

  /* ========= Video ended ========= */
  function handleVideoEnded() {
    setQueue((prevQueue) => {
      if (prevQueue.length <= 1) {
        setCurrentVideo(null);

        if (nextStep === "card") {
          setActiveDay(nextDayIndex);
          setMode("card");
        } else if (nextStep === "finalReveal") {
          setMode("finalReveal");
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

  /* ========= Continue από κάρτα ημέρας ========= */
  function handleDayCardButton() {
    if (!days.length) return;

    if (isLastDay) {
      // ✅ last day -> berth zoom out -> show full itinerary
      startVideoSequence(["v4"], "finalReveal", activeDay);
      return;
    }

    if (isPenultimateDay) {
      // ✅ penultimate day -> island-to-berth -> show LAST day card
      startVideoSequence(["v3"], "card", activeDay + 1);
      return;
    }

    // ✅ middle days -> island-to-island -> next day card
    startVideoSequence(["v2"], "card", activeDay + 1);
  }

  /* ========= RENDER HELPERS ========= */
  function renderStartOverlay() {
    return (
      <div className="pointer-events-auto max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-5 py-4 text-center">
        <div className="text-xs uppercase text-gray-500">Navigoplan • Virtual Journey</div>
        <div className="mt-2 text-xl font-semibold">Start your journey</div>
        <p className="mt-2 text-sm text-gray-700">
          Press <b>Start the journey</b> to watch your yacht leaving the berth and begin Day 1.
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
        <div className="text-xs uppercase text-gray-500">VIP Day {day}</div>
        <div className="text-xl font-semibold mt-1">{leg ? `${leg.from} → ${leg.to}` : "Leisure Day"}</div>
        <div className="mt-2 text-sm text-gray-700">
          {date && (
            <>
              📅 {formatDate(date)}
              <br />
            </>
          )}
          {leg && (
            <>
              NM: {(leg.nm ?? 0).toFixed(1)} • Time: {formatHM(leg.hours)} • Fuel: {(leg.fuelL ?? 0).toFixed(0)} L
            </>
          )}
        </div>
        {notes && <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">📝 {notes}</div>}
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

  function renderFinalItinerary() {
    const dayCards: any[] = Array.isArray(fullPayload?.dayCards) ? fullPayload!.dayCards : [];
    const tripTitle: string = fullPayload?.tripTitle || "Final VIP Itinerary";

    return (
      <div className="pointer-events-auto w-[92vw] max-w-4xl rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-6 py-5">
        <div className="text-xs uppercase text-gray-500">Final VIP Itinerary</div>
        <div className="text-xl font-semibold mt-1 mb-3">{tripTitle}</div>

        <div className="space-y-2 text-sm text-gray-800 max-h-[420px] overflow-auto">
          {(dayCards.length ? dayCards : days).map((d: any) => (
            <div key={d.day} className="rounded-lg border border-gray-200 px-3 py-2 bg-white">
              <div className="font-semibold text-gray-900">
                Day {d.day} {d.leg ? `– ${d.leg.from} → ${d.leg.to}` : d.title ? `– ${d.title}` : ""}
              </div>
              <div className="text-xs text-gray-500">{d.date ? <>📅 {formatDate(d.date)}</> : null}</div>

              {d.leg && (
                <div className="text-xs mt-1">
                  {d.leg.nm != null && <>NM: {Number(d.leg.nm).toFixed(1)} • </>}
                  {d.leg.hours != null && <>Time: {formatHM(Number(d.leg.hours))} • </>}
                  {d.leg.fuelL != null && <>Fuel: {Number(d.leg.fuelL).toFixed(0)} L</>}
                </div>
              )}

              {d.activities?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.activities.slice(0, 10).map((a: string, i2: number) => (
                    <span key={i2} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                      {a}
                    </span>
                  ))}
                </div>
              ) : null}

              {d.notes && <div className="mt-2 text-xs whitespace-pre-wrap">📝 {d.notes}</div>}
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
            muted
            autoPlay
            onEnded={handleVideoEnded}
          />
        )}

        {/* OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && <div className="mt-6">{renderStartOverlay()}</div>}
          {mode === "card" && <div className="mt-6">{renderDayCard()}</div>}
          {mode === "finalReveal" && (
            <div className="mt-6 flex justify-center w-full">
              {renderFinalItinerary()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
