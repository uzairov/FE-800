/**
 * Email service via Resend.
 * Set RESEND_API_KEY in .env to enable.
 * If the key is missing, emails are logged to console (dev mode).
 */

interface SendCandidateLinkParams {
  to: string;
  candidateName: string;
  positionName: string;
  link: string;
  expiresAt: Date;
  senderName?: string;
}

function buildCandidateEmail({ candidateName, positionName, link, expiresAt, senderName }: SendCandidateLinkParams) {
  const expires = expiresAt.toLocaleDateString('ru-RU');
  const from = senderName ?? 'HR-команда';
  return {
    subject: `Приглашение пройти оценку: ${positionName}`,
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1020;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1020;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a6e,#1d4ed8);padding:32px 40px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;background:#3b82f6;border-radius:12px;display:inline-flex;align-items:center;justify-content:center">
              <span style="color:#fff;font-weight:900;font-size:18px">A</span>
            </div>
            <span style="color:#fff;font-weight:800;font-size:22px;letter-spacing:-0.5px">Aptio</span>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="color:#9ca3af;font-size:14px;margin:0 0 8px">Здравствуйте,</p>
          <h1 style="color:#f9fafb;font-size:24px;font-weight:700;margin:0 0 16px">${candidateName}</h1>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px">
            Компания приглашает вас пройти профессиональную оценку на позицию
            <strong style="color:#e5e7eb">${positionName}</strong>.
            Тест займёт около 30–60 минут и включает психометрические задания.
          </p>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0">
            <a href="${link}"
               style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 4px 20px rgba(37,99,235,0.4)">
              Начать оценку →
            </a>
          </div>

          <!-- Link fallback -->
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 8px">Если кнопка не работает, перейдите по ссылке:</p>
          <p style="text-align:center;margin:0 0 32px">
            <a href="${link}" style="color:#60a5fa;font-size:12px;word-break:break-all">${link}</a>
          </p>

          <!-- Info -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px">
            <p style="color:#9ca3af;font-size:13px;margin:0 0 8px">⏰ Ссылка действительна до <strong style="color:#e5e7eb">${expires}</strong></p>
            <p style="color:#9ca3af;font-size:13px;margin:0 0 8px">📋 Рекомендуем пройти тест за один раз</p>
            <p style="color:#9ca3af;font-size:13px;margin:0">🔒 Результаты конфиденциальны и видны только HR-команде</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding:24px 40px;text-align:center">
          <p style="color:#4b5563;font-size:12px;margin:0">
            Это письмо отправлено командой <strong style="color:#6b7280">${from}</strong> через платформу Aptio.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export async function sendCandidateLink(params: SendCandidateLinkParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'your_resend_key_here') {
    // Dev mode — log to console
    const email = buildCandidateEmail(params);
    console.log('[email:DEV] Would send to:', params.to);
    console.log('[email:DEV] Subject:', email.subject);
    console.log('[email:DEV] Link:', params.link);
    return;
  }

  const email = buildCandidateEmail(params);
  const fromAddress = process.env.EMAIL_FROM ?? 'Aptio <noreply@aptio.app>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [params.to],
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] Resend error:', res.status, body);
    // Don't throw — email failure shouldn't break assessment creation
  }
}

export async function sendTeamInvite(params: {
  to: string;
  inviterName: string;
  companyName: string;
  inviteLink: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const { to, inviterName, companyName, inviteLink } = params;

  if (!apiKey || apiKey === 'your_resend_key_here') {
    console.log('[email:DEV] Team invite to:', to, 'link:', inviteLink);
    return;
  }

  const fromAddress = process.env.EMAIL_FROM ?? 'Aptio <noreply@aptio.app>';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject: `${inviterName} приглашает вас в ${companyName} на Aptio`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#111827;border-radius:16px;color:#e5e7eb">
        <h2 style="color:#f9fafb">Вас приглашают в команду</h2>
        <p><strong>${inviterName}</strong> приглашает вас присоединиться к компании <strong>${companyName}</strong> на платформе Aptio.</p>
        <a href="${inviteLink}" style="display:inline-block;margin:24px 0;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600">Принять приглашение →</a>
        <p style="color:#6b7280;font-size:12px">Ссылка действительна 48 часов.</p>
      </div>`,
    }),
  });
}
