"use client";
import React, { useMemo } from "react";

/* ========= Local type definitions ========= */
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
type DayCard = { day: number; date: string; leg?: Leg; notes?: string };
type SpotWeather = {
  tempC?: number;
  precipMM?: number;
  cloudPct?: number;
  label?: string;
  windKts?: number;
  gustKts?: number;
};

export type LegMeteo = {
  index: number;
  from: string;
  to: string;
  avgWind: number;
  avgWave: number;
  maxWind: number;
  maxWave: number;
};

/* ========= Utility helpers ========= */
function formatHoursHM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
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
function ktToBeaufort(kt?: number) {
  const v = kt ?? 0;
  const scale = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
  const idx = scale.findIndex((s) => v < s);
  return idx === -1 ? 12 : idx;
}
function bftLabel(b: number) {
  const arr = [
    "Άπνοια",
    "Σιγανός αέρας",
    "Ελαφρύ αεράκι",
    "Ήπιος άνεμος",
    "Μέτριος άνεμος",
    "Ισχυρός άνεμος",
    "Πολύ ισχυρός",
    "Σχεδόν θυελλώδης",
    "Θυελλώδης",
    "Ισχυρά θυελλώδης",
    "Θύελλα",
    "Σφοδρή θύελλα",
    "Τυφώνας",
  ];
  return arr[b] ?? "";
}
function pickText(obj: any, lang: "el" | "en" = "el") {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "object") return obj[lang] || obj.el || obj.en || "";
  return "";
}
function renderVhf(vhf: any) {
  if (!vhf) return null;
  if (typeof vhf === "string") return vhf;
  if (typeof vhf === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(vhf)) {
      if (!v) continue;
      parts.push(`${k.replace(/_/g, " ")}: ${String(v)}`);
    }
    return parts.join(" • ");
  }
  return null;
}

/* ========= Facilities UI helpers ========= */
const FAC_ICON: Record<string, string> = {
  water: "💧",
  electricity: "🔌",
  fuel: "⛽",
  restaurants: "🍽️",
  shops: "🛍️",
  atm: "🏧",
  showers: "🚿",
  laundry: "🧺",
  repairs: "🛠️",
  provisions: "🥫",
  berths: "🛳️",
  berth: "🛳️",
  wifi: "📶",
  pharmacy: "💊",
  supermarket: "🛒",
  taxi: "🚕",
  hospital: "🏥",
};

function titleizeKey(k: string) {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function FacilityChip({
  k,
  v,
}: {
  k: string;
  v: any;
}) {
  const icon = FAC_ICON[k] ?? "✅";
  // Hide false / null / empty
  if (v === false || v == null) return null;

  // boolean true -> icon + label
  if (v === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800">
        <span>{icon}</span>
        <span>{titleizeKey(k)}</span>
      </span>
    );
  }

  // string/number -> icon + label + short detail
  const s = String(v).trim();
  if (!s) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800">
      <span>{icon}</span>
      <span className="font-medium">{titleizeKey(k)}</span>
      <span className="text-slate-600">• {s}</span>
    </span>
  );
}

/* ========= VHF + Hazards (seed) ========= */
const VHF_MAP: Record<string, string> = {
  Alimos: "71",
  Aegina: "12",
  Poros: "12",
  Hydra: "12",
  Spetses: "—",
  "Porto Cheli": "—",
  Mykonos: "—",
  Paros: "—",
  Naxos: "—",
  Milos: "—",
};

const HAZARDS_MAP: Record<string, { label: string; sev: number; note?: string }[]> = {
  Hydra: [
    { label: "Στενός λιμένας", sev: 2, note: "Περιορισμένοι ελιγμοί." },
    { label: "Surge από διερχόμενα", sev: 2, note: "Ferries/traffic." },
  ],
  Poros: [
    { label: "Πλευρικό ρεύμα στο στενό", sev: 1 },
    { label: "Φυκιάδες / κακό πιάσιμο", sev: 1, note: "Δοκίμασε δύο φορές για set." },
  ],
  "Porto Cheli": [
    { label: "Ρηχά άκρα/χείλη", sev: 1 },
    { label: "Μπερδέματα αλυσίδων", sev: 1 },
  ],
  Mykonos: [
    { label: "Ριπές Μελτεμιού", sev: 2 },
    { label: "Κυματισμός από ferries", sev: 1 },
  ],
  Aegina: [
    { label: "Μεγάλη κίνηση (traffic)", sev: 1 },
    { label: "Wash από ferries", sev: 1 },
  ],
};

