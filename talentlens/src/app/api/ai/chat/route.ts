import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — AI-ассистент HR-платформы Aptio. Ты помогаешь HR-специалистам:
- Интерпретировать результаты психометрических оценок кандидатов
- Анализировать компетенции (лидерство, коммуникация, аналитика, командная работа, стрессоустойчивость, мотивация, ответственность, креативность)
- Составлять вопросы для интервью на основе результатов тестирования
- Давать рекомендации по онбордингу и развитию сотрудников
- Объяснять Red Flag индикаторы поведения
- Помогать со сравнением кандидатов

Отвечай на языке пользователя (русский, узбекский или английский).
Будь конкретным, структурируй ответы. Не выдумывай данные — только анализируй то, что пользователь предоставил.
Максимальная длина ответа — 400 слов.`;

// POST /api/ai/chat — streaming chat with plan gate
export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);

    // Plan gate — check hasAiAssistant
    if (user.role !== 'SUPERADMIN') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = await (prisma.company as any).findUnique({
        where: { id: user.companyId },
        include: { planTier: true },
      });
      const plan = company?.planTier;
      if (plan && !plan.hasAiAssistant) {
        return new Response(
          JSON.stringify({ error: `AI-ассистент недоступен на плане «${plan.displayName}». Обновите тариф до Starter или выше.` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // No plan at all — also block
      if (!plan) {
        return new Response(
          JSON.stringify({ error: 'AI-ассистент недоступен на бесплатном плане.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const body = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream response from Anthropic
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: body.messages.slice(-20), // keep last 20 turns
    });

    // Return a ReadableStream (SSE-compatible)
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('[ai/chat POST]', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
