import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendResetEmail } from '@/lib/email';
import { ok } from '@/types';

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      // Always return ok to not leak whether email exists
      return NextResponse.json(ok({ sent: true }));
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (user) {
      const token   = randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.user as any).update({
        where: { id: user.id },
        data: { resetPasswordToken: token, resetPasswordExpires: expires },
      });

      sendResetEmail(user.email, token).catch((e) =>
        console.error('[forgot-password] email failed:', e),
      );
    }

    // Always return the same response (no user enumeration)
    return NextResponse.json(ok({ sent: true }));
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json(ok({ sent: true }));
  }
}
