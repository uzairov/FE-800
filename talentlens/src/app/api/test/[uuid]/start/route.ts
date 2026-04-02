import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setAssessmentStatus } from '@/lib/redis';
import { ok, err } from '@/types';

const StartSchema = z.object({
  language: z.enum(['ru', 'uz', 'en']),
});

export async function POST(req: NextRequest, { params }: { params: { uuid: string } }) {
  try {
    const body = await req.json();
    const parsed = StartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { linkUuid: params.uuid },
      include: { testSession: true },
    });

    if (!assessment) {
      return NextResponse.json(err('Link not found'), { status: 404 });
    }
    if (assessment.linkExpiresAt < new Date()) {
      return NextResponse.json(err('Link has expired'), { status: 410 });
    }
    if (assessment.testSession?.finishedAt) {
      return NextResponse.json(err('Test already completed'), { status: 409 });
    }

    // Upsert session — only set startedAt the first time
    const existingStartedAt = assessment.testSession?.startedAt ?? null;

    const session = await prisma.testSession.upsert({
      where: { assessmentId: assessment.id },
      create: {
        assessmentId: assessment.id,
        language: parsed.data.language,
        startedAt: new Date(),
      },
      update: {
        language: parsed.data.language,
        // Preserve original startedAt — don't reset on page refresh
        ...(existingStartedAt ? {} : { startedAt: new Date() }),
      },
    });

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: 'IN_PROGRESS' },
    });
    await setAssessmentStatus(assessment.id, 'IN_PROGRESS');

    return NextResponse.json(ok({ sessionId: session.id, startedAt: session.startedAt }));
  } catch (error) {
    console.error('[test start]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
