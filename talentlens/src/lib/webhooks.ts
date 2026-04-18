import { prisma } from '@/lib/prisma';

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
