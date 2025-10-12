"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href
      ? "text-sm font-medium text-brand-gold"
      : "text-sm text-white/90 hover:text-brand-gold transition";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0b1220cc] backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-gold">
          Navigoplan
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          <li><Link href="/features" className={linkClass("/features")}>Features</Link></li>
          <li><Link href="/pricing" className={linkClass("/pricing")}>Pricing</Link></li>
          <li><Link href="/ai" className={linkClass("/ai")}>AI Planner</Link></li>
          <li>
            <Link
              href="/#trial"
              className="rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy shadow-md ring-1 ring-black/10 hover:bg-amber-300 transition"
            >
              Start Planning
            </Link>
          </li>
        </ul>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="md:hidden inline-flex items-center gap-2 rounded-md bg-[#0b1220] px-3 py-2 text-sm text-white ring-1 ring-white/10"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white/98 shadow-xl backdrop-blur-sm">
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
            <li className="p-3">
              <Link
                href="/#trial"
                className="block w-full rounded-xl bg-brand-gold px-4 py-3 text-center font-semibold text-brand-navy shadow-sm ring-1 ring-black/10 hover:bg-amber-300"
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
