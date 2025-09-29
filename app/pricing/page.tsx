export default function PricingPage() {
  const plans = [
    {
      name: "Free Trial",
      price: "€0",
      tagline: "Try Navigoplan with no commitment.",
      features: ["1 itinerary", "Read-only sharing", "Email support"],
      cta: "Start Free",
      featured: false,
    },
    {
      name: "Yacht",
      price: "€125 / month",
      tagline: "For captains & boutique operators.",
      features: [
        "Unlimited itineraries",
        "Route Planner",
        "APA/VAT automation",
        "Experiences",
        "Shareable proposals",
      ],
      cta: "Choose Yacht",
      featured: true,
    },
    {
      name: "Pro",
      price: "€250 / month",
      tagline: "For brokers managing multiple yachts.",
      features: ["All Yacht features", "White-label links", "Import/Export", "Priority support"],
      cta: "Choose Pro",
      featured: false,
    },
  ];

  return (
    <div className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-navy">Pricing</h1>
          <p className="mt-2 text-slate-600">Transparent plans built for charter operations.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 shadow-sm transition ${
                p.featured
                  ? "border-2 border-brand-navy bg-brand-navy text-white hover:shadow-md"
                  : "border border-brand-gold/40 bg-white text-slate-900 hover:shadow-md"
              }`}
            >
              {p.featured && (
                <div className="mb-3 inline-block rounded-full bg-brand-gold px-3 py-1 text-xs font-medium text-brand-navy">
                  Most Popular
                </div>
              )}
              <div className="text-xl font-semibold">{p.name}</div>
              <div className={`mt-2 text-3xl font-bold ${p.featured ? "text-brand-gold" : "text-brand-navy"}`}>
                {p.price}
              </div>
              <p className={`mt-1 text-sm ${p.featured ? "text-slate-200" : "text-slate-600"}`}>{p.tagline}</p>

              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span
                      className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                        p.featured ? "bg-brand-gold" : "bg-brand-navy"
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/#trial"
                className={`mt-6 inline-block w-full rounded-xl px-4 py-3 text-center text-sm font-medium ${
                  p.featured
                    ? "bg-brand-gold text-brand-navy hover:opacity-90"
                    : "border border-brand-navy text-brand-navy hover:bg-brand-gold hover:text-brand-navy"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Prices exclude VAT where applicable. You can cancel anytime.
        </p>
      </section>
    </div>
  );
}
