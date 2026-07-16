import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockDodoPayments } from './helpers/dodoMock';
import { resetData, startStack, stopStack } from './helpers/stack';

vi.mock('dodopayments', () => ({ default: MockDodoPayments }));

const { signup, login, createSessionToken, sessionCookieHeader } = await import('@/lib/auth');
const { ApiKey, User } = await import('@/lib/models');
const { PLANS, planLimitRedisKey } = await import('@/lib/plans');
const { createKey, listKeys, revokeKey } = await import('@/lib/keys');
const { getRedisMock } = await import('./helpers/stack');

const signupRoute = await import('@/app/api/auth/signup/route');
const keysRoute = await import('@/app/api/keys/route');
const keyIdRoute = await import('@/app/api/keys/[id]/route');

function authedRequest(url: string, userId: string, init: RequestInit = {}) {
  const cookie = sessionCookieHeader(createSessionToken(userId)).split(';')[0];
  return new Request(url, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie, 'content-type': 'application/json' },
  });
}

beforeAll(async () => {
  await startStack();
});
afterAll(async () => {
  await stopStack();
});
beforeEach(async () => {
  await resetData();
});

describe('signup auto-provisions an API key', () => {
  it('creates the account, mints one key, and returns the raw key exactly once', async () => {
    const res = await signupRoute.POST(
      new Request('http://x/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'Founder@Example.com', password: 'correct horse battery' }),
      }),
    );
    const body = (await res.json()) as { ok: boolean; apiKey: string; user: { id: string } };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.apiKey).toMatch(/^pdk_live_[0-9a-f]{32}$/);
    expect(res.headers.get('set-cookie')).toContain('ec_session=');

    const keys = await ApiKey.find({}).lean();
    expect(keys).toHaveLength(1);
    // Stored HASHED (sha256) — never the raw key. Same scheme as app/api.
    expect(keys[0].keyHash).toBe(crypto.createHash('sha256').update(body.apiKey).digest('hex'));
    expect(JSON.stringify(keys[0])).not.toContain(body.apiKey);
    expect(keys[0].prefix).toBe(body.apiKey.slice(0, 12));

    const user = await User.findById(body.user.id).lean();
    expect(user?.email).toBe('founder@example.com'); // normalised
    expect(user?.plan).toBe('trial');
    expect(user?.subscriptionStatus).toBe('none');
  });

  it('publishes the trial rate limit to shared Redis for the new key', async () => {
    const { user } = await signup('a@example.com', 'correct horse battery');
    const key = await ApiKey.findOne({ userId: user._id }).lean();
    const raw = await getRedisMock().get(planLimitRedisKey(String(key!._id)));
    expect(JSON.parse(raw!)).toEqual({
      plan: 'trial',
      rateLimitPerMinute: PLANS.trial.rateLimitPerMinute,
      monthlyQuota: PLANS.trial.monthlyQuota,
    });
  });

  it('rejects a duplicate email and a weak password', async () => {
    await signup('dupe@example.com', 'correct horse battery');
    await expect(signup('dupe@example.com', 'correct horse battery')).rejects.toThrow(/already exists/i);
    await expect(signup('weak@example.com', 'short')).rejects.toThrow(/at least 10/i);
  });

  it('logs in with the right password and refuses the wrong one', async () => {
    await signup('login@example.com', 'correct horse battery');
    const user = await login('login@example.com', 'correct horse battery');
    expect(user.email).toBe('login@example.com');
    await expect(login('login@example.com', 'wrong password!!')).rejects.toThrow(/incorrect/i);
  });
});

describe('API key CRUD', () => {
  it('creates, lists and revokes keys through the route handlers', async () => {
    const { user } = await signup('crud@example.com', 'correct horse battery');
    const uid = String(user._id);

    const createRes = await keysRoute.POST(
      authedRequest('http://x/api/keys', uid, {
        method: 'POST',
        body: JSON.stringify({ name: 'CI pipeline' }),
      }),
    );
    const created = (await createRes.json()) as { ok: boolean; apiKey: string; key: { id: string } };
    expect(createRes.status).toBe(200);
    expect(created.apiKey).toMatch(/^pdk_live_[0-9a-f]{32}$/);

    const listRes = await keysRoute.GET(authedRequest('http://x/api/keys', uid));
    const listed = (await listRes.json()) as { keys: { id: string; name: string; active: boolean; prefix: string }[] };
    expect(listed.keys).toHaveLength(2); // auto-provisioned + this one
    // The list NEVER contains a raw key.
    expect(JSON.stringify(listed)).not.toContain(created.apiKey);

    const delRes = await keyIdRoute.DELETE(
      authedRequest(`http://x/api/keys/${created.key.id}`, uid, { method: 'DELETE' }),
      { params: Promise.resolve({ id: created.key.id }) },
    );
    expect(delRes.status).toBe(200);

    const after = await listKeys(user._id);
    expect(after.find((k) => k.id === created.key.id)?.active).toBe(false);
    // The revoked key's published rate limit is gone from Redis.
    expect(await getRedisMock().get(planLimitRedisKey(created.key.id))).toBeNull();
  });

  it('refuses to revoke twice', async () => {
    const { user } = await signup('twice@example.com', 'correct horse battery');
    const { key } = await createKey(user._id, 'temp', 'trial');
    await revokeKey(user._id, key.id);
    await expect(revokeKey(user._id, key.id)).rejects.toThrow(/not found or already revoked/i);
  });

  it('requires a session', async () => {
    const res = await keysRoute.GET(new Request('http://x/api/keys'));
    expect(res.status).toBe(401);
  });
});
