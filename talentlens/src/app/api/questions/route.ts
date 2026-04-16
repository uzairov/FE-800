import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';
import { getRequestUser } from '@/lib/api-helpers';
import { z } from 'zod';

// ─── GET /api/questions ─────────────────────────────────────────────────────
// ?scope=all|system|mine  (default: all = system + company's own)
// ?blockType=...
// ?search=...

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const blockType  = searchParams.get('blockType') ?? undefined;
    const search     = searchParams.get('search')?.trim() ?? '';
    const scope      = searchParams.get('scope') ?? 'all'; // all | system | mine

    // Build scope filter
    let scopeFilter: Record<string, unknown>;
    if (scope === 'system') {
      scopeFilter = { companyId: null };
    } else if (scope === 'mine') {
      scopeFilter = { companyId: user.companyId };
    } else {
      // all = system questions + this company's own
      scopeFilter = {
        OR: [
          { companyId: null },
          { companyId: user.companyId },
        ],
      };
    }

    const where: Record<string, unknown> = { ...scopeFilter };
    if (blockType) where.blockType = blockType;
    if (search) {
      where.AND = [
        {
          OR: [
            { textRu: { contains: search, mode: 'insensitive' } },
            { textUz: { contains: search, mode: 'insensitive' } },
            { textEn: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

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

// ─── Shared schema ──────────────────────────────────────────────────────────

const OptionSchema = z.object({
  textRu: z.string().default(''),
  textUz: z.string().default(''),
  textEn: z.string().default(''),
});

const ScoringEntrySchema = z.object({
  competency: z.string(),
  scores: z.array(z.number().min(0).max(4)),
});

// ─── POST /api/questions ────────────────────────────────────────────────────

const CreateSchema = z.object({
  blockType:   z.string().min(1).max(64),
  textRu:      z.string().min(1),
  textUz:      z.string().default(''),
  textEn:      z.string().default(''),
  optionsJson: z.array(OptionSchema).min(0).max(6),
  scoringJson: z.array(ScoringEntrySchema).default([]),
  hrHint:      z.string().optional(),
  riskFlag:    z.boolean().default(false),
  orderIndex:  z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const data = CreateSchema.parse(body);

    // HR creates a company-private question; SUPERADMIN creates system question
    const companyId = user.role === 'SUPERADMIN' ? null : user.companyId;

    const question = await prisma.question.create({
      data: { ...data, companyId },
    });
    return NextResponse.json(ok(question), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json(err(error.issues[0].message), { status: 400 });
    console.error('[questions POST]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── PATCH /api/questions ───────────────────────────────────────────────────

const UpdateSchema = z.object({
  id:          z.string().min(1),
  blockType:   z.string().min(1).max(64).optional(),
  textRu:      z.string().min(1).optional(),
  textUz:      z.string().optional(),
  textEn:      z.string().optional(),
  optionsJson: z.array(OptionSchema).min(0).max(6).optional(),
  scoringJson: z.array(ScoringEntrySchema).optional(),
  hrHint:      z.string().nullable().optional(),
  riskFlag:    z.boolean().optional(),
  orderIndex:  z.number().int().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const body = await req.json();
    const { id, ...data } = UpdateSchema.parse(body);

    // Guard: system questions (companyId = null) only editable by SUPERADMIN
    const existing = await prisma.question.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) return NextResponse.json(err('Not found'), { status: 404 });

    if (existing.companyId === null && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Системные вопросы могут редактировать только SuperAdmin'), { status: 403 });
    }
    if (existing.companyId !== null && existing.companyId !== user.companyId && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Нет доступа'), { status: 403 });
    }

    const question = await prisma.question.update({ where: { id }, data });
    return NextResponse.json(ok(question));
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json(err(error.issues[0].message), { status: 400 });
    console.error('[questions PATCH]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── DELETE /api/questions ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json(err('Missing id'), { status: 400 });

    const existing = await prisma.question.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) return NextResponse.json(err('Not found'), { status: 404 });

    if (existing.companyId === null && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Системные вопросы может удалять только SuperAdmin'), { status: 403 });
    }
    if (existing.companyId !== null && existing.companyId !== user.companyId && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Нет доступа'), { status: 403 });
    }

    await prisma.question.delete({ where: { id } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (error) {
    console.error('[questions DELETE]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
