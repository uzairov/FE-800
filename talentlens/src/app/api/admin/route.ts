import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

// GET /api/admin — platform-wide stats + company list (SUPERADMIN only)
// Middleware already blocks non-SUPERADMIN at /api/admin/*
export async function GET(req: NextRequest) {
  try {
    getRequestUser(req); // ensure headers present

    const { searchParams } = req.nextUrl;
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const skip  = (page - 1) * limit;
    const search = searchParams.get('search') ?? '';

    // Platform stats
    const [totalCompanies, totalUsers, totalAssessments, plans, companiesRaw, total] =
      await Promise.all([
        prisma.company.count(),
        prisma.user.count(),
        prisma.assessment.count(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).plan.findMany({ orderBy: { priceUsd: 'asc' } }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma.company as any).findMany({
          where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
          include: {
            planTier: true,
            _count: { select: { users: true, assessments: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.company.count({
          where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
        }),
      ]);

    // 30-day daily new assessments
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const dailyRaw = await prisma.assessment.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    // Aggregate by day
    const dailyMap: Record<string, number> = {};
    for (const row of dailyRaw) {
      const d = row.createdAt.toISOString().slice(0, 10);
      dailyMap[d] = (dailyMap[d] ?? 0) + row._count.id;
    }
    const timeline = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companies = (companiesRaw as any[]).map((c) => ({
      id:          c.id,
      name:        c.name,
      isBlocked:   c.isBlocked,
      plan:        c.planTier ? { id: c.planTier.id, name: c.planTier.name, displayName: c.planTier.displayName } : null,
      userCount:   c._count.users,
      assessCount: c._count.assessments,
      createdAt:   c.createdAt,
    }));

    return NextResponse.json(ok({
      stats: { totalCompanies, totalUsers, totalAssessments },
      timeline,
      plans,
      companies,
      total,
      page,
      limit,
    }));
  } catch (e) {
    console.error('[admin GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
