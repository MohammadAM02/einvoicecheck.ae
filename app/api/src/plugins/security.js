import { randomUUID } from 'node:crypto';
import { ApiKey } from '../models/ApiKey.js';
import { config } from '../config/env.js';
import { planLimitRedisKey, parsePlanLimit } from '../config/plans.js';

/**
 * Extract the presented raw API key from either header form:
 *   x-api-key: <key>
 *   Authorization: Bearer <key>
 */
function extractKey(request) {
  const headerKey = request.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) return headerKey.trim();

  const auth = request.headers['authorization'];
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * preHandler: authenticate the request by API key. On success attaches the
 * ApiKey document to request.apiKey. On failure replies 401 and returns false.
 */
export async function authenticate(request, reply) {
  const raw = extractKey(request);
  if (!raw) {
    reply.code(401).send({
      error: 'unauthorized',
      message: 'Missing API key. Supply it via the x-api-key header or Authorization: Bearer <key>.',
    });
    return reply;
  }
  const keyHash = ApiKey.hashKey(raw);
  const doc = await ApiKey.findOne({ keyHash, active: true }).exec();
  if (!doc) {
    reply.code(401).send({
      error: 'unauthorized',
      message: 'Invalid or inactive API key.',
    });
    return reply;
  }
  request.apiKey = doc;
  // best-effort last-used stamp; never blocks the request
  ApiKey.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
}

/**
 * Redis sliding-window rate limiter, per API key. Uses a sorted set of request
 * timestamps; entries older than the window are trimmed on each call.
 * `namespace` isolates independent buckets for the same key (A-019) — e.g.
 * paid operations vs cheap /usage reads.
 */
async function consume(redis, keyId, max, windowMs, namespace = '') {
  const now = Date.now();
  const k = namespace ? `rl:${namespace}:${keyId}` : `rl:${keyId}`;
  const member = `${now}-${Math.random().toString(36).slice(2)}`;
  const pipeline = redis.multi();
  pipeline.zremrangebyscore(k, 0, now - windowMs);
  pipeline.zadd(k, now, member);
  pipeline.zcard(k);
  pipeline.pexpire(k, windowMs);
  const res = await pipeline.exec();
  // res[2] === [null, <zcard>]
  const count = Number(res?.[2]?.[1] ?? 0);
  if (count > max) {
    // We over-added; roll back this request's marker so it doesn't skew the window.
    await redis.zrem(k, member);
    return { allowed: false, remaining: 0, retryAfterMs: windowMs };
  }
  return { allowed: true, remaining: Math.max(0, max - count), retryAfterMs: windowMs };
}

/**
 * Read the plan limit the dashboard (app/web) published to shared Redis for
 * this API key. See src/config/plans.js for the contract. Distinguishes the
 * states callers must treat differently (A-014):
 *   { status: 'ok', limit }          valid published plan metadata
 *   { status: 'missing' }            nothing published for this key
 *   { status: 'malformed' }          published blob is not parseable
 *   { status: 'unreadable', error }  Redis transport failure
 */
async function readPlanLimit(redis, keyId) {
  let raw;
  try {
    raw = await redis.get(planLimitRedisKey(keyId));
  } catch (e) {
    return { status: 'unreadable', error: e };
  }
  if (!raw) return { status: 'missing' };
  const limit = parsePlanLimit(raw);
  if (!limit) return { status: 'malformed' };
  return { status: 'ok', limit };
}

/**
 * Build a preHandler that enforces the per-key rate limit. Requires
 * request.apiKey (run authenticate first) and fastify.redis.
 *
 * Precedence for the limit: published plan limit (Redis, written by app/web on
 * signup / subscribe / upgrade / cancel) > ApiKey.rateLimitPerMinute > global
 * default. An over-plan caller therefore gets a 429 from this service without
 * the dashboard having to touch the API at all. Missing/malformed published
 * data deliberately falls back to the document/global default (per-minute
 * enforcement still holds); monthly quota fail-closed is handled separately
 * in reserveMonthlyQuota (A-014).
 */
export function makeRateLimiter(fastify, { max: maxOverride = null, namespace = '' } = {}) {
  return async function rateLimit(request, reply) {
    const key = request.apiKey;
    if (!key) return; // authenticate already rejected
    const read = await readPlanLimit(fastify.redis, String(key._id));
    const planLimit = read.status === 'ok' ? read.limit : null;
    const max = maxOverride ?? planLimit?.rateLimitPerMinute ?? key.rateLimitPerMinute ?? config.rateLimit.max;
    const windowMs = config.rateLimit.windowMs;

    let result;
    try {
      result = await consume(fastify.redis, String(key._id), max, windowMs, namespace);
    } catch (e) {
      if (config.rateLimit.requireRedis) {
        // Fail CLOSED: a limiter outage must not become unlimited paid access.
        request.log.error({ err: e }, 'rate limiter unavailable; failing closed (503)');
        reply.code(503).send({
          error: 'rate_limiter_unavailable',
          message: 'Rate limiting is temporarily unavailable. Please retry shortly.',
        });
        return reply;
      }
      // Fail-open on limiter infrastructure errors, but log — never 500 the caller.
      request.log.warn({ err: e }, 'rate limiter unavailable; allowing request');
      return;
    }

    reply.header('x-ratelimit-limit', String(max));
    reply.header('x-ratelimit-remaining', String(result.remaining));
    reply.header('x-ratelimit-window-ms', String(windowMs));

    if (!result.allowed) {
      reply.header('retry-after', String(Math.ceil(result.retryAfterMs / 1000)));
      reply.code(429).send({
        error: 'rate_limited',
        message: `Rate limit exceeded: ${max} requests per ${windowMs / 1000}s. Retry shortly.`,
      });
      return reply;
    }
  };
}

