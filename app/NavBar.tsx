"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Helper για active link styling
  const linkClass = (href: string) =>
    pathname === href
      ? "text-sm font-medium text-brand-gold"
      : "text-sm text-white hover:text-brand-gold";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-brand-navy/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-brand-gold"
        >
          Navigoplan
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-6 md:flex">
          <li>
            <Link href="/features" className={linkClass("/features")}>
              Features
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={linkClass("/pricing")}>
              Pricing
            </Link>
          </li>
          <li>
            <Link href="/ai" className={linkClass("/ai")}>
              AI Planner
            </Link>
          </li>
          <li>
            <Link
              href="/#trial"
              className="rounded-xl bg-brand-gold px-4 py-2 text-sm font-medium text-brand-navy transition hover:opacity-90"
            >
              Start Planning
            </Link>
          </li>
        </ul>

        {/* Mobile menu button */}
        <button
          className="rounded-md bg-brand-navy/80 px-3 py-2 text-sm text-white md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white shadow-lg">
          <ul className="flex flex-col divide-y divide-slate-200">
            <li>
              <Link
                href="/features"
                className={`block px-6 py-3 ${pathname === "/features" ? "text-brand-navy font-medium" : "text-slate-800 hover:bg-slate-100"}`}
                onClick={() => setOpen(false)}
              >
                Features
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className={`block px-6 py-3 ${pathname === "/pricing" ? "text-brand-navy font-medium" : "text-slate-800 hover:bg-slate-100"}`}
                onClick={() => setOpen(false)}
              >
                Pricing
              </Link>
            </li>
            <li>
              <Link
                href="/ai"
                className={`block px-6 py-3 ${pathname === "/ai" ? "text-brand-navy font-medium" : "text-slate-800 hover:bg-slate-100"}`}
                onClick={() => setOpen(false)}
              >
                AI Planner
              </Link>
            </li>
            <li>
              <Link
                href="/#trial"
                className="block px-6 py-3 font-medium text-brand-navy hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                Start Planning
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
