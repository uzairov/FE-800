import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getRequestUser } from '@/lib/api-helpers';

const SYSTEM_PROMPT = `Ты — AI-ассистент HR-платформы Aptio. Ты помогаешь HR-специалистам:
- Интерпретировать результаты психометрических оценок кандидатов
- Анализировать компетенции (лидерство, коммуникация, аналитика, командная работа, стрессоустойчивость, мотивация, ответственность, креативность)
- Составлять вопросы для интервью на основе результатов тестирования
- Давать рекомендации по онбордингу и развитию сотрудников
- Объяснять Red Flag индикаторы поведения
- Помогать со сравнением кандидатов

Отвечай на языке пользователя (русский, узбекский, казахский или английский).
Будь конкретным, структурируй ответы. Не выдумывай данные — только анализируй то, что пользователь предоставил.
Максимальная длина ответа — 400 слов.`;

// POST /api/ai/chat — streaming chat, requires Pro / Enterprise plan
export async function POST(req: NextRequest) {
  try {
    const user = getRequestUser(req);
    console.log('[AI] API Key present:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[AI] User ID:', user.id);

    // Check API key BEFORE trying to stream — give user a clear error
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_key_here') {
      return new Response(
        JSON.stringify({
          error: 'AI-ассистент не настроен. Администратор должен добавить ANTHROPIC_API_KEY в настройки сервера.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new Anthropic({ apiKey });

    // Start streaming — if this throws we return a proper error BEFORE the response
    let stream;
    try {
      stream = await client.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: body.messages.slice(-20), // keep last 20 turns
      });
    } catch (e) {
      console.error('[ai/chat] stream init failed:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      const isAuth = /authentication|api key|unauthorized/i.test(msg);
      return new Response(
        JSON.stringify({
          error: isAuth
            ? 'ANTHROPIC_API_KEY недействителен. Проверьте ключ в настройках сервера.'
            : `Ошибка AI-сервиса: ${msg}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    console.log('[AI] Streaming started');

    // Return a ReadableStream (plain-text chunked)
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let sentAnything = false;
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
              sentAnything = true;
            }
          }
          // If the stream ended without sending any text, surface that
          if (!sentAnything) {
            controller.enqueue(
              encoder.encode('⚠️ AI не вернул ответ. Попробуйте переформулировать вопрос.'),
            );
          }
        } catch (e) {
          console.error('[ai/chat] stream error:', e);
          const msg = e instanceof Error ? e.message : 'Unknown error';
          controller.enqueue(encoder.encode(`\n\n⚠️ Ошибка AI: ${msg}`));
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
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
