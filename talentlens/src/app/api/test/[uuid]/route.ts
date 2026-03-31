import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setAssessmentStatus } from '@/lib/redis';
import { ok, err } from '@/types';

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { linkUuid: params.uuid },
      include: {
        position: {
          select: {
            name: true,
            nameUz: true,
            nameEn: true,
            blocksJson: true,
            competenciesJson: true,
            estimatedMinutes: true,
          },
        },
        testSession: {
          select: { language: true, startedAt: true, finishedAt: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(err('Link not found'), { status: 404 });
    }

    if (assessment.linkExpiresAt < new Date()) {
      return NextResponse.json(err('Link has expired'), { status: 410 });
    }

    if (assessment.testSession?.finishedAt) {
      return NextResponse.json(ok({ status: 'completed' }));
    }

    // Mark link as opened (first time only)
    if (assessment.status === 'CREATED') {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { status: 'LINK_OPENED' },
      });
      await setAssessmentStatus(assessment.id, 'LINK_OPENED');
    }

    // Fetch questions for all blocks in the position template
    const blocks = assessment.position.blocksJson as string[];
    const questions = await prisma.question.findMany({
      where: { blockType: { in: blocks } },
      select: {
        id: true,
        blockType: true,
        textRu: true,
        textUz: true,
        textEn: true,
        optionsJson: true,
        scoringJson: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json(
      ok({
        assessmentId: assessment.id,
        candidateName: assessment.candidateName,
        position: assessment.position,
        estimatedMinutes: assessment.estimatedMinutes,
        blocks,
        questions,
        language: assessment.testSession?.language ?? null,
        alreadyStarted: !!assessment.testSession?.startedAt,
      }),
    );
  } catch (error) {
    console.error('[test GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
