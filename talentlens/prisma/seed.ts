import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 10 fixed position templates for Aptio.
// Block IDs follow {PREFIX}_{BLOCK_TYPE} convention used by import-questions.ts.

interface TemplateSpec {
  id: string;
  name: string;
  nameUz: string;
  nameEn: string;
  industry: string;
  level: string;
  estimatedMinutes: number;
  competencies: Array<{ key: string; weight: 1 | 2 | 3 }>;
  blocks: string[];
}

const TEMPLATES: TemplateSpec[] = [
  // 1. Sales Manager
  {
    id: 'tmpl_sales_manager',
    name: 'Менеджер по продажам',
    nameUz: 'Sotish menejeri',
    nameEn: 'Sales Manager',
    industry: 'Продажи',
    level: 'linear',
    estimatedMinutes: 35,
    competencies: [
      { key: 'sales_skills',           weight: 3 },
      { key: 'honesty',                weight: 3 },
      { key: 'negotiation',            weight: 3 },
      { key: 'stress_resistance',      weight: 2 },
      { key: 'emotional_intelligence', weight: 2 },
      { key: 'result_orientation',     weight: 2 },
      { key: 'locus_of_control',       weight: 1 },
      { key: 'self_motivation',        weight: 1 },
    ],
    blocks: ['SM_SJT', 'SM_PSS', 'SM_EQ', 'SM_LOCUS', 'SM_CASE', 'SM_INTERVIEW'],
  },

  // 2. Call Center Operator
  {
    id: 'tmpl_call_center',
    name: 'Оператор колл-центра',
    nameUz: "Qo'ng'iroq markazi operatori",
    nameEn: 'Call Center Operator',
    industry: 'Колл-центр',
    level: 'linear',
    estimatedMinutes: 30,
    competencies: [
      { key: 'stress_resistance',         weight: 3 },
      { key: 'monotolerance',             weight: 3 },
      { key: 'attention_to_detail',       weight: 3 },
      { key: 'emotional_intelligence',    weight: 2 },
      { key: 'communication_flexibility', weight: 2 },
      { key: 'service_orientation',       weight: 2 },
      { key: 'locus_of_control',          weight: 1 },
      { key: 'self_motivation',           weight: 1 },
    ],
    blocks: ['CC_SJT', 'CC_PSS', 'CC_EQ', 'CC_ATTENTION', 'CC_INTERVIEW'],
  },

  // 3. Sales Team Lead
  {
    id: 'tmpl_sales_lead',
    name: 'Руководитель отдела продаж',
    nameUz: "Sotuv bo'limi rahbari",
    nameEn: 'Sales Team Lead',
    industry: 'Продажи',
    level: 'manager',
    estimatedMinutes: 40,
    competencies: [
      { key: 'leadership',             weight: 3 },
      { key: 'sales_skills',           weight: 3 },
      { key: 'systems_thinking',       weight: 3 },
      { key: 'result_orientation',     weight: 2 },
      { key: 'emotional_intelligence', weight: 2 },
      { key: 'negotiation',            weight: 2 },
      { key: 'stress_resistance',      weight: 1 },
      { key: 'honesty',                weight: 1 },
    ],
    blocks: ['SL_SJT', 'SL_PSS', 'SL_LEADERSHIP', 'SL_CASE', 'SL_INTERVIEW'],
  },

  // 4. HR Specialist
  {
    id: 'tmpl_hr_specialist',
    name: 'HR-специалист',
    nameUz: 'HR mutaxassisi',
    nameEn: 'HR Specialist',
    industry: 'HR',
    level: 'specialist',
    estimatedMinutes: 35,
    competencies: [
      { key: 'emotional_intelligence',    weight: 3 },
      { key: 'communication_flexibility', weight: 3 },
      { key: 'attention_to_detail',       weight: 3 },
      { key: 'service_orientation',       weight: 2 },
      { key: 'honesty',                   weight: 2 },
      { key: 'stress_resistance',         weight: 2 },
      { key: 'systems_thinking',          weight: 1 },
      { key: 'self_motivation',           weight: 1 },
    ],
    blocks: ['HR_SJT', 'HR_PSS', 'HR_EQ', 'HR_CASE', 'HR_INTERVIEW'],
  },

  // 5. Accountant
  {
    id: 'tmpl_accountant',
    name: 'Бухгалтер',
    nameUz: 'Buxgalter',
    nameEn: 'Accountant',
    industry: 'Финансы',
    level: 'specialist',
    estimatedMinutes: 30,
    competencies: [
      { key: 'attention_to_detail', weight: 3 },
      { key: 'honesty',             weight: 3 },
      { key: 'monotolerance',       weight: 3 },
      { key: 'systems_thinking',    weight: 2 },
      { key: 'attention',           weight: 2 },
      { key: 'stress_resistance',   weight: 2 },
      { key: 'locus_of_control',    weight: 1 },
      { key: 'self_motivation',     weight: 1 },
    ],
    blocks: ['AC_SJT', 'AC_PSS', 'AC_ATTENTION', 'AC_CASE', 'AC_INTERVIEW'],
  },

  // 6. IT Developer
  {
    id: 'tmpl_developer',
    name: 'IT-разработчик',
    nameUz: 'IT dasturchi',
    nameEn: 'Software Developer',
    industry: 'IT',
    level: 'specialist',
    estimatedMinutes: 35,
    competencies: [
      { key: 'systems_thinking',    weight: 3 },
      { key: 'attention_to_detail', weight: 3 },
      { key: 'self_motivation',     weight: 3 },
      { key: 'attention',           weight: 2 },
      { key: 'monotolerance',       weight: 2 },
      { key: 'locus_of_control',    weight: 2 },
      { key: 'stress_resistance',   weight: 1 },
      { key: 'honesty',             weight: 1 },
    ],
    blocks: ['DEV_SJT', 'DEV_PSS', 'DEV_LOGIC', 'DEV_CASE', 'DEV_INTERVIEW'],
  },

  // 7. Customer Success Manager
  {
    id: 'tmpl_customer_success',
    name: 'Менеджер по работе с клиентами',
    nameUz: 'Mijozlar bilan ishlash menejeri',
    nameEn: 'Customer Success Manager',
    industry: 'Клиентский сервис',
    level: 'specialist',
    estimatedMinutes: 30,
    competencies: [
      { key: 'service_orientation',       weight: 3 },
      { key: 'communication_flexibility', weight: 3 },
      { key: 'emotional_intelligence',    weight: 3 },
      { key: 'stress_resistance',         weight: 2 },
      { key: 'result_orientation',        weight: 2 },
      { key: 'honesty',                   weight: 2 },
      { key: 'self_motivation',           weight: 1 },
      { key: 'attention_to_detail',       weight: 1 },
    ],
    blocks: ['CS_SJT', 'CS_PSS', 'CS_EQ', 'CS_CASE', 'CS_INTERVIEW'],
  },

  // 8. Logistics / Warehouse Manager
  {
    id: 'tmpl_logistics',
    name: 'Логист / Менеджер склада',
    nameUz: 'Logist / Ombor menejeri',
    nameEn: 'Logistics / Warehouse Manager',
    industry: 'Логистика',
    level: 'specialist',
    estimatedMinutes: 30,
    competencies: [
      { key: 'systems_thinking',    weight: 3 },
      { key: 'attention_to_detail', weight: 3 },
      { key: 'stress_resistance',   weight: 3 },
      { key: 'monotolerance',       weight: 2 },
      { key: 'result_orientation',  weight: 2 },
      { key: 'honesty',             weight: 2 },
      { key: 'leadership',          weight: 1 },
      { key: 'attention',           weight: 1 },
    ],
    blocks: ['LG_SJT', 'LG_PSS', 'LG_ATTENTION', 'LG_CASE', 'LG_INTERVIEW'],
  },

  // 9. Security Guard
  {
    id: 'tmpl_security',
    name: 'Охранник',
    nameUz: "Qo'riqchi",
    nameEn: 'Security Guard',
    industry: 'Безопасность',
    level: 'linear',
    estimatedMinutes: 25,
    competencies: [
      { key: 'attention',           weight: 3 },
      { key: 'monotolerance',       weight: 3 },
      { key: 'stress_resistance',   weight: 3 },
      { key: 'honesty',             weight: 3 },
      { key: 'attention_to_detail', weight: 2 },
      { key: 'locus_of_control',    weight: 2 },
      { key: 'self_motivation',     weight: 1 },
      { key: 'service_orientation', weight: 1 },
    ],
    blocks: ['SG_SJT', 'SG_PSS', 'SG_ATTENTION', 'SG_INTERVIEW'],
  },

  // 10. Executive / Director
  {
    id: 'tmpl_executive',
    name: 'Топ-менеджер / Директор',
    nameUz: 'Top-menejer / Direktor',
    nameEn: 'Executive / Director',
    industry: 'Управление',
    level: 'top',
    estimatedMinutes: 45,
    competencies: [
      { key: 'leadership',             weight: 3 },
      { key: 'systems_thinking',       weight: 3 },
      { key: 'result_orientation',     weight: 3 },
      { key: 'emotional_intelligence', weight: 3 },
      { key: 'negotiation',            weight: 2 },
      { key: 'stress_resistance',      weight: 2 },
      { key: 'honesty',                weight: 2 },
      { key: 'locus_of_control',       weight: 1 },
    ],
    blocks: ['EX_SJT', 'EX_PSS', 'EX_LEADERSHIP', 'EX_CASE', 'EX_INTERVIEW'],
  },
];

