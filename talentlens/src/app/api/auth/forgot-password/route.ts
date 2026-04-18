import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { ok, err } from '@/types';

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to not leak whether email exists
      return NextResponse.json(ok({ reset: true }));
    }

    const hashed = await hashPassword(password);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.user as any).update({
      where: { id: user.id },
      data: {
        password:             hashed,
        resetPasswordToken:   null,
        resetPasswordExpires: null,
      },
    });

    return NextResponse.json(ok({ reset: true }));
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
