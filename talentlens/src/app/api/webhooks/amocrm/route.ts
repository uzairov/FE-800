import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

// POST /api/webhooks/amocrm/export — push assessment results to AmoCRM
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
    const token   = company?.amoIntegrationToken as string | undefined;
    if (!token) return NextResponse.json(err('AmoCRM integration not configured. Add amoIntegrationToken in company settings.'), { status: 422 });

    // Build the note text
    const scores = assessment.competencyResults
      .map((r) => `${r.competency}: ${r.score}% (${r.level})`)
      .join('\n');
    const noteText = [
      `🎯 Оценка кандидата: ${assessment.candidateName}`,
      `Должность: ${assessment.position.name}`,
      ``,
      `Компетенции:`,
      scores,
      assessment.riskFlags.length > 0
        ? `\n⚠️ Red Flags: ${assessment.riskFlags.map((f) => f.type).join(', ')}`
        : '',
    ].join('\n');

    // POST to AmoCRM API — add note to a lead/contact
    // token should be in format "subdomain:access_token"
    const [subdomain, accessToken] = token.split(':');
    const amoUrl = `https://${subdomain}.amocrm.ru/api/v4/notes`;

    const res = await fetch(amoUrl, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        _embedded: {
          notes: [{
            entity_type: 'leads',
            note_type:   'common',
            params:      { text: noteText },
          }],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[amocrm export]', res.status, body);
      return NextResponse.json(err(`AmoCRM error: ${res.status}`), { status: 502 });
    }

    return NextResponse.json(ok({ exported: true, candidateName: assessment.candidateName }));
  } catch (e) {
    console.error('[webhooks/amocrm POST]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
