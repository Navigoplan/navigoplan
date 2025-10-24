// app/api/auth/magic/verify/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { sha256 } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();

  const appBase = (process.env.APP_URL || "").replace(/\/+$/, "") || url.origin;

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login?e=missing", appBase));
  }

  try {
    const tokenHash = sha256(token);

    // Βρες το token στη DB
    const rec = await prisma.magicLinkToken.findFirst({
      where: { tokenHash, email },
      include: { user: true },
    });

    if (!rec) {
      return NextResponse.redirect(new URL("/login?e=invalid", appBase));
    }

    // Έλεγχος λήξης
    if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
      // Προαιρετικά: καθάρισε το token
      await prisma.magicLinkToken.delete({ where: { id: rec.id } });
      return NextResponse.redirect(new URL("/login?e=expired", appBase));
    }

    // One-time use: σβήστο αμέσως
    await prisma.magicLinkToken.delete({ where: { id: rec.id } });

    // Βεβαιώσου ότι υπάρχει user (στο send το είχες ήδη να τον δημιουργεί)
    const user = rec.user ?? (await prisma.user.findUnique({ where: { id: rec.userId } }));
    if (!user) {
      return NextResponse.redirect(new URL("/login?e=no_user", appBase));
    }

    // Γράψε session cookie
    setSession(JSON.stringify({ uid: user.id, email: user.email }));

    // Πήγαινε στο dashboard
    return NextResponse.redirect(new URL("/ai", appBase));
  } catch {
    return NextResponse.redirect(new URL("/login?e=error", appBase));
  }
}
