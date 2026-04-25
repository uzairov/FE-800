import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/feedback360/[id]/report/[userId] — individual employee report
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  try {
    const user = getRequestUser(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = await (prisma as any).feedback360.findUnique({ where: { id: params.id } });
    if (!fb || fb.companyId !== user.companyId) {
      return NextResponse.json(err('Not found'), { status: 404 });
    }

    // HR/Admin can see anyone; others can only see themselves
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN' && user.role !== 'HR') {
      if (user.id !== params.userId) {
        return NextResponse.json(err('Forbidden'), { status: 403 });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (prisma as any).feedback360Response.findUnique({
      where: { feedback360Id_userId: { feedback360Id: params.id, userId: params.userId } },
    });

    const employee = await prisma.user.findUnique({
      where:  { id: params.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!employee) return NextResponse.json(err('Employee not found'), { status: 404 });

    const { competencies } = fb as { competencies: string[] };
    const peer    = (response?.peerAverageScores  ?? {}) as Record<string, number>;
    const manager = (response?.managerScores       ?? {}) as Record<string, number>;
    const self    = (response?.selfScores          ?? {}) as Record<string, number>;
    const gap     = (response?.gapAnalysis         ?? {}) as Record<string, number>;

    const competencyBreakdown = competencies.map((name) => {
      const peerAvg     = peer[name]    ?? null;
      const managerScore = manager[name] ?? null;
      const selfScore    = self[name]    ?? null;
      const gapValue     = gap[name]     ?? null;

      let interpretation: string | null = null;
      if (gapValue !== null) {
        if (gapValue > 1)       interpretation = 'Вы себя переоцениваете — коллеги видят вас ниже';
        else if (gapValue < -1) interpretation = 'Вы себя недооцениваете — коллеги видят вас выше';
        else                    interpretation = 'Самооценка совпадает с внешней оценкой';
      }

      return { name, peerAvg, managerScore, selfScore, gap: gapValue, interpretation };
    });

    // Top strengths: competencies with peer avg ≥ 4
    const topStrengths = competencyBreakdown
      .filter((c) => (c.peerAvg ?? c.managerScore ?? 0) >= 4)
      .map((c) => c.name);

    // Areas for development: competencies with peer avg < 3
    const areasForDevelopment = competencyBreakdown
      .filter((c) => (c.peerAvg ?? c.managerScore ?? 5) < 3)
      .map((c) => c.name);

    return NextResponse.json(ok({
      employee,
      feedback360: { id: fb.id, name: fb.name, status: fb.status },
      competencies: competencyBreakdown,
      topStrengths,
      areasForDevelopment,
      meta: {
        peerRatingsReceived:   response?.peerRatingsReceived   ?? 0,
        managerRatingReceived: response?.managerRatingReceived ?? false,
        selfRatingSubmitted:   response?.selfRatingSubmitted   ?? false,
      },
    }));
  } catch (e) {
    console.error('[feedback360/report/userId GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