const PLANS = [
  {
    id: 'plan_free',
    name: 'free',
    displayName: 'Free',
    maxAssessmentsPerMonth: 5,
    maxUsers: 1,
    hasAiAssistant: false,
    priceUsd: 0,
    features: ['5 оценок/мес', '1 пользователь', '5 базовых должностей'],
  },
  {
    id: 'plan_starter',
    name: 'starter',
    displayName: 'Starter',
    maxAssessmentsPerMonth: 50,
    maxUsers: 3,
    hasAiAssistant: false,
    priceUsd: 25,
    features: ['50 оценок/мес', '3 пользователя', 'Все 10 должностей', 'Экспорт PDF'],
  },
  {
    id: 'plan_professional',
    name: 'professional',
    displayName: 'Pro',
    maxAssessmentsPerMonth: 200,
    maxUsers: 10,
    hasAiAssistant: true,
    priceUsd: 50,
    features: ['200 оценок/мес', '10 пользователей', 'AI-ассистент', 'API доступ', 'Webhooks'],
  },
  {
    id: 'plan_enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    maxAssessmentsPerMonth: -1,
    maxUsers: -1,
    hasAiAssistant: true,
    priceUsd: 150,
    features: ['Безлимит оценок', 'Безлимит пользователей', '360° оценки', 'Белый лейбл'],
  },
];

