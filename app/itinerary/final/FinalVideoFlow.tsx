"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========= Types ========= */
type Leg = {
  from: string;
  to: string;
  nm?: number;
  hours?: number;
  fuelL?: number;
  eta?: { dep?: string; arr?: string; window?: string };
};

export type DayCard = {
  day: number;
  date?: string;
  leg?: Leg;
  notes?: string;
  title?: string;
  activities?: string[];
};

type VideoId = "v1" | "v2" | "v3" | "v4";

type Props = {
  days: DayCard[];
  video1Url: string; // berth-to-island
  video2Url: string; // island-to-island
  video3Url: string; // island-to-berth
  video4Url: string; // berth-zoom-out (final reveal)
  fullPayload?: any | null; // from sessionStorage (VIP dayCards)
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
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
  /**
   * mode:
   * - idle: start screen
   * - video: playing
   * - card: paused on LAST FRAME, overlay visible
   * - finalReveal: paused on LAST FRAME, overview overlay visible
   */
  const [mode, setMode] = useState<"idle" | "video" | "card" | "finalReveal">(
    "idle"
  );
  const [activeDay, setActiveDay] = useState(0);

  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isLastDay = activeDay === days.length - 1;
  const isPenultimateDay = activeDay === days.length - 2;

  // VIP dayCards from session payload (prefer these for content)
  const vipDayCards: any[] = useMemo(() => {
    const arr = fullPayload?.dayCards;
    return Array.isArray(arr) ? arr : [];
  }, [fullPayload]);

  function getDayData(i: number) {
    // prefer VIP dayCard if exists (richer)
    const vip = vipDayCards[i];
    const base = days[i];
    const d = vip ?? base;

    const day = d?.day ?? i + 1;
    const date = d?.date;
    const leg = d?.leg;
    const title =
      d?.title ??
      (leg?.from && leg?.to ? `${leg.from} → ${leg.to}` : d?.port ?? d?.name ?? "");
    const notes = d?.notes ?? "";
    const activities: string[] = Array.isArray(d?.activities) ? d.activities : [];

    return { day, date, leg, title, notes, activities };
  }

  const videoSrc = useMemo(() => {
    return currentVideo === "v1"
      ? video1Url
      : currentVideo === "v2"
      ? video2Url
      : currentVideo === "v3"
      ? video3Url
      : currentVideo === "v4"
      ? video4Url
      : undefined;
  }, [currentVideo, video1Url, video2Url, video3Url, video4Url]);

  function primeVideo(el: HTMLVideoElement) {
    el.muted = true;
    el.playsInline = true;
    (el as any).webkitPlaysInline = true;
    el.preload = "metadata";
    el.controls = false;
    (el as any).disablePictureInPicture = true;
    (el as any).controlsList = "nodownload nofullscreen noremoteplayback";
  }

  async function playNow() {
    const el = videoRef.current;
    if (!el || !videoSrc) return;

    try {
      primeVideo(el);
      setVideoError(null);

      el.pause();
      el.currentTime = 0;
      el.load();

      const p = el.play();
      if (p && typeof (p as any).catch === "function") {
        await p;
      }
    } catch {
      setVideoError(
        "Autoplay was blocked. Click on the video once to start playback."
      );
    }
  }

  // When we enter "video" mode, try to play
  useEffect(() => {
    if (mode !== "video") return;
    if (!videoSrc) return;
    // try play shortly after render
    const id = window.requestAnimationFrame(() => playNow());
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, videoSrc]);

  /* ========= Start Journey ========= */
  async function handleStartJourney() {
    if (!days.length) return;

    setActiveDay(0);
    setCurrentVideo("v1");
    setMode("video");

    // user gesture → direct play attempt
    requestAnimationFrame(() => playNow());
  }

  /* ========= Video ended ========= */
  function handleVideoEnded() {
    const el = videoRef.current;
    if (el) {
      // keep last frame on screen
      el.pause();
      // keep currentTime at end; do NOT clear videoSrc
    }

    if (currentVideo === "v4") {
      // final video ended → show final reveal overlay on last frame
      setMode("finalReveal");
      return;
    }

    // after each travel video: show day card overlay, while keeping frame
    setMode("card");
  }

  /* ========= Continue from overlay card ========= */
  function handleContinue() {
    // If we're on final day card -> play v4 (zoom-out + final reveal)
    if (isLastDay) {
      setCurrentVideo("v4");
      setMode("video");
      return;
    }

    // If we're on penultimate -> play island-to-berth, then advance day
    if (isPenultimateDay) {
      setCurrentVideo("v3");
      setMode("video");
      // next day becomes last day after video ends
      setActiveDay((d) => Math.min(d + 1, days.length - 1));
      return;
    }

    // middle days -> island-to-island, then advance day
    setCurrentVideo("v2");
    setMode("video");
    setActiveDay((d) => Math.min(d + 1, days.length - 1));
  }

  /* ========= UI blocks ========= */

  function OverlayCard() {
    const d = getDayData(activeDay);
    const dep = d.leg?.eta?.dep;
    const arr = d.leg?.eta?.arr;
    const nm = d.leg?.nm;
    const hrs = d.leg?.hours;

    return (
      <div className="pointer-events-auto max-w-xl w-[92vw] sm:w-[620px] rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-2xl px-6 py-5">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">
          VIP DAY {d.day}
        </div>

        <div className="mt-1 text-2xl font-semibold text-slate-900">
          {d.title || "Cruise Day"}
        </div>

        <div className="mt-2 text-sm text-gray-700 space-y-1">
          {d.date ? <div>📅 {formatDate(d.date)}</div> : null}

          {(nm != null || hrs != null) && (
            <div>
              {nm != null ? <>NM: {Number(nm).toFixed(1)} • </> : null}
              {hrs != null ? <>Time: {formatHM(Number(hrs))}</> : null}
              {dep || arr ? (
                <>
                  {" "}
                  •{" "}
                  {dep ? <>Depart {dep}</> : null}
                  {arr ? <> • Arrive {arr}</> : null}
                </>
              ) : null}
            </div>
          )}

          {d.notes ? (
            <div className="mt-2 whitespace-pre-wrap">📝 {d.notes}</div>
          ) : null}
        </div>

        {d.activities?.length ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-600">Highlights</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
              {d.activities.slice(0, 8).map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleContinue}
            className="rounded-xl bg-black text-white px-5 py-2 text-sm font-medium hover:bg-black/85"
          >
            {isLastDay ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  function FinalRevealOverlay() {
    // show the VIP full itinerary (use fullPayload if available)
    const cards: any[] = Array.isArray(fullPayload?.dayCards)
      ? fullPayload.dayCards
      : days;

    return (
      <div className="pointer-events-auto w-[92vw] max-w-5xl rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-2xl px-6 py-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              Final VIP Itinerary
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {fullPayload?.tripTitle ?? "Your Journey"}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {cards.length} days
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-auto space-y-3">
          {cards.map((d: any, idx: number) => {
            const day = d?.day ?? idx + 1;
            const date = d?.date ? formatDate(d.date) : "";
            const leg = d?.leg;
            const title =
              d?.title ??
              (leg?.from && leg?.to ? `${leg.from} → ${leg.to}` : d?.port ?? "");

            return (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-slate-900">
                    Day {day} • {title}
                  </div>
                  <div className="text-xs text-slate-500">{date}</div>
                </div>

                {leg && (
                  <div className="mt-1 text-xs text-slate-700">
                    {leg.nm != null ? <>NM: {Number(leg.nm).toFixed(1)} • </> : null}
                    {leg.hours != null ? <>Time: {formatHM(Number(leg.hours))}</> : null}
                    {leg.eta?.dep ? <> • Dep {leg.eta.dep}</> : null}
                    {leg.eta?.arr ? <> • Arr {leg.eta.arr}</> : null}
                  </div>
                )}

                {d?.notes ? (
                  <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                    {d.notes}
                  </div>
                ) : null}

                {Array.isArray(d?.activities) && d.activities.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.activities.slice(0, 8).map((a: string, i2: number) => (
                      <span
                        key={i2}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-black min-h-[360px]">
        {/* VIDEO stays mounted so last frame stays visible */}
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
            onError={() => setVideoError("Video failed to load (check path & deployment).")}
            onClick={() => {
              // if autoplay was blocked, click starts it
              if (mode === "video") playNow();
            }}
          />
        )}

        {/* error helper */}
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

        {/* overlays */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && (
            <div className="pointer-events-auto mt-6 max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/96 backdrop-blur border border-white/70 shadow-xl px-5 py-4 text-center">
              <div className="text-xs uppercase text-gray-500">
                Navigoplan • Virtual Journey
              </div>
              <div className="mt-2 text-xl font-semibold">Start your journey</div>
              <p className="mt-2 text-sm text-gray-700">
                Press <b>Start the journey</b> to begin the cinematic itinerary.
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
          )}

          {/* ✅ Card overlay while keeping last video frame */}
          {mode === "card" && <div className="mt-6">{OverlayCard()}</div>}

          {/* ✅ Final reveal overlay while keeping last video frame */}
          {mode === "finalReveal" && (
            <div className="mt-6 flex justify-center w-full">
              {FinalRevealOverlay()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
