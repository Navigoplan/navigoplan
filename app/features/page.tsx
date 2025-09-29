export default function FeaturesPage() {
  const features = [
    {
      title: "Smart Route Planner",
      desc: "Drag & drop legs, nautical distances, engine hours & fuel estimates.",
    },
    {
      title: "Pricing Automation",
      desc: "APA, VAT & fees calculated instantly with your own templates.",
    },
    {
      title: "Luxury Experiences",
      desc: "Curate beaches, restaurants, activities; attach photos & notes.",
    },
    {
      title: "Shareable Proposals",
      desc: "One beautiful link or PDF your clients will love.",
    },
    {
      title: "Import / Export",
      desc: "Bring yacht data in, export itineraries out — fast.",
    },
    {
      title: "Notifications",
      desc: "Know when clients open, view, or request changes.",
    },
  ];

  return (
    <div className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-navy">Features</h1>
          <p className="mt-2 text-slate-600">
            Everything you need to plan, price and present luxury yacht charter itineraries.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-brand-gold/40 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="text-lg font-semibold text-brand-navy">{f.title}</div>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              <div className="mt-4 text-xs text-brand-gold">Included in all plans</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <a
            href="/#trial"
            className="inline-block rounded-xl bg-brand-navy px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-gold hover:text-brand-navy"
          >
            Start Free Trial
          </a>
        </div>
      </section>
    </div>
  );
}
