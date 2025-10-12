"use client";

import HeroVideo from "@/app/components/HeroVideo";

export default function HeroSection() {
  return (
    <section className="relative h-[70vh] min-h-[520px] overflow-hidden bg-slate-900">
      {/* Background video */}
      <HeroVideo mp4="/hero.mp4" poster="/hero-poster.png" className="absolute inset-0" />

      {/* Animated dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/40 animate-overlay" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="animate-title text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
          Luxury Yacht Charter Itinerary Software
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-100/90 md:text-xl">
          Plan routes, estimate fuel, generate PDFs & interactive maps.
        </p>

        {/* CTA buttons */}
        <div className="mt-8 flex gap-4">
          <a
            href="/ai"
            className="rounded-2xl bg-amber-400 px-6 py-3 font-semibold text-slate-900 shadow hover:bg-amber-300 transition"
          >
            Start Planning
          </a>
          <a
            href="#features"
            className="rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white/90 hover:bg-white/10 transition"
          >
            See Features
          </a>
        </div>
      </div>

      {/* Bottom wave transition */}
      <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0">
        <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0,64 C160,96 320,96 480,80 C640,64 800,32 960,37.3 C1120,42.7 1280,85.3 1440,101.3 L1440,120 L0,120 Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
