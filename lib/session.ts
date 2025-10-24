// app/lib/session.ts
import { cookies } from 'next/headers';

const COOKIE_NAME = 'session';
const isProd = process.env.NODE_ENV === 'production';

export async function getSession(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

/** Χρησιμοποίησε ΜΟΝΟ σε Route Handlers ή Server Actions. */
export async function setSession(value: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
