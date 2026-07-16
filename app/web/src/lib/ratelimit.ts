import type { Types } from 'mongoose';
import { getRedis } from './redis';
import { ApiKey } from './models';
import { PLANS, planLimitRedisKey, type PlanId } from './plans';

/**
 * Publish a user's plan limits to shared Redis, one entry per ACTIVE key.
 * app/api reads `plan:limits:<apiKeyId>` on every request, so this is what
 * makes an over-plan call 429 without the two services talking directly.
 *
 * Revoked keys have their entry deleted (the key is dead anyway, but we do not
 * leave stale limits lying around).
 */
export async function publishPlanLimits(userId: Types.ObjectId, plan: PlanId): Promise<number> {
  const redis = getRedis();
  const keys = await ApiKey.find({ userId }).select('_id active').lean();
  const cfg = PLANS[plan];
  let published = 0;

  for (const key of keys) {
    const redisKey = planLimitRedisKey(String(key._id));
    if (key.active) {
      await redis.set(
        redisKey,
        JSON.stringify({
          plan: cfg.id,
          rateLimitPerMinute: cfg.rateLimitPerMinute,
          monthlyQuota: cfg.monthlyQuota,
        }),
      );
      published += 1;
    } else {
      await redis.del(redisKey);
    }
  }
  return published;
}

/** Drop a single key's published limit (used on revoke). */
export async function revokePlanLimit(apiKeyId: Types.ObjectId | string): Promise<void> {
  await getRedis().del(planLimitRedisKey(String(apiKeyId)));
}
