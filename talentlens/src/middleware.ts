import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that do NOT require authentication
const PUBLIC_PREFIXES = [
  '/api/auth/',       // register, login, refresh, logout, google OAuth
  '/test/',           // candidate test pages
  '/api/test/',       // candidate test API
  '/_next/',
  '/favicon.ico',
  '/login',
  '/register',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow root redirect
  if (pathname === '/') return NextResponse.next();

  // Page routes are protected client-side; only enforce auth on API routes
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? '');
    const { payload } = await jwtVerify(token, secret);

    const role = String(payload.role ?? '');

    // /api/admin/* — SUPERADMIN only
    if (pathname.startsWith('/api/admin') && role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Forward user info as headers to API routes
    const headers = new Headers(req.headers);
    headers.set('x-user-id',         String(payload.sub ?? ''));
    headers.set('x-user-email',      String(payload.email ?? ''));
    headers.set('x-user-role',       role);
    headers.set('x-user-company-id', String(payload.companyId ?? ''));

    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 },
    );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
