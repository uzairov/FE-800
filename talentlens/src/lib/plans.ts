// ─────────────────────────────────────────────────────────────────────────────
// Plan limits & feature flags — single source of truth.
// Values match the Plan rows in DB (see prisma/seed.ts) but are mirrored here
// so checks don't always need a DB lookup.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanName = 'free' | 'starter' | 'professional' | 'enterprise';

export interface PlanFeatures {
  displayName:            string;
  priceUsd:               number;
  maxAssessmentsPerMonth: number; // -1 = unlimited
  maxUsers:               number; // -1 = unlimited
  maxPositionTemplates:   number; // -1 = unlimited
  hasPdfExport:           boolean;
  hasAiAssistant:         boolean;
  hasApiAccess:           boolean;
  hasWebhooks:            boolean;
  has360Reviews:          boolean;
  hasWhiteLabel:          boolean;
}

export const PLANS: Record<PlanName, PlanFeatures> = {
  free: {
    displayName:            'Free',
    priceUsd:               0,
    maxAssessmentsPerMonth: 5,
    maxUsers:               1,
    maxPositionTemplates:   5,
    hasPdfExport:           false,
    hasAiAssistant:         true,
    hasApiAccess:           false,
    hasWebhooks:            false,
    has360Reviews:          false,
    hasWhiteLabel:          false,
  },
  starter: {
    displayName:            'Starter',
    priceUsd:               25,
    maxAssessmentsPerMonth: 50,
    maxUsers:               3,
    maxPositionTemplates:   10,
    hasPdfExport:           true,
    hasAiAssistant:         true,
    hasApiAccess:           false,
    hasWebhooks:            false,
    has360Reviews:          false,
    hasWhiteLabel:          false,
  },
  professional: {
    displayName:            'Pro',
    priceUsd:               50,
    maxAssessmentsPerMonth: 200,
    maxUsers:               10,
    maxPositionTemplates:   10,
    hasPdfExport:           true,
    hasAiAssistant:         true,
    hasApiAccess:           true,
    hasWebhooks:            true,
    has360Reviews:          false,
    hasWhiteLabel:          false,
  },
  enterprise: {
    displayName:            'Enterprise',
    priceUsd:               150,
    maxAssessmentsPerMonth: -1,
    maxUsers:               -1,
    maxPositionTemplates:   -1,
    hasPdfExport:           true,
    hasAiAssistant:         true,
    hasApiAccess:           true,
    hasWebhooks:            true,
    has360Reviews:          true,
    hasWhiteLabel:          true,
  },
};

export const PLAN_ORDER: PlanName[] = ['free', 'starter', 'professional', 'enterprise'];

export function getPlan(name: string | null | undefined): PlanFeatures {
  if (name && name in PLANS) return PLANS[name as PlanName];
  return PLANS.free;
}

/** Suggest the cheapest plan that includes the given feature. */
export function nextPlanWith(feature: keyof PlanFeatures, current: string): PlanName | null {
  const currentIdx = PLAN_ORDER.indexOf(current as PlanName);
  for (let i = Math.max(0, currentIdx + 1); i < PLAN_ORDER.length; i++) {
    const candidate = PLANS[PLAN_ORDER[i]];
    if (candidate[feature]) return PLAN_ORDER[i];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan check primitives — used by API routes.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
  feature?: string;
  planName?: string;
  upgradeTo?: PlanName;
}

export function canCreateAssessment(
  planName: string,
  monthlyCount: number,
): PlanCheckResult {
  const plan = getPlan(planName);
  if (plan.maxAssessmentsPerMonth < 0) return { allowed: true };
  if (monthlyCount < plan.maxAssessmentsPerMonth) {
    return { allowed: true, current: monthlyCount, limit: plan.maxAssessmentsPerMonth };
  }
  return {
    allowed: false,
    reason: `Лимит ${plan.maxAssessmentsPerMonth} оценок/мес для плана «${plan.displayName}» исчерпан`,
    current: monthlyCount,
    limit: plan.maxAssessmentsPerMonth,
    feature: 'maxAssessmentsPerMonth',
    planName,
    upgradeTo: nextPlanWith('hasAiAssistant', planName) ?? 'starter',
  };
}

export function canUseFeature(
  planName: string,
  feature: keyof Pick<
    PlanFeatures,
    'hasPdfExport' | 'hasAiAssistant' | 'hasApiAccess' | 'hasWebhooks' | 'has360Reviews' | 'hasWhiteLabel'
  >,
): PlanCheckResult {
  const plan = getPlan(planName);
  if (plan[feature]) return { allowed: true };
  const upgradeTo = nextPlanWith(feature, planName);
  return {
    allowed: false,
    reason: `Эта функция недоступна на плане «${plan.displayName}»`,
    feature,
    planName,
    upgradeTo: upgradeTo ?? undefined,
  };
}
