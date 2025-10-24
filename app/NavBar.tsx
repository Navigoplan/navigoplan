"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Μπορεί να έρθει { email } ή null από το /api/auth/magic/session
type SessUser = { email?: string } | null;

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessUser>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/magic/session", { cache: "no-store" });
        const data = await res.json();
        if (alive) setUser(data?.user ?? null);
      } catch {
        // ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const linkClass = (href: string) =>
    pathname === href
      ? "text-sm font-semibold text-[#d6bd78]"
      : "text-sm text-[#c4a962] hover:text-[#d6bd78] transition";

  return (
    <header
      className="
        sticky top-0 z-40 w-full
        border-b border-white/10
        bg-[rgba(32,34,44,0.78)] backdrop-blur-md
        shadow-[0_2px_10px_rgba(0,0,0,0.25)]
      "
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/navigoplan-logo.png?v=1"
            alt="Navigoplan Logo"
            width={160}
            height={45}
            style={{ objectFit: "contain", display: "block" }}
          />
          <span className="sr-only">Navigoplan</span>
        </Link>

        {/* Desktop menu */}
        <ul className="hidden items-center gap-6 md:flex">
          <li><Link href="/features" className={linkClass("/features")}>Features</Link></li>
          <li><Link href="/pricing"  className={linkClass("/pricing")}>Pricing</Link></li>
          <li><Link href="/ai"       className={linkClass("/ai")}>AI Planner</Link></li>

          {/* Auth (desktop) */}
          <li className="flex items-center gap-3">
            {loading ? (
              <span className="text-xs text-[#c4a962] opacity-60">checking…</span>
            ) : user && user.email ? (
              <div className="relative group">
                {/* Premium pill με αρχικό + email */}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c4a962] text-[#0b1220] text-xs font-bold">
                    {user.email[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="text-xs text-[#c4a962]">
                    {user.email.length > 28 ? user.email.slice(0, 25) + "…" : user.email}
                  </span>
                </span>

                {/* Dropdown on hover */}
                <div className="absolute right-0 mt-2 hidden w-56 rounded-xl border border-white/10 bg-[rgba(32,34,44,0.95)] p-2 shadow-lg group-hover:block">
                  <div className="px-3 py-2 text-xs text-white/70">
                    Signed in as<br />
                    <span className="text-white break-all">{user.email}</span>
                  </div>
                  <form action="/api/auth/logout" method="post">
                    <button className="mt-1 w-full rounded-lg border border-[#c4a962] px-3 py-2 text-sm text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition">
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition shadow-sm"
              >
                Login
              </Link>
            )}
          </li>

          <li>
            <Link
              href="/#trial"
              className="rounded-full border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition shadow-sm"
            >
              Start Planning
            </Link>
          </li>
        </ul>

        {/* Mobile button */}
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="md:hidden inline-flex items-center gap-2 rounded-md border border-[#c4a962] bg-[rgba(32,34,44,0.85)] px-3 py-2 text-sm text-[#c4a962] hover:text-[#d6bd78]"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[rgba(32,34,44,0.92)] backdrop-blur-md border-t border-white/10">
          <ul className="flex flex-col divide-y divide-white/10">
            {[
              { href: "/features", label: "Features" },
              { href: "/pricing",  label: "Pricing" },
              { href: "/ai",       label: "AI Planner" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-6 py-3 text-[#c4a962] hover:text-[#d6bd78] ${pathname === item.href ? "font-semibold" : ""}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Auth (mobile) */}
            <li className="px-6 py-3 flex items-center justify-between">
              {loading ? (
                <span className="text-xs text-[#c4a962] opacity-60">checking…</span>
              ) : user && user.email ? (
                <>
                  <span className="text-xs text-[#c4a962] opacity-80">
                    {user.email.length > 28 ? user.email.slice(0, 25) + "…" : user.email}
                  </span>
                  <form action="/api/auth/logout" method="post" onSubmit={() => setOpen(false)}>
                    <button className="rounded-xl border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition">
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition"
                >
                  Login
                </Link>
              )}
            </li>

            <li className="p-3">
              <Link
                href="/#trial"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl border border-[#c4a962] px-4 py-3 text-center font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition"
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
