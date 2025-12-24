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
type Mode = "idle" | "video" | "card" | "finalReveal";

type Props = {
  days: DayCard[];
  video1Url: string;
  video2Url: string;
  video3Url: string;
  video4Url: string;
  fullPayload?: any | null;
};

/* ========= Curated destination info (same as VipGuestsView) ========= */
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
    description: "Ύδρα χωρίς αυτοκίνητα: πέτρινα αρχοντικά, ναυτική ιστορία και έντονη καλλιτεχνική ζωή.",
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
    description: "Παραθαλάσσια κωμόπολη σε χερσόνησο, με πευκόφυτο Μπίστι και καλές ταβέρνες.",
    highlights: ["Περίπατος στο Μπίστι", "Θαλασσινά", "Ήσυχη βραδιά", "Κοντινά μπάνια"],
  },
};

/* ========= SeaGuide VIP + Facilities (NEW) ========= */
type SeaGuideEntry = {
  id?: string;
  region?: string;
  name?: { el?: string; en?: string } | string;
  vip_info?: { el?: string; en?: string } | string;
  facilities?: Record<string, any>;
};

const SEA_GUIDE_URL = "/data/sea_guide_vol3_master.json";

function normalize(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
function tokensOf(s: string) {
  return normalize(s)
    .replace(/[^a-z0-9α-ω\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function pickText(v: any, lang: "el" | "en" = "el") {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v?.[lang] || v?.el || v?.en || "";
  return "";
}

type SeaGuideIndex = { tokenMap: Map<string, SeaGuideEntry[]> };

function buildSeaGuideIndex(items: SeaGuideEntry[]): SeaGuideIndex {
  const tokenMap = new Map<string, SeaGuideEntry[]>();

  function addToken(tok: string, e: SeaGuideEntry) {
    const k = normalize(tok);
    if (!k) return;
    const arr = tokenMap.get(k) ?? [];
    arr.push(e);
    tokenMap.set(k, arr);
  }

  for (const e of items) {
    const names: string[] = [];
    if (e?.id) names.push(String(e.id));

    const n = e?.name;
    if (typeof n === "string") names.push(n);
    else {
      if (n?.el) names.push(n.el);
      if (n?.en) names.push(n.en);
    }

    for (const nm of names) tokensOf(nm).forEach((t) => addToken(t, e));
  }

  return { tokenMap };
}

function bestMatchSeaGuide(toName: string, idx: SeaGuideIndex | null): SeaGuideEntry | null {
  if (!idx) return null;
  const qTokens = Array.from(new Set(tokensOf(toName)));
  if (!qTokens.length) return null;

  const score = new Map<SeaGuideEntry, number>();
  for (const t of qTokens) {
    const list = idx.tokenMap.get(t) ?? [];
    for (const e of list) score.set(e, (score.get(e) ?? 0) + 1);
  }

  let best: SeaGuideEntry | null = null;
  let bestScore = 0;
  for (const [e, sc] of score) {
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }
  return bestScore >= 1 ? best : null;
}

function extractVipInfo(entry: SeaGuideEntry | null) {
  return entry ? pickText(entry.vip_info, "el").trim() : "";
}

/* Facilities icons */
const FAC_ICON: Record<string, { icon: string; label: string }> = {
  restaurants: { icon: "🍽️", label: "Restaurants" },
  shops: { icon: "🛍️", label: "Shops" },
  atm: { icon: "🏧", label: "ATM" },
  fuel: { icon: "⛽", label: "Fuel" },
  water: { icon: "💧", label: "Water" },
  electricity: { icon: "🔌", label: "Power" },
};

function facilitiesChips(facilities: Record<string, any> | undefined) {
  if (!facilities || typeof facilities !== "object") return [];
  const keys = ["restaurants", "shops", "atm"]; // ζητάς αυτά (εύκολα προσθέτεις κι άλλα)
  const out: { k: string; icon: string; label: string }[] = [];
  for (const k of keys) {
    const v = (facilities as any)[k];
    if (v === true || (typeof v === "string" && v.trim()) || (typeof v === "number" && !Number.isNaN(v))) {
      const meta = FAC_ICON[k] ?? { icon: "✅", label: k };
      out.push({ k, icon: meta.icon, label: meta.label });
    }
  }
  return out;
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
  const [mode, setMode] = useState<Mode>("idle");
  const [activeDay, setActiveDay] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoId | null>(null);
  const [pendingDay, setPendingDay] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const vipDayCards: any[] = useMemo(() => {
    const arr = fullPayload?.dayCards;
    return Array.isArray(arr) ? arr : [];
  }, [fullPayload]);

  const isLastDay = activeDay === days.length - 1;
  const isPenultimateDay = activeDay === days.length - 2;

  // Load SeaGuide index once
  const [sgIndex, setSgIndex] = useState<SeaGuideIndex | null>(null);
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch(SEA_GUIDE_URL, { cache: "no-store" });
        const j = await r.json();
        const list: SeaGuideEntry[] = Array.isArray(j)
          ? j
          : Array.isArray(j?.items)
          ? j.items
          : Array.isArray(j?.data)
          ? j.data
          : Array.isArray(j?.ports)
          ? j.ports
          : [];
        const idx = buildSeaGuideIndex(list);
        if (!abort) setSgIndex(idx);
      } catch {
        if (!abort) setSgIndex({ tokenMap: new Map() });
      }
    })();
    return () => { abort = true; };
  }, []);

  const currentData = useMemo(() => {
    const vip = vipDayCards[activeDay];
    const base = days[activeDay];
    const d = vip ?? base;

    const leg: Leg | undefined = d?.leg;
    const to = leg?.to ?? d?.port ?? d?.name ?? "";
    const curated = DEST_INFO[to];

    const sgEntry = bestMatchSeaGuide(to, sgIndex);
    const vipInfo = extractVipInfo(sgEntry);
    const fac = facilitiesChips(sgEntry?.facilities);

    return {
      day: d?.day ?? activeDay + 1,
      date: d?.date,
      leg,
      to,
      notes: d?.notes ?? "",
      description: curated?.description ?? "",
      highlights: (curated?.highlights ?? []).slice(0, 6),
      title: d?.title ?? (leg?.from && leg?.to ? `${leg.from} → ${leg.to}` : to),
      vipInfo,
      fac,
    };
  }, [activeDay, vipDayCards, days, sgIndex]);

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

  function softPlay() {
    const el = videoRef.current;
    if (!el) return;
    try {
      primeVideo(el);
      setVideoError(null);
      const p = el.play();
      if (p && typeof (p as any).catch === "function") {
        (p as any).catch(() => setVideoError("Click the video once to start playback."));
      }
    } catch {
      setVideoError("Click the video once to start playback.");
    }
  }

  useEffect(() => {
    if (mode !== "video") return;
    if (!videoSrc) return;
    const el = videoRef.current;
    if (!el) return;
    primeVideo(el);
    setVideoError(null);
    try { el.currentTime = 0; } catch {}
    const id = window.requestAnimationFrame(() => softPlay());
    return () => window.cancelAnimationFrame(id);
  }, [mode, videoSrc]);

  function handleStartJourney() {
    if (!days.length) return;
    setPendingDay(null);
    setActiveDay(0);
    setCurrentVideo("v1");
    setMode("video");
    requestAnimationFrame(() => softPlay());
  }

  function handleVideoEnded() {
    const el = videoRef.current;
    if (el) el.pause();

    if (pendingDay != null) {
      setActiveDay(pendingDay);
      setPendingDay(null);
    }

    if (currentVideo === "v4") setMode("finalReveal");
    else setMode("card");
  }

  function handleContinue() {
    if (isLastDay) {
      setCurrentVideo("v4");
      setMode("video");
      requestAnimationFrame(() => softPlay());
      return;
    }
    if (isPenultimateDay) {
      setPendingDay(Math.min(activeDay + 1, days.length - 1));
      setCurrentVideo("v3");
      setMode("video");
      requestAnimationFrame(() => softPlay());
      return;
    }
    setPendingDay(Math.min(activeDay + 1, days.length - 1));
    setCurrentVideo("v2");
    setMode("video");
    requestAnimationFrame(() => softPlay());
  }

  function OverlayCard() {
    const { day, date, leg, notes, description, highlights, vipInfo, fac } = currentData;

    return (
      <div className="pointer-events-auto w-[92vw] max-w-[980px] rounded-2xl bg-white/85 backdrop-blur-md border border-white/50 shadow-2xl overflow-hidden">
        <div className="grid sm:grid-cols-[120px_1fr_260px] gap-0">
          <div className="bg-neutral-50/70 p-4 flex flex-col items-start justify-center">
            <div className="text-3xl font-semibold leading-none">{day}</div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
          </div>

          <div className="p-4">
            <div className="text-sm text-neutral-500">{formatDate(date)}</div>

            {leg ? (
              <>
                <div className="mt-1 text-lg font-semibold">{leg.from} → {leg.to}</div>
                <div className="mt-1 text-sm text-neutral-700">
                  {fmtNM(leg.nm)}
                  {leg.hours != null ? ` • ${formatHoursHM(leg.hours)}` : ""}
                  {leg.eta?.dep && leg.eta?.arr
                    ? ` • Depart ${leg.eta.dep} • Arrive ${leg.eta.arr}${leg.eta.window ? ` (${leg.eta.window})` : ""}`
                    : ""}
                </div>

                {/* Facilities icons */}
                {fac.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {fac.map((c) => (
                      <span key={c.k} className="rounded-full border px-2 py-1 bg-white">
                        {c.icon} {c.label}
                      </span>
                    ))}
                  </div>
                )}

                {(description || notes) && (
                  <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">{description}</p>
                )}

                {vipInfo && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="font-semibold">VIP:</span> {vipInfo}
                  </div>
                )}

                {notes && <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{notes}</p>}
              </>
            ) : (
              <>
                <div className="mt-1 text-lg font-semibold">Leisure day</div>
                {notes && <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{notes}</p>}
              </>
            )}
          </div>

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

        <div className="mt-4 max-h-[520px] overflow-auto space-y-3 pr-1">
          {cards.map((d: any, idx: number) => {
            const day = d?.day ?? idx + 1;
            const date = d?.date ? formatDate(d.date) : "";
            const leg = d?.leg as Leg | undefined;
            const to = leg?.to ?? d?.port ?? "";

            const curated = DEST_INFO[to];
            const desc = curated?.description ?? "";
            const hi = (curated?.highlights ?? []).slice(0, 6);

            const sgEntry = bestMatchSeaGuide(to, sgIndex);
            const vipInfo = extractVipInfo(sgEntry);
            const fac = facilitiesChips(sgEntry?.facilities);

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
                          {fmtNM(leg.nm)}
                          {leg.hours != null ? ` • ${formatHoursHM(leg.hours)}` : ""}
                          {leg.eta?.dep && leg.eta?.arr
                            ? ` • Depart ${leg.eta.dep} • Arrive ${leg.eta.arr}${leg.eta.window ? ` (${leg.eta.window})` : ""}`
                            : ""}
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-lg font-semibold">{d?.title ?? to ?? "Leisure"}</div>
                    )}

                    {/* Facilities icons */}
                    {fac.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {fac.map((c) => (
                          <span key={c.k} className="rounded-full border px-2 py-1 bg-white">
                            {c.icon} {c.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {desc ? <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">{desc}</p> : null}

                    {vipInfo ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <span className="font-semibold">VIP:</span> {vipInfo}
                      </div>
                    ) : null}

                    {d?.notes ? <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{d.notes}</p> : null}
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
            onCanPlay={() => {
              if (mode === "video") softPlay();
            }}
            onError={() => setVideoError("Video failed to load (check path & deployment).")}
            onClick={() => {
              if (mode === "video") softPlay();
            }}
          />
        )}

        {videoError && (
          <div className="pointer-events-auto absolute left-4 right-4 bottom-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {videoError}
          </div>
        )}

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

          {mode === "card" && <div className="mt-6">{OverlayCard()}</div>}

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
