import Link from "next/link";

export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
        Features
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        AI itinerary drafts, live weather hints, guest &amp; crew notes, fuel
        estimates and crisp PDF exports — all tuned for Greek island charters.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-brand-navy">AI Auto Planner</h3>
          <p className="mt-1 text-sm text-slate-600">
            Δώσε start/end, μέρες, ταχύτητα &amp; προαιρετικά vias — πάρε
            έτοιμο σχέδιο με εκτιμήσεις χρόνου/καυσίμου.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-brand-navy">Custom Mode</h3>
          <p className="mt-1 text-sm text-slate-600">
            Φτιάξε χειροκίνητα το itinerary μέρα-μέρα με autocomplete όλων των
            λιμανιών της Ελλάδας.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-brand-navy">PDF Export</h3>
          <p className="mt-1 text-sm text-slate-600">
            Καθαρό PDF για guests/crew με summary &amp; day cards. Branded
            εκδόσεις σύντομα.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/ai"
          className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy"
        >
          Try the AI Planner
        </Link>
        <Link href="/pricing" className="text-sm text-brand-navy underline">
          See Pricing
        </Link>
      </div>
    </section>
  );
}