/* ========= Operational Warnings ========= */
type Sev = "info" | "warn" | "alert";
type Warn = { sev: Sev; text: string };

function warnClass(sev: Sev) {
  if (sev === "alert") return "bg-rose-100 text-rose-800 border-rose-200";
  if (sev === "warn") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-sky-200";
}

function computeWarnings(l?: Leg, wx?: SpotWeather): Warn[] {
  const out: Warn[] = [];
  if (!l) return out;

  const bft = ktToBeaufort(wx?.windKts);
  if (bft >= 7) {
    out.push({
      sev: "alert",
      text: `Ισχυροί άνεμοι: Bft ${bft} (${bftLabel(bft)}). Πρόσεξε δεσίματα και χειρισμούς.`,
    });
  } else if (bft >= 5) {
    out.push({
      sev: "warn",
      text: `Ενισχυμένος άνεμος: Bft ${bft} (${bftLabel(bft)}). Πιθανές ριπές/πλευρικοί άνεμοι.`,
    });
  }

  if ((wx?.precipMM ?? 0) >= 0.5 || (wx?.label ?? "").toLowerCase().includes("rain")) {
    out.push({ sev: "alert", text: "Βροχή — ολισθηρά καταστρώματα & μειωμένη ορατότητα." });
  }
  if ((wx?.cloudPct ?? 0) >= 85) {
    out.push({
      sev: "warn",
      text: "Πυκνή νέφωση — μειωμένη αντίθεση ορίζοντα, έλεγχος φώτων/σημαντήρων.",
    });
  }

  if (l.hours >= 3.5) {
    out.push({
      sev: "warn",
      text: `Μεγάλη πλεύση (~${formatHoursHM(l.hours)}) — rotations, snacks, securing.`,
    });
  }

  const [h, m] = l.eta?.arr?.split(":").map(Number) ?? [];
  if (h > 18 || (h === 18 && (m ?? 0) >= 30)) {
    out.push({
      sev: "warn",
      text: "Άφιξη κοντά στο σούρουπο — έλεγχος searchlight/φώτων καταστρώματος.",
    });
  }

  return out;
}

