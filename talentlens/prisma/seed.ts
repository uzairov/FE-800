import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Block IDs match import-questions.ts convention: {PREFIX}_{BLOCK_TYPE}
// Sales Manager:   SM_SJT, SM_PSS, SM_EQ, SM_LOCUS, SM_CASE, SM_INTERVIEW
// Call Center:     CC_SJT, CC_PSS, CC_EQ, CC_ATTENTION, CC_INTERVIEW

async function main() {
  // ── Sales Manager ──────────────────────────────────────────────────────────
  await prisma.positionTemplate.upsert({
    where: { id: 'tmpl_sales_manager' },
    update: {},
    create: {
      id: 'tmpl_sales_manager',
      name: 'Менеджер по продажам',
      nameUz: 'Sotish menejeri',
      nameEn: 'Sales Manager',
      industry: 'Продажи',
      level: 'linear',
      estimatedMinutes: 35,
      // Competencies match actual question data in questions.json
      // weight 3=required, 2=important, 1=optional (§7.2)
      competenciesJson: [
        { key: 'sales_skills',           weight: 3 },
        { key: 'honesty',                weight: 3 },
        { key: 'negotiation',            weight: 3 },
        { key: 'stress_resistance',      weight: 2 },
        { key: 'emotional_intelligence', weight: 2 },
        { key: 'result_orientation',     weight: 2 },
        { key: 'locus_of_control',       weight: 1 },
        { key: 'self_motivation',        weight: 1 },
      ],
      // Blocks in display order; SM_INTERVIEW = open-text (manual scoring)
      blocksJson: ['SM_SJT', 'SM_PSS', 'SM_EQ', 'SM_LOCUS', 'SM_CASE', 'SM_INTERVIEW'],
    },
  });

  // ── Call Center Operator ───────────────────────────────────────────────────
  await prisma.positionTemplate.upsert({
    where: { id: 'tmpl_call_center' },
    update: {},
    create: {
      id: 'tmpl_call_center',
      name: 'Оператор колл-центра',
      nameUz: "Qo'ng'iroq markazi operatori",
      nameEn: 'Call Center Operator',
      industry: 'Колл-центр',
      level: 'linear',
      estimatedMinutes: 30,
      competenciesJson: [
        { key: 'stress_resistance',         weight: 3 },
        { key: 'monotolerance',             weight: 3 },
        { key: 'attention_to_detail',       weight: 3 },
        { key: 'emotional_intelligence',    weight: 2 },
        { key: 'communication_flexibility', weight: 2 },
        { key: 'service_orientation',       weight: 2 },
        { key: 'locus_of_control',          weight: 1 },
        { key: 'self_motivation',           weight: 1 },
      ],
      blocksJson: ['CC_SJT', 'CC_PSS', 'CC_EQ', 'CC_ATTENTION', 'CC_INTERVIEW'],
    },
  });

  console.log('✓ Position templates seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
