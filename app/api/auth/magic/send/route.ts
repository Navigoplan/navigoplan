import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/lib/crypto";
import { Resend } from "resend";
import { MagicLinkEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const clean = String(email || "").trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    // ensure user exists (ή φτιάξτον)
    let user = await prisma.user.findUnique({ where: { email: clean } });
    if (!user) user = await prisma.user.create({ data: { email: clean } });

    // create one-time token (hash in DB)
    const token = randomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15'
    await prisma.magicLinkToken.create({
      data: { email: clean, userId: user.id, tokenHash, expiresAt },
    });

    const base = process.env.APP_URL!.replace(/\/+$/, "");
    const link = `${base}/api/auth/magic/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(clean)}`;

    // send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: `${process.env.SENDER_NAME} <${process.env.SENDER_EMAIL}>`,
      to: [clean],
      subject: "Sign in to NaviGoPlan",
      html: MagicLinkEmail({ link }),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "error" }, { status: 500 });
  }
}
