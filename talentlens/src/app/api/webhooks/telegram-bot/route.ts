import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function tgReply(botToken: string, chatId: number, replyText: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'Markdown' }),
  });
}

// POST /api/webhooks/telegram-bot — Telegram Bot webhook
// Register with: https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://aptio.uz/api/webhooks/telegram-bot
export async function POST(req: NextRequest) {
  try {
    const update = await req.json() as TelegramUpdate;
    const msg    = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId   = msg.chat.id;
    const text     = msg.text.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn('[telegram-bot] TELEGRAM_BOT_TOKEN not set');
      return NextResponse.json({ ok: true });
    }

    const reply = (t: string) => tgReply(botToken, chatId, t);

    // /start — bind Telegram account by code
    if (text.startsWith('/start')) {
      const parts  = text.split(' ');
      const code   = parts[1]?.trim();
      if (code) {
        // code is the userId stored as linkCode in the user record
        const user = await prisma.user.findFirst({ where: { id: code } });
        if (user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.user as any).update({
            where: { id: user.id },
            data:  { telegramChatId: String(chatId) },
          });
          await reply(`✅ Аккаунт привязан!\n\nПривет, ${user.name ?? user.email}! Теперь вы будете получать уведомления о новых оценках.`);
        } else {
          await reply('❌ Код не найден. Скопируйте ссылку из профиля в Aptio.');
        }
      } else {
        await reply('👋 *Aptio HR Bot*\n\nЧтобы привязать аккаунт, перейдите в Aptio → Настройки → Telegram и нажмите «Подключить».');
      }
      return NextResponse.json({ ok: true });
    }

    // /status — open assessments count
    if (text === '/status') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = await (prisma.user as any).findFirst({ where: { telegramChatId: String(chatId) } }) as { id: string; name?: string; email: string; companyId: string } | null;
      if (!user) {
        await reply('🔗 Аккаунт не привязан. Используйте /start <код> из настроек Aptio.');
        return NextResponse.json({ ok: true });
      }
      const [pending, completed] = await Promise.all([
        prisma.assessment.count({
          where: { companyId: user.companyId, status: { in: ['CREATED', 'LINK_OPENED', 'IN_PROGRESS'] } },
        }),
        prisma.assessment.count({
          where: { companyId: user.companyId, status: 'COMPLETED' },
        }),
      ]);
      await reply(
        `📊 *Статус оценок*\n\n` +
        `🔄 В процессе: *${pending}*\n` +
        `✅ Завершено: *${completed}*`,
      );
      return NextResponse.json({ ok: true });
    }

    // /help
    if (text === '/help') {
      await reply(
        `🤖 *Aptio HR Bot — команды*\n\n` +
        `/start <код> — привязать аккаунт\n` +
        `/status — количество оценок\n` +
        `/help — эта справка`,
      );
      return NextResponse.json({ ok: true });
    }

    // Unknown command
    await reply('Неизвестная команда. Отправьте /help для справки.');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[telegram-bot webhook]', e);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { id: number; username?: string };
  };
}
