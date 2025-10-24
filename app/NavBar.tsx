// app/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "AI Planner", href: "/ai" },
  { label: "Login", href: "/login" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // κλείνει το mobile menu όταν αλλάζει route
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <header
      className={[
        "sticky top-0 z-50",
        "border-b border-slate-200/60",
        scrolled ? "bg-white/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur" : "bg-white/80 backdrop-blur",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:py-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            {/* Μικρό “στίγμα” logo */}
            <span
              aria-hidden
              className="inline-block h-6 w-6 rounded-full"
              style={{ background: "var(--color-navy)" }}
            />
            <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-navy)" }}>
              Navigoplan
            </span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-3 py-2 text-sm font-medium rounded-lg transition",
                "hover:bg-[var(--color-cloud)]",
                isActive(item.href)
                  ? "text-[var(--color-navy)]"
                  : "text-slate-600 hover:text-[var(--color-navy)]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}

          {/* CTA */}
          <Link
            href="/#trial"
            className="ml-2 btn-cta"
            aria-label="Start Planning"
          >
            Start Planning
          </Link>
        </nav>

        {/* Mobile toggler */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle Menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/70 bg-white/70 hover:bg-white transition"
        >
          {/* Hamburger / X */}
          <svg
            className={`h-5 w-5 ${open ? "hidden" : "block"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg
            className={`h-5 w-5 ${open ? "block" : "hidden"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4">
          <ul className="divide-y divide-slate-200/60 rounded-xl border border-slate-200/60 bg-white">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "block px-4 py-3 text-sm",
                    isActive(item.href)
                      ? "text-[var(--color-navy)]"
                      : "text-slate-700 hover:text-[var(--color-navy)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="p-3">
              <Link
                href="/#trial"
                onClick={() => setOpen(false)}
                className="btn-cta block w-full text-center"
              >
                Start Planning
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
