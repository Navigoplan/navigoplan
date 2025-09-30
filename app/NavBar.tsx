"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Κλείσιμο menu σε resize & με ESC
  useEffect(() => {
    const onResize = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Κλείδωμα scroll όταν είναι ανοιχτό
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Κλικ έξω για κλείσιμο
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

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
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
      </nav>

      {/* Mobile overlay + slideover */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        aria-hidden={!open}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 z-50 h-full w-80 max-w-[85%] transform border-l border-slate-200 bg-white shadow-xl transition-transform md:hidden
        ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <span className="text-base font-semibold text-brand-navy">Menu</span>
          <button
            aria-label="Close menu"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="flex flex-col px-5 py-3">
          <Link href="/features" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>Features</Link>
          <Link href="/pricing" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>Pricing</Link>
          <Link href="/ai" className="py-2 text-sm text-slate-800 hover:text-brand-navy" onClick={() => setOpen(false)}>AI Planner</Link>
          <Link
            href="/ai"
            className="mt-3 w-full rounded-xl bg-brand-navy px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-gold hover:text-brand-navy"
            onClick={() => setOpen(false)}
          >
            Start Planning
          </Link>
        </div>
      </div>
    </header>
  );
}
