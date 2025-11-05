"use client";

import { useEffect, useMemo, useState } from "react";

/* ========= Types ========= */
type YachtType = "Motor" | "Sailing";
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

/* ========= Curated destination info (true, concise, selling) ========= */
type DestInfo = { description: string; highlights: string[] };

const DEST_INFO: Record<string, DestInfo> = {
  // --- Saronic core ---
  Aegina: {
    description:
      "Νησί με μακραίωνη ιστορία: ο Ναός της Αφαίας (5ος αι. π.Χ.) σχηματίζει με Παρθενώνα και Σούνιο το «ιερό τρίγωνο». Φημίζεται παγκοσμίως για το φιστίκι Αιγίνης ΠΟΠ και τη νεοκλασική της Χώρα.",
    highlights: [
      "Ναός Αφαίας & πανοραμική θέα",
      "Μονή Αγίου Νεκταρίου",
      "Βόλτα στη Χώρα – νεοκλασικά",
      "Φρέσκα θαλασσινά στο λιμανάκι",
    ],
  },
  Agistri: {
    description:
      "Μικρό πράσινο νησί με πεύκα που φτάνουν ως τη θάλασσα και πεντακάθαρα νερά. Ιδανικό για κολύμπι και ήρεμες αγκυροβολίες.",
    highlights: ["Απονήσος – κρυστάλλινα νερά", "Dragonera & Chalikiada", "SUP/κανό στον όρμο", "Χαλαρή βραδιά σε ταβερνάκι"],
  },
  Poros: {
    description:
      "Πράσινο νησί απέναντι από τον Γαλατά. Φημισμένο για το Ρολόι του, το στενό κανάλι, τα πευκοδάση και τις ήρεμες παραλίες.",
    highlights: ["Ανάβαση στο Ρολόι", "Μονή Ζωοδόχου Πηγής", "Λιμανάκι της Αγάπης", "Βόλτα στο κανάλι με tender"],
  },
  Hydra: {
    description:
      "Η κοσμοπολίτικη Ύδρα χωρίς αυτοκίνητα: πέτρινα αρχοντικά, ναυτική ιστορία και έντονη καλλιτεχνική ζωή (Λέοναρντ Κοέν, διεθνείς εκθέσεις).",
    highlights: ["Περίπατος στο λιμάνι & κανόνια", "Αρχοντικά – μουσεία", "Ηλιοβασίλεμα στο Κανόνι", "Κολύμπι στα Σπηλια"],
  },
  "Spetses": {
    description:
      "Νησί της Μπουμπουλίνας, αρχοντικό και ρομαντικό. Φημισμένο για τις άμαξες, τα παλιά αρχοντικά και την κοσμική του ατμόσφαιρα.",
    highlights: ["Μουσείο Μπουμπουλίνας", "Βόλτα στην Ντάπια", "Παραλία Αγ. Παρασκευή", "Βραδινή ζωή & κοκτέιλ"],
  },
  "Porto Cheli": {
    description:
      "Κλειστός, προστατευμένος κόλπος στην Ερμιονίδα με πολλές επιλογές αγκυροβολίας. Βάση για εξορμήσεις σε Σπέτσες/Ύδρα.",
    highlights: ["Ήρεμες αγκυρoβολίες", "Θαλάσσια παιχνίδια", "Φρέσκο ψάρι", "Short hop προς Σπέτσες"],
  },
  Ermioni: {
    description:
      "Παραθαλάσσια κωμόπολη σε στενό χερσόνησο, με πευκόφυτο Μπίστι. Ηρεμία, καλές ταβέρνες και όμορφος περίπατος.",
    highlights: ["Περίπατος στο Μπίστι", "Θαλασσινά στην παραλία", "Ήσυχη βραδιά", "Βάση για κοντινά μπάνια"],
  },
  // Μπορείς να προσθέσεις κι άλλα προοδευτικά (Κυκλάδες κ.λπ.)
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
    } catch {
      /* ignore */
    }
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
  } catch {
    /* ignore */
  }

  return card;
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
  // Συλλέγουμε μοναδικούς προορισμούς (to)
  const destNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of plan) if (d.leg?.to) set.add(d.leg.to);
    return Array.from(set);
  }, [plan]);

  // Cache για Wikipedia εμπλουτισμό
  const [wiki, setWiki] = useState<Record<string, WikiCard | null>>({});

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
          const hasLeg = !!d.leg;
          const to = d.leg?.to ?? "";
          const img = thumbs?.[to] || wiki[to]?.imageUrl;
          const wx = destWeather?.[to];

          // Κείμενο: curated πρώτα, διαφορετικά Wikipedia summary
          const curated = DEST_INFO[to];
          const summary = wiki[to]?.summary?.trim();
          const mainDesc = curated?.description || summary || "";

          const hi = (curated?.highlights || []).slice(0, 6);

          return (
            <div
              key={d.day}
              className="rounded-2xl border overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="grid sm:grid-cols-[120px_1fr_260px] gap-0">
                {/* Day pill */}
                <div className="bg-neutral-50 p-4 flex flex-col items-start justify-center">
                  <div className="text-3xl font-semibold leading-none">{d.day}</div>
                  <div className="text-xs uppercase tracking-wider text-neutral-500">Day</div>
                </div>

                {/* Main */}
                <div className="p-4">
                  <div className="text-sm text-neutral-500">{formatDate(d.date)}</div>

                  {hasLeg ? (
                    <>
                      <div className="mt-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-lg font-semibold">
                            {d.leg!.from} → {d.leg!.to}
                          </div>
                          <div className="mt-1 text-sm text-neutral-600">
                            {Math.round(d.leg!.nm)} nm • {formatHoursHM(d.leg!.hours)}
                            {d.leg!.eta ? (
                              <>
                                {" "}
                                • Depart {d.leg!.eta.dep} • Arrive {d.leg!.eta.arr} ({d.leg!.eta.window})
                              </>
                            ) : null}
                          </div>

                          {/* Live Weather chips */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {wx && <span className="rounded-full border px-2 py-1">Weather: {wx.label ?? "—"}</span>}
                            {wx?.tempC != null && (
                              <span className="rounded-full border px-2 py-1">🌡 {wx.tempC}°C</span>
                            )}
                            {wx?.cloudPct != null && (
                              <span className="rounded-full border px-2 py-1">☁️ {wx.cloudPct}%</span>
                            )}
                            {wx?.precipMM != null && (
                              <span className="rounded-full border px-2 py-1">🌧 {wx.precipMM} mm/h</span>
                            )}
                          </div>
                        </div>

                        {/* Image */}
                        {img && (
                          <img
                            src={img}
                            alt={to}
                            className="h-24 w-40 shrink-0 rounded-md object-cover ring-1 ring-black/5"
                            loading="lazy"
                          />
                        )}
                      </div>

                      {/* Descriptions */}
                      {mainDesc && (
                        <p className="mt-3 text-[15px] leading-relaxed text-neutral-800">
                          {mainDesc}
                          {!curated?.description && summary ? (
                            <span className="text-neutral-500 text-sm"> (Πηγή: Wikipedia)</span>
                          ) : null}
                        </p>
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

                {/* Highlights column */}
                <div className="p-4 border-l bg-neutral-50">
                  <div className="text-sm font-medium mb-1">Highlights</div>
                  {hi.length ? (
                    <ul className="text-sm text-neutral-700 space-y-1 list-disc pl-5">
                      {hi.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-neutral-500">Swim stop, dinner ashore, golden-hour cruise.</div>
                  )}

                  {/* Wikipedia link if available */}
                  {wiki[to]?.sourceUrl && (
                    <div className="mt-3">
                      <a
                        href={wiki[to]!.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-neutral-600 hover:text-neutral-800"
                        title="Πηγή: Wikipedia (εξωτερικός σύνδεσμος)"
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

        {/* CTA */}
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
