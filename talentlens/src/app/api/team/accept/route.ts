import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signAccessToken, createRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

// ── GET /api/team/accept?token= ───────────────────────────────────────────────
// Returns invite info so the page can display company/role and know if user exists

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json(err('Missing token'), { status: 400 });

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { company: { select: { name: true } } },
    });

    if (!invite)              return NextResponse.json(err('Приглашение не найдено'), { status: 404 });
    if (invite.acceptedAt)    return NextResponse.json(err('Приглашение уже принято'), { status: 409 });
    if (invite.expiresAt < new Date()) return NextResponse.json(err('Приглашение истекло'), { status: 410 });

    const userExists = !!(await prisma.user.findUnique({ where: { email: invite.email } }));

    return NextResponse.json(ok({
      email:       invite.email,
      companyName: invite.company.name,
      role:        invite.role,
      expiresAt:   invite.expiresAt,
      userExists,
    }));
  } catch (e) {
    console.error('[team/accept GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ── POST /api/team/accept ─────────────────────────────────────────────────────
// New user: { token, name, password }
// Existing user: { token, password }

const AcceptSchema = z.object({
  token:    z.string().min(1),
  name:     z.string().optional(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = AcceptSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(err('Validation error'), { status: 400 });

    const { token, name, password } = parsed.data;

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { company: { select: { id: true, name: true } } },
    });

    if (!invite)              return NextResponse.json(err('Приглашение не найдено'), { status: 404 });
    if (invite.acceptedAt)    return NextResponse.json(err('Приглашение уже принято'), { status: 409 });
    if (invite.expiresAt < new Date()) return NextResponse.json(err('Приглашение истекло'), { status: 410 });

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });
    let userId: string;

    if (existing) {
      // Existing user — verify password, then switch company if needed
      const valid = await bcrypt.compare(password, existing.password);
      if (!valid) return NextResponse.json(err('Неверный пароль'), { status: 401 });

      if (existing.companyId !== invite.companyId) {
        await prisma.user.update({
          where: { id: existing.id },
          data:  { companyId: invite.companyId, role: invite.role as never },
        });
      }
      userId = existing.id;
    } else {
      // New user — create account
      const hash = await bcrypt.hash(password, 12);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (prisma.user as any).create({
        data: {
          email:         invite.email,
          password:      hash,
          name:          name ?? invite.email.split('@')[0],
          role:          invite.role,
          companyId:     invite.companyId,
          emailVerified: true,
        },
      });
      userId = user.id;
    }

    // Mark invite accepted
    await prisma.teamInvite.update({
      where: { token },
      data:  { acceptedAt: new Date() },
    });

    // Issue JWT
    const accessToken  = await signAccessToken({
      sub:       userId,
      email:     invite.email,
      role:      invite.role,
      companyId: invite.companyId,
    });
    const refreshToken = await createRefreshToken(userId);

    return NextResponse.json(ok({ accessToken, refreshToken }));
  } catch (e) {
    console.error('[team/accept POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
