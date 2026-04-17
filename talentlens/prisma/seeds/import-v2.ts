// Aptio — v2 Question & Template Import Script
// Reads prisma/aptio_questions_v2.json and imports one position at a time.
//
// Usage:
//   npx tsx prisma/seeds/import-v2.ts <position_id>
//   npx tsx prisma/seeds/import-v2.ts sales_head
//   npx tsx prisma/seeds/import-v2.ts all   ← imports every position sequentially

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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
  type?: string;
  competency?: string;
  max_score?: number;
  explanation_ru?: string;
  scoring_criteria_ru?: string;
}

interface JsonBlock {
  id: string;
  type: string;
  questions: JsonQuestion[];
}

interface JsonPosition {
  id: string;
  name_ru: string;
  name_uz: string;
  name_en: string;
  industry: string;
  level: string;
  competencies: {
    required?: string[];
    important?: string[];
    optional?: string[];
  };
  blocks: JsonBlock[];
}

interface QuestionsData {
  positions: JsonPosition[];
}

// ── Prefix map (position_id → block type prefix) ──────────────────────────────
const PREFIX: Record<string, string> = {
  sales_head:           'SH',
  cc_supervisor:        'CS',
  marketer:             'MK',
  marketing_head:       'MH',
  accountant:           'AC',
  financial_analyst:    'FA',
  account_manager:      'AM',
  commercial_director:  'CD',
};

// ── Level normalisation (JSON → Prisma enum) ──────────────────────────────────
function normaliseLevel(level: string): string {
  return level === 'management' ? 'manager' : level;
}

// ── Build scoringJson from MCQ options ────────────────────────────────────────
function buildMCScoringJson(
  options: JsonOption[],
): Array<{ competency: string; scores: number[] }> {
  const map = new Map<string, number[]>();

  for (let i = 0; i < options.length; i++) {
    const { competency, score } = options[i];
    if (competency == null || score == null) continue;
    if (!map.has(competency)) map.set(competency, new Array(options.length).fill(0));
    map.get(competency)![i] = score;
  }

  return Array.from(map.entries()).map(([competency, scores]) => ({ competency, scores }));
}

// ── Import a single position ───────────────────────────────────────────────────
async function importPosition(pos: JsonPosition): Promise<void> {
  const prefix = PREFIX[pos.id];
  if (!prefix) {
    console.warn(`⚠  No prefix for "${pos.id}" — skipping`);
    return;
  }

  const level = normaliseLevel(pos.level);

  // Build competenciesJson: required=3, important=2, optional=1
  const competenciesJson = [
    ...(pos.competencies.required  ?? []).map((key) => ({ key, weight: 3 })),
    ...(pos.competencies.important ?? []).map((key) => ({ key, weight: 2 })),
    ...(pos.competencies.optional  ?? []).map((key) => ({ key, weight: 1 })),
  ];

  // Build blocksJson: ordered list of blockType keys
  const blocksJson = pos.blocks.map((b) => `${prefix}_${b.type}`);

  // Upsert PositionTemplate using deterministic ID
  // Using `as any` because Prisma client may be stale (run `prisma generate` to refresh)
  const templateId = `tmpl_${pos.id}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.positionTemplate as any).upsert({
    where:  { id: templateId },
    create: {
      id:               templateId,
      name:             pos.name_ru,
      nameUz:           pos.name_uz,
      nameEn:           pos.name_en,
      industry:         pos.industry,
      level,
      competenciesJson,
      blocksJson,
      companyId:        null,
    },
    update: {
      name:             pos.name_ru,
      nameUz:           pos.name_uz,
      nameEn:           pos.name_en,
      industry:         pos.industry,
      level,
      competenciesJson,
      blocksJson,
    },
  });

  console.log(`  ✓ Template upserted: ${templateId} (${pos.name_ru})`);

  // Import questions block by block
  let mcqCount   = 0;
  let openCount  = 0;
  let errorCount = 0;

  for (const block of pos.blocks) {
    const blockType = `${prefix}_${block.type}`;

    for (let idx = 0; idx < block.questions.length; idx++) {
      const q = block.questions[idx];
      const isOpen = q.type === 'open_text' || !q.options || q.options.length === 0;

      const optionsJson = isOpen
        ? []
        : q.options!.map((o) => ({ textRu: o.text_ru, textUz: o.text_uz, textEn: o.text_en }));

      const scoringJson = isOpen
        ? q.competency
          ? [{ competency: q.competency, scores: [q.max_score ?? 4] }]
          : []
        : buildMCScoringJson(q.options!);

      const hrHint = q.explanation_ru ?? q.scoring_criteria_ru ?? null;
      const riskFlag = !isOpen && (q.options ?? []).some((o) => o.flag === 'risk');

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.question as any).upsert({
          where:  { id: q.id },
          create: {
            id: q.id,
            blockType,
            textRu:     q.text_ru,
            textUz:     q.text_uz,
            textEn:     q.text_en,
            optionsJson,
            scoringJson,
            hrHint,
            riskFlag,
            orderIndex: idx,
            companyId:  null,
          },
          update: {
            blockType,
            textRu:     q.text_ru,
            textUz:     q.text_uz,
            textEn:     q.text_en,
            optionsJson,
            scoringJson,
            hrHint,
            riskFlag,
            orderIndex: idx,
          },
        });
        isOpen ? openCount++ : mcqCount++;
      } catch (e) {
        console.error(`    ✗ Failed: ${q.id}`, e);
        errorCount++;
      }
    }

    console.log(`    ✓ ${blockType} — ${block.questions.length} questions`);
  }

  console.log(`  Questions: ${mcqCount} MCQ, ${openCount} open-text${errorCount ? `, ${errorCount} errors` : ''}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx prisma/seeds/import-v2.ts <position_id|all>');
    console.error('Available positions:', Object.keys(PREFIX).join(', '));
    process.exit(1);
  }

  const dataFile = path.join(__dirname, '..', 'aptio_questions_v2.json');
  if (!fs.existsSync(dataFile)) {
    console.error(`✗ File not found: ${dataFile}`);
    process.exit(1);
  }

  const data: QuestionsData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

  if (arg === 'all') {
    for (const pos of data.positions) {
      console.log(`\n▶ ${pos.id}`);
      await importPosition(pos);
    }
  } else {
    const pos = data.positions.find((p) => p.id === arg);
    if (!pos) {
      console.error(`✗ Position not found: "${arg}"`);
      console.error('Available:', data.positions.map((p) => p.id).join(', '));
      process.exit(1);
    }
    console.log(`\n▶ ${pos.id}`);
    await importPosition(pos);
  }

  console.log('\n✓ Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
