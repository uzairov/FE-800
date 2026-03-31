import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getRequestUser(req);

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        position: true,
        createdBy: { select: { name: true, email: true } },
        testSession: true,
        riskFlags: { orderBy: { level: 'asc' } },
        competencyResults: { orderBy: { weight: 'desc' } },
      },
    });

    if (!assessment) {
      return NextResponse.json(err('Assessment not found'), { status: 404 });
    }

    return NextResponse.json(ok(assessment));
  } catch (error) {
    console.error('[assessment GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = getRequestUser(req);

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });
    if (!assessment) {
      return NextResponse.json(err('Assessment not found'), { status: 404 });
    }

    await prisma.assessment.delete({ where: { id: params.id } });
    return NextResponse.json(ok(null));
  } catch (error) {
    console.error('[assessment DELETE]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
