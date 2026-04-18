import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).findUnique({
    where: { emailVerifyToken: token },
  });

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
    return NextResponse.redirect(`${appUrl}/login?error=token_expired`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.user as any).update({
    where: { id: user.id },
    data: {
      emailVerified:      true,
      emailVerifyToken:   null,
      emailVerifyExpires: null,
    },
  });

  // Redirect to onboarding if not done, else dashboard
  const dest = user.onboardingDone ? '/dashboard' : '/onboarding';
  return NextResponse.redirect(`${appUrl}${dest}?verified=1`);
}
