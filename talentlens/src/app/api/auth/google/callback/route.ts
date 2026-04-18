import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAccessToken, createRefreshToken } from '@/lib/auth';

// GET /api/auth/google/callback — handle Google OAuth2 callback
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const storedState = req.cookies.get('_gstate')?.value;
  const origin      = req.nextUrl.origin;

  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, origin));

  // CSRF check
  if (!storedState || !state || state !== storedState) return fail('invalid_state');
  if (error || !code) return fail(error ?? 'no_code');

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('google_not_configured');

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${origin}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenRes.ok) return fail('token_exchange_failed');
    const tokens = await tokenRes.json() as { access_token: string };

    // 2. Get Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return fail('profile_fetch_failed');

    const profile = await profileRes.json() as {
      id: string; email: string; name?: string; picture?: string;
    };

    const { id: googleId, email, name } = profile;

    // 3. Find or create user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user = await (prisma.user as any).findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      // Brand-new user — create company + user together
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = await (prisma.company as any).create({
        data: {
          name:   `${name ?? email.split('@')[0]}'s Company`,
          planId: 'plan_free',
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user = await (prisma.user as any).create({
        data: {
          email,
          name:      name ?? null,
          googleId,
          password:  crypto.randomUUID(), // unused, Google auth only
          companyId: company.id,
          role:      'HR',
        },
      });
    } else if (!user.googleId) {
      // Existing email-password user — link their Google account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user = await (prisma.user as any).update({
        where: { id: user.id },
        data:  { googleId },
      });
    }

    if (user.isBlocked) return fail('account_blocked');

    // 4. Issue our own JWT tokens (same as email/password flow)
    const accessToken  = signAccessToken({
      sub:       user.id,
      email:     user.email,
      role:      user.role,
      companyId: user.companyId,
    });
    const refreshToken = await createRefreshToken(user.id);

    // 5. Pass tokens to the login page via query params (client picks them up)
    const redirect = new URL('/login', origin);
    redirect.searchParams.set('at', accessToken);
    redirect.searchParams.set('rt', refreshToken);

    const response = NextResponse.redirect(redirect);
    response.cookies.delete('_gstate');
    return response;
  } catch (err) {
    console.error('[google/callback]', err);
    return fail('oauth_failed');
  }
}
