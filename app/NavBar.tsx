"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Active link highlight
  const linkClass = (href: string) =>
    pathname === href
      ? "text-sm font-semibold text-brand-gold"
      : "text-sm text-brand-gold hover:opacity-90 transition";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-gold/20 bg-[#0b1220cc] backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-brand-gold"
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
              className="rounded-full border border-brand-gold px-4 py-2 text-sm font-semibold text-brand-gold shadow-md transition hover:bg-brand-gold hover:text-brand-navy"
            >
              Start Planning
            </Link>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center gap-2 rounded-md border border-brand-gold bg-[#0b1220] px-3 py-2 text-sm text-brand-gold"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[#0b1220f2] backdrop-blur-md border-t border-brand-gold/30">
          <ul className="flex flex-col divide-y divide-brand-gold/10">
            {[
              { href: "/features", label: "Features" },
              { href: "/pricing", label: "Pricing" },
              { href: "/ai", label: "AI Planner" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-6 py-3 text-brand-gold hover:bg-brand-gold/10 ${
                    pathname === item.href ? "font-semibold" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="p-3">
              <Link
                href="/#trial"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl border border-brand-gold px-4 py-3 text-center font-semibold text-brand-gold hover:bg-brand-gold hover:text-brand-navy transition"
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
