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

  // appBase: βασικό origin για redirects (χωρίς τελικό /)
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

    // Βεβαιώσου ότι υπάρχει user
    // (αν δεν υπάρχει στο include, δοκίμασε lookup μόνο αν έχουμε έγκυρο string id)
    let user = rec.user ?? null;

    if (!user) {
      const uid = rec.userId ?? undefined; // guard: ποτέ null προς Prisma
      if (!uid) {
        return NextResponse.redirect(new URL("/login?e=no_user", appBase));
      }

      user = await prisma.user.findUnique({
        where: { id: uid },
      });
    }

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
