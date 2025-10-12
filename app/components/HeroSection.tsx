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

      {/* Animated ocean waves – guaranteed working */}
      <div className="pointer-events-none absolute bottom-[-1px] left-0 right-0 overflow-hidden">
        <div className="wave-container">
          <svg viewBox="0 0 2880 200" xmlns="http://www.w3.org/2000/svg" className="w-[200%]">
            <path
              d="M0,80 C320,110 640,110 960,88 C1280,66 1600,40 1920,48 C2240,56 2560,96 2880,118 L2880,200 L0,200 Z"
              fill="#ffffff"
              opacity="0.85"
            />
            <path
              d="M0,102 C320,126 640,126 960,102 C1280,82 1600,62 1920,70 C2240,78 2560,116 2880,138 L2880,200 L0,200 Z"
              fill="#f8fafc"
              opacity="1"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
