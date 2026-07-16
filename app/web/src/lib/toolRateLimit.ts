import { createHash } from 'node:crypto';
import { getRedis } from './redis';

/**
 * IP rate limit for the zero-login free tool (/tools/uae-e-invoice-validator).
 *
 * Same Redis instance app/api uses for `plan:limits:*` and its per-key limiter;
 * we just own a different namespace: `tool:rl:<tool>:<ipHash>:<window>`.
 * Fixed window, INCR + EXPIRE - the same shape as the API's per-minute limiter.
 *
 * The IP is stored only as a salted SHA-256 prefix; the raw address is never
 * written to Redis (see /legal/privacy - we do not need the address itself).
 *
 * FAIL OPEN: if Redis is unreachable the request is allowed and `degraded` is
 * set, so the caller can say so plainly. Production must not silently disable
 * the limit: TOOL_RATE_LIMIT_REQUIRE_REDIS=true makes a Redis outage a hard 503
 * instead of an unlimited free tool.
 */

export const TOOL_RATE_LIMIT = Number(process.env.TOOL_RATE_LIMIT_PER_HOUR ?? 20);
export const TOOL_RATE_WINDOW_SECONDS = 3600;

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  /** Redis was unreachable; the limit could not be enforced for this request. */
  degraded: boolean;
  /** Redis was unreachable AND the deployment requires it -> caller must 503. */
  unavailable: boolean;
};

/** Best-effort client IP from the proxy chain (Railway / Vercel style headers). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function ipHash(ip: string): string {
  const salt = process.env.TOOL_RATE_LIMIT_SALT ?? 'einvoicecheck-tool';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

export function toolRateKey(tool: string, ip: string, now = Date.now()): string {
  const window = Math.floor(now / (TOOL_RATE_WINDOW_SECONDS * 1000));
  return `tool:rl:${tool}:${ipHash(ip)}:${window}`;
}

export async function checkToolRateLimit(tool: string, ip: string): Promise<RateLimitDecision> {
  const limit = TOOL_RATE_LIMIT;
  const key = toolRateKey(tool, ip);

  try {
    const redis = getRedis();
    const hits = await redis.incr(key);
    if (hits === 1) await redis.expire(key, TOOL_RATE_WINDOW_SECONDS);
    const ttl = await redis.ttl(key);
    return {
      allowed: hits <= limit,
      limit,
      remaining: Math.max(0, limit - hits),
      resetSeconds: ttl > 0 ? ttl : TOOL_RATE_WINDOW_SECONDS,
      degraded: false,
      unavailable: false,
    };
  } catch {
    const required = process.env.TOOL_RATE_LIMIT_REQUIRE_REDIS === 'true';
    return {
      allowed: !required,
      limit,
      remaining: 0,
      resetSeconds: TOOL_RATE_WINDOW_SECONDS,
      degraded: true,
      unavailable: required,
    };
  }
}
