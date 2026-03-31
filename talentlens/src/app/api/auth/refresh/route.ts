import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rotateRefreshToken } from '@/lib/auth';
import { ok, err } from '@/types';

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RefreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(err('refreshToken is required'), { status: 400 });
    }

    const result = await rotateRefreshToken(parsed.data.refreshToken);

    if (!result) {
      return NextResponse.json(err('Invalid or expired refresh token'), { status: 401 });
    }

    return NextResponse.json(ok(result));
  } catch (error) {
    console.error('[refresh]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
