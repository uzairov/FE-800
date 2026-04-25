import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

// POST /api/webhooks/bitrix24/export — push assessment results to Bitrix24
export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    const { assessmentId } = (await req.json()) as { assessmentId: string };
    if (!assessmentId) return NextResponse.json(err('assessmentId required'), { status: 400 });

    const assessment = await prisma.assessment.findFirst({
      where:   { id: assessmentId, companyId: user.companyId },
      include: {
        competencyResults: true,
        position:          { select: { name: true } },
        riskFlags:         true,
      },
    });
    if (!assessment) return NextResponse.json(err('Assessment not found'), { status: 404 });
    if (assessment.status !== 'COMPLETED') return NextResponse.json(err('Assessment not completed'), { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company = await (prisma.company as any).findUnique({ where: { id: user.companyId } });
    const token   = company?.bitrix24IntegrationToken as string | undefined;
    if (!token) return NextResponse.json(err('Bitrix24 integration not configured. Add bitrix24IntegrationToken in company settings.'), { status: 422 });

    // token format: "subdomain:webhook_secret"
    const [subdomain, secret] = token.split(':');
    const b24Url = `https://${subdomain}.bitrix24.ru/rest/${secret}/tasks.task.add.json`;

    const scores = assessment.competencyResults
      .map((r) => `[B]${r.competency}[/B]: ${r.score}% (${r.level})`)
      .join('\n');

    const taskTitle       = `HR Оценка: ${assessment.candidateName} — ${assessment.position.name}`;
    const taskDescription = [
      `Кандидат: ${assessment.candidateName}`,
      `Должность: ${assessment.position.name}`,
      ``,
      `Компетенции:`,
      scores,
      assessment.riskFlags.length > 0
        ? `\n⚠️ Red Flags: ${assessment.riskFlags.map((f) => f.type).join(', ')}`
        : '',
    ].join('\n');

    const res = await fetch(b24Url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        fields: {
          TITLE:       taskTitle,
          DESCRIPTION: taskDescription,
          PRIORITY:    1,
          STATUS:      2, // In progress
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[bitrix24 export]', res.status, body);
      return NextResponse.json(err(`Bitrix24 error: ${res.status}`), { status: 502 });
    }

    return NextResponse.json(ok({ exported: true, candidateName: assessment.candidateName }));
  } catch (e) {
    console.error('[webhooks/bitrix24 POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
