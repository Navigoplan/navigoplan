"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  // Κλείσιμο menu όταν αλλάζει το μέγεθος
  useEffect(() => {
    const onResize = () => setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="text-lg font-semibold text-brand-navy">
          Navigoplan
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/features" className="text-sm text-slate-700 hover:text-brand-navy">Features</Link>
          <Link href="/pricing" className="text-sm text-slate-700 hover:text-brand-navy">Pricing</Link>
          <Link href="/ai" className="text-sm text-slate-700 hover:text-brand-navy">AI Planner</Link>
          <Link
            href="/ai"
            className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy"
          >
            Start Planning
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          aria-label="Open menu"
          className="md:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-2">
            <Link href="/features" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>Features</Link>
            <Link href="/pricing" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/ai" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>AI Planner</Link>
            <Link
              href="/ai"
              className="mt-2 w-full rounded-xl bg-brand-navy px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy"
              onClick={() => setOpen(false)}
            >
              Start Planning
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
