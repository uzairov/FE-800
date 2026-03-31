import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { setAssessmentStatus, clearSessionProgress } from '@/lib/redis';
import { calculateCompetencyScores, calculateRiskFlags } from '@/lib/scoring';
import { ok, err } from '@/types';

const FinishSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.number().int().min(0),
      answeredAt: z.string(),
      responseMs: z.number().int().min(0),
    }),
  ),
  tabSwitches: z.number().int().min(0),
});

export async function POST(req: NextRequest, { params }: { params: { uuid: string } }) {
  try {
    const body = await req.json();
    const parsed = FinishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), {
        status: 400,
      });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { linkUuid: params.uuid },
      include: {
        testSession: true,
        position: true,
      },
    });

    if (!assessment?.testSession) {
      return NextResponse.json(err('Session not found'), { status: 404 });
    }

    if (assessment.testSession.finishedAt) {
      return NextResponse.json(ok({ alreadyDone: true }));
    }

    const { answers, tabSwitches } = parsed.data;

    // ── Fetch questions needed for scoring ────────────────────────────────
    const blocks = assessment.position.blocksJson as string[];
    const questions = await prisma.question.findMany({
      where: { blockType: { in: blocks } },
      select: { id: true, scoringJson: true },
    });

    // ── Scoring §7 ────────────────────────────────────────────────────────
    const competencyWeights = assessment.position.competenciesJson as Array<{
      key: string;
      weight: 1 | 2 | 3;
    }>;
    const scores = calculateCompetencyScores(answers, questions, competencyWeights);

    // ── Risk flags §6 ─────────────────────────────────────────────────────
    const flags = calculateRiskFlags(answers, tabSwitches);

    // ── Persist everything in a transaction ───────────────────────────────
    await prisma.$transaction([
      // Update session
      prisma.testSession.update({
        where: { assessmentId: assessment.id },
        data: { answersJson: answers, tabSwitches, finishedAt: new Date() },
      }),
      // Update assessment status
      prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'COMPLETED' },
      }),
      // Store competency results
      ...scores.map((s) =>
        prisma.competencyResult.upsert({
          where: { assessmentId_competency: { assessmentId: assessment.id, competency: s.competency } },
          create: {
            assessmentId: assessment.id,
            competency: s.competency,
            score: s.score,
            level: s.level,
            weight: s.weight,
          },
          update: { score: s.score, level: s.level, weight: s.weight },
        }),
      ),
      // Store risk flags (delete old, insert new)
      prisma.riskFlag.deleteMany({ where: { assessmentId: assessment.id } }),
    ]);

    // Insert flags after deleteMany (need separate call due to transaction ordering)
    if (flags.length > 0) {
      await prisma.riskFlag.createMany({
        data: flags.map((f) => ({
          assessmentId: assessment.id,
          level: f.level,
          type: f.type,
          descriptionRu: f.descriptionRu,
          value: f.value ?? null,
        })),
      });
    }

    await setAssessmentStatus(assessment.id, 'COMPLETED');
    await clearSessionProgress(params.uuid);

    return NextResponse.json(ok({ done: true, competencies: scores.length }));
  } catch (error) {
    console.error('[test finish]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
