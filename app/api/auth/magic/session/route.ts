import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// προσπαθεί να εξαγάγει email από ο,τιδήποτε: string / JSON-string / object / nested
function extractEmail(input: unknown): string | null {
  // 1) string: καθαρό email ή JSON-string
  if (typeof input === "string") {
    // αν είναι JSON-string, προσπάθησε parse
    const trimmed = input.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractEmail(parsed);
      } catch {
        // όχι έγκυρο JSON: ίσως είναι direct email string
      }
    }
    // fallback: αν είναι email pattern, κράτα το
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    return isEmail ? input : null;
  }

  // 2) object: ψάξε γνωστά μονοπάτια
  if (input && typeof input === "object") {
    const obj: any = input;
    // προτεραιότητα: user.email
    const fromUser = extractEmail(obj.user?.email);
    if (fromUser) return fromUser;

    // μετά: email στο ίδιο επίπεδο
    const fromTop = extractEmail(obj.email);
    if (fromTop) return fromTop;

    // μερικοί αποθηκεύουν ολόκληρο το object σε string ιδιότητα (π.χ. "user": "{\"email\":\"...\"}")
    if (typeof obj.user === "string") {
      const fromUserStr = extractEmail(obj.user);
      if (fromUserStr) return fromUserStr;
    }
    if (typeof obj.email === "string") {
      const fromEmailStr = extractEmail(obj.email);
      if (fromEmailStr) return fromEmailStr;
    }
  }

  return null;
}

export async function GET() {
  const sess: unknown = await getSession(); // μπορεί να είναι string | {email} | {user:{email}} | JSON-string | null
  const email = extractEmail(sess);
  return NextResponse.json({ user: email ? { email } : null });
}
