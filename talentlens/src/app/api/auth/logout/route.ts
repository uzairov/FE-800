import { NextRequest, NextResponse } from 'next/server';
import { revokeRefreshToken } from '@/lib/auth';
import { ok } from '@/types';

const COOKIE_NAME = 'rt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Revoke from body
    if (typeof body?.refreshToken === 'string' && body.refreshToken) {
      await revokeRefreshToken(body.refreshToken).catch(() => {});
    }

    // Revoke from cookie
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    if (cookieToken) {
      await revokeRefreshToken(cookieToken).catch(() => {});
    }

    const res = NextResponse.json(ok(null));
    res.cookies.delete(COOKIE_NAME);
    return res;
  } catch (error) {
    console.error('[logout]', error);
    const res = NextResponse.json(ok(null));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}
