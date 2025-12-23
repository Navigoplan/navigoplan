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

type VideoId = "v1" | "v2" | "v3" | "v4";

type Props = {
  days: DayCard[];
  // 4 videos
  video1Url: string; // berth-to-island
  video2Url: string; // island-to-island
  video3Url: string; // island-to-berth
  video4Url: string; // berth-zoom-out (final reveal)
  fullPayload?: any | null; // optional (if you pass it from page.tsx)
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
  fullPayload,
}: Props) {
  const [mode, setMode] = useState<"idle" | "video" | "card" | "finalReveal">("idle");
  const [activeDay, setActiveDay] = useState(0);

  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);
  const [queue, setQueue] = useState<VideoId[]>([]);
  const [nextStep, setNextStep] = useState<"card" | "finalReveal" | null>(null);
  const [nextDayIndex, setNextDayIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

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
      setVideoError(null);

      // IMPORTANT: keep muted for autoplay policies
      el.muted = true;
      (el as any).playsInline = true;
      (el as any).webkitPlaysInline = true;

      try {
        el.pause();
        // Force reload new src
        el.load();
        el.currentTime = 0;

        const p = el.play();
        if (p && typeof (p as any).catch === "function") {
          (p as any).catch((err: any) => {
            setVideoError("Autoplay was blocked. Click on the video once to start playback.");
            // leave it paused, user can click play
            console.warn("Video play blocked:", err);
          });
        }
      } catch (e: any) {
        setVideoError("Video could not start.");
      }
    } else {
      el.pause();
    }
  }, [isVideoStep, videoSrc, currentVideo, mode]);

  /* ========= Helper: start a video sequence ========= */
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
    // Start -> berth-to-island -> Day1
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

  /* ========= Continue from day card ========= */
  function handleDayCardButton() {
    if (!days.length) return;

    if (isLastDay) {
      // last day -> berth zoom out -> reveal
      startVideoSequence(["v4"], "finalReveal", activeDay);
      return;
    }

    if (isPenultimateDay) {
      // penultimate day -> island-to-berth -> last day card
      startVideoSequence(["v3"], "card", activeDay + 1);
      return;
    }

    // middle days -> island-to-island -> next day card
    startVideoSequence(["v2"], "card", activeDay + 1);
  }

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
              📅 {date}
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

  function renderFinalReveal() {
    const dayCards: any[] = Array.isArray(fullPayload?.dayCards) ? fullPayload.dayCards : [];

    return (
      <div className="pointer-events-auto max-w-4xl w-[92vw] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-6 py-5">
        <div className="text-xs uppercase text-gray-500">Final VIP Itinerary</div>
        <div className="text-xl font-semibold mt-1 mb-3">{fullPayload?.tripTitle ?? "Final Itinerary"}</div>

        <div className="space-y-2 text-sm text-gray-800 max-h-[420px] overflow-auto">
          {(dayCards.length ? dayCards : days).map((d: any) => (
            <div key={d.day} className="rounded-lg border border-gray-200 px-3 py-2 bg-white">
              <div className="font-semibold text-gray-900">
                Day {d.day} {d.leg ? `– ${d.leg.from} → ${d.leg.to}` : ""}
              </div>
              {d.date && <div className="text-xs text-gray-500">📅 {d.date}</div>}
              {d.leg && (
                <div className="text-xs mt-1">
                  NM: {(d.leg.nm ?? 0).toFixed(1)} • Time: {formatHM(d.leg.hours)} • Fuel: {(d.leg.fuelL ?? 0).toFixed(0)} L
                </div>
              )}
              {d.notes && <div className="mt-2 text-xs whitespace-pre-wrap">📝 {d.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-black min-h-[360px]">
        {/* VIDEO */}
        {videoSrc && (
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            preload="metadata"
            onEnded={handleVideoEnded}
            onError={() => setVideoError("Video failed to load. Check the file path & deployment.")}
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />
        )}

        {/* small error helper */}
        {videoError && (
          <div className="pointer-events-auto absolute left-4 right-4 bottom-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {videoError}
            {videoSrc ? (
              <div className="mt-1 text-xs text-amber-800">
                Try opening: <span className="font-mono">{videoSrc}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && <div className="mt-6">{renderStartOverlay()}</div>}
          {mode === "card" && <div className="mt-6">{renderDayCard()}</div>}
          {mode === "finalReveal" && (
            <div className="mt-6 flex justify-center w-full">
              {renderFinalReveal()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
