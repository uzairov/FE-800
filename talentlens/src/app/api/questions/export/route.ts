import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { err } from '@/types';

// GET /api/questions/export — download all questions as JSON
export async function GET(req: NextRequest) {
  try {
    getRequestUser(req);

    const questions = await prisma.question.findMany({
      orderBy: [{ blockType: 'asc' }, { orderIndex: 'asc' }],
    });

    // Strip internal id so re-import creates fresh records
    const exported = questions.map(({ id: _id, createdAt: _ca, ...rest }) => rest);

    const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), questions: exported }, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="aptio-questions-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    console.error('[questions/export GET]', e);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