/* ========= Main Component ========= */
export default function CaptainCrewToolkit({
  plan,
  startDate,
  yachtType,
  speed,
  lph,
  thumbs = {},
  destWeather = {},
  legMeteo = [],
  seaGuideDetails = {},
}: {
  plan: DayCard[];
  startDate: string;
  yachtType: YachtType;
  speed: number;
  lph: number;
  thumbs?: Record<string, string | undefined>;
  destWeather?: Record<string, SpotWeather>;
  legMeteo?: LegMeteo[];
  seaGuideDetails?: Record<string, any>;
}) {
  const summary: { day: number; port?: string; sev: Sev; text: string }[] = [];
  for (const d of plan) {
    const l = d.leg;
    const wx = l ? destWeather[l.to] : undefined;
    const warns = computeWarnings(l, wx);
    if (warns.length) {
      const top = warns.find((w) => w.sev === "alert") ?? warns[0];
      summary.push({ day: d.day, port: l?.to, sev: top.sev, text: top.text });
    }
  }

  const stopOrder: string[] = Array.from(
    new Set([plan?.[0]?.leg?.from, ...plan.map((d) => d.leg?.to)].filter(Boolean) as string[])
  );

  // Globals (SeaGuide)
  const seaGuideLoaded = (window as any).__NAVIGOPLAN_SEAGUIDE__?.count ?? 0;
  const sgLookup = (window as any).__NAVIGOPLAN_SEAGUIDE_LOOKUP__ as undefined | ((stop: string, port?: any) => any);
  const sgExtract = (window as any).__NAVIGOPLAN_SEAGUIDE_EXTRACT__ as undefined | ((entry: any, lang?: "el" | "en") => any);

  const seaGuideByStop = useMemo(() => {
    const out: Record<string, any | null> = {};
    for (const stop of stopOrder) {
      if ((seaGuideDetails as any)?.[stop]) {
        out[stop] = (seaGuideDetails as any)[stop];
        continue;
      }
      if (!sgLookup) {
        out[stop] = null;
        continue;
      }
      const variants = [
        stop,
        stop.replace(/^Island of\s+/i, "").trim(),
        stop.replace(/\s*\([^)]+\)\s*/g, " ").trim(),
      ].filter(Boolean);

      let found: any | null = null;
      for (const v of variants) {
        const hit = sgLookup(v, null);
        if (hit) {
          found = hit;
          break;
        }
      }
      out[stop] = found;
    }
    return out;
  }, [stopOrder, seaGuideDetails, sgLookup]);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* HEADER (more readable) */}
      <div className="relative h-28 bg-gradient-to-r from-[#071a2e] via-[#0b2d52] to-[#071a2e]">
        <div className="absolute inset-0 opacity-10 [background:radial-gradient(80%_60%_at_70%_30%,white,transparent)]" />
        <div className="relative h-full flex items-center px-6">
          <div>
            <div className="text-xs uppercase text-neutral-200 tracking-wider">
              Navigoplan • Captain & Crew Toolkit
            </div>
            <h2 className="text-2xl font-semibold text-white drop-shadow-sm">
              Operational Plan
            </h2>
            <div className="text-neutral-200 text-sm">
              Από {formatDate(startDate)} • {plan.length} days • {speed} kn{" "}
              {yachtType === "Motor" ? `• ${lph} L/h` : "• Sailing"}
            </div>
          </div>
        </div>
      </div>

      {/* In-transit weather per leg */}
      <div className="px-6 pt-5">
        <div className="mb-2 text-sm font-semibold text-neutral-800">
          In-transit weather per leg
        </div>
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b">
                <th className="text-left px-3 py-2">Leg</th>
                <th className="text-left px-3 py-2">Avg wind (m/s)</th>
                <th className="text-left px-3 py-2">Avg wave (m)</th>
                <th className="text-left px-3 py-2">Max wind</th>
                <th className="text-left px-3 py-2">Max wave</th>
              </tr>
            </thead>
            <tbody>
              {legMeteo.length ? (
                legMeteo.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-3 py-2">
                      {r.from} → {r.to}
                    </td>
                    <td className="px-3 py-2">{Number.isFinite(r.avgWind) ? r.avgWind : "—"}</td>
                    <td className="px-3 py-2">{Number.isFinite(r.avgWave) ? r.avgWave : "—"}</td>
                    <td className="px-3 py-2">{Number.isFinite(r.maxWind) ? r.maxWind : "—"}</td>
                    <td className="px-3 py-2">{Number.isFinite(r.maxWave) ? r.maxWave : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    — No data yet. Αυτό γεμίζει όταν το RouteMapClient υπολογίσει meteo πάνω στη διαδρομή —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY */}
      {summary.length > 0 && (
        <div className="px-6 pt-4">
          <div className="mb-2 text-sm font-semibold text-neutral-800">
            Βασικές προειδοποιήσεις (auto)
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.map((w) => (
              <div
                key={w.day}
                className={`border rounded-full px-3 py-1 text-sm ${warnClass(w.sev)}`}
                title={`Day ${w.day}${w.port ? ` • ${w.port}` : ""}`}
              >
                <b>Day {w.day}</b>
                {w.port && <> • {w.port}</>} — {w.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="p-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-100 text-neutral-700">
              <th className="px-3 py-2 text-left">Day</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">From → To</th>
              <th className="px-3 py-2 text-left">NM</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-left">Depart</th>
              <th className="px-3 py-2 text-left">Arrive</th>
              <th className="px-3 py-2 text-left">Live Weather 🟢</th>
              <th className="px-3 py-2 text-left">Live Wind & Waves 🟢</th>
              <th className="px-3 py-2 text-left">VHF</th>
              <th className="px-3 py-2 text-left">Hazards</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((d) => {
              const l = d.leg;
              const wx = l ? destWeather[l.to] : undefined;
              const bft = ktToBeaufort(wx?.windKts);
              const warns = computeWarnings(l, wx);
              const localHaz = l?.to ? HAZARDS_MAP[l.to] ?? [] : [];

              return (
                <tr key={d.day} className="border-t align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 font-medium">{d.day}</td>
                  <td className="px-3 py-2">{formatDate(d.date)}</td>
                  <td className="px-3 py-2 font-medium text-brand-navy">
                    {l ? `${l.from} → ${l.to}` : "—"}
                  </td>
                  <td className="px-3 py-2">{l?.nm ?? "—"}</td>
                  <td className="px-3 py-2">{l ? formatHoursHM(l.hours) : "—"}</td>
                  <td className="px-3 py-2">{l?.eta?.dep ?? "—"}</td>
                  <td className="px-3 py-2">{l?.eta?.arr ?? "—"}</td>

                  <td className="px-3 py-2 text-xs">
                    {wx ? (
                      <>
                        {wx.label ?? "—"} {wx.tempC != null && <>({wx.tempC}°C)</>}
                        {wx.cloudPct != null && <> • ☁ {wx.cloudPct}%</>}
                        {wx.precipMM != null && <> • 🌧 {wx.precipMM}mm</>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-3 py-2 text-xs">
                    {wx?.windKts != null ? (
                      <>
                        {Math.round(wx.windKts)} kt • Bft {bft} ({bftLabel(bft)})
                        {wx.gustKts != null && <> • ριπές {Math.round(wx.gustKts)} kt</>}
                        <div className="mt-1 text-[11px] text-slate-500">
                          Waves: (coming soon)
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-3 py-2">{l?.to ? VHF_MAP[l.to] ?? "—" : "—"}</td>

                  <td className="px-3 py-2">
                    {localHaz.length > 0 || warns.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {localHaz.map((h, i) => (
                          <span
                            key={`h-${i}`}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${
                              h.sev >= 2
                                ? "bg-amber-100 border-amber-200"
                                : "bg-neutral-100 border-neutral-200"
                            }`}
                            title={h.note}
                          >
                            ⚠ {h.label}
                          </span>
                        ))}
                        {warns.map((w, i) => (
                          <span
                            key={`w-${i}`}
                            className={`inline-block border rounded-full px-2 py-0.5 text-xs ${warnClass(
                              w.sev
                            )}`}
                          >
                            {w.text}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Captain’s Operational Brief (Sea Guide) */}
      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-neutral-800">
                Captain’s Operational Brief (Sea Guide)
              </div>
              <div className="mt-1 text-xs text-slate-500">
                VHF • Contacts • Seasonal Weather Patterns 🔵 • Approach • Anchorage • Protection • Mooring • Hazards • Captain Tips • VIP • Facilities
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              SeaGuide loaded: <b>{seaGuideLoaded}</b>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {stopOrder.map((stop) => {
              const entry = seaGuideByStop[stop] ?? null;
              const extracted = entry && sgExtract ? sgExtract(entry, "el") : null;

              const vhf = extracted?.vhf_port_authority || renderVhf(entry?.vhf) || null;
              const contacts = extracted?.contacts_port_authority || entry?.contacts || null;

              const weatherSummer = extracted?.weather_summer || pickText(entry?.weather?.summer, "el");
              const weatherWinter = extracted?.weather_winter || pickText(entry?.weather?.winter, "el");
              const approach = extracted?.approach || pickText(entry?.approach, "el");

              const anchMin = extracted?.anch_depth_min ?? entry?.anchorage?.depth_m?.min;
              const anchMax = extracted?.anch_depth_max ?? entry?.anchorage?.depth_m?.max;
              const anchBottom = extracted?.anch_bottom ?? entry?.anchorage?.bottom ?? [];
              const anchHolding = extracted?.anch_holding || pickText(entry?.anchorage?.holding, "el");
              const windGood = extracted?.anch_protection_good ?? entry?.anchorage?.protection?.wind_good ?? [];
              const windPoor = extracted?.anch_protection_poor ?? entry?.anchorage?.protection?.wind_poor ?? [];

              const mooring = extracted?.mooring || pickText(entry?.mooring, "el");
              const hazards = (extracted?.hazards as string[])?.length ? extracted.hazards : (entry?.hazards?.el || entry?.hazards?.en || []);
              const tips = (extracted?.captain_tips as string[])?.length ? extracted.captain_tips : (entry?.captain_tips?.el || entry?.captain_tips?.en || []);
              const vip = extracted?.vip_info || pickText(entry?.vip_info, "el");

              return (
                <details key={stop} className="rounded-xl border border-slate-200">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate-900">
                    {stop}
                    {entry?.category ? (
                      <span className="ml-2 text-xs text-slate-500">{String(entry.category)}</span>
                    ) : null}
                    {entry?.region ? (
                      <span className="ml-2 text-xs text-slate-400">• {String(entry.region)}</span>
                    ) : null}
                  </summary>

                  <div className="border-t border-slate-200 px-3 py-3 text-sm text-slate-800">
                    {!entry ? (
                      <div className="text-xs text-slate-500">No Sea Guide match for this stop yet.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-3">
                          {vhf && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">VHF & Communications</div>
                              <div className="text-sm">{vhf}</div>
                            </div>
                          )}

                          {contacts && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Contacts</div>
                              {typeof contacts === "string" ? (
                                <div className="text-sm">{contacts}</div>
                              ) : (
                                <div className="text-sm space-y-1">
                                  {Object.entries(contacts).map(([k, v]) => (
                                    <div key={k}>
                                      <span className="text-xs text-slate-500">{String(k).replace(/_/g, " ")}:</span>{" "}
                                      <span>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {(weatherSummer || weatherWinter) && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Seasonal Weather Patterns 🔵</div>
                              {weatherSummer && (
                                <div className="mt-1">
                                  <div className="text-[11px] font-semibold text-slate-500">Summer</div>
                                  <div className="text-sm">{weatherSummer}</div>
                                </div>
                              )}
                              {weatherWinter && (
                                <div className="mt-2">
                                  <div className="text-[11px] font-semibold text-slate-500">Winter</div>
                                  <div className="text-sm">{weatherWinter}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {approach && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Approach & Entry</div>
                              <div className="text-sm">{approach}</div>
                            </div>
                          )}

                          {vip && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">VIP Info</div>
                              <div className="text-sm">{vip}</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {(anchMin != null || anchMax != null || anchHolding || (anchBottom?.length ?? 0) > 0) && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Anchorage Details</div>
                              {(anchMin != null || anchMax != null) && (
                                <div className="text-sm">
                                  <span className="text-xs text-slate-500">Depth:</span>{" "}
                                  {anchMin ?? "—"}–{anchMax ?? "—"} m
                                </div>
                              )}
                              {Array.isArray(anchBottom) && anchBottom.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-xs text-slate-500">Bottom:</span>{" "}
                                  {anchBottom.join(", ")}
                                </div>
                              )}
                              {anchHolding && (
                                <div className="mt-1 text-sm">
                                  <span className="text-xs text-slate-500">Holding:</span>{" "}
                                  {anchHolding}
                                </div>
                              )}
                              <div className="mt-2 text-sm">
                                <div className="text-xs font-semibold text-slate-500">Protection from Wind</div>
                                <div className="text-sm">
                                  <span className="text-xs text-slate-500">Wind good:</span>{" "}
                                  {(Array.isArray(windGood) ? windGood : []).join(", ") || "—"}
                                </div>
                                <div className="text-sm">
                                  <span className="text-xs text-slate-500">Wind poor:</span>{" "}
                                  {(Array.isArray(windPoor) ? windPoor : []).join(", ") || "—"}
                                </div>
                              </div>
                            </div>
                          )}

                          {mooring && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Mooring & Berthing</div>
                              <div className="text-sm">{mooring}</div>
                            </div>
                          )}

                          {hazards.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Hazards & Local Risks</div>
                              <ul className="mt-1 list-disc pl-5 text-sm">
                                {hazards.map((h: string, idx: number) => (
                                  <li key={idx}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {tips.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Captain’s tips</div>
                              <ul className="mt-1 list-disc pl-5 text-sm">
                                {tips.map((t: string, idx: number) => (
                                  <li key={idx}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Facilities (icons + no "true") */}
                          {entry?.facilities && typeof entry.facilities === "object" && (
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Facilities & Services</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(entry.facilities)
                                  .map(([k, v]) => <FacilityChip key={k} k={k} v={v} />)
                                  .filter(Boolean)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t bg-neutral-50 px-6 py-4 text-sm text-neutral-600">
        ⚓ Οι πληροφορίες προορίζονται για επιχειρησιακή καθοδήγηση και δεν αντικαθιστούν επίσημες Notice to Mariners ή forecast bulletins.
      </div>
    </div>
  );
}
