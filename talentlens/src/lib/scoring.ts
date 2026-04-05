/**
 * Aptio scoring algorithm — §7 of the TZ.
 *
 * Each answer scores 1-4 per competency.
 * Raw score per competency = sum of answer scores / max possible * 100.
 * Weight coefficients (§7.2): required ×3, important ×2, optional ×1.
 */

export interface Answer {
  questionId: string;
  selectedOption: number; // 0-based index; -1 for open-text
  answeredAt: string;
  responseMs: number;
  changeCount?: number;     // how many times answer was changed on this question
  backNavigations?: number; // cumulative back navigations at time of answer
}

export interface ScoringEntry {
  competency: string;
  scores: number[]; // score per option index, values 1-4
}

export interface QuestionForScoring {
  id: string;
  scoringJson: unknown; // ScoringEntry[]
}

export interface CompetencyWeight {
  key: string;
  weight: 1 | 2 | 3;
}

export interface CompetencyScore {
  competency: string;
  score: number;   // 0-100 %
  level: 'high' | 'medium' | 'low';
  weight: number;
}

// ─────────────────────────────────────────────
// Score calculation
// ─────────────────────────────────────────────

export function calculateCompetencyScores(
  answers: Answer[],
  questions: QuestionForScoring[],
  weights: CompetencyWeight[],
): CompetencyScore[] {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const raw: Record<string, { sum: number; max: number }> = {};

  for (const answer of answers) {
    if (answer.selectedOption === -1) continue; // open-text: not scoreable
    const question = qMap.get(answer.questionId);
    if (!question) continue;

    const scoring = question.scoringJson as ScoringEntry[];
    for (const entry of scoring) {
      if (!raw[entry.competency]) {
        raw[entry.competency] = { sum: 0, max: 0 };
      }
      const score = (entry.scores as number[])[answer.selectedOption] ?? 0;
      raw[entry.competency].sum += score;
      // Max = highest possible score in this question for this competency
      const maxScore = Math.max(...(entry.scores as number[]));
      raw[entry.competency].max += maxScore > 0 ? maxScore : 4;
    }
  }

  const weightMap = new Map(weights.map((w) => [w.key, w.weight]));
  const results: CompetencyScore[] = [];

  for (const [competency, { sum, max }] of Object.entries(raw)) {
    if (max === 0) continue;
    const score = Math.round((sum / max) * 100);
    const level: CompetencyScore['level'] =
      score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';
    const weight = (weightMap.get(competency) ?? 1) as number;
    results.push({ competency, score, level, weight });
  }

  return results;
}

// ─────────────────────────────────────────────
// Risk flag detection — §6
// ─────────────────────────────────────────────

export type FlagLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface RiskFlagInput {
  level: FlagLevel;
  type: string;
  descriptionRu: string;
  value?: number;
}

export function calculateRiskFlags(
  answers: Answer[],
  tabSwitches: number,
  totalBackNavigations = 0,
  totalLongPauses = 0,
): RiskFlagInput[] {
  const flags: RiskFlagInput[] = [];
  const total = answers.length;

  // ── Fast answers (< 3 s = 3000 ms) — threshold > 30 % ────────────────
  if (total > 0) {
    const fast = answers.filter((a) => a.responseMs < 3000).length;
    const ratio = fast / total;
    if (ratio > 0.3) {
      flags.push({
        level: ratio > 0.6 ? 'CRITICAL' : 'WARNING',
        type: 'fast_answers',
        descriptionRu: `${Math.round(ratio * 100)}% ответов дано менее чем за 3 секунды`,
        value: Math.round(ratio * 100),
      });
    }
  }

  // ── Tab switches — threshold > 3 ──────────────────────────────────────
  if (tabSwitches > 0) {
    flags.push({
      level: tabSwitches > 10 ? 'CRITICAL' : tabSwitches > 3 ? 'WARNING' : 'INFO',
      type: 'tab_switches',
      descriptionRu: `Переключение вкладок зафиксировано ${tabSwitches} раз`,
      value: tabSwitches,
    });
  }

  // ── Answer pattern (> 80 % same option) ──────────────────────────────
  // Skip open-text answers (selectedOption === -1) — they all share the same
  // sentinel value and would create a false pattern flag.
  const mcAnswers = answers.filter((a) => a.selectedOption !== -1);
  if (mcAnswers.length > 5) {
    const counts: Record<number, number> = {};
    for (const a of mcAnswers) {
      counts[a.selectedOption] = (counts[a.selectedOption] ?? 0) + 1;
    }
    const mcTotal = mcAnswers.length;
    const maxCount = Math.max(...Object.values(counts));
    const ratio = maxCount / mcTotal;
    if (ratio > 0.8) {
      flags.push({
        level: 'WARNING',
        type: 'answer_pattern',
        descriptionRu: `${Math.round(ratio * 100)}% ответов одного типа — возможен паттерн`,
        value: Math.round(ratio * 100),
      });
    }
  }

  // ── Back navigations ─────────────────────────────────────────────────
  if (totalBackNavigations > 0) {
    flags.push({
      level: totalBackNavigations > 10 ? 'WARNING' : 'INFO',
      type: 'back_navigation',
      descriptionRu: `Кандидат возвращался к предыдущим вопросам ${totalBackNavigations} раз`,
      value: totalBackNavigations,
    });
  }

  // ── Long pauses ───────────────────────────────────────────────────────
  if (totalLongPauses > 0) {
    flags.push({
      level: totalLongPauses > 3 ? 'WARNING' : 'INFO',
      type: 'long_pause',
      descriptionRu: `Зафиксировано ${totalLongPauses} пауз длительностью более 60 секунд`,
      value: totalLongPauses,
    });
  }

  // ── Frequent answer changes ───────────────────────────────────────────
  const totalChanges = answers.reduce((sum, a) => sum + (a.changeCount ?? 0), 0);
  if (totalChanges > 0) {
    const changeRatio = totalChanges / Math.max(answers.length, 1);
    if (changeRatio > 0.3 || totalChanges > 10) {
      flags.push({
        level: totalChanges > 15 ? 'WARNING' : 'INFO',
        type: 'answer_changes',
        descriptionRu: `Кандидат изменял ответы ${totalChanges} раз — возможна неуверенность`,
        value: totalChanges,
      });
    }
  }

  return flags;
}
