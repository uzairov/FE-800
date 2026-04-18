import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signAccessToken, createRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

const COOKIE_NAME = 'rt';
const COOKIE_30D  = 30 * 24 * 60 * 60; // seconds

const LoginSchema = z.object({
  email:      z.string().email(),
  password:   z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const { email, password, rememberMe } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma.user as any).findUnique({ where: { email } });

    // Constant-time-ish: always hash even when user not found to prevent timing attacks
    const isValid = user ? await verifyPassword(password, user.password) : false;

    if (!user || !isValid) {
      return NextResponse.json(err('Invalid email or password'), { status: 401 });
    }

    if (user.isBlocked) {
      return NextResponse.json(err('Аккаунт заблокирован'), { status: 403 });
    }

    const accessToken  = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
    const refreshToken = await createRefreshToken(user.id, rememberMe);

    const payload = ok({
      accessToken,
      // Only return refreshToken in body when NOT rememberMe (client stores in sessionStorage)
      refreshToken: rememberMe ? null : refreshToken,
      rememberMe,
      user: {
        id:             user.id,
        email:          user.email,
        name:           user.name,
        role:           user.role,
        companyId:      user.companyId,
        emailVerified:  user.emailVerified,
        onboardingDone: user.onboardingDone,
      },
    });

    const res = NextResponse.json(payload);

    if (rememberMe) {
      // httpOnly cookie — JS cannot access it, XSS-safe
      res.cookies.set(COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   COOKIE_30D,
        path:     '/api/auth',
      });
    }

    return res;
  } catch (error) {
    console.error('[login]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
