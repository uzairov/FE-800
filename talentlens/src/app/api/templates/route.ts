import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

// ─── GET /api/templates ─────────────────────────────────────────────────────
// Returns system templates + this company's custom templates

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates = await (prisma.positionTemplate as any).findMany({
      where: {
        isActive: true,
        OR: [
          { companyId: null },
          { companyId: user.companyId },
        ],
      },
      orderBy: [{ companyId: 'asc' }, { name: 'asc' }],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = templates.map((t: any) => ({
      ...t,
      isSystem: t.companyId === null,
    }));

    return NextResponse.json(ok(result));
  } catch (error) {
    console.error('[templates GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── POST /api/templates ────────────────────────────────────────────────────

const CompetencySchema = z.object({
  key:    z.string().min(1),
  weight: z.number().int().min(1).max(3),
});

const CreateTemplateSchema = z.object({
  name:             z.string().min(1).max(120),
  nameUz:           z.string().default(''),
  nameEn:           z.string().default(''),
  industry:         z.string().min(1),
  level:            z.enum(['linear', 'specialist', 'manager', 'top']),
  estimatedMinutes: z.number().int().min(5).max(180).default(30),
  competenciesJson: z.array(CompetencySchema).min(1),
  blocksJson:       z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json(err('Нет прав для создания шаблонов'), { status: 403 });
    }

    const body   = await req.json();
    const parsed = CreateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(err('Validation error', parsed.error.flatten()), { status: 400 });
    }

    const companyId = user.role === 'SUPERADMIN' ? null : user.companyId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = await (prisma.positionTemplate as any).create({
      data: { ...parsed.data, companyId },
    });

    return NextResponse.json(ok({ ...template, isSystem: companyId === null }), { status: 201 });
  } catch (error) {
    console.error('[templates POST]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

// ─── DELETE /api/templates ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json(err('Missing id'), { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmpl = await (prisma.positionTemplate as any).findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!tmpl) return NextResponse.json(err('Not found'), { status: 404 });

    if (tmpl.companyId === null && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Системные шаблоны может удалять только SuperAdmin'), { status: 403 });
    }
    if (tmpl.companyId !== null && tmpl.companyId !== user.companyId && user.role !== 'SUPERADMIN') {
      return NextResponse.json(err('Нет доступа'), { status: 403 });
    }

    await prisma.positionTemplate.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json(ok({ deleted: true }));
  } catch (error) {
    console.error('[templates DELETE]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