/**
 * Redis key holding one API key's current UTC-calendar-month quota counter.
 * Counters only — never invoice payloads (spec invariant).
 */
export function monthlyQuotaKey(keyId, now = new Date()) {
  return `q:month:${keyId}:${now.toISOString().slice(0, 7)}`;
}

/** Exact UTC month-end expiry in milliseconds — never truncated early (A-015). */
function monthEndMs(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

/**
 * Atomic monthly-quota reservation (A-015): check remaining capacity, add this
 * reservation, and on first use pin the key to the exact UTC month-end — one
 * native Redis operation. The reservation set holds opaque tokens only, never
 * payloads or secrets. Returns {1, usedAfter, remaining} on success, or
 * {0, used} when the quota is already exhausted.
 */
const RESERVE_LUA = `
local key = KEYS[1]
local quota = tonumber(ARGV[1])
local token = ARGV[2]
local expiryMs = tonumber(ARGV[3])
local used = redis.call('SCARD', key)
if used >= quota then return {0, used} end
redis.call('SADD', key, token)
if used == 0 then redis.call('PEXPIREAT', key, expiryMs) end
return {1, used + 1, quota - used - 1}
`;

/**
 * Atomically reserve one monthly-quota unit for the request's API key, BEFORE
 * expensive billable work. Reads the same published plan limit the rate
 * limiter uses (plan:limits:<keyId> from app/web). Returns:
 *   { ok: true,  quota, remaining, key, token }    reservation made
 *   { ok: true,  quota: null }                     no quota authority needed
 *   { ok: false, quota, unavailable? }             exhausted / fail-closed
 * The reservation is attached to request.quota and released automatically by
 * the onResponse hook unless finalizeMonthlyQuota() is called first.
 *
 * Fail-closed policy (A-014): missing or malformed active-plan metadata is
 * never treated as an unlimited monthly quota — the request is refused with a
 * safe 503 before any billable work. Redis transport failure follows the rate
 * limiter's policy: fail CLOSED (503) when config.rateLimit.requireRedis,
 * else fail open with a warning.
 */
export async function reserveMonthlyQuota(fastify, request) {
  const key = request.apiKey;
  if (!key) return { ok: true, quota: null };

  const read = await readPlanLimit(fastify.redis, String(key._id));
  if (read.status === 'unreadable') {
    if (config.rateLimit.requireRedis) {
      request.log.error({ err: read.error }, 'monthly quota store unavailable; failing closed (503)');
      return { ok: false, quota: null, unavailable: true };
    }
    request.log.warn({ err: read.error }, 'monthly quota store unavailable; allowing request');
    return { ok: true, quota: null };
  }
  if (read.status !== 'ok' || !read.limit.monthlyQuota || read.limit.monthlyQuota <= 0) {
    // Missing, malformed, or quota-less active-plan metadata: no authoritative
    // limit exists. Never silently disable monthly quotas.
    request.log.error(
      { status: read.status, keyId: String(key._id) },
      'plan limits missing or malformed; failing closed (503)'
    );
    return { ok: false, quota: null, unavailable: true };
  }
  const quota = read.limit.monthlyQuota;

  const k = monthlyQuotaKey(String(key._id));
  const token = randomUUID();
  let res;
  try {
    res = await fastify.redis.eval(RESERVE_LUA, 1, k, quota, token, monthEndMs());
  } catch (e) {
    if (config.rateLimit.requireRedis) {
      request.log.error({ err: e }, 'monthly quota store unavailable; failing closed (503)');
      return { ok: false, quota, unavailable: true };
    }
    request.log.warn({ err: e }, 'monthly quota store unavailable; allowing request');
    return { ok: true, quota: null };
  }
  if (Number(res[0]) === 0) {
    return { ok: false, quota, remaining: 0, key: k };
  }
  request.quota = { key: k, token, finalized: false, released: false };
  return { ok: true, quota, remaining: Number(res[2]), key: k, token };
}

/** Keep the reserved unit: the billable operation produced a real outcome. */
export function finalizeMonthlyQuota(request) {
  if (request.quota) request.quota.finalized = true;
}

/**
 * Register the automatic release hook once per app. Must be called during
 * route registration (before app.ready()); per-request reservation calls run
 * too late to add hooks. Any reservation never finalized — internal error,
 * route throw — is released when the response is sent (A-008/A-016). Release
 * removes exactly this reservation's opaque token and is idempotent (SREM of a
 * missing member is a no-op).
 */
export function registerQuotaReleaseHook(fastify) {
  if (fastify.quotaReleaseHookRegistered) return;
  fastify.quotaReleaseHookRegistered = true;
  fastify.addHook('onResponse', async (request) => {
    const q = request.quota;
    if (!q || q.finalized || q.released) return;
    q.released = true;
    try {
      await fastify.redis.srem(q.key, q.token);
    } catch (e) {
      request.log.warn({ err: e }, 'failed to release monthly quota reservation');
    }
  });
}

/** Standard 429/503 reply for a rejected quota reservation. */
export function quotaRejectedReply(reply, quota) {
  if (quota.unavailable) {
    return reply.code(503).send({
      error: 'quota_store_unavailable',
      message: 'Quota enforcement is temporarily unavailable. Please retry shortly.',
    });
  }
  return reply.code(429).send({
    error: 'quota_exceeded',
    message: `Monthly quota exceeded: ${quota.quota} operations per UTC calendar month. Resets on the 1st of the next month.`,
  });
}
