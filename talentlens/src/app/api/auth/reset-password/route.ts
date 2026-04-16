import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { ok, err } from '@/types';

const Schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error'), { status: 400 });
    }

    const { token, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      return NextResponse.json(err('Неверная или устаревшая ссылка'), { status: 400 });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return NextResponse.json(err('Ссылка истекла. Запросите новую.'), { status: 400 });
    }

    const hashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password:             hashed,
        resetPasswordToken:   null,
        resetPasswordExpires: null,
      },
    });

    return NextResponse.json(ok({ reset: true }));
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
