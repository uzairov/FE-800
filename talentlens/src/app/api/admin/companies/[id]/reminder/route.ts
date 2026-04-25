import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentReminder } from '@/lib/email';
import { ok, err } from '@/types';

// POST /api/admin/companies/[id]/reminder
// Sends a payment-reminder email to the company's first ADMIN user.
// SUPERADMIN-only (enforced by middleware on /api/admin/*).

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company = await (prisma.company as any).findUnique({
      where:   { id: params.id },
      include: {
        planTier: true,
        users: {
          where:   { role: { in: ['ADMIN', 'SUPERADMIN'] } },
          orderBy: { createdAt: 'asc' },
          take:    1,
          select:  { email: true, name: true },
        },
      },
    });

    if (!company)            return NextResponse.json(err('Company not found'), { status: 404 });
    if (!company.users[0])   return NextResponse.json(err('No admin user for this company'), { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdueAmount = (company as any).overdueAmount ?? 0;

    await sendPaymentReminder({
      to:           company.users[0].email,
      companyName:  company.name,
      planName:     company.planTier?.displayName ?? 'Free',
      amount:       overdueAmount,
    });

    return NextResponse.json(ok({ sent: true, to: company.users[0].email }));
  } catch (e) {
    console.error('[admin/companies/reminder POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
