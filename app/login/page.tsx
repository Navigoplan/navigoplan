"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEmail) {
      setError("Βάλε ένα έγκυρο email.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/auth/magic/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        throw new Error(j?.error || "Κάτι πήγε στραβά.");
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Κάτι πήγε στραβά.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <main className="relative min-h-[calc(100dvh-56px)] bg-[#0b1220] text-white">
        {/* background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-1/3 -left-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-25"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, #c4a962 0%, rgba(196,169,98,0) 70%)",
            }}
          />
          <div
            className="absolute -bottom-1/3 -right-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-20"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, #d6bd78 0%, rgba(214,189,120,0) 70%)",
            }}
          />
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-10 md:py-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="mb-4 text-center">
                <img
                  src="/navigoplan-logo.png?v=1"
                  alt="Navigoplan"
                  width={160}
                  height={45}
                  className="mx-auto"
                />
              </div>
              <h1 className="text-2xl font-semibold text-center">Έλεγξε το email σου</h1>
              <p className="mt-2 text-center text-sm text-white/70">
                Στείλαμε ένα magic link στο <span className="font-medium text-[#d6bd78]">{email}</span>.
                Άνοιξέ το από τη συσκευή σου για να συνδεθείς.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/login"
                  className="rounded-xl border border-[#c4a962] px-4 py-2 text-sm font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] transition"
                >
                  Αποστολή σε άλλο email
                </Link>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-white/50">
              Αν δεν βρίσκεις το μήνυμα, έλεγξε και τα ανεπιθύμητα.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100dvh-56px)] bg-[#0b1220] text-white">
      {/* background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/3 -left-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-25"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, #c4a962 0%, rgba(196,169,98,0) 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/3 -right-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, #d6bd78 0%, rgba(214,189,120,0) 70%)",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-md">
          {/* card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div className="mb-6 text-center">
              <img
                src="/navigoplan-logo.png?v=1"
                alt="Navigoplan"
                width={160}
                height={45}
                className="mx-auto"
              />
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Sign in with magic link
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Βάλε το email σου και θα σου στείλουμε έναν σύνδεσμο.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-[#0b1220]/60 border border-white/15 px-4 py-3 text-white outline-none ring-0 focus:border-[#c4a962] transition"
              />

              <button
                type="submit"
                disabled={submitting || !isEmail}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-[#c4a962] px-4 py-3 font-semibold text-[#c4a962] hover:bg-[#c4a962] hover:text-[#0b1220] disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Sending…
                  </span>
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-sm text-white/70">
              <Link href="/" className="hover:text-[#d6bd78] transition">
                ← Επιστροφή στην αρχική
              </Link>
              <Link href="/features" className="hover:text-[#d6bd78] transition">
                Δες τα features
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-white/50">
            Χρησιμοποιούμε magic links — δεν χρειάζονται κωδικοί.
          </p>
        </div>
      </div>
    </main>
  );
}
