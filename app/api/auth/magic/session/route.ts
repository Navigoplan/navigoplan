import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const sess: unknown = await getSession();

  let email: string | null = null;

  if (typeof sess === "string") {
    // π.χ. getSession() επιστρέφει σκέτο email
    email = sess;
  } else if (sess && typeof sess === "object") {
    // π.χ. { user: { email } } ή { email }
    const s = sess as any;
    if (typeof s?.user?.email === "string") {
      email = s.user.email;
    } else if (typeof s?.email === "string") {
      email = s.email;
    }
  }

  return NextResponse.json({ user: email ? { email } : null });
}
