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
  port?: string;
};

type VideoId = "v1" | "v2" | "v3" | "v4";

type Props = {
  days: DayCard[];
  video1Url: string; // berth-to-island
  video2Url: string; // island-to-island
  video3Url: string; // island-to-berth
  video4Url: string; // berth-zoom-out (final reveal)
  fullPayload?: any | null; // sessionStorage payload (VIP dayCards etc)
};

/* ========= VIP curated info (same list as VipGuestsView) ========= */
type DestInfo = { description: string; highlights: string[] };

const DEST_INFO: Record<string, DestInfo> = {
  Aegina: {
    description:
      "Νησί με μακραίωνη ιστορία: ο Ναός της Αφαίας σχηματίζει με Παρθενώνα και Σούνιο το «ιερό τρίγωνο». Φημισμένο για το φιστίκι ΠΟΠ και τη νεοκλασική Χώρα.",
    highlights: ["Ναός Αφαίας & θέα", "Μονή Αγίου Νεκταρίου", "Βόλτα στη Χώρα", "Θαλασσινά στο λιμάνι"],
  },
  Agistri: {
    description:
      "Μικρό πράσινο νησί με πεύκα ως τη θάλασσα και νερά-πισίνα. Ιδανικό για κολύμπι και ήρεμες αγκυροβολίες.",
    highlights: ["Απονήσος", "Dragonera", "SUP/κανό", "Χαλαρό δείπνο"],
  },
  Poros: {
    description:
      "Πράσινο νησί απέναντι από τον Γαλατά. Φημίζεται για το Ρολόι, το στενό κανάλι και τις πευκόφυτες ακτές.",
    highlights: ["Ρολόι", "Μονή Ζωοδόχου Πηγής", "Λιμανάκι της Αγάπης", "Tender στο κανάλι"],
  },
  Hydra: {
    description:
      "Ύδρα χωρίς αυτοκίνητα: πέτρινα αρχοντικά, ναυτική ιστορία και έντονη καλλιτεχνική ζωή.",
    highlights: ["Περίπατος στο λιμάνι", "Μουσεία", "Ηλιοβασίλεμα στο Κανόνι", "Σπήλια"],
  },
  Spetses: {
    description: "Νησί της Μπουμπουλίνας — αρχοντικό, ρομαντικό και κοσμικό.",
    highlights: ["Μουσείο Μπουμπουλίνας", "Ντάπια", "Άγ. Παρασκευή", "Κοκτέιλ το βράδυ"],
  },
  "Porto Cheli": {
    description: "Κλειστός, προστατευμένος κόλπος στην Ερμιονίδα. Βάση για Σπέτσες/Ύδρα.",
    highlights: ["Ήρεμες αγκυροβολίες", "Θαλάσσια παιχνίδια", "Φρέσκο ψάρι", "Short hop σε Σπέτσες"],
  },
  Ermioni: {
    description:
      "Παραθαλάσσια κωμόπολη σε χερσόνησο, με πευκόφυτο Μπίστι και καλές ταβέρνες.",
    highlights: ["Περίπατος στο Μπίστι", "Θαλασσινά", "Ήσυχη βραδιά", "Κοντινά μπάνια"],
  },
};

/* ========= Weather (Open-Meteo like AI Planner) ========= */
type SpotWeather = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

