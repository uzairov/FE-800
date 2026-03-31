import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/types';

export async function GET(_req: NextRequest) {
  try {
    const templates = await prisma.positionTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(ok(templates));
  } catch (error) {
    console.error('[templates GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
