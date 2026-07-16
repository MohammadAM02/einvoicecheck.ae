import type { Types } from 'mongoose';
import { connectMongo } from './db';
import { ApiKey } from './models';
import { getRedis } from './redis';
import { PLANS, planLimitRedisKey, type PlanId } from './plans';
import { revokePlanLimit } from './ratelimit';

export type KeyView = {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export class KeyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function listKeys(userId: Types.ObjectId): Promise<KeyView[]> {
  await connectMongo();
  const keys = await ApiKey.find({ userId }).sort({ createdAt: -1 }).lean();
  return keys.map((k) => ({
    id: String(k._id),
    name: k.name,
    prefix: k.prefix,
    active: k.active,
    createdAt: new Date(k.createdAt).toISOString(),
    lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
    revokedAt: k.revokedAt ? new Date(k.revokedAt).toISOString() : null,
  }));
}

const MAX_ACTIVE_KEYS = 5;

/**
 * Mint a key. The raw value is returned here and NOWHERE else, ever — only its
 * SHA-256 hash is stored (same scheme as app/api, so the key authenticates
 * against the API immediately). The new key's plan rate limit is published to
 * shared Redis at creation time.
 */
export async function createKey(
  userId: Types.ObjectId,
  name: string,
  plan: PlanId,
): Promise<{ raw: string; key: KeyView }> {
  await connectMongo();
  const clean = String(name ?? '').trim().slice(0, 60) || 'API key';
  const activeCount = await ApiKey.countDocuments({ userId, active: true });
  if (activeCount >= MAX_ACTIVE_KEYS) {
    throw new KeyError(`Key limit reached (${MAX_ACTIVE_KEYS} active). Revoke one first.`, 409);
  }

  const { raw, doc } = ApiKey.generate({ name: clean, userId });
  const created = await ApiKey.create(doc);

  const cfg = PLANS[plan];
  await getRedis().set(
    planLimitRedisKey(String(created._id)),
    JSON.stringify({
      plan: cfg.id,
      rateLimitPerMinute: cfg.rateLimitPerMinute,
      monthlyQuota: cfg.monthlyQuota,
    }),
  );

  return {
    raw,
    key: {
      id: String(created._id),
      name: created.name,
      prefix: created.prefix,
      active: true,
      createdAt: new Date(created.createdAt).toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
  };
}

/** Revoke: deactivate the key and drop its published rate limit from Redis. */
export async function revokeKey(userId: Types.ObjectId, keyId: string): Promise<void> {
  await connectMongo();
  const res = await ApiKey.updateOne(
    { _id: keyId, userId, active: true },
    { $set: { active: false, revokedAt: new Date() } },
  );
  if (res.matchedCount === 0) throw new KeyError('Key not found or already revoked.', 404);
  await revokePlanLimit(keyId);
}
