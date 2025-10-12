"use client";

import HeroVideo from "@/app/components/HeroVideo";

export default function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[520px] overflow-hidden bg-slate-900">
      {/* Background video */}
      <HeroVideo mp4="/hero.mp4" poster="/hero-poster.png" className="absolute inset-0" />

      {/* Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/60 via-black/35 to-black/40" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
          Luxury Yacht Charter Itinerary Software
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90 drop-shadow md:text-xl">
          Plan routes, estimate costs, and present stunning itineraries your clients will love.
        </p>

        {/* CTAs: outlined gold (hex to avoid any token issues) */}
        <div className="mt-8 flex gap-4">
          <a
            href="/ai"
            className="inline-flex items-center justify-center rounded-full border-2 border-[#c4a962] px-6 py-3 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962]/10 transition"
          >
            Start Planning
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-full border-2 border-[#c4a962] px-6 py-3 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962]/10 transition"
          >
            See Features
          </a>
        </div>
      </div>

      {/* Bottom curve / waves */}
      <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0">
        <div className="wave-band" />
      </div>
    </section>
  );
}
