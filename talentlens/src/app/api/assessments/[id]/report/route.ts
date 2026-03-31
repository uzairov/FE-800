import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getRequestUser(req);

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        position: { select: { name: true, industry: true, competenciesJson: true } },
        testSession: { select: { startedAt: true, finishedAt: true, language: true, tabSwitches: true } },
        competencyResults: { orderBy: { weight: 'desc' } },
        riskFlags: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!assessment) {
      return NextResponse.json(err('Assessment not found'), { status: 404 });
    }

    if (assessment.status !== 'COMPLETED') {
      return NextResponse.json(
        err('Report not available: test not completed yet'),
        { status: 400 },
      );
    }

    return NextResponse.json(ok(assessment));
  } catch (error) {
    console.error('[report GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
