"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Χαλαρός τύπος: επιτρέπει {email} ή {uid} ή οποιοδήποτε αντικείμενο
type SessUser = any;

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

  // Fallback: πρώτα email, μετά uid, αλλιώς τίποτα
  const EmailBadge = () => {
    const label: string | null =
      (user && typeof user === "object" && typeof user.email === "string" && user.email) ||
      (user && typeof user === "object" && typeof user.uid === "string" && user.uid) ||
      null;

    if (!label) return null;

    const short = label.length > 28 ? label.slice(0, 25) + "…" : label;
    return <span className="text-xs text-[#c4a962] opacity-80">{short}</span>;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#c4a962]/30 bg-[#0b1220cc] backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
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
            ) : user ? (
              <>
                <EmailBadge />
                <form action="/api/auth/logout" method="post">
                  <button className="rounded-full border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition shadow-sm">
                    Logout
                  </button>
                </form>
              </>
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
          className="md:hidden inline-flex items-center gap-2 rounded-md border border-[#c4a962] bg-[#0b1220] px-3 py-2 text-sm text-[#c4a962] hover:text-[#d6bd78]"
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-[#0b1220f2] backdrop-blur-md border-t border-[#c4a962]/30">
          <ul className="flex flex-col divide-y divide-[#c4a962]/10">
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
              ) : user ? (
                <>
                  <EmailBadge />
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
