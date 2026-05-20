import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard', '/library', '/publish', '/accounts', '/calendar',
  '/agents', '/governance', '/admin', '/superadmin', '/access', '/team',
  '/studio', '/projects', '/campaigns', '/inbox', '/analytics', '/operations',
  '/resources', '/queue', '/validation', '/exceptions', '/integrations',
  '/review', '/support', '/profile', '/manage-posts',
];

// Routes only for unauthenticated users
const AUTH_ONLY_ROUTES = new Set(['/login', '/signup', '/reset-password']);

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// zv_auth cookie is set client-side via supabase onAuthStateChange.
// It acts as a first-layer signal; the real validation is client-side in
// (dashboard)/layout.tsx via supabase.auth.getSession().
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthCookie = request.cookies.has('zv_auth');

  // Redirect bare root
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasAuthCookie ? '/dashboard' : '/login', request.url),
    );
  }

  // Block protected routes for users without a session cookie
  if (isProtectedPath(pathname) && !hasAuthCookie) {
    const url = new URL('/login', request.url);
    // Preserve intended destination so login can redirect back after auth
    if (pathname !== '/dashboard') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Bounce already-authenticated users away from auth pages
  if (AUTH_ONLY_ROUTES.has(pathname) && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Security headers on every response
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = {
  // Exclude static files, Next.js internals, and public assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)'],
};
