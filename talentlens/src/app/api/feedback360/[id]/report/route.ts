import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/feedback360/[id]/report — HR view: all participants summary
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getRequestUser(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = await (prisma as any).feedback360.findUnique({
      where: { id: params.id },
    });
    if (!fb || fb.companyId !== user.companyId) {
      return NextResponse.json(err('Not found'), { status: 404 });
    }

    const { participantIds } = fb as { participantIds: string[] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responses = await (prisma as any).feedback360Response.findMany({
      where: { feedback360Id: params.id },
    });

    const participants = await prisma.user.findMany({
      where:  { id: { in: participantIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    const userMap = new Map(participants.map((u) => [u.id, u]));

    const result = responses.map((r: {
      userId: string; peerRatingsReceived: number;
      managerRatingReceived: boolean; selfRatingSubmitted: boolean;
      peerAverageScores: unknown; managerScores: unknown; selfScores: unknown; gapAnalysis: unknown;
    }) => ({
      user:                  userMap.get(r.userId) ?? { id: r.userId, name: 'Unknown' },
      peerRatingsReceived:   r.peerRatingsReceived,
      managerRatingReceived: r.managerRatingReceived,
      selfRatingSubmitted:   r.selfRatingSubmitted,
      peerAverageScores:     r.peerAverageScores,
      managerScores:         r.managerScores,
      selfScores:            r.selfScores,
      gapAnalysis:           r.gapAnalysis,
    }));

    return NextResponse.json(ok({ feedback360: fb, participants: result }));
  } catch (e) {
    console.error('[feedback360/report GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
