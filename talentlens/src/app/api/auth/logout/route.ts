import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revokeRefreshToken } from '@/lib/auth';
import { ok } from '@/types';

const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = LogoutSchema.safeParse(body);

    if (parsed.success) {
      await revokeRefreshToken(parsed.data.refreshToken);
    }

    return NextResponse.json(ok(null));
  } catch (error) {
    console.error('[logout]', error);
    return NextResponse.json(ok(null)); // always succeed on logout
  }
}