async function main() {
  for (const t of TEMPLATES) {
    await prisma.positionTemplate.upsert({
      where: { id: t.id },
      update: {
        name:             t.name,
        nameUz:           t.nameUz,
        nameEn:           t.nameEn,
        industry:         t.industry,
        level:            t.level,
        estimatedMinutes: t.estimatedMinutes,
        competenciesJson: t.competencies,
        blocksJson:       t.blocks,
      },
      create: {
        id:               t.id,
        name:             t.name,
        nameUz:           t.nameUz,
        nameEn:           t.nameEn,
        industry:         t.industry,
        level:            t.level,
        estimatedMinutes: t.estimatedMinutes,
        competenciesJson: t.competencies,
        blocksJson:       t.blocks,
      },
    });
  }

  for (const p of PLANS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).plan.upsert({
      where: { id: p.id },
      update: {
        name:                   p.name,
        displayName:            p.displayName,
        maxAssessmentsPerMonth: p.maxAssessmentsPerMonth,
        maxUsers:               p.maxUsers,
        hasAiAssistant:         p.hasAiAssistant,
        priceUsd:               p.priceUsd,
        features:               p.features,
      },
      create: {
        id:                     p.id,
        name:                   p.name,
        displayName:            p.displayName,
        maxAssessmentsPerMonth: p.maxAssessmentsPerMonth,
        maxUsers:               p.maxUsers,
        hasAiAssistant:         p.hasAiAssistant,
        priceUsd:               p.priceUsd,
        features:               p.features,
      },
    });
  }

  console.log(`✓ ${TEMPLATES.length} position templates and ${PLANS.length} plans seeded`);

  // ── SUPERADMIN account ────────────────────────────────────────────────────
  // Create a system company for the superadmin if it doesn't exist yet
  const systemCompany = await prisma.company.upsert({
    where:  { id: 'company-system' },
    update: {},
    create: { id: 'company-system', name: 'Aptio System' },
  });

  const passwordHash = await bcrypt.hash('SuperAdmin123!', 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const superAdmin = await (prisma.user as any).upsert({
    where:  { email: 'superadmin@aptio.uz' },
    update: {},
    create: {
      email:         'superadmin@aptio.uz',
      password:      passwordHash,
      name:          'Super Admin',
      role:          'SUPERADMIN',
      emailVerified: true,
      companyId:     systemCompany.id,
    },
  });
  console.log('✓ SUPERADMIN created:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
