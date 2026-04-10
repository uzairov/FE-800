import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';

// PATCH /api/admin/companies — update company (plan, blocked)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { companyId: string; planId?: string; isBlocked?: boolean };
    const { companyId, planId, isBlocked } = body;
    if (!companyId) return NextResponse.json(err('Missing companyId'), { status: 400 });

    const data: Record<string, unknown> = {};
    if (planId    !== undefined) data.planId    = planId;
    if (isBlocked !== undefined) data.isBlocked = isBlocked;

    const company = await prisma.company.update({ where: { id: companyId }, data });
    return NextResponse.json(ok(company));
  } catch (e) {
    console.error('[admin/companies PATCH]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
