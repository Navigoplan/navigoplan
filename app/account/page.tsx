// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessUser = { email?: string } | null;

export default function AccountPage() {
  const [user, setUser] = useState<SessUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/magic/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (alive) setUser(data?.user ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ——— UI ———
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header strip */}
      <div
        className="py-12 text-center"
        style={{ backgroundColor: "var(--color-brand-navy)" }}
      >
        <h1
          className="text-3xl font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          style={{ color: "var(--color-brand-gold)" }}
        >
          Account
        </h1>
        <p className="mt-2 text-white/80 text-sm">
          Manage your profile and plan.
        </p>
      </div>

      {/* Card */}
      <div className="mx-auto -mt-10 max-w-3xl px-6">
        <div
          className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{ borderColor: "var(--color-brand-gold)" }}
        >
          {loading ? (
            <p className="text-slate-500">Checking your session…</p>
          ) : !user?.email ? (
            <div className="text-center">
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--color-brand-navy)" }}
              >
                You’re not signed in
              </h2>
              <p className="mt-1 text-slate-600">
                Please log in to view your account.
              </p>
              <Link
                href="/login?next=/account"
                className="mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-brand-gold)" }}
              >
                Log in
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile */}
              <div className="rounded-xl border p-5" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-brand-navy)" }}
                >
                  Profile
                </h3>
                <div className="text-sm">
                  <div className="text-slate-500">Email</div>
                  <div className="font-medium">{user.email}</div>
                </div>

                <form action="/api/auth/logout" method="post" className="mt-5">
                  <button
                    className="rounded-xl border px-4 py-2 text-sm font-semibold transition"
                    style={{
                      borderColor: "var(--color-brand-gold)",
                      color: "var(--color-brand-navy)",
                    }}
                  >
                    Log out
                  </button>
                </form>
              </div>

              {/* Plan */}
              <div className="rounded-xl border p-5" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-brand-navy)" }}
                >
                  Plan
                </h3>

                {/* Placeholder: μέχρι να βάλουμε Stripe, θεωρούμε Free */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Current plan</div>
                    <div className="font-medium">Free</div>
                  </div>
                  <Link
                    href="/pricing?reason=upgrade"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: "var(--color-brand-gold)" }}
                  >
                    Upgrade to Pro
                  </Link>
                </div>

                {/* Μελλοντικά (Stripe Portal) */}
                <div className="mt-4 flex gap-2">
                  <button
                    disabled
                    title="Coming soon"
                    className="rounded-xl border px-4 py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
                    style={{ borderColor: "var(--color-brand-gold)", color: "var(--color-brand-navy)" }}
                  >
                    Manage billing (soon)
                  </button>
                </div>
              </div>
            </div>

            /* Quick actions */
          )}
          {user?.email && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/ai"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-brand-gold)" }}
              >
                Go to AI Planner
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold"
                style={{ borderColor: "var(--color-brand-gold)", color: "var(--color-brand-navy)" }}
              >
                View pricing
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Note: όταν περάσουμε στο Stripe (βήμα 3),
          το "Manage billing (soon)" θα κάνει POST σε /api/stripe/portal
          και θα γίνεται redirect στο Customer Portal. */}
    </div>
  );
}
