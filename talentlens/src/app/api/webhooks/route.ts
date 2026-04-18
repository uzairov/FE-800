import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

const WebhookSchema = z.object({
  telegramBotToken: z.string().optional().nullable(),
  telegramChatId:   z.string().optional().nullable(),
  slackWebhookUrl:  z.string().url().optional().nullable().or(z.literal('')),
  onCompleted:      z.boolean().default(true),
  onCreated:        z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user    = getRequestUser(req);
    const setting = await prisma.webhookSetting.findUnique({ where: { companyId: user.companyId } });
    return NextResponse.json(ok(setting ?? {}));
  } catch (e) {
    console.error('[webhooks GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user   = getRequestUser(req);
    const body   = await req.json();
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(err('Validation error'), { status: 400 });

    const setting = await prisma.webhookSetting.upsert({
      where:  { companyId: user.companyId },
      create: { companyId: user.companyId, ...parsed.data },
      update: parsed.data,
    });
    return NextResponse.json(ok(setting));
  } catch (e) {
    console.error('[webhooks PUT]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
