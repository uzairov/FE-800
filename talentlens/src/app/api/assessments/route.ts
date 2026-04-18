import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { setAssessmentStatus } from '@/lib/redis';
import { sendCandidateLink } from '@/lib/email';
import { ok, err } from '@/types';

const CreateSchema = z.object({
  candidateName:  z.string().min(1, 'Candidate name required'),
  positionId:     z.string().min(1, 'Position required'),
  competencies:   z.array(z.string()).min(1, 'At least one competency required'),
  candidateEmail: z.string().email().optional().or(z.literal('')),
  expiryDays:     z.number().int().min(1).max(30).default(7),
});

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = req.nextUrl;

    const status   = searchParams.get('status')   ?? undefined;
    const search   = searchParams.get('search')   ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo   = searchParams.get('dateTo')   ?? undefined;
    const sortRaw  = searchParams.get('sort')     ?? 'createdAt';
    const dirRaw   = searchParams.get('dir')      ?? 'desc';
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const skip  = (page - 1) * limit;

    const sortField = ['createdAt', 'candidateName', 'status'].includes(sortRaw) ? sortRaw : 'createdAt';
    const sortDir   = dirRaw === 'asc' ? 'asc' : 'desc';

    const where = {
      companyId: user.companyId,
      ...(status ? { status: status as never } : {}),
      ...(search ? { candidateName: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(dateFrom || dateTo ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
        },
      } : {}),
    };

    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip,
        take: limit,
        include: {
          position: { select: { name: true, industry: true } },
          createdBy: { select: { name: true, email: true } },
          testSession: { select: { startedAt: true, finishedAt: true, language: true } },
        },
      }),
      prisma.assessment.count({ where }),
    ]);

    return NextResponse.json(ok({ assessments, total, page, limit }));
  } catch (error) {
    console.error('[assessments GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const { candidateName, positionId, competencies, candidateEmail, expiryDays } = parsed.data;

    // ── Plan limit check ────────────────────────────────────────────────
    if (user.role !== 'SUPERADMIN') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = await (prisma.company as any).findUnique({
        where:   { id: user.companyId },
        include: { planTier: true },
      });
      const plan = company?.planTier;
      if (plan && plan.maxAssessmentsPerMonth > 0) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthlyCount = await prisma.assessment.count({
          where: { companyId: user.companyId, createdAt: { gte: startOfMonth } },
        });
        if (monthlyCount >= plan.maxAssessmentsPerMonth) {
          return NextResponse.json(
            err(`Лимит оценок для плана «${plan.displayName}» (${plan.maxAssessmentsPerMonth}/мес) исчерпан. Обновите тариф.`),
            { status: 403 },
          );
        }
      }
    }

    const template = await prisma.positionTemplate.findUnique({
      where: { id: positionId },
    });
    if (!template) {
      return NextResponse.json(err('Position template not found'), { status: 404 });
    }

    const linkExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const assessment = await prisma.assessment.create({
      data: {
        candidateName,
        positionId,
        competencies,
        estimatedMinutes: template.estimatedMinutes,
        linkExpiresAt,
        companyId:   user.companyId,
        createdById: user.id,
      },
      include: {
        position:  { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    await setAssessmentStatus(assessment.id, 'CREATED');

    if (candidateEmail) {
      const origin = req.nextUrl.origin;
      const link   = `${origin}/test/${assessment.linkUuid}`;
      await sendCandidateLink({
        to:           candidateEmail,
        candidateName,
        positionName: template.name,
        link,
        expiresAt:    linkExpiresAt,
        senderName:   assessment.createdBy.name ?? assessment.createdBy.email,
      });
    }

    return NextResponse.json(ok({ ...assessment, candidateEmail: candidateEmail ?? null }), { status: 201 });
  } catch (error) {
    console.error('[assessments POST]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
