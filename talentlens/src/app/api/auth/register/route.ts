import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, signAccessToken, createRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
  companyName: z.string().min(1, 'Company name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const { email, password, name, companyName } = parsed.data;

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(err('Email already registered'), { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create company + user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName },
      });

      return tx.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          role: 'HR',
          companyId: company.id,
        },
      });
    });

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
      { status: 201 },
    );
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
