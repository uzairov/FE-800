import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cacheSessionProgress } from '@/lib/redis';
import { ok, err } from '@/types';

// Periodic progress save — stores to DB + Redis backup (§TEST-08)
const AnswerSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.number().int().min(-1),
      textAnswer: z.string().optional(),
      answeredAt: z.string(),
      responseMs: z.number().int().min(0),
    }),
  ),
  tabSwitches: z.number().int().min(0),
});

export async function POST(req: NextRequest, { params }: { params: { uuid: string } }) {
  try {
    const body = await req.json();
    const parsed = AnswerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { linkUuid: params.uuid },
      include: { testSession: true },
    });

    if (!assessment?.testSession) {
      return NextResponse.json(err('Session not found — call /start first'), {
        status: 404,
      });
    }

    if (assessment.testSession.finishedAt) {
      return NextResponse.json(err('Test already completed'), { status: 409 });
    }

    const { answers, tabSwitches } = parsed.data;

    await prisma.testSession.update({
      where: { assessmentId: assessment.id },
      data: {
        answersJson: answers,
        tabSwitches,
      },
    });

    // Also store in Redis as backup for §TEST-08
    await cacheSessionProgress(params.uuid, { answers, tabSwitches });

    return NextResponse.json(ok({ saved: answers.length }));
  } catch (error) {
    console.error('[test answer]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
