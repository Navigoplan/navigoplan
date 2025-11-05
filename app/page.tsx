// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import HeroVideo from "./components/HeroVideo";

type SessUser = { email?: string } | null;

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessUser>(null);
  const [checking, setChecking] = useState(true);

  // Διαβάζουμε session όπως στο NavBar
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/magic/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (alive) setSessionUser(data?.user ?? null);
      } catch {
        /* ignore */
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* HERO with background video */}
      <section className="relative">
        <HeroVideo
          mp4="/hero.mp4"
          // webm="/hero.webm"
          poster="/hero-poster.png"
          className="h-[70vh] md:h-[78vh]"
        >
          <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
            {/* GOLD HEADLINE */}
            <h1
              className="animate-title text-4xl md:text-5xl font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              style={{ color: "var(--color-brand-gold)" }}
            >
              Luxury Yacht Charter Itinerary Software
            </h1>

            <p className="mt-4 mx-auto max-w-xl text-lg text-white/90 drop-shadow">
              Plan routes, estimate costs, and present stunning itineraries your clients will love.
            </p>

            {/* CTAs: outlined gold */}
            <div className="mt-6 flex justify-center gap-4">
              <a
                href="#trial"
                className="inline-flex items-center justify-center rounded-full border-2 border-[var(--color-brand-gold)] px-6 py-3 text-center text-sm font-semibold text-[var(--color-brand-gold)] bg-transparent hover:bg-[color:rgba(196,169,98,0.10)] transition"
              >
                Start Planning
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border-2 border-[var(--color-brand-gold)] px-6 py-3 text-center text-sm font-semibold text-[var(--color-brand-gold)] bg-transparent hover:bg-[color:rgba(196,169,98,0.10)] transition"
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
          {/* GOLD SECTION TITLE */}
          <h2
            className="text-2xl font-semibold mb-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]"
            style={{ color: "var(--color-brand-gold)" }}
          >
            Built for modern charter operations
          </h2>
          {/* stronger NAVY subcopy */}
          <p className="mt-2 font-medium" style={{ color: "var(--color-brand-navy)" }}>
            Plan, price and present high-end itineraries.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-6 text-center">
          {/* GOLD “Simple Pricing” */}
          <h2
            className="text-2xl font-semibold mb-2 drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]"
            style={{ color: "var(--color-brand-gold)" }}
          >
            Simple Pricing
          </h2>
        {/* stronger NAVY subcopy */}
          <p className="mt-2 font-medium" style={{ color: "var(--color-brand-navy)" }}>
            Transparent plans to get you started.
          </p>
        </div>
      </section>

      {/* Trial */}
      <section
        id="trial"
        className="border-t py-16"
        style={{ backgroundColor: "var(--color-brand-navy)" }}
      >
        <div
          className="mx-auto max-w-xl rounded-2xl border p-6 text-center shadow-sm"
          style={{ borderColor: "var(--color-brand-gold)", background: "#fff" }}
        >
          {/* Ανάλογα με το session, αλλάζει το περιεχόμενο */}
          {checking ? (
            <p className="text-slate-500 text-sm">Checking your session…</p>
          ) : sessionUser && sessionUser.email ? (
            <>
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--color-brand-navy)" }}
              >
                You’re signed in
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--color-brand-navy)" }}>
                {sessionUser.email}
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href="/ai"
                  className="rounded-2xl px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: "var(--color-brand-gold)" }}
                >
                  Go to AI Planner
                </a>
                <a
                  href="/account"
                  className="rounded-2xl px-6 py-3 text-sm font-semibold border"
                  style={{ borderColor: "var(--color-brand-gold)", color: "var(--color-brand-navy)" }}
                >
                  Manage account
                </a>
              </div>
            </>
          ) : (
            <>
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--color-brand-navy)" }}
              >
                Start your free trial
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                No credit card required. Cancel anytime.
              </p>

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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2"
                    style={{ boxShadow: "none" }}
                  />
                  <button
                    type="submit"
                    className="rounded-2xl px-6 py-3 text-sm font-medium hover:opacity-90"
                    style={{ background: "var(--color-brand-gold)", color: "var(--color-brand-navy)" }}
                  >
                    Create Account
                  </button>
                </form>
              ) : (
                <p className="mt-4 font-medium text-green-600">
                  ✅ Thank you! We’ll be in touch soon.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
