/**
 * SHARED PLAN / RATE-LIMIT CONFIG  (canonical copy)
 *
 * Mirrored, field for field, by `app/web/src/lib/plans.ts`. If you change a
 * limit here, change it there too — the two services are deployed separately
 * and only share Redis + Mongo, not a bundle.
 *
 * Contract between the two services:
 *   - app/web (dashboard) WRITES  Redis key `plan:limits:<apiKeyId>`
 *   - app/api (this service) READS it on every request in the rate limiter.
 *   Value is JSON: { plan, rateLimitPerMinute, monthlyQuota }
 *
 * The value is advisory-but-authoritative: if present it wins over the ApiKey
 * document's own `rateLimitPerMinute`; if absent we fall back to the document,
 * then to the global default. That means the API keeps working even if the
 * dashboard has never published anything for a key.
 *
 * Pricing: free trial / $29 Starter / $99 Pro. Prices live here for reference
 * only — the real product IDs come from env vars in app/web (never hardcoded).
 */

export const PLAN_IDS = /** @type {const} */ (['trial', 'starter', 'pro']);

export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Free trial',
    priceUsd: 0,
    rateLimitPerMinute: 10,
    monthlyQuota: 100,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 29,
    rateLimitPerMinute: 60,
    monthlyQuota: 2000,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 99,
    rateLimitPerMinute: 300,
    monthlyQuota: 15000,
  },
};

/** Redis key holding the published plan limits for one API key. */
export function planLimitRedisKey(apiKeyId) {
  return `plan:limits:${apiKeyId}`;
}

/** Parse a published limit blob. Returns null on anything malformed. */
export function parsePlanLimit(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const rateLimitPerMinute = Number(parsed?.rateLimitPerMinute);
    if (!Number.isFinite(rateLimitPerMinute) || rateLimitPerMinute <= 0) return null;
    return {
      plan: typeof parsed.plan === 'string' ? parsed.plan : null,
      rateLimitPerMinute,
      monthlyQuota: Number(parsed?.monthlyQuota) || null,
    };
  } catch {
    return null;
  }
}
