import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/google — initiate Google OAuth2 flow
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Redirect back to login with error if Google not configured
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.nextUrl.origin));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
  const state       = crypto.randomUUID(); // CSRF token

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    access_type:   'offline',
    prompt:        'select_account',
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );

  // Store state in httpOnly cookie for CSRF verification in callback
  response.cookies.set('_gstate', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600, // 10 minutes
    path:     '/',
  });

  return response;
}
