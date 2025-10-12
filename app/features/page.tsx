import Link from "next/link";

type Feature = {
  title: string;
  text: string;
  icon: JSX.Element;
};

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

const features: Feature[] = [
  {
    title: "AI Auto Planner",
    text:
      "Δώσε start/end, μέρες, ταχύτητα & προαιρετικά via — πάρε έτοιμο itinerary με εκτιμήσεις χρόνου/καυσίμου, λιμάνια και highlights.",
    icon: IconAI,
  },
  {
    title: "Custom Mode",
    text:
      "Χτίσε το ταξίδι χειροκίνητα, μέρα-μέρα, με autocomplete όλων των ελληνικών λιμανιών, αποστάσεις και σημειώσεις πληρώματος.",
    icon: IconWrench,
  },
  {
    title: "PDF Export",
    text:
      "Καθαρό, branded PDF για guests/crew — summary, day cards, highlights & map. Έτοιμο για email ή εκτύπωση.",
    icon: IconPDF,
  },
  {
    title: "Weather & Hints",
    text:
      "Live weather hints (άνεμοι/εναλλακτικές), προτάσεις overnight και anchorages, tuned για ελληνικά νησιά.",
    icon: IconCloud,
  },
  {
    title: "Distance & Fuel",
    text:
      "Αυτόματοι υπολογισμοί ναυτικών μιλίων, χρόνου πλεύσης και κατανάλωσης βάσει ταχύτητας/ώρας μηχανής.",
    icon: IconFuel,
  },
  {
    title: "Interactive Sea Map",
    text:
      "Διαδραστικός χάρτης με στάσεις/waypoints. Δες την πορεία και μοιράσου link με τον πελάτη.",
    icon: IconMap,
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header + subcopy */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
          Features
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          AI itinerary drafts, live weather hints, guest &amp; crew notes, fuel estimates and
          crisp PDF exports — all tuned for Greek island charters.
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

      {/* Features grid */}
      <section className="pb-12 md:pb-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="
                  group relative rounded-2xl border
                  border-[#c4a962]/35 bg-white p-5 shadow-sm
                  transition hover:shadow-lg hover:border-[#c4a962]/60
                "
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-[#c4a962]/0 transition group-hover:ring-2 group-hover:ring-[#c4a962]/30" />
                <div className="flex items-start gap-3">
                  <span className="text-[#c4a962]">{f.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-brand-navy">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/ai"
              className="rounded-2xl bg-[#c4a962] px-5 py-3 text-sm font-semibold text-[#0b1220] shadow-sm ring-1 ring-black/10 hover:opacity-90 transition"
            >
              Try AI Planner
            </Link>
            <Link
              href="/#trial"
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
