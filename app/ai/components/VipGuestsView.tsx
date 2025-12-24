"use client";

import { useEffect, useMemo, useState } from "react";

/* ========= Types ========= */
type Leg = {
  from: string;
  to: string;
  nm: number;
  hours: number;
  fuelL: number;
  cost?: number;
  eta?: { dep: string; arr: string; window: string };
};
type DayCard = {
  day: number;
  date: string;
  leg?: Leg;
  notes?: string;
  userNotes?: { marina?: string; food?: string; beach?: string };
};
type PlannerMode = "Region" | "Custom";
type SpotWeather = { tempC?: number; precipMM?: number; cloudPct?: number; label?: string };

type Props = {
  plan: DayCard[];
  mode: PlannerMode;
  startDate: string;
  start: string;
  end?: string;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, SpotWeather>;
};

/* ========= Utilities ========= */
function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}
function formatHoursHM(hoursFloat: number) {
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h} h ${m} m`;
}
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

/* ========= Curated destination info ========= */
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
    description:
      "Κλειστός, προστατευμένος κόλπος στην Ερμιονίδα. Βάση για Σπέτσες/Ύδρα.",
    highlights: ["Ήρεμες αγκυροβολίες", "Θαλάσσια παιχνίδια", "Φρέσκο ψάρι", "Short hop σε Σπέτσες"],
  },
  Ermioni: {
    description:
      "Παραθαλάσσια κωμόπολη σε χερσόνησο, με πευκόφυτο Μπίστι και καλές ταβέρνες.",
    highlights: ["Περίπατος στο Μπίστι", "Θαλασσινά", "Ήσυχη βραδιά", "Κοντινά μπάνια"],
  },
};

/* ========= Wikipedia enrichment ========= */
type WikiCard = {
  title: string;
  summary: string;
  imageUrl?: string;
  gallery?: string[];
  sourceUrl?: string;
};

async function fetchJSON(url: string) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("fetch error");
  return r.json();
}
function encTitle(s: string) {
  return encodeURIComponent(s.replace(/\s+/g, "_"));
}
async function fetchWikiCard(placeName: string): Promise<WikiCard | null> {
  const langs = ["el", "en"];
  let summary: any = null;

  for (const lang of langs) {
    try {
      const base = `https://${lang}.wikipedia.org/api/rest_v1`;
      summary = await fetchJSON(`${base}/page/summary/${encTitle(placeName)}`);
      if (summary?.title) break;
    } catch {}
  }
  if (!summary) return null;

  const card: WikiCard = {
    title: summary?.title ?? placeName,
    summary: summary?.extract ?? "",
    imageUrl: summary?.thumbnail?.source,
    sourceUrl: summary?.content_urls?.desktop?.page,
    gallery: [],
  };

  try {
    const base = `https://${summary?.lang ?? "en"}.wikipedia.org/api/rest_v1`;
    const media = await fetchJSON(`${base}/page/media/${encTitle(card.title)}`);
    const pics: string[] = [];
    for (const item of media?.items ?? []) {
      if (item?.type === "image") {
        const src = item?.srcset?.[item.srcset.length - 1]?.src || item?.src || item?.thumbnail?.source;
        if (src) pics.push(src);
      }
    }
    card.gallery = Array.from(new Set([...(card.imageUrl ? [card.imageUrl] : []), ...pics])).slice(0, 6);
    if (!card.imageUrl && card.gallery?.length) card.imageUrl = card.gallery[0];
  } catch {}

  return card;
}

/* ========= Sea Guide VIP Info (NEW robust matching) ========= */
type SeaGuideEntry = {
  id?: string;
  region?: string;
  name?: { el?: string; en?: string } | string;
  vip_info?: { el?: string; en?: string } | string;
};

const SEA_GUIDE_URL = "/data/sea_guide_vol3_master.json";

type SeaGuideIndex = {
  entries: SeaGuideEntry[];
  tokenMap: Map<string, SeaGuideEntry[]>;
};

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

    for (const nm of names) {
      const toks = tokensOf(nm);
      toks.forEach((t) => addToken(t, e));
    }
  }

  return { entries: items, tokenMap };
}

function bestMatchSeaGuide(toName: string, idx: SeaGuideIndex | null): SeaGuideEntry | null {
  if (!idx) return null;

  const qTokens = Array.from(new Set(tokensOf(toName)));
  if (!qTokens.length) return null;

  const score = new Map<SeaGuideEntry, number>();
  for (const t of qTokens) {
    const list = idx.tokenMap.get(t) ?? [];
    for (const e of list) {
      score.set(e, (score.get(e) ?? 0) + 1);
    }
  }

  let best: SeaGuideEntry | null = null;
  let bestScore = 0;

  for (const [e, sc] of score) {
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }

  // For simple names like "Poros", even score=1 is often enough
  // but keep a small safety: require at least 1 token match.
  if (best && bestScore >= 1) return best;

  return null;
}

function extractVipInfo(entry: SeaGuideEntry | null, lang: "el" | "en" = "el") {
  if (!entry) return "";
  return pickText(entry.vip_info, lang).trim();
}

