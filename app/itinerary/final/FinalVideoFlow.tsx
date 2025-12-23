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
  video1Url: string;
  video2Url: string;
  video3Url: string;
  video4Url: string;
  fullPayload?: any | null;
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

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isVideoStep && videoSrc) {
      setVideoError(null);

      el.muted = true;
      (el as any).playsInline = true;
      (el as any).webkitPlaysInline = true;

      try {
        el.pause();
        el.load();
        el.currentTime = 0;

        const p = el.play();
        if (p && typeof (p as any).catch === "function") {
          (p as any).catch(() => {
            setVideoError("Autoplay was blocked. Click the video once to start.");
          });
        }
      } catch {
        setVideoError("Video could not start.");
      }
    } else {
      el.pause();
    }
  }, [isVideoStep, videoSrc, currentVideo, mode]);

  function startVideoSequence(vids: VideoId[], after: "card" | "finalReveal", dayIndex: number) {
    if (!vids.length) return;
    setQueue(vids);
    setCurrentVideo(vids[0]);
    setNextStep(after);
    setNextDayIndex(dayIndex);
    setMode("video");
  }

  function handleStartJourney() {
    if (!days.length) return;
    setActiveDay(0);
    startVideoSequence(["v1"], "card", 0);
  }

  function handleVideoEnded() {
    setQueue((prev) => {
      if (prev.length <= 1) {
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
      }
      const nq = prev.slice(1);
      setCurrentVideo(nq[0]);
      return nq;
    });
  }

  function handleDayCardButton() {
    if (!days.length) return;

    if (isLastDay) {
      startVideoSequence(["v4"], "finalReveal", activeDay);
      return;
    }
    if (isPenultimateDay) {
      startVideoSequence(["v3"], "card", activeDay + 1);
      return;
    }
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
    const cards: any[] = Array.isArray(fullPayload?.dayCards) ? fullPayload.dayCards : [];

    return (
      <div className="pointer-events-auto max-w-4xl w-[92vw] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-6 py-5">
        <div className="text-xs uppercase text-gray-500">Final VIP Itinerary</div>
        <div className="text-xl font-semibold mt-1 mb-3">{fullPayload?.tripTitle ?? "Final Itinerary"}</div>

        <div className="space-y-2 text-sm text-gray-800 max-h-[420px] overflow-auto">
          {(cards.length ? cards : days).map((d: any) => (
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
            onError={() => setVideoError("Video failed to load (404). Check file path & deploy.")}
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />
        )}

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

        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && <div className="mt-6">{renderStartOverlay()}</div>}
          {mode === "card" && <div className="mt-6">{renderDayCard()}</div>}
          {mode === "finalReveal" && <div className="mt-6 flex justify-center w-full">{renderFinalReveal()}</div>}
        </div>
      </div>
    </div>
  );
}
