// app/account/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SessUser = {
  email?: string;
  // αν το backend δίνει createdAt/created_at/signupAt, το πιάνουμε
  createdAt?: string;
  created_at?: string;
  signupAt?: string;
} | null;

type SubInfo = {
  plan: "Free" | "Pro" | "VIP";
  status: "active" | "past_due" | "canceled" | "inactive";
  currentPeriodEnd?: string | null;
};

function formatDate(d?: string | number | Date | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function AccountPage() {
  const [user, setUser] = useState<SessUser>(null);
  const [loading, setLoading] = useState(true);

  // demo subscription μέχρι να μπει Stripe/DB
  const [sub, setSub] = useState<SubInfo>({
    plan: "Free",
    status: "inactive",
    currentPeriodEnd: null,
  });

  // --- Session fetch (όπως στο NavBar) ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/magic/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        const u = (data?.user ?? null) as SessUser;

        // Fallback: αν δεν έχουμε ημερομηνία από backend, κρατάμε firstSeen τοπικά
        let created = u?.createdAt || u?.created_at || u?.signupAt || "";
        try {
          const LS_KEY = "navigoplan:firstSeen";
          if (!created) {
            const existing = localStorage.getItem(LS_KEY);
            if (existing) {
              created = existing;
            } else {
              const now = new Date().toISOString();
              localStorage.setItem(LS_KEY, now);
              created = now;
            }
          } else {
            // αν backend δίνει created, συγχρονίζουμε το local
            localStorage.setItem(LS_KEY, created);
          }
        } catch {
          // ignore localStorage errors
        }

        setUser(u ? { ...u, createdAt: created } : null);

        // TODO: όταν μπει DB/Stripe, φέρε πραγματική συνδρομή (GET /api/billing/me)
        setSub((prev) => ({ ...prev }));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signupDate = useMemo(() => {
    // δίνουμε προτεραιότητα σε createdAt / created_at / signupAt
    const iso =
      user?.createdAt ||
      (user as any)?.created_at ||
      (user as any)?.signupAt ||
      null;
    return formatDate(iso);
  }, [user]);

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
        <p className="mt-2 text-white/80 text-sm">Manage your profile and plan.</p>
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
              <p className="mt-1 text-slate-600">Please log in to view your account.</p>
              <Link
                href="/login?next=/account"
                className="mt-4 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-brand-gold)" }}
              >
                Log in
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Profile */}
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "rgba(0,0,0,.08)" }}
                >
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: "var(--color-brand-navy)" }}
                  >
                    Profile
                  </h3>

                  <div className="text-sm">
                    <div className="text-slate-500">Email</div>
                    <div className="font-medium break-all">{user.email}</div>
                  </div>

                  <div className="mt-3 text-sm">
                    <div className="text-slate-500">Sign-up date</div>
                    <div className="font-medium">{signupDate}</div>
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
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "rgba(0,0,0,.08)" }}
                >
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: "var(--color-brand-navy)" }}
                  >
                    Plan
                  </h3>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Current plan</div>
                      <div className="font-medium">{sub.plan}</div>

                      {/* Αν είχαμε active status/period end, το δείχνουμε */}
                      {sub.status === "active" && sub.currentPeriodEnd && (
                        <div className="mt-1 text-xs text-slate-600">
                          Renews on {formatDate(sub.currentPeriodEnd)}
                        </div>
                      )}
                    </div>

                    <Link
                      href="/pricing?reason=upgrade"
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                      style={{ background: "var(--color-brand-gold)" }}
                    >
                      Upgrade to Pro
                    </Link>
                  </div>

                  {/* Stripe portal – θα ενεργοποιηθεί στο επόμενο βήμα */}
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled
                      title="Coming soon"
                      className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-semibold opacity-60"
                      style={{
                        borderColor: "var(--color-brand-gold)",
                        color: "var(--color-brand-navy)",
                      }}
                    >
                      Manage billing (soon)
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
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
                  style={{
                    borderColor: "var(--color-brand-gold)",
                    color: "var(--color-brand-navy)",
                  }}
                >
                  View pricing
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
