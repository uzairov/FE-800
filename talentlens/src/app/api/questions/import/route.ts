import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';
import { z } from 'zod';

const OptionSchema = z.object({
  textRu: z.string().default(''),
  textUz: z.string().default(''),
  textEn: z.string().default(''),
});

const ScoringEntrySchema = z.object({
  competency: z.string(),
  scores: z.array(z.number().min(0).max(4)),
});

const QuestionImportSchema = z.object({
  blockType:   z.string().min(1).max(64),
  textRu:      z.string().min(1),
  textUz:      z.string().default(''),
  textEn:      z.string().default(''),
  optionsJson: z.array(OptionSchema).default([]),
  scoringJson: z.array(ScoringEntrySchema).default([]),
  hrHint:      z.string().nullable().optional(),
  riskFlag:    z.boolean().default(false),
  orderIndex:  z.number().int().default(0),
});

// POST /api/questions/import — bulk import questions from JSON
// Body: { questions: [...] } or the full export object { version, questions }
export async function POST(req: NextRequest) {
  try {
    getRequestUser(req);

    const body = await req.json();
    const rawList: unknown[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.questions)
      ? body.questions
      : null!;

    if (!Array.isArray(rawList)) {
      return NextResponse.json(err('Expected { questions: [...] } or array'), { status: 400 });
    }

    const parsed = rawList.map((item, i) => {
      const r = QuestionImportSchema.safeParse(item);
      if (!r.success) throw new Error(`Question #${i + 1}: ${r.error.issues[0].message}`);
      return r.data;
    });

    // Bulk create
    const created = await prisma.$transaction(
      parsed.map((q) => prisma.question.create({ data: q }))
    );

    return NextResponse.json(ok({ imported: created.length }), { status: 201 });
  } catch (e) {
    if (e instanceof Error) return NextResponse.json(err(e.message), { status: 400 });
    console.error('[questions/import POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
