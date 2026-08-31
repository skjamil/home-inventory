import { NextRequest, NextResponse } from 'next/server';

// A lightweight, Edge-safe fast-path redirect — NOT the authoritative check.
// Database sessions require a Prisma lookup to validate, and Prisma isn't
// Edge-compatible, so the real enforcement lives where it can safely use
// Prisma: (protected)/layout.tsx (redirects server-side) and each API route
// (checks auth() itself, returns 401). This middleware only bounces the
// common case of a request with no session cookie at all, before it even
// reaches a page/route — see docs/ARCHITECTURE.md's "Auth" data flow.
const PROTECTED_PAGE_PREFIXES = ['/dashboard', '/items', '/categories', '/settings', '/profile'];
const SESSION_COOKIE_NAMES = ['authjs.session-token', '__Secure-authjs.session-token'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
  if (hasSessionCookie) return NextResponse.next();

  return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
}

export const config = {
  matcher: ['/dashboard/:path*', '/items/:path*', '/categories/:path*', '/settings/:path*', '/profile/:path*'],
};
