import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// GET   /api/admin/companies — full client list with payment + activity
// PATCH /api/admin/companies — update plan / blocked / paymentStatus
//
// SUPERADMIN-only (enforced by middleware on /api/admin/*).
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyRow {
  id:                   string;
  name:                 string;
  adminEmail:           string | null;
  registeredAt:         Date;
  currentPlan:          string;
  planName:             string;
  planId:               string | null;
  paymentStatus:        string;
  overdueAmount:        number;
  assessmentsThisMonth: number;
  lastActivityAt:       Date | null;
  userCount:            number;
  isBlocked:            boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search        = searchParams.get('search')        ?? '';
    const planFilter    = searchParams.get('plan')          ?? '';
    const paymentFilter = searchParams.get('paymentStatus') ?? '';
    const dateFrom      = searchParams.get('dateFrom')      ?? '';
    const dateTo        = searchParams.get('dateTo')        ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (paymentFilter && ['active', 'overdue', 'pending'].includes(paymentFilter)) {
      where.paymentStatus = paymentFilter;
    }
    if (planFilter) where.planTier = { name: planFilter };
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) }              : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companiesRaw = await (prisma.company as any).findMany({
      where,
      include: {
        planTier: true,
        users: {
          where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true },
        },
        _count: { select: { users: true, assessments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Batch: assessments this month per company ────────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCounts = await prisma.assessment.groupBy({
      by: ['companyId'],
      where: { createdAt: { gte: startOfMonth } },
      _count: { id: true },
    });
    const monthlyMap = new Map(monthlyCounts.map((r) => [r.companyId, r._count.id]));

    // ── Batch: last activity per company (latest assessment.createdAt) ───
    const lastActivityRaw = await prisma.assessment.groupBy({
      by: ['companyId'],
      _max: { createdAt: true },
    });
    const lastActivityMap = new Map(
      lastActivityRaw.map((r) => [r.companyId, r._max.createdAt as Date | null]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companies: CompanyRow[] = (companiesRaw as any[]).map((c) => ({
      id:                   c.id,
      name:                 c.name,
      adminEmail:           c.users[0]?.email ?? null,
      registeredAt:         c.createdAt,
      currentPlan:          c.planTier?.displayName ?? 'Free',
      planName:             c.planTier?.name ?? 'free',
      planId:               c.planId,
      paymentStatus:        c.paymentStatus ?? 'active',
      overdueAmount:        c.overdueAmount ?? 0,
      assessmentsThisMonth: monthlyMap.get(c.id) ?? 0,
      lastActivityAt:       c.lastActivityAt ?? lastActivityMap.get(c.id) ?? null,
      userCount:            c._count.users,
      isBlocked:            c.isBlocked,
    }));

    // ── Aggregate stats ──────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const activeCompanyIds = new Set(
      (await prisma.assessment.findMany({
        where:    { createdAt: { gte: thirtyDaysAgo } },
        select:   { companyId: true },
        distinct: ['companyId'],
      })).map((r) => r.companyId),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlans = await (prisma as any).plan.findMany();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planPriceMap = new Map(allPlans.map((p: any) => [p.id, p.priceUsd as number]));

    let mrr          = 0;
    let totalOverdue = 0;
    for (const c of companies) {
      if (c.planId && !c.isBlocked) mrr += planPriceMap.get(c.planId) ?? 0;
      totalOverdue += c.overdueAmount;
    }

    return NextResponse.json(ok({
      companies,
      stats: {
        totalCompanies:  companies.length,
        activeCompanies: companies.filter((c) => activeCompanyIds.has(c.id)).length,
        mrr,
        totalOverdue,
      },
      plans: allPlans,
    }));
  } catch (e) {
    console.error('[admin/companies GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — update company
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      companyId:      string;
      planId?:        string;
      isBlocked?:     boolean;
      paymentStatus?: string;
      overdueAmount?: number;
    };
    const { companyId, planId, isBlocked, paymentStatus, overdueAmount } = body;
    if (!companyId) return NextResponse.json(err('Missing companyId'), { status: 400 });

    const data: Record<string, unknown> = {};
    if (planId        !== undefined) data.planId    = planId;
    if (isBlocked     !== undefined) data.isBlocked = isBlocked;
    if (paymentStatus !== undefined && ['active', 'overdue', 'pending'].includes(paymentStatus)) {
      data.paymentStatus = paymentStatus;
    }
    if (overdueAmount !== undefined) data.overdueAmount = overdueAmount;

    const company = await prisma.company.update({ where: { id: companyId }, data });
    return NextResponse.json(ok(company));
  } catch (e) {
    console.error('[admin/companies PATCH]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