/* ========= Component ========= */
export default function VipGuestsView({
  plan,
  mode,
  startDate,
  start,
  end,
  thumbs,
  destWeather,
}: Props) {
  const destNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of plan) if (d.leg?.to) set.add(d.leg.to);
    return Array.from(set);
  }, [plan]);

  const [wiki, setWiki] = useState<Record<string, WikiCard | null>>({});
  const [sgIndex, setSgIndex] = useState<SeaGuideIndex | null>(null);

  // Wikipedia
  useEffect(() => {
    let abort = false;
    (async () => {
      const next: Record<string, WikiCard | null> = {};
      for (const name of destNames) {
        try {
          next[name] = await fetchWikiCard(name);
        } catch {
          next[name] = null;
        }
      }
      if (!abort) setWiki(next);
    })();
    return () => {
      abort = true;
    };
  }, [destNames]);

  // SeaGuide index (load once)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch(SEA_GUIDE_URL, { cache: "no-store" });
        if (!r.ok) throw new Error("sea guide fetch failed");
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
        if (!abort) setSgIndex({ entries: [], tokenMap: new Map() });
      }
    })();
    return () => {
      abort = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative h-28 bg-gradient-to-r from-black via-neutral-800 to-black">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full px-6 flex items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-300">Navigoplan • VIP Itinerary</div>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "Region" ? `${start} → ${end ?? start}` : "Custom Cruise"}
            </h2>
            <div className="text-neutral-300 text-sm">
              From {formatDate(startDate)} • {plan.length} days
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="p-6 space-y-4">
        {plan.map((d) => {
          const to = d.leg?.to ?? "";
          const img = thumbs?.[to] || wiki[to]?.imageUrl;
          const wx = destWeather?.[to];
          const curated = DEST_INFO[to];
          const summary = wiki[to]?.summary?.trim();

          const mainDesc = curated?.description || summary || "";
          const hi = (curated?.highlights || []).slice(0, 6);

          // ✅ NEW: VIP info from SeaGuide (robust match)
          const sgEntry = bestMatchSeaGuide(to, sgIndex);
          const vipInfo = extractVipInfo(sgEntry, "el");

          return (
            <div
              key={d.day}
              className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="grid sm:grid-cols-[120px_1fr_260px] gap-0">
                <div className="bg-neutral-50 p-4 flex flex-col items-start justify-center">
                  <div className="text-3xl font-semibold leading-none">{d.day}</div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
                </div>

                <div className="p-4">
                  <div className="text-sm text-neutral-500">{formatDate(d.date)}</div>

                  {d.leg ? (
                    <>
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold">
                            {d.leg.from} → {d.leg.to}
                          </div>
                          <div className="mt-1 text-sm text-neutral-600">
                            {Math.round(d.leg.nm)} nm • {formatHoursHM(d.leg.hours)}
                            {d.leg.eta && (
                              <>
                                {" "}
                                • Depart {d.leg.eta.dep} • Arrive {d.leg.eta.arr} ({d.leg.eta.window})
                              </>
                            )}
                          </div>

                          {/* Live Weather chips */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {wx && <span className="rounded-full border px-2 py-1">Weather: {wx.label ?? "—"}</span>}
                            {wx?.tempC != null && <span className="rounded-full border px-2 py-1">🌡 {wx.tempC}°C</span>}
                            {wx?.cloudPct != null && <span className="rounded-full border px-2 py-1">☁️ {wx.cloudPct}%</span>}
                            {wx?.precipMM != null && <span className="rounded-full border px-2 py-1">🌧 {wx.precipMM} mm/h</span>}
                          </div>
                        </div>

                        {img && (
                          <img
                            src={img}
                            alt={to}
                            className="h-24 w-40 shrink-0 rounded-md object-cover ring-1 ring-black/5"
                            loading="lazy"
                          />
                        )}
                      </div>

                      {mainDesc && (
                        <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
                          {mainDesc}
                          {!curated?.description && summary ? (
                            <span className="text-neutral-500 text-sm"> (Πηγή: Wikipedia)</span>
                          ) : null}
                        </p>
                      )}

                      {/* ✅ VIP INFO box */}
                      {vipInfo && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <span className="font-semibold">VIP:</span> {vipInfo}
                        </div>
                      )}

                      {d.notes && <p className="mt-2 text-neutral-700">{d.notes}</p>}
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-semibold">Leisure day</div>
                      {d.notes && <p className="mt-2 text-neutral-700">{d.notes}</p>}
                    </>
                  )}
                </div>

                <div className="p-4 border-l bg-neutral-50">
                  <div className="text-sm font-medium mb-1">Highlights</div>
                  {hi.length ? (
                    <ul className="text-sm text-neutral-700 space-y-1 list-disc pl-5">
                      {hi.map((x, i) => (<li key={i}>{x}</li>))}
                    </ul>
                  ) : (
                    <div className="text-sm text-neutral-500">Swim stop, dinner ashore, golden-hour cruise.</div>
                  )}

                  {wiki[to]?.sourceUrl && (
                    <div className="mt-3">
                      <a
                        href={wiki[to]!.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-neutral-600 hover:text-neutral-800"
                        title="Πηγή: Wikipedia"
                      >
                        Περισσότερα στη Wikipedia
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-2xl border bg-neutral-50 p-5 text-center">
          <div className="text-sm text-neutral-600">Θέλεις premium PDF brochure με φωτογραφίες & route map;</div>
          <div className="mt-3">
            <button className="px-4 py-2 rounded-2xl bg-black text-white text-sm font-medium hover:opacity-90">
              Export VIP Brochure (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
