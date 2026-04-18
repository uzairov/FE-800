import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/plan — current company's plan info + usage this month
export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [company, monthlyAssessments, memberCount] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.company as any).findUnique({
        where:   { id: user.companyId },
        include: { planTier: true },
      }),
      prisma.assessment.count({
        where: { companyId: user.companyId, createdAt: { gte: startOfMonth } },
      }),
      prisma.user.count({ where: { companyId: user.companyId } }),
    ]);

    const plan = company?.planTier ?? {
      id: 'plan_free', name: 'free', displayName: 'Free',
      maxAssessmentsPerMonth: 5, maxUsers: 2, hasAiAssistant: false,
      priceUsd: 0, features: [], createdAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlans = await (prisma as any).plan.findMany({ orderBy: { priceUsd: 'asc' } });

    return NextResponse.json(ok({
      plan,
      usage: {
        assessmentsThisMonth: monthlyAssessments,
        members: memberCount,
      },
      allPlans,
    }));
  } catch (e) {
    console.error('[plan GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
