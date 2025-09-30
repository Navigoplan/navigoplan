"use client";

import { useState } from "react";
import Link from "next/link";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-brand-navy/90 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-brand-gold"
        >
          Navigoplan
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden items-center gap-6 md:flex">
          <li>
            <Link
              href="/features"
              className="text-sm text-white hover:text-brand-gold"
            >
              Features
            </Link>
          </li>
          <li>
            <Link
              href="/pricing"
              className="text-sm text-white hover:text-brand-gold"
            >
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="/ai"
              className="text-sm text-white hover:text-brand-gold"
            >
              AI Planner
            </Link>
          </li>
          <li>
            <Link
              href="/#trial"
              className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy hover:opacity-90"
            >
              Start Planning
            </Link>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md bg-white/10 px-3 py-2 text-sm text-white md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>

        {/* Mobile Dropdown */}
        {open && (
          <div className="absolute right-4 top-14 w-48 rounded-xl border border-slate-200 bg-white shadow-lg">
            <Link
              href="/features"
              className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/ai"
              className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              AI Planner
            </Link>
            <Link
              href="/#trial"
              className="block px-4 py-2 text-sm font-medium text-brand-navy hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              Start Planning
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
