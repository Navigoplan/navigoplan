// middleware.ts
import { NextResponse, NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/ai', '/planner'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // άφησε static, _next, api auth routes κλπ.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/public') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const session = req.cookies.get('session')?.value;
  if (session) return NextResponse.next();

  // redirect σε /login με ?next=...
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
