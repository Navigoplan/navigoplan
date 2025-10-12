"use client";

import HeroVideo from "@/app/components/HeroVideo";

export default function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[520px] overflow-hidden bg-slate-900">
      {/* Background video */}
      <HeroVideo mp4="/hero.mp4" poster="/hero-poster.png" className="absolute inset-0" />

      {/* Overlay (για αναγνωσιμότητα) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/40 animate-overlay" />

      {/* Περιεχόμενο */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="animate-title text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
          Luxury Yacht Charter Itinerary Software
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90 drop-shadow md:text-xl">
          Plan routes, estimate costs, and present stunning itineraries your clients will love.
        </p>

        {/* CTA buttons – outlined gold */}
        <div className="mt-8 flex gap-4">
          <a
            href="/ai"
            className="rounded-full border border-[var(--color-brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-gold)] bg-transparent hover:bg-[var(--color-brand-gold)]/10 transition"
          >
            Start Planning
          </a>
          <a
            href="#features"
            className="rounded-full border border-[var(--color-brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-gold)] bg-transparent hover:bg-[var(--color-brand-gold)]/10 transition"
          >
            See Features
          </a>
        </div>
      </div>

      {/* Κάτω animated κύματα (background-image) */}
      <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0">
        <div className="wave-band" />
      </div>
    </section>
  );
}
