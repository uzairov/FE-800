import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

const COOKIE_NAME = 'rt';
const COOKIE_30D  = 30 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Try body first
    let token: string | null = null;
    let fromCookie = false;

    try {
      const body = await req.json();
      if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 0) {
        token = body.refreshToken;
      }
    } catch { /* no body or not JSON */ }

    // 2. Fallback to httpOnly cookie (rememberMe flow)
    if (!token) {
      token      = req.cookies.get(COOKIE_NAME)?.value ?? null;
      fromCookie = !!token;
    }

    console.log('[refresh] token present:', !!token, 'fromCookie:', fromCookie);

    if (!token) {
      console.warn('[refresh] no token in body or cookie');
      return NextResponse.json(err('refreshToken is required'), { status: 400 });
    }

    const result = await rotateRefreshToken(token);
    console.log('[refresh] user found:', !!result, result ? `(new accessToken issued)` : '(rotation failed)');

    if (!result) {
      // Clear stale cookie
      const res = NextResponse.json(err('Invalid or expired refresh token'), { status: 401 });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    const res = NextResponse.json(ok(result));

    // Re-set cookie with fresh token (rotation)
    if (fromCookie) {
      res.cookies.set(COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   COOKIE_30D,
        path:     '/api/auth',
      });
    }

    return res;
  } catch (error) {
    console.error('[refresh]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
