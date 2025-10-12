"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

/* ======================= Types ======================= */
type Feature = {
  title: string;
  text: string;
  icon: ReactNode;
  bullets?: string[];
};

/* ======================= Icons ======================= */
const IconAI = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
const IconWrench = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 3a7 7 0 0 1-9.9 9.9L7 17l-4 4 4-4 4.1-4.1A7 7 0 0 1 21 3Z" />
  </svg>
);
const IconPDF = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h5M8 17h8" />
  </svg>
);
const IconCloud = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.7 1A4.5 4.5 0 0 0 6.5 19Z" />
  </svg>
);
const IconFuel = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 21V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14H3Z" />
    <path d="M16 7h2l2 2v7a3 3 0 0 1-3 3h-1" />
    <path d="M6 10h6" />
  </svg>
);
const IconMap = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" />
    <path d="M9 3v15M15 6v15" />
  </svg>
);

/* ======================= Data ======================= */
const features: Feature[] = [
  {
    title: "AI Auto Planner",
    text:
      "Δώσε start/end, μέρες, ταχύτητα & προαιρετικά via — πάρε έτοιμο itinerary με εκτιμήσεις χρόνου/καυσίμου, στάσεις και προτάσεις.",
    icon: IconAI,
    bullets: ["Αποστάσεις & χρόνοι αυτόματα", "Προτεινόμενα overnight", "Συμβουλές για νησιά/λιμάνια"],
  },
  {
    title: "Custom Mode",
    text:
      "Χτίσε χειροκίνητα το ταξίδι, μέρα-μέρα, με autocomplete όλων των ελληνικών λιμανιών και προσωπικές σημειώσεις.",
    icon: IconWrench,
    bullets: ["Drag & reorder ημερών", "Σημειώσεις για crew/guests", "Συμπλήρωση waypoint εύκολα"],
  },
  {
    title: "PDF Export",
    text:
      "Καθαρό branded PDF για guests/crew: summary, day cards, highlights & χάρτης. Έτοιμο για email/εκτύπωση.",
    icon: IconPDF,
    bullets: ["Logo/branding", "Τέλειο για προσφορές", "Έκδοση light/detailed"],
  },
  {
    title: "Weather Hints",
    text:
      "Live hints για ανέμους & εναλλακτικές, ώστε να αποφεύγεις εκτεθειμένα σκέλη με τον πιο ήρεμο τρόπο.",
    icon: IconCloud,
    bullets: ["Άνεμοι/ριπές", "Safe alternatives", "Προτεινόμενα αγκυροβόλια"],
  },
  {
    title: "Fuel & Time Estimator",
    text:
      "Αυτόματοι υπολογισμοί ναυτικών μιλίων, χρόνου πλεύσης και κατανάλωσης βάσει ταχύτητας και ωρών.",
    icon: IconFuel,
    bullets: ["Ν.Μ. & ώρες", "Κατανάλωση/ημέρα", "Σύνολα ταξιδιού"],
  },
  {
    title: "Interactive Sea Map",
    text:
      "Διαδραστικός χάρτης με στάσεις/waypoints. Δες την πορεία και μοιράσου ασφαλές link με τον πελάτη.",
    icon: IconMap,
    bullets: ["Zoom σε στάσεις", "Shareable link", "Επισκόπηση διαδρομής"],
  },
];

/* ======================= UI helpers ======================= */
function Tick({ on }: { on?: boolean }) {
  return (
    <span
      className={
        on
          ? "inline-block h-3 w-3 rounded-full bg-emerald-500"
          : "inline-block h-3 w-3 rounded-full bg-slate-300"
      }
    />
  );
}

