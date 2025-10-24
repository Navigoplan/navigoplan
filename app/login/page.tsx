"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/magic/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Failed");
      setSent(true);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally { setLoading(false); }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 rounded-2xl border">
        <h1 className="text-xl font-semibold mb-2">Check your email</h1>
        <p>Σου στείλαμε magic link για σύνδεση.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-2xl border">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          type="email" required value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border rounded-lg px-3 py-2"
        />
        <button
          disabled={loading}
          className="rounded-lg bg-black text-white px-3 py-2 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>
    </div>
  );
}
