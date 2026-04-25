import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name:           z.string().min(1),
  description:    z.string().optional(),
  competencies:   z.array(z.string()).min(1),
  participantIds: z.array(z.string()).min(1),
  evaluatorIds:   z.array(z.string()).default([]),
  includePeer:    z.boolean().default(true),
  includeSelf:    z.boolean().default(true),
  includeManager: z.boolean().default(true),
  isAnonymous:    z.boolean().default(true),
  startedAt:      z.string().optional(),
  closedAt:       z.string().optional(),
});

// GET /api/feedback360 — list all 360 reviews for the company
export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = await (prisma as any).feedback360.findMany({
      where:   { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { ratings: true, responses: true } },
      },
    });

    return NextResponse.json(ok(items));
  } catch (e) {
    console.error('[feedback360 GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// POST /api/feedback360 — create new 360 review
export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN' && user.role !== 'HR') {
      return NextResponse.json(err('Forbidden'), { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), { status: 400 });
    }

    const { name, description, competencies, participantIds, evaluatorIds,
            includePeer, includeSelf, includeManager, isAnonymous, startedAt, closedAt } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (prisma as any).feedback360.create({
      data: {
        companyId:    user.companyId,
        name,
        description,
        competencies,
        participantIds,
        evaluatorIds,
        includePeer,
        includeSelf,
        includeManager,
        isAnonymous,
        status:    'draft',
        startedAt: startedAt ? new Date(startedAt) : null,
        closedAt:  closedAt  ? new Date(closedAt)  : null,
      },
    });

    // Pre-create response stubs for each participant
    for (const uid of participantIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).feedback360Response.upsert({
        where:  { feedback360Id_userId: { feedback360Id: item.id, userId: uid } },
        update: {},
        create: { feedback360Id: item.id, userId: uid },
      });
    }

    return NextResponse.json(ok(item), { status: 201 });
  } catch (e) {
    console.error('[feedback360 POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
