import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';

const SESSION_PASSWORD =
  process.env.AUTH_SECRET ?? 'fallback-dev-secret-change-in-production-32ch';
const COOKIE_NAME = 'openmaic_session';

// Routes accessible without authentication
const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/api/auth/register',
  '/api/auth/login',
  '/api/health',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Check session cookie
  const sealed = req.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (sealed) {
    try {
      const session = await unsealData<{ userId?: string }>(sealed, { password: SESSION_PASSWORD });
      isAuthenticated = Boolean(session.userId);
    } catch {
      // Invalid/expired cookie — treat as unauthenticated
    }
  }

  if (!isAuthenticated) {
    // API routes return 401 JSON; page routes redirect to /login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
