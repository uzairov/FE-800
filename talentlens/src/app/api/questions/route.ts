import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';
import { getRequestUser } from '@/lib/api-helpers';
import { z } from 'zod';

// ─── GET /api/questions ─────────────────────────────────────────────────────
// Returns all questions grouped by blockType.
// Query params: ?blockType=... to filter

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blockType = searchParams.get('blockType') ?? undefined;

    const where = blockType ? { blockType } : {};
    const questions = await prisma.question.findMany({
      where,
      orderBy: [{ blockType: 'asc' }, { orderIndex: 'asc' }],
    });

    // Group by blockType
    const grouped: Record<string, typeof questions> = {};
    for (const q of questions) {
      if (!grouped[q.blockType]) grouped[q.blockType] = [];
      grouped[q.blockType].push(q);
    }

    // Block meta summary
    const blocks = Object.entries(grouped).map(([type, qs]) => ({
      blockType: type,
      count: qs.length,
      questions: qs,
    }));

    return NextResponse.json(ok({ blocks, total: questions.length }));
  } catch (error) {
    console.error('[questions GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── POST /api/questions ────────────────────────────────────────────────────
// Create a new custom question (HR-authored)

const CreateSchema = z.object({
  blockType:   z.string().min(1).max(64),
  textRu:      z.string().min(1),
  textUz:      z.string().default(''),
  textEn:      z.string().default(''),
  optionsJson: z.array(z.object({
    textRu: z.string(),
    textUz: z.string().optional().default(''),
    textEn: z.string().optional().default(''),
  })).min(2).max(6),
  scoringJson: z.array(z.object({
    competency: z.string(),
    scores: z.array(z.number().min(0).max(4)),
  })).default([]),
  orderIndex: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  try {
    getRequestUser(req); // ensures middleware validated the JWT

    const body = await req.json();
    const data = CreateSchema.parse(body);

    const question = await prisma.question.create({ data });
    return NextResponse.json(ok(question), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json(err(error.issues[0].message), { status: 400 });
    console.error('[questions POST]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── DELETE /api/questions ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    getRequestUser(req);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json(err('Missing id'), { status: 400 });

    await prisma.question.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (error) {
    console.error('[questions DELETE]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
