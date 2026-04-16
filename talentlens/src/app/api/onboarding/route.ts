import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';

const Schema = z.object({
  industry:    z.string().min(1),
  size:        z.enum(['1-10', '11-50', '51-200', '201-500', '500+']),
  templateIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId    = req.headers.get('x-user-id');
    const companyId = req.headers.get('x-user-company-id');

    if (!userId || !companyId) {
      return NextResponse.json(err('Unauthorized'), { status: 401 });
    }

    const body   = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), { status: 400 });
    }

    const { industry, size } = parsed.data;

    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data:  { industry, size },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { onboardingDone: true },
      }),
    ]);

    return NextResponse.json(ok({ done: true }));
  } catch (error) {
    console.error('[onboarding]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
