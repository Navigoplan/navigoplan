import Link from "next/link";

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
        Pricing
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Ευέλικτα πλάνα για brokers και ιδιοκτήτες. Χρέωση ανά yacht / user.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy">Starter</h3>
          <p className="mt-1 text-sm text-slate-600">
            Βασικός προγραμματισμός &amp; PDF export.
          </p>
          <div className="mt-4 text-2xl font-bold">€ —</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy">Pro</h3>
          <p className="mt-1 text-sm text-slate-600">
            Weather hints, καλύτερα PDFs, fuel estimates.
          </p>
          <div className="mt-4 text-2xl font-bold">€€ —</div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-brand-navy">VIP</h3>
          <p className="mt-1 text-sm text-slate-600">
            Crew mode, branding, offline export &amp; advanced layers.
          </p>
          <div className="mt-4 text-2xl font-bold">€€€ —</div>
        </div>
      </div>

      <div className="mt-8">
        <Link
          href="/ai"
          className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy"
        >
          Start Planning
        </Link>
      </div>
    </section>
  );
}
