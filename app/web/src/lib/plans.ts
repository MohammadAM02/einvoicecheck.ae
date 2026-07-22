/**
 * SHARED PLAN / RATE-LIMIT CONFIG (mirror of app/api/src/config/plans.js).
 * Keep the two in sync — the services share Redis + Mongo, not a bundle.
 *
 * Redis contract:
 *   app/web  WRITES `plan:limits:<apiKeyId>` = {plan, rateLimitPerMinute, monthlyQuota}
 *   app/api  READS  it in its rate limiter, so an over-plan call gets a 429.
 *
 * Product IDs are NEVER hardcoded — they come from env at call time.
 */

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
  /** Env var holding the Dodo Payments product_id for this tier. */
  productIdEnv: string;
  /** Env var holding the Lemon Squeezy variant_id for this tier. */
  lemonVariantIdEnv: string;
  blurb: string;
  trialPeriodDays?: number;
};

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: 'trial',
    name: 'Free trial',
    priceUsd: 0,
    priceLabel: '$0',
    cadence: 'for 14 days',
    rateLimitPerMinute: 10,
    monthlyQuota: 100,
    productIdEnv: 'DODO_PRODUCT_ID_TRIAL',
    lemonVariantIdEnv: 'LEMON_VARIANT_ID_TRIAL',
    blurb: 'Enough to wire the API into one CI pipeline and see your real error list.',
    trialPeriodDays: 14,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 29,
    priceLabel: '$29',
    cadence: 'per month',
    rateLimitPerMinute: 60,
    monthlyQuota: 2000,
    productIdEnv: 'DODO_PRODUCT_ID_STARTER',
    lemonVariantIdEnv: 'LEMON_VARIANT_ID_STARTER',
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
    productIdEnv: 'DODO_PRODUCT_ID_PRO',
    lemonVariantIdEnv: 'LEMON_VARIANT_ID_PRO',
    blurb: 'For teams validating every invoice in CI across several entities or clients.',
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

/**
 * Resolve the Dodo product_id for a plan from env. Throws (rather than
 * guessing) if it is unset — a wrong product id is worse than a clear 500.
 */
export function productIdFor(plan: PlanId): string {
  const envName = PLANS[plan].productIdEnv;
  const value = process.env[envName];
  if (!value) {
    throw new Error(
      `Missing ${envName}. Create the "${PLANS[plan].name}" product in the Dodo Payments dashboard and set ${envName} in Railway.`,
    );
  }
  return value;
}

/** Map a Dodo product_id back to our plan id. Returns null if unknown. */
export function planForProductId(productId: string | null | undefined): PlanId | null {
  if (!productId) return null;
  for (const id of PLAN_IDS) {
    if (process.env[PLANS[id].productIdEnv] === productId) return id;
  }
  return null;
}

export function planLimitRedisKey(apiKeyId: string): string {
  return `plan:limits:${apiKeyId}`;
}

/** Subscription lifecycle, driven exclusively by verified webhooks. */
export const SUBSCRIPTION_STATUSES = [
  'none',
  'active',
  'on_hold',
  'failed',
  'cancelled',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
