"use client";

import { useState } from "react";
import HeroVideo from "./components/HeroVideo";

export default function Home() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO with background video */}
      <section className="relative">
        <HeroVideo
          mp4="/hero.mp4"
          // webm="/hero.webm" // αν το έχεις
          poster="/hero-poster.png"
          className="h-[70vh] md:h-[78vh]"
        >
          <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
            <h1 className="animate-title text-4xl font-bold tracking-tight text-white drop-shadow md:text-5xl">
              Luxury Yacht Charter Itinerary Software
            </h1>
            <p className="mt-4 mx-auto max-w-xl text-lg text-white/90 drop-shadow">
              Plan routes, estimate costs, and present stunning itineraries your clients will love.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <a
                href="#trial"
                className="rounded-2xl bg-brand-gold px-6 py-3 text-center text-sm font-medium text-brand-navy transition hover:opacity-90"
              >
                Start Planning
              </a>
              <a
                href="#features"
                className="rounded-2xl border border-white/80 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-white hover:text-brand-navy"
              >
                See Features
              </a>
            </div>
          </div>
        </HeroVideo>

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

      {/* Features */}
      <section id="features" className="border-t bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-brand-navy">Built for modern charter operations</h2>
          <p className="mt-2 text-slate-600">Plan, price and present high-end itineraries.</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-2xl font-semibold text-brand-navy">Simple Pricing</h2>
          <p className="mt-2 text-slate-600">Transparent plans to get you started.</p>
        </div>
      </section>

      {/* Trial */}
      <section id="trial" className="border-t bg-brand-navy py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-brand-gold bg-white p-6 text-center shadow-sm">
          <h3 className="text-xl font-semibold text-brand-navy">Start your free trial</h3>
          <p className="mt-1 text-sm text-slate-600">No credit card required. Cancel anytime.</p>

          {!submitted ? (
            <form
              action="https://formspree.io/f/mjkenvdw"
              method="POST"
              onSubmit={() => setSubmitted(true)}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
              />
              <button
                type="submit"
                className="rounded-2xl bg-brand-gold px-6 py-3 text-sm font-medium text-brand-navy hover:opacity-90"
              >
                Create Account
              </button>
            </form>
          ) : (
            <p className="mt-4 font-medium text-green-600">✅ Thank you! We’ll be in touch soon.</p>
          )}
        </div>
      </section>
    </div>
  );
}
