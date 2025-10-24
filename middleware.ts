// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/ai", "/planner"];

export async function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // άσε απ’ έξω static, images, login και τα auth APIs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // χρειάζεται auth;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // ρώτα το session endpoint, περνώντας ΟΛΑ τα cookies
  const res = await fetch(`${origin}/api/auth/magic/session`, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null);

  const json = await res?.json().catch(() => null);
  const authed = !!json?.user?.email;

  if (authed) return NextResponse.next();

  // redirect σε /login?next=<full path>
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

// ποια paths περνάνε από middleware (εξαιρούμε static assets)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
