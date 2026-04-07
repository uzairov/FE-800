import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

const CommentSchema = z.object({
  text:                z.string().min(1).max(2000),
  competencyResultId:  z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.reportComment.findMany({
      where: { assessmentId: params.id },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(ok(comments));
  } catch (e) {
    console.error('[comments GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user   = getRequestUser(req);
    const body   = await req.json();
    const parsed = CommentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(err('Validation error'), { status: 400 });

    const comment = await prisma.reportComment.create({
      data: {
        assessmentId:      params.id,
        competencyResultId: parsed.data.competencyResultId ?? null,
        authorId:          user.id,
        text:              parsed.data.text,
      },
      include: { author: { select: { name: true, email: true } } },
    });
    return NextResponse.json(ok(comment), { status: 201 });
  } catch (e) {
    console.error('[comments POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
