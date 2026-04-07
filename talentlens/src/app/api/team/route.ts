import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { sendTeamInvite } from '@/lib/email';
import { ok, err } from '@/types';

const InviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(['HR', 'VIEWER']).default('HR'),
});

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const [members, invites] = await Promise.all([
      prisma.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.teamInvite.findMany({
        where: { companyId: user.companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return NextResponse.json(ok({ members, invites }));
  } catch (e) {
    console.error('[team GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user   = getRequestUser(req);
    const body   = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(err('Validation error'), { status: 400 });

    const { email, role } = parsed.data;

    // Check not already a member
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.companyId === user.companyId) {
      return NextResponse.json(err('Пользователь уже в команде'), { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await prisma.teamInvite.create({
      data: { email, companyId: user.companyId, invitedById: user.id, role, expiresAt },
      include: { company: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } },
    });

    const inviteLink = `${req.nextUrl.origin}/invite/${invite.token}`;
    await sendTeamInvite({
      to:          email,
      inviterName: invite.invitedBy.name ?? invite.invitedBy.email,
      companyName: invite.company.name,
      inviteLink,
    });

    return NextResponse.json(ok({ id: invite.id, email, role }), { status: 201 });
  } catch (e) {
    console.error('[team POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = req.nextUrl;
    const inviteId = searchParams.get('inviteId');
    const memberId = searchParams.get('memberId');

    if (inviteId) {
      await prisma.teamInvite.deleteMany({ where: { id: inviteId, companyId: user.companyId } });
    } else if (memberId) {
      if (memberId === user.id) return NextResponse.json(err('Cannot remove yourself'), { status: 400 });
      await prisma.user.updateMany({
        where: { id: memberId, companyId: user.companyId },
        data:  { companyId: user.companyId }, // keep but could archive
      });
    }
    return NextResponse.json(ok({ done: true }));
  } catch (e) {
    console.error('[team DELETE]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
