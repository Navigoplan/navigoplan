// app/lib/crypto.ts
import { createHash, createHmac, randomBytes } from "crypto";

/* ------------------------------------------------------------------ */
/* Τα δικά σου helpers (μένουν ως έχουν)                               */
/* ------------------------------------------------------------------ */
export function randomToken(): string {
  return randomBytes(32).toString("hex");
}
export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Magic-link tokens (HMAC-SHA256 + base64url payload.signature)      */
/* ------------------------------------------------------------------ */
const SECRET = process.env.AUTH_SECRET ?? "dev-secret"; // βάλε AUTH_SECRET στα env

export type MagicPayload = {
  uid: string;
  email: string;
  iat: number; // issued at (epoch seconds)
  exp: number; // expires at (epoch seconds)
  nonce?: string;
};

// base64url helpers
const b64u = {
  enc: (buf: Buffer) =>
    buf
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_"),
  dec: (str: string) => {
    const pad = 4 - (str.length % 4 || 4);
    const s = (str + "=".repeat(pad)).replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(s, "base64");
  },
};

function sign(input: string) {
  return createHmac("sha256", SECRET).update(input).digest();
}

/**
 * Φτιάχνει magic token: payload.signature
 * @param data { uid, email }
 * @param ttlSec χρόνος ζωής σε δευτερόλεπτα (default 15')
 */
export function createMagicToken(
  data: { uid: string; email: string },
  ttlSec = 15 * 60
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MagicPayload = {
    uid: data.uid,
    email: data.email,
    iat: now,
    exp: now + ttlSec,
    nonce: b64u.enc(randomBytes(8)),
  };
  const payloadB64 = b64u.enc(Buffer.from(JSON.stringify(payload), "utf8"));
  const sigB64 = b64u.enc(sign(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

/**
 * Επαληθεύει token και επιστρέφει { uid, email } – κάνει throw αν είναι invalid/expired.
 */
export async function verifyMagicToken(token: string): Promise<{
  uid: string;
  email: string;
}> {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("invalid_token");

  const [payloadB64, sigB64] = parts;
  const expected = b64u.enc(sign(payloadB64));
  if (expected !== sigB64) throw new Error("invalid_signature");

  let payload: MagicPayload;
  try {
    payload = JSON.parse(b64u.dec(payloadB64).toString("utf8"));
  } catch {
    throw new Error("invalid_payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new Error("expired");
  if (!payload.uid || !payload.email) throw new Error("invalid_payload");

  return { uid: payload.uid, email: payload.email };
}
