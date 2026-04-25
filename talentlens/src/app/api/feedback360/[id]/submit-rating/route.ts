import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';

const SubmitSchema = z.object({
  ratedUserId: z.string(),
  raterUserId: z.string(),
  rationType:  z.enum(['peer', 'self', 'manager', 'skip']),
  scores:      z.record(z.string(), z.number().min(1).max(5)),
  comments:    z.string().optional(),
});

// POST /api/feedback360/[id]/submit-rating — public (link-based), no JWT required
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), { status: 400 });
    }

    const { ratedUserId, raterUserId, rationType, scores, comments } = parsed.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fb = await (prisma as any).feedback360.findUnique({ where: { id: params.id } });
    if (!fb || fb.status !== 'active') {
      return NextResponse.json(err('Review not found or not active'), { status: 404 });
    }

    const { isAnonymous } = fb as { isAnonymous: boolean };

    // Upsert rating
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).feedback360Rating.upsert({
      where: {
        feedback360Id_ratedUserId_raterUserId_rationType: {
          feedback360Id: params.id, ratedUserId, raterUserId, rationType,
        },
      },
      update: { scores, comments, submittedAt: new Date() },
      create: {
        feedback360Id: params.id, ratedUserId, raterUserId, rationType,
        scores, comments, isAnonymous, submittedAt: new Date(),
      },
    });

    // Recalculate aggregates for the rated user
    await recalcResponse(params.id, ratedUserId);

    return NextResponse.json(ok({ submitted: true }));
  } catch (e) {
    console.error('[feedback360/submit-rating POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

async function recalcResponse(feedback360Id: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ratings = await (prisma as any).feedback360Rating.findMany({
    where: { feedback360Id, ratedUserId: userId, submittedAt: { not: null } },
  });

  const peers   = ratings.filter((r: { rationType: string }) => r.rationType === 'peer');
  const manager = ratings.find( (r: { rationType: string }) => r.rationType === 'manager');
  const self    = ratings.find( (r: { rationType: string }) => r.rationType === 'self');

  // Aggregate peer scores
  let peerAverageScores: Record<string, number> | null = null;
  if (peers.length > 0) {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const p of peers) {
      const s = p.scores as Record<string, number>;
      for (const [k, v] of Object.entries(s)) {
        sums[k]   = (sums[k]   ?? 0) + v;
        counts[k] = (counts[k] ?? 0) + 1;
      }
    }
    peerAverageScores = Object.fromEntries(
      Object.entries(sums).map(([k, v]) => [k, Math.round((v / counts[k]) * 10) / 10]),
    );
  }

  const managerScores = manager ? (manager.scores as Record<string, number>) : null;
  const selfScores    = self    ? (self.scores    as Record<string, number>) : null;

  // Gap analysis: self vs average of peer+manager
  let gapAnalysis: Record<string, number> | null = null;
  if (selfScores) {
    gapAnalysis = {};
    const external = peerAverageScores ?? managerScores;
    if (external) {
      for (const key of Object.keys(selfScores)) {
        if (external[key] !== undefined) {
          gapAnalysis[key] = Math.round((selfScores[key] - external[key]) * 10) / 10;
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).feedback360Response.upsert({
    where:  { feedback360Id_userId: { feedback360Id, userId } },
    update: {
      peerRatingsReceived:   peers.length,
      managerRatingReceived: !!manager,
      selfRatingSubmitted:   !!self,
      peerAverageScores,
      managerScores,
      selfScores,
      gapAnalysis,
      submittedAt: new Date(),
    },
    create: {
      feedback360Id, userId,
      peerRatingsReceived:   peers.length,
      managerRatingReceived: !!manager,
      selfRatingSubmitted:   !!self,
      peerAverageScores,
      managerScores,
      selfScores,
      gapAnalysis,
    },
  });
}
