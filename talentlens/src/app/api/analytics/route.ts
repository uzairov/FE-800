import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { companyId } = user;

    // Last 30 days — assessments per day
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [allAssessments, competencyResults] = await Promise.all([
      prisma.assessment.findMany({
        where: { companyId },
        select: { status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.competencyResult.findMany({
        where: { assessment: { companyId } },
        select: { competency: true, score: true, level: true },
      }),
    ]);

    // ── Assessments per day (last 30 days) ──────────────────────────────
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const a of allAssessments) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (key in dayMap) dayMap[key]++;
    }
    const timeline = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    // ── Status distribution ──────────────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    for (const a of allAssessments) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    }
    const statusDist = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // ── Average score per competency ─────────────────────────────────────
    const compMap: Record<string, { sum: number; count: number }> = {};
    for (const r of competencyResults) {
      if (!compMap[r.competency]) compMap[r.competency] = { sum: 0, count: 0 };
      compMap[r.competency].sum   += r.score;
      compMap[r.competency].count += 1;
    }
    const competencyAvg = Object.entries(compMap)
      .map(([competency, { sum, count }]) => ({
        competency,
        avg: Math.round(sum / count),
        count,
      }))
      .sort((a, b) => b.avg - a.avg);

    // ── Summary ──────────────────────────────────────────────────────────
    const total     = allAssessments.length;
    const completed = allAssessments.filter((a) => a.status === 'COMPLETED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json(ok({ timeline, statusDist, competencyAvg, total, completed, completionRate }));
  } catch (e) {
    console.error('[analytics GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
