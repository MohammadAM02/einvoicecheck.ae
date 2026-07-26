/* Shared plan / rate-limit config. Keep in sync with app/api/src/config/plans.js. */
export const PLAN_IDS = ['trial', 'starter', 'pro'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type Plan = {
  id: PlanId;
  name: string;
  priceUsd: number;
  priceLabel: string;
  cadence: string;
  rateLimitPerMinute: number;
  monthlyQuota: number;
  paypalPlanIdEnv?: string;
  blurb: string;
};

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: 'trial',
    name: 'Free trial',
    priceUsd: 0,
    priceLabel: '$0',
    cadence: 'no card required',
    rateLimitPerMinute: 10,
    monthlyQuota: 100,
    blurb: 'Enough to wire the API into one CI pipeline and see your real error list.',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 29,
    priceLabel: '$29',
    cadence: 'per month',
    rateLimitPerMinute: 60,
    monthlyQuota: 2000,
    paypalPlanIdEnv: 'PAYPAL_PLAN_ID_STARTER',
    blurb: 'For one finance system or ERP export you keep clean before it reaches your ASP.',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 99,
    priceLabel: '$99',
    cadence: 'per month',
    rateLimitPerMinute: 300,
    monthlyQuota: 15000,
    paypalPlanIdEnv: 'PAYPAL_PLAN_ID_PRO',
    blurb: 'For teams validating every invoice in CI across several entities or clients.',
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

export function paypalPlanIdFor(plan: PlanId): string {
  const envName = PLANS[plan].paypalPlanIdEnv;
  if (!envName) throw new Error(`The ${PLANS[plan].name} tier does not use PayPal checkout.`);
  const value = process.env[envName];
  if (!value) {
    throw new Error(
      `Missing ${envName}. Create the "${PLANS[plan].name}" billing plan in PayPal and set ${envName} in Railway.`,
    );
  }
  return value;
}

export function planForPaypalPlanId(planId: string | null | undefined): PlanId | null {
  if (!planId) return null;
  for (const id of PLAN_IDS) {
    const envName = PLANS[id].paypalPlanIdEnv;
    if (envName && process.env[envName] === planId) return id;
  }
  return null;
}

export function planLimitRedisKey(apiKeyId: string): string {
  return `plan:limits:${apiKeyId}`;
}

export const SUBSCRIPTION_STATUSES = ['none', 'active', 'on_hold', 'failed', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
