import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Sales Manager ──────────────────────────────────────────────────────
  await prisma.positionTemplate.upsert({
    where: { id: 'tmpl_sales_manager' },
    update: {},
    create: {
      id: 'tmpl_sales_manager',
      name: 'Менеджер по продажам',
      nameUz: "Sotuv menejeri",
      nameEn: 'Sales Manager',
      industry: 'Продажи',
      level: 'linear',
      estimatedMinutes: 35,
      // §7.2: weight 3=required, 2=important, 1=optional
      competenciesJson: [
        { key: 'sales_skills',              weight: 3 },
        { key: 'stress_resistance',         weight: 3 },
        { key: 'communication_flexibility', weight: 2 },
        { key: 'motivation',                weight: 2 },
        { key: 'honesty',                   weight: 2 },
        { key: 'emotional_intelligence',    weight: 1 },
        { key: 'locus_of_control',          weight: 1 },
      ],
      blocksJson: ['SJT_SALES', 'PSS', 'BIG_FIVE', 'TKI', 'ROTTER'],
    },
  });

  // ── Call Center Operator ───────────────────────────────────────────────
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
        { key: 'communication_flexibility', weight: 3 },
        { key: 'attention',                 weight: 2 },
        { key: 'emotional_intelligence',    weight: 2 },
        { key: 'honesty',                   weight: 2 },
        { key: 'locus_of_control',          weight: 1 },
        { key: 'motivation',                weight: 1 },
      ],
      blocksJson: ['PSS', 'TKI', 'BOURDON', 'MSCEIT', 'BIG_FIVE'],
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
