import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

// POST /api/feedback360/[id]/send — activate and send invites
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getRequestUser(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = await (prisma as any).feedback360.findUnique({
      where: { id: params.id },
    });
    if (!fb || fb.companyId !== user.companyId) {
      return NextResponse.json(err('Not found'), { status: 404 });
    }

    // Activate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).feedback360.update({
      where: { id: params.id },
      data:  { status: 'active', startedAt: new Date() },
    });

    // Get evaluator emails and send (fire-and-forget; email lib handles errors internally)
    const { evaluatorIds, name } = fb as { evaluatorIds: string[]; name: string };
    const rateUrl = `${req.nextUrl.origin}/feedback360/${params.id}/rate`;

    if (evaluatorIds.length > 0) {
      const evaluators = await prisma.user.findMany({
        where:  { id: { in: evaluatorIds } },
        select: { email: true, name: true },
      });
      // Best-effort email delivery — don't block the response on failure
      import('@/lib/email').then(({ sendFeedback360Invite }) => {
        for (const ev of evaluators) {
          sendFeedback360Invite({ to: ev.email, reviewName: name, rateUrl }).catch(() => {});
        }
      }).catch(() => {});
    }

    return NextResponse.json(ok({ sent: evaluatorIds.length }));
  } catch (e) {
    console.error('[feedback360/send POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
