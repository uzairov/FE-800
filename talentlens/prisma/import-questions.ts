// TalentLens — Question Import Script
// Reads a questions JSON file and upserts all multiple-choice questions into the DB.
// Open-text questions are imported with empty options (manual scoring by HR).
//
// Usage:
//   npx tsx prisma/import-questions.ts
//   QUESTIONS_FILE=./data/questions.json npx tsx prisma/import-questions.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ── JSON path — override with QUESTIONS_FILE env var ──────────────────────────
const QUESTIONS_FILE = process.env.QUESTIONS_FILE ?? path.join(__dirname, 'questions.json');

// ── Types ─────────────────────────────────────────────────────────────────────

interface JsonOption {
  id: string;
  text_ru: string;
  text_uz: string;
  text_en: string;
  score?: number;
  competency?: string;
  flag?: string;
}

interface JsonQuestion {
  id: string;
  text_ru: string;
  text_uz: string;
  text_en: string;
  options?: JsonOption[];
  type?: string;       // "open_text" or undefined (multiple-choice)
  competency?: string; // for open_text
  max_score?: number;  // for open_text
}

interface JsonBlock {
  id: string;
  type: string;
  questions: JsonQuestion[];
}

interface JsonPosition {
  id: string;
  blocks: JsonBlock[];
}

interface QuestionsData {
  positions: JsonPosition[];
}

// ── Position → blockType prefix ───────────────────────────────────────────────
// blockType = "{PREFIX}_{BLOCK_TYPE}", e.g. SM_SJT, CC_ATTENTION
const POSITION_PREFIX: Record<string, string> = {
  sales_manager: 'SM',
  call_center_operator: 'CC',
};

// ── Build scoringJson from multiple-choice options ────────────────────────────
// Groups options by competency.
// scores[optionIndex] = score (0 when the option doesn't measure that competency).
// Scoring algorithm uses Math.max(scores) as the max for that competency.
function buildMCScoringJson(
  options: JsonOption[],
): Array<{ competency: string; scores: number[] }> {
  const map = new Map<string, number[]>();

  for (let i = 0; i < options.length; i++) {
    const { competency, score } = options[i];
    if (competency == null || score == null) continue;

    if (!map.has(competency)) {
      map.set(competency, new Array(options.length).fill(0));
    }
    map.get(competency)![i] = score;
  }

  return [...map.entries()].map(([competency, scores]) => ({ competency, scores }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(QUESTIONS_FILE)) {
    console.error(`✗ File not found: ${QUESTIONS_FILE}`);
    console.error(
      '  Set QUESTIONS_FILE env var to the correct path, e.g.:\n' +
        '  QUESTIONS_FILE=./data/questions.json npx tsx prisma/import-questions.ts',
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
  const data: QuestionsData = JSON.parse(raw);

  let imported = 0;
  let openText = 0;
  let errors = 0;

  for (const pos of data.positions) {
    const prefix = POSITION_PREFIX[pos.id];
    if (!prefix) {
      console.warn(`⚠  Unknown position id: "${pos.id}" — skipping`);
      continue;
    }

    for (const block of pos.blocks) {
      const blockType = `${prefix}_${block.type}`;

      for (let idx = 0; idx < block.questions.length; idx++) {
        const q = block.questions[idx];

        const isOpenText = q.type === 'open_text' || !q.options || q.options.length === 0;

        const optionsJson = isOpenText
          ? [] // open-text: no options; HR scores manually
          : q.options!.map((o) => ({
              textRu: o.text_ru,
              textUz: o.text_uz,
              textEn: o.text_en,
            }));

        const scoringJson = isOpenText
          ? q.competency
            ? [{ competency: q.competency, scores: [q.max_score ?? 4] }]
            : []
          : buildMCScoringJson(q.options!);

        try {
          await prisma.question.upsert({
            where: { id: q.id },
            create: {
              id: q.id,
              blockType,
              textRu: q.text_ru,
              textUz: q.text_uz,
              textEn: q.text_en,
              optionsJson,
              scoringJson,
              orderIndex: idx,
            },
            update: {
              blockType,
              textRu: q.text_ru,
              textUz: q.text_uz,
              textEn: q.text_en,
              optionsJson,
              scoringJson,
              orderIndex: idx,
            },
          });

          isOpenText ? openText++ : imported++;
        } catch (e) {
          console.error(`  ✗ Failed to import question ${q.id}:`, e);
          errors++;
        }
      }

      console.log(`  ✓ ${blockType} — ${block.questions.length} questions`);
    }
  }

  console.log(`\n✓ Import complete:`);
  console.log(`  Multiple-choice : ${imported}`);
  console.log(`  Open-text       : ${openText}`);
  if (errors > 0) console.error(`  Errors          : ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
