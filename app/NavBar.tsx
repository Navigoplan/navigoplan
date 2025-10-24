// app/NavBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = { label: string; href: string };

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

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (active: boolean) =>
    [
      "px-3 py-2 text-sm font-medium rounded-lg transition",
      scrolled
        ? active
          ? "text-[var(--color-brand-gold)]"
          : "text-[var(--color-navy)] hover:text-[var(--color-brand-gold)]"
        : active
          ? "text-[var(--color-brand-gold)]"
          : "text-white hover:text-[var(--color-brand-gold)]",
    ].join(" ");

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50 transition",
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-slate-200/60"
          : "bg-transparent border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 md:py-4">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-6 w-6 rounded-full"
            style={{ background: "var(--color-brand-gold)" }}
          />
          <span
            className={[
              "text-lg font-semibold tracking-tight",
              scrolled ? "text-[var(--color-navy)]" : "text-white",
            ].join(" ")}
          >
            Navigoplan
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
              {item.label}
            </Link>
          ))}
          {/* CTA */}
          <Link
            href="/#trial"
            className={["ml-2", scrolled ? "btn-cta-solid" : "btn-cta"].join(" ")}
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
          className={[
            "md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border transition",
            scrolled
              ? "border-slate-200/70 bg-white/80 text-slate-800"
              : "border-white/30 bg-white/10 text-white",
          ].join(" ")}
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
          <ul
            className={[
              "rounded-xl border",
              scrolled
                ? "border-slate-200/60 bg-white text-slate-800"
                : "border-white/30 bg-white/10 text-white backdrop-blur",
            ].join(" ")}
          >
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className="border-b last:border-none border-current/15">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={[
                    "block px-4 py-3 text-sm",
                    isActive(item.href)
                      ? "text-[var(--color-brand-gold)]"
                      : scrolled
                        ? "hover:text-[var(--color-navy)]"
                        : "hover:text-[var(--color-brand-gold)]",
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
                className="block w-full text-center btn-cta"
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