const wxCache = new Map<string, SpotWeather>();
function labelFromWx(precipMM?: number, cloudPct?: number) {
  if ((precipMM ?? 0) > 0.1) return "Rain";
  if ((cloudPct ?? 0) >= 70) return "Cloudy";
  if ((cloudPct ?? 0) >= 30) return "Partly cloudy";
  return "Clear";
}
async function fetchSpotWeather(lat: number, lon: number): Promise<SpotWeather | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (wxCache.has(key)) return wxCache.get(key)!;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,precipitation,cloud_cover,is_day` +
    `&timezone=auto`;

  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();

    const out: SpotWeather = {
      tempC: j?.current?.temperature_2m != null ? Math.round(j.current.temperature_2m) : undefined,
      precipMM: j?.current?.precipitation != null ? +Number(j.current.precipitation).toFixed(1) : undefined,
      cloudPct: j?.current?.cloud_cover != null ? Math.round(j.current.cloud_cover) : undefined,
    };
    out.label = labelFromWx(out.precipMM, out.cloudPct);
    wxCache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

/* ========= Utils ========= */
function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}
function formatHoursHM(hoursFloat?: number) {
  const h = Math.floor(hoursFloat ?? 0);
  const m = Math.round(((hoursFloat ?? 0) - h) * 60);
  return `${h} h ${m} m`;
}
function fmtNM(nm?: number) {
  if (nm == null) return "";
  return `${Math.round(nm)} nm`;
}

/* ========= Component ========= */
export function FinalVideoFlow({
  days,
  video1Url,
  video2Url,
  video3Url,
  video4Url,
  fullPayload,
}: Props) {
  /**
   * We keep the <video> mounted so the last frame stays visible.
   * onEnded → pause on last frame → show overlay.
   */
  const [mode, setMode] = useState<"idle" | "video" | "card" | "finalReveal">("idle");
  const [activeDay, setActiveDay] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const vipDayCards: any[] = useMemo(() => {
    const arr = fullPayload?.dayCards;
    return Array.isArray(arr) ? arr : [];
  }, [fullPayload]);

  const isLastDay = activeDay === days.length - 1;
  const isPenultimateDay = activeDay === days.length - 2;

  // Build current card data (VIP payload preferred)
  const currentData = useMemo(() => {
    const vip = vipDayCards[activeDay];
    const base = days[activeDay];
    const d = vip ?? base;

    const leg: Leg | undefined = d?.leg;
    const to = leg?.to ?? d?.port ?? d?.name ?? "";
    const curated = DEST_INFO[to];

    // Coordinates: from URL payload (stops) if present
    // We encoded stops in URL; in FinalItineraryPage we converted to DayCard only.
    // So we can’t rely on coords here. If later you want coords, we can also pass them.
    return {
      day: d?.day ?? activeDay + 1,
      date: d?.date,
      leg,
      to,
      notes: d?.notes ?? "",
      description: curated?.description ?? "",
      highlights: (curated?.highlights ?? []).slice(0, 6),
      activities: Array.isArray(d?.activities) ? d.activities : [],
      title: d?.title ?? (leg?.from && leg?.to ? `${leg.from} → ${leg.to}` : to),
      // fallback coords by common ports (quick + safe)
      // (we only need rough coords for live meteo; adjust later with your ports dataset if you want)
      coords: guessCoords(to),
    };
  }, [activeDay, vipDayCards, days]);

  // Live weather state (per current destination)
  const [wx, setWx] = useState<SpotWeather | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = currentData.coords;
      if (!c) {
        if (!cancelled) setWx(null);
        return;
      }
      const w = await fetchSpotWeather(c.lat, c.lon);
      if (!cancelled) setWx(w);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentData.to]);

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
      if (p && typeof (p as any).catch === "function") await p;
    } catch {
      setVideoError("Autoplay was blocked. Click on the video once to start playback.");
    }
  }

  useEffect(() => {
    if (mode !== "video") return;
    if (!videoSrc) return;
    const id = window.requestAnimationFrame(() => playNow());
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, videoSrc]);

  function handleStartJourney() {
    if (!days.length) return;
    setActiveDay(0);
    setCurrentVideo("v1");
    setMode("video");
    requestAnimationFrame(() => playNow());
  }

  function handleVideoEnded() {
    const el = videoRef.current;
    if (el) el.pause();
    if (currentVideo === "v4") setMode("finalReveal");
    else setMode("card");
  }

  function handleContinue() {
    if (isLastDay) {
      setCurrentVideo("v4");
      setMode("video");
      requestAnimationFrame(() => playNow());
      return;
    }
    if (isPenultimateDay) {
      setCurrentVideo("v3");
      setMode("video");
      setActiveDay((d) => Math.min(d + 1, days.length - 1));
      requestAnimationFrame(() => playNow());
      return;
    }
    setCurrentVideo("v2");
    setMode("video");
    setActiveDay((d) => Math.min(d + 1, days.length - 1));
    requestAnimationFrame(() => playNow());
  }

  function VipStyleOverlayCard() {
    const { day, date, leg, notes, description, highlights } = currentData;

    return (
      <div className="pointer-events-auto w-[92vw] max-w-[980px] rounded-2xl bg-white/85 backdrop-blur-md border border-white/50 shadow-2xl overflow-hidden">
        <div className="grid sm:grid-cols-[120px_1fr_260px] gap-0">
          {/* Left day column */}
          <div className="bg-neutral-50/70 p-4 flex flex-col items-start justify-center">
            <div className="text-3xl font-semibold leading-none">{day}</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
          </div>

          {/* Middle */}
          <div className="p-4">
            <div className="text-sm text-neutral-500">{formatDate(date)}</div>

            {leg ? (
              <>
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold">
                      {leg.from} → {leg.to}
                    </div>

                    {/* NM / Time / ETA */}
                    <div className="mt-1 text-sm text-neutral-700">
                      {fmtNM(leg.nm)}
                      {leg.hours != null ? ` • ${formatHoursHM(leg.hours)}` : ""}
                      {leg.eta?.dep && leg.eta?.arr
                        ? ` • Depart ${leg.eta.dep} • Arrive ${leg.eta.arr}${leg.eta.window ? ` (${leg.eta.window})` : ""}`
                        : ""}
                    </div>

                    {/* Weather chips */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {wx?.label ? (
                        <span className="rounded-full border px-2 py-1 bg-white/70">
                          Weather: {wx.label}
                        </span>
                      ) : null}
                      {wx?.tempC != null ? (
                        <span className="rounded-full border px-2 py-1 bg-white/70">
                          🌡 {wx.tempC}°C
                        </span>
                      ) : null}
                      {wx?.cloudPct != null ? (
                        <span className="rounded-full border px-2 py-1 bg-white/70">
                          ☁️ {wx.cloudPct}%
                        </span>
                      ) : null}
                      {wx?.precipMM != null ? (
                        <span className="rounded-full border px-2 py-1 bg-white/70">
                          🌧 {wx.precipMM} mm/h
                        </span>
                      ) : null}
                    </div>

                    {/* Description + Notes */}
                    {(description || notes) && (
                      <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
                        {description}
                      </p>
                    )}

                    {notes && (
                      <p className="mt-2 text-neutral-700 whitespace-pre-wrap">
                        {notes}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 text-lg font-semibold">Leisure day</div>
                {notes && <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{notes}</p>}
              </>
            )}
          </div>

          {/* Right highlights */}
          <div className="p-4 border-l bg-neutral-50/70">
            <div className="text-sm font-medium mb-1">Highlights</div>
            {highlights.length ? (
              <ul className="text-sm text-neutral-700 space-y-1 list-disc pl-5">
                {highlights.map((x, i) => (<li key={i}>{x}</li>))}
              </ul>
            ) : (
              <div className="text-sm text-neutral-500">Swim stop, dinner ashore, golden-hour cruise.</div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleContinue}
                className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/85"
              >
                {isLastDay ? "Finish" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function FinalRevealOverlay() {
    const cards: any[] = Array.isArray(fullPayload?.dayCards) ? fullPayload.dayCards : days;

    return (
      <div className="pointer-events-auto w-[92vw] max-w-5xl rounded-2xl bg-white/85 backdrop-blur-md border border-white/50 shadow-2xl px-6 py-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Final VIP Itinerary</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {fullPayload?.tripTitle ?? "Your Journey"}
            </div>
          </div>
          <div className="text-xs text-slate-600">{cards.length} days</div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-auto space-y-3">
          {cards.map((d: any, idx: number) => {
            const day = d?.day ?? idx + 1;
            const date = d?.date ? formatDate(d.date) : "";
            const leg = d?.leg;
            const to = leg?.to ?? d?.port ?? "";
            const curated = DEST_INFO[to];
            const hi = (curated?.highlights ?? []).slice(0, 6);

            return (
              <div key={idx} className="rounded-2xl border overflow-hidden bg-white shadow-sm">
                <div className="grid sm:grid-cols-[120px_1fr_260px] gap-0">
                  <div className="bg-neutral-50 p-4 flex flex-col items-start justify-center">
                    <div className="text-3xl font-semibold leading-none">{day}</div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
                  </div>

                  <div className="p-4">
                    <div className="text-sm text-neutral-500">{date}</div>
                    {leg ? (
                      <>
                        <div className="mt-1 text-lg font-semibold">{leg.from} → {leg.to}</div>
                        <div className="mt-1 text-sm text-neutral-600">
                          {fmtNM(leg.nm)}{leg.hours != null ? ` • ${formatHoursHM(leg.hours)}` : ""}
                          {leg.eta?.dep && leg.eta?.arr
                            ? ` • Depart ${leg.eta.dep} • Arrive ${leg.eta.arr}${leg.eta.window ? ` (${leg.eta.window})` : ""}`
                            : ""}
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-lg font-semibold">{d?.title ?? to ?? "Leisure"}</div>
                    )}
                    {d?.notes && <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{d.notes}</p>}
                  </div>

                  <div className="p-4 border-l bg-neutral-50">
                    <div className="text-sm font-medium mb-1">Highlights</div>
                    {hi.length ? (
                      <ul className="text-sm text-neutral-700 space-y-1 list-disc pl-5">
                        {hi.map((x, i2) => (<li key={i2}>{x}</li>))}
                      </ul>
                    ) : (
                      <div className="text-sm text-neutral-500">Swim stop, dinner ashore, golden-hour cruise.</div>
                    )}
                  </div>
                </div>
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
              if (mode === "video") playNow();
            }}
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

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          {mode === "idle" && (
            <div className="pointer-events-auto mt-6 max-w-md w-[92vw] sm:w-[520px] rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-xl px-5 py-4 text-center">
              <div className="text-xs uppercase text-gray-500">Navigoplan • Virtual Journey</div>
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

          {mode === "card" && <div className="mt-6">{VipStyleOverlayCard()}</div>}

          {mode === "finalReveal" && (
            <div className="mt-6 flex justify-center w-full">
              <FinalRevealOverlay />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Quick coords fallback for live meteo =========
   (Optional: later we can pass real coords from your ports dataset) */
function guessCoords(name: string): { lat: number; lon: number } | null {
  const m: Record<string, { lat: number; lon: number }> = {
    Alimos: { lat: 37.919, lon: 23.716 },
    Aegina: { lat: 37.746, lon: 23.428 },
    Agistri: { lat: 37.708, lon: 23.355 },
    Poros: { lat: 37.499, lon: 23.454 },
    Hydra: { lat: 37.349, lon: 23.466 },
    Spetses: { lat: 37.262, lon: 23.160 },
    Ermioni: { lat: 37.386, lon: 23.248 },
    "Porto Cheli": { lat: 37.326, lon: 23.141 },
  };
  return m[name] ?? null;
}
