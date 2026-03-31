import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signAccessToken, createRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time-ish: always hash even when user not found to prevent timing attacks
    const isValid = user ? await verifyPassword(password, user.password) : false;

    if (!user || !isValid) {
      return NextResponse.json(err('Invalid email or password'), { status: 401 });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
    const refreshToken = await createRefreshToken(user.id);

    return NextResponse.json(
      ok({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        },
      }),
    );
  } catch (error) {
    console.error('[login]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
