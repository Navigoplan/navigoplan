import Link from "next/link";
import type { ReactNode } from "react";

type Feature = {
  title: string;
  text: string;
  icon: ReactNode;
};

const IconAI = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 18v3m12h3m12h3M12 18v3m0 0v3m-3-6h3m3 3v3m-6 0h3" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const IconWrench = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 3a7 7 0 0 1-9.9 9.9L3 21l3-3m15-15a7 7 0 0 1-9.9 9.9L3 21l3-3" />
  </svg>
);

const IconPDF = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2v6a2 2 0 0 0 2 2h6" />
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  </svg>
);

const features: Feature[] = [
  {
    title: "AI Auto Planner",
    text: "Δώσε start/end, μέρες, ταχύτητα & προαιρετικά vias — πάρε έτοιμο σχέδιο με εκτιμήσεις χρόνου/καυσίμου.",
    icon: IconAI,
  },
  {
    title: "Custom Mode",
    text: "Φτιάξε χειροκίνητα το itinerary μέρα-μέρα με autocomplete όλων των λιμανιών της Ελλάδας.",
    icon: IconWrench,
  },
  {
    title: "PDF Export",
    text: "Καθαρό PDF για guests/crew με summary & day cards. Branded εκδόσεις σύντομα.",
    icon: IconPDF,
  },
];

export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-brand-navy">Features</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        AI itinerary drafts, live weather hints, guest & crew notes, fuel estimates and crisp PDF exports — all tuned
        for Greek island charters.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3 text-brand-navy">
              {f.icon}
              <h3 className="font-semibold text-lg">{f.title}</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <Link
          href="/ai"
          className="rounded-xl bg-brand-navy px-5 py-2 text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy transition"
        >
          Try the AI Planner
        </Link>
        <Link href="/pricing" className="text-sm text-brand-navy underline hover:text-brand-gold transition">
          See Pricing
        </Link>
      </div>
    </section>
  );
}
