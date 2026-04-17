import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const me   = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!me) return NextResponse.json(err('Not found'), { status: 404 });
    return NextResponse.json(ok(me));
  } catch (e) {
    console.error('[profile GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(80),
});

export async function PATCH(req: NextRequest) {
  try {
    const user   = getRequestUser(req);
    const body   = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(err('Validation error'), { status: 400 });

    await prisma.user.update({
      where: { id: user.id },
      data:  { name: parsed.data.name },
    });

    return NextResponse.json(ok({ name: parsed.data.name }));
  } catch (e) {
    console.error('[profile PATCH]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
