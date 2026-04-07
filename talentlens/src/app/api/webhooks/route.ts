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

// ── Dispatcher (called internally from finish route) ─────────────────────────
export async function sendWebhookNotification(companyId: string, event: {
  type:          'assessment.completed' | 'assessment.created';
  candidateName: string;
  positionName:  string;
  score?:        number;
  link?:         string;
}) {
  try {
    const setting = await prisma.webhookSetting.findUnique({ where: { companyId } });
    if (!setting) return;

    const shouldSend =
      (event.type === 'assessment.completed' && setting.onCompleted) ||
      (event.type === 'assessment.created'   && setting.onCreated);
    if (!shouldSend) return;

    const text = event.type === 'assessment.completed'
      ? `✅ *Тест завершён*\n👤 ${event.candidateName}\n💼 ${event.positionName}${event.score != null ? `\n📊 Средний балл: ${event.score}%` : ''}`
      : `📋 *Новая оценка создана*\n👤 ${event.candidateName}\n💼 ${event.positionName}`;

    // Telegram
    if (setting.telegramBotToken && setting.telegramChatId) {
      await fetch(
        `https://api.telegram.org/bot${setting.telegramBotToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: setting.telegramChatId, text, parse_mode: 'Markdown' }),
        },
      ).catch(console.error);
    }

    // Slack
    if (setting.slackWebhookUrl) {
      await fetch(setting.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.replace(/\*/g, '*') }),
      }).catch(console.error);
    }
  } catch (e) {
    console.error('[webhook dispatch]', e);
  }
}
