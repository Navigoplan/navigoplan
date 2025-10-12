"use client";

import HeroVideo from "@/app/components/HeroVideo";

export default function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[520px] overflow-hidden bg-slate-900">
      {/* Background video */}
      <HeroVideo mp4="/hero.mp4" poster="/hero-poster.png" className="absolute inset-0" />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/40 to-black/45 animate-overlay" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="animate-title text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
          Luxury Yacht Charter Itinerary Software
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90 drop-shadow md:text-xl">
          Plan routes, estimate costs, and present stunning itineraries your clients will love.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex gap-4">
          <a
            href="/ai"
            className="rounded-full bg-[var(--color-brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-navy)] shadow-md ring-1 ring-black/10 hover:opacity-90 transition"
          >
            Start Planning
          </a>
          <a
            href="#features"
            className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white/90 shadow-sm hover:bg-white/10 transition"
          >
            See Features
          </a>
        </div>
      </div>

      {/* Bottom animated waves (from globals.css .wave-band) */}
      <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0">
        <div className="wave-band" />
      </div>
    </section>
  );
}