/* ======================= Intro Gate (Video) ======================= */
/** Fullscreen intro video. Autoplay/muted/playsInline for mobile, Skip button, auto-fallback in 5s. */
function IntroGate({ onDone }: { onDone: () => void }) {
  const vidRef = useRef<HTMLVideoElement | null>(null);

  // Respect reduced motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) onDone();
  }, [onDone]);

  // Safety timeout in case autoplay fails or file is heavy
  useEffect(() => {
    const t = setTimeout(() => onDone(), 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <video
        ref={vidRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        preload="metadata"
        poster="/hero-poster.png"
        onEnded={onDone}
        onError={onDone}
      >
        {/* Έχεις ήδη αυτό το αρχείο: /public/videos/navigoplan-intro.mp4 */}
        <source src="/videos/navigoplan-intro.mp4" type="video/mp4" />
      </video>

      {/* Soft gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Tagline (optional) */}
      <div className="absolute inset-x-0 bottom-10 flex items-center justify-center">
        <div className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10">
          Navigoplan — Luxury Yacht Charter Itineraries
        </div>
      </div>

      {/* Skip */}
      <button
        type="button"
        onClick={onDone}
        className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-black/10 hover:bg-white"
        aria-label="Skip intro"
      >
        Skip
      </button>
    </div>
  );
}

/* ======================= Page ======================= */
export default function FeaturesPage() {
  const [showIntro, setShowIntro] = useState(true);
  const handleIntroDone = () => setShowIntro(false);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {showIntro && <IntroGate onDone={handleIntroDone} />}

      {/* Header */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">Features</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          AI itinerary drafts, live weather hints, guest &amp; crew notes, fuel estimates and crisp PDF exports — all
          tuned for Greek island charters.
        </p>

        {/* Quick CTAs */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/#trial"
            className="rounded-full border border-[#c4a962] px-5 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition"
          >
            Start Free Trial
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            See Pricing
          </Link>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="mb-3 text-center text-xs uppercase tracking-widest text-slate-500">
            Made for Greece — Saronic • Cyclades • Ionian • Dodecanese • Sporades • North Aegean • Crete
          </p>
          <div className="grid grid-cols-2 gap-3 opacity-80 sm:grid-cols-4 md:grid-cols-7">
            {["Saronic", "Cyclades", "Ionian", "Dodecanese", "Sporades", "North Aegean", "Crete"].map((r) => (
              <div
                key={r}
                className="flex h-9 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-500"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="group relative rounded-2xl border border-[#c4a962]/35 bg-white p-5 shadow-sm transition hover:shadow-lg hover:border-[#c4a962]/60"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#c4a962]">{f.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-brand-navy">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                    {f.bullets && (
                      <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                        {f.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#c4a962]" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-semibold text-brand-navy">How it works</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Add basics", d: "Start/end, dates, speed & προαιρετικά vias." },
              { n: "2", t: "Tune itinerary", d: "Διόρθωσε μέρες/stops, πρόσθεσε σημειώσεις." },
              { n: "3", t: "Share/Export", d: "Στείλε link ή καθαρό branded PDF στον πελάτη." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-[#c4a962] text-lg font-semibold">{s.n}</div>
                <div className="mt-1 font-medium text-brand-navy">{s.t}</div>
                <p className="mt-1 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro / VIP comparison */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-semibold text-brand-navy">Pro &amp; VIP</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Level up with weather layers, Crew Mode, private notes και branding.
          </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-1/2 px-4 py-3 font-medium text-slate-600">Feature</th>
                  <th className="w-1/6 px-4 py-3 font-medium text-slate-600">Free</th>
                  <th className="w-1/6 px-4 py-3 font-medium text-slate-600">Pro</th>
                  <th className="w-1/6 px-4 py-3 font-medium text-slate-600">VIP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["AI / Custom Planner", true, true, true],
                  ["Greek Ports DB", true, true, true],
                  ["Dashed Route (water-only)", true, true, true],
                  ["Guest PDF (GR/EN)", true, true, true],
                  ["Crew PDF", false, true, true],
                  ["Weather badges", true, true, true],
                  ["Weather layers (map)", false, true, true],
                  ["Crew Mode (ops details)", false, true, true],
                  ["Private notes / blacklist", false, true, true],
                  ["Branding (logo/colors)", false, true, true],
                  ["Share & versioning", false, true, true],
                  ["VIP PDF pack", false, false, true],
                ].map(([name, free, pro, vip]) => (
                  <tr key={name as string} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-800">{name as string}</td>
                    <td className="px-4 py-3"><Tick on={free as boolean} /></td>
                    <td className="px-4 py-3"><Tick on={pro as boolean} /></td>
                    <td className="px-4 py-3"><Tick on={vip as boolean} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PDF previews */}
      <section className="border-t bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-semibold text-brand-navy">PDF Gallery</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Guest vs Crew templates, bilingual, με το λογότυπό σου και τα brand colors.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { title: "Guest PDF", tag: "Polished" },
              { title: "Crew PDF", tag: "Detailed" },
              { title: "VIP PDF", tag: "Branded" },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200" />
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-brand-navy">{p.title}</div>
                    <div className="text-xs text-slate-500">{p.tag}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="#" className="text-xs font-semibold text-[#c4a962] hover:underline">
                      Preview
                    </Link>
                    <Link href="#" className="text-xs font-semibold text-slate-700 hover:underline">
                      Download
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            *Βάλε αργότερα πραγματικά δείγματα αρχείων (.pdf) στα παραπάνω links.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-xl font-semibold text-brand-navy">FAQ</h2>
          <div className="mt-4 space-y-3">
            {[
              {
                q: "Μπορώ να αλλάξω χειροκίνητα τις στάσεις που προτείνει το AI;",
                a: "Ναι. Το σχέδιο είναι απλώς μια βάση. Με το Custom Mode ρυθμίζεις μέρες, στάσεις και σημειώσεις όπως θες.",
              },
              {
                q: "Τα καύσιμα υπολογίζονται αυτόματα;",
                a: "Ναι, βάσει ταχύτητας και αποστάσεων/ωρών. Μπορείς να αλλάξεις τις παραμέτρους για ακριβέστερα estimates.",
              },
              {
                q: "Γίνεται export σε PDF με το λογότυπό μου;",
                a: "Βεβαίως. Υποστηρίζουμε branded PDF export με summary και day cards.",
              },
              {
                q: "Μπορώ να μοιραστώ το itinerary με link;",
                a: "Ναι, υπάρχει shareable link για να βλέπουν οι πελάτες την πορεία και τις στάσεις.",
              },
            ].map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm">
                <summary className="cursor-pointer select-none font-medium text-brand-navy">{f.q}</summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="border-t bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-xl font-semibold text-brand-navy">Roadmap</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Weather+", d: "Gusts & waves overlays με quick risk badges." },
              { t: "Offline mode", d: "Πλάνα & προβολή saved routes με ασθενές Wi-Fi." },
              { t: "AIS filters", d: "Βασική εικόνα κίνησης γύρω από επόμενη στάση." },
              { t: "Auto day splits", d: "Σπάει μακριά σκέλη σε ισορροπημένες ημέρες." },
              { t: "iPad app", d: "Touch-first UI για bridge workflows." },
              { t: "Private notes", d: "Προσωπικά σχόλια/blacklist spots ανά χρήστη." },
            ].map((i) => (
              <div key={i.t} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="font-medium text-brand-navy">{i.t}</div>
                <p className="mt-1 text-sm text-slate-600">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status / Changelog strip */}
      <section className="border-y">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>All systems operational</span>
          </div>
          <Link href="/changelog" className="text-[#c4a962] hover:underline">
            What’s new →
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h3 className="text-2xl font-semibold text-brand-navy">
            Plan, price & present itineraries your clients will love.
          </h3>
          <p className="mt-2 text-slate-600">
            Δοκίμασέ το δωρεάν — χωρίς κάρτα. Μπορείς να ακυρώσεις οποιαδήποτε στιγμή.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/#trial"
              className="rounded-2xl bg-[#c4a962] px-6 py-3 text-sm font-semibold text-[#0b1220] shadow-sm ring-1 ring-black/10 hover:opacity-90 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/ai"
              className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition"
            >
              Try AI Planner
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
