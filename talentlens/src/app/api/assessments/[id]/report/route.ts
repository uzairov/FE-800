import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestUser } from '@/lib/api-helpers';
import { ok, err } from '@/types';

interface AnswerRow {
  questionId:     string;
  selectedOption: number;
  answeredAt?:    string;
  responseMs?:    number;
}

interface ScoringEntry {
  competency: string;
  scores:     number[];
}

interface OptionsRow {
  textRu: string;
  textUz?: string;
  textEn?: string;
  textKz?: string;
}

interface QuestionBreakdownItem {
  idx:         number;
  questionId:  string;
  blockType:   string;
  text:        string;
  selectedIdx: number;
  optionText:  string;
  earned:      number;
  maxPossible: number;
}

interface CompetencyBreakdown {
  competency: string;
  weight:     number;
  sum:        number;
  max:        number;
  score:      number; // 0-100
  questions:  QuestionBreakdownItem[];
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getRequestUser(req);

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, companyId: user.companyId },
      include: {
        position:          { select: { name: true, industry: true, competenciesJson: true } },
        testSession:       {
          select: {
            startedAt:   true,
            finishedAt:  true,
            language:    true,
            tabSwitches: true,
            answersJson: true,
          },
        },
        competencyResults: { orderBy: { weight: 'desc' } },
        riskFlags:         { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!assessment) {
      return NextResponse.json(err('Assessment not found'), { status: 404 });
    }

    if (assessment.status !== 'COMPLETED') {
      return NextResponse.json(
        err('Report not available: test not completed yet'),
        { status: 400 },
      );
    }

    // ── Build per-question breakdown (§REP-CALC) ─────────────────────────
    const answers: AnswerRow[] = (assessment.testSession?.answersJson as unknown as AnswerRow[]) ?? [];
    const questionIds = Array.from(
      new Set(answers.filter((a) => a.selectedOption !== -1).map((a) => a.questionId)),
    );

    const questions = questionIds.length > 0
      ? await prisma.question.findMany({
          where:  { id: { in: questionIds } },
          select: { id: true, textRu: true, blockType: true, optionsJson: true, scoringJson: true },
        })
      : [];

    const qMap = new Map(questions.map((q) => [q.id, q]));

    const competencies = ((assessment.position.competenciesJson ?? []) as Array<{ key: string; weight: number }>);
    const weightMap = new Map(competencies.map((c) => [c.key, c.weight]));

    const breakdown: Record<string, CompetencyBreakdown> = {};
    for (const c of competencies) {
      breakdown[c.key] = {
        competency: c.key,
        weight:     c.weight,
        sum:        0,
        max:        0,
        score:      0,
        questions:  [],
      };
    }

    answers.forEach((answer, i) => {
      if (answer.selectedOption === -1) return;
      const q = qMap.get(answer.questionId);
      if (!q) return;

      const scoring = (q.scoringJson ?? []) as unknown as ScoringEntry[];
      const options = (q.optionsJson ?? []) as unknown as OptionsRow[];
      const optionText = options[answer.selectedOption]?.textRu ?? `Вариант ${answer.selectedOption + 1}`;

      for (const entry of scoring) {
        if (!breakdown[entry.competency]) {
          breakdown[entry.competency] = {
            competency: entry.competency,
            weight:     weightMap.get(entry.competency) ?? 1,
            sum:        0,
            max:        0,
            score:      0,
            questions:  [],
          };
        }
        const scoresArr   = Array.isArray(entry.scores)
          ? (entry.scores as unknown[]).map((s) => Number(s))
          : ([] as number[]);
        const earned      = Number(scoresArr[answer.selectedOption] ?? 0);
        const maxPossible = scoresArr.length > 0 ? Math.max(...scoresArr) : 4;

        breakdown[entry.competency].sum += earned;
        breakdown[entry.competency].max += maxPossible;
        breakdown[entry.competency].questions.push({
          idx:         i + 1,
          questionId:  q.id,
          blockType:   q.blockType,
          text:        q.textRu.length > 120 ? q.textRu.slice(0, 117) + '…' : q.textRu,
          selectedIdx: answer.selectedOption,
          optionText:  optionText.length > 120 ? optionText.slice(0, 117) + '…' : optionText,
          earned,
          maxPossible,
        });
      }
    });

    for (const key of Object.keys(breakdown)) {
      const b = breakdown[key];
      b.score = b.max > 0 ? Math.round((b.sum / b.max) * 100) : 0;
    }

    const scored = Object.keys(breakdown).filter((k) => breakdown[k].max > 0);
    console.log('[report] total competencies:', Object.keys(breakdown).length);
    console.log('[report] scored:', scored.length, scored);

    // Strip bulky answersJson from the response.
    const sessionLite = assessment.testSession
      ? {
          startedAt:   assessment.testSession.startedAt,
          finishedAt:  assessment.testSession.finishedAt,
          language:    assessment.testSession.language,
          tabSwitches: assessment.testSession.tabSwitches,
        }
      : null;

    return NextResponse.json(ok({
      ...assessment,
      testSession: sessionLite,
      breakdown,
    }));
  } catch (error) {
    console.error('[report GET]', error);
    return NextResponse.json(err('Internal server error'), { status: 500 });
  }
}
