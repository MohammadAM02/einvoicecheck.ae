import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockDodoPayments, callsTo, resetDodoCalls, signWebhook } from './helpers/dodoMock';
import { getRedisMock, resetData, startStack, stopStack } from './helpers/stack';
import type { UserDoc } from '@/lib/models';
// The API service's OWN parser, imported straight from app/api — this is the
// contract that makes an over-plan call 429 in production.
import { parsePlanLimit, planLimitRedisKey as apiPlanLimitRedisKey } from '../../api/src/config/plans.js';

vi.mock('dodopayments', () => ({ default: MockDodoPayments }));

const { signup } = await import('@/lib/auth');
const { ApiKey, User } = await import('@/lib/models');
const { PLANS, planLimitRedisKey } = await import('@/lib/plans');
const { chargeOverage } = await import('@/lib/billing');
const { usageSummary } = await import('@/lib/usage');
const { UsageEvent } = await import('@/lib/models');
const { dodoEnvironment } = await import('@/lib/dodo');

const checkoutRoute = await import('@/app/api/billing/checkout/route');
const portalRoute = await import('@/app/api/billing/portal/route');
const changePlanRoute = await import('@/app/api/billing/change-plan/route');
const cancelRoute = await import('@/app/api/billing/cancel/route');
const recoverRoute = await import('@/app/api/billing/recover/route');
const usageRoute = await import('@/app/api/usage/route');
const webhookRoute = await import('@/app/api/webhooks/dodo/route');
const { createSessionToken, sessionCookieHeader } = await import('@/lib/auth');

function authed(url: string, userId: string, body?: unknown) {
  const cookie = sessionCookieHeader(createSessionToken(userId)).split(';')[0];
  return new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function deliver(type: string, userId: string, webhookId: string, data: Record<string, unknown> = {}) {
  const raw = JSON.stringify({
    business_id: 'biz_mock',
    type,
    timestamp: new Date().toISOString(),
    data: {
      payload_type: 'Subscription',
      subscription_id: 'sub_mock_1',
      status: 'active',
      customer: { customer_id: 'cus_mock_1', email: 'sm@example.com' },
      metadata: { user_id: userId },
      ...data,
    },
  });
  const res = await webhookRoute.POST(
    new Request('http://x/api/webhooks/dodo', {
      method: 'POST',
      headers: { ...signWebhook(raw, webhookId), 'content-type': 'application/json' },
      body: raw,
    }),
  );
  return res;
}

let userId: string;

beforeAll(async () => {
  await startStack();
});
afterAll(async () => {
  await stopStack();
});
beforeEach(async () => {
  await resetData();
  resetDodoCalls();
  const { user } = await signup('sm@example.com', 'correct horse battery');
  userId = String(user._id);
});

describe('Dodo client configuration', () => {
  it('defaults to test_mode when DODO_PAYMENTS_ENVIRONMENT is unset', async () => {
    const prev = process.env.DODO_PAYMENTS_ENVIRONMENT;
    delete process.env.DODO_PAYMENTS_ENVIRONMENT;
    expect(dodoEnvironment()).toBe('test_mode');
    process.env.DODO_PAYMENTS_ENVIRONMENT = 'anything-else';
    expect(dodoEnvironment()).toBe('test_mode');
    process.env.DODO_PAYMENTS_ENVIRONMENT = 'live_mode';
    expect(dodoEnvironment()).toBe('live_mode');
    if (prev === undefined) delete process.env.DODO_PAYMENTS_ENVIRONMENT;
    else process.env.DODO_PAYMENTS_ENVIRONMENT = prev;
  });
});

describe('checkout', () => {
  it('creates a checkout session with the env-sourced product id and returns checkout_url', async () => {
    const res = await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'starter' }));
    const body = (await res.json()) as { ok: boolean; checkoutUrl: string };
    expect(res.status).toBe(200);
    expect(body.checkoutUrl).toBe('https://test.dodopayments.com/checkout/mock');

    const [call] = callsTo('checkoutSessions.create');
    const params = call.args[0] as {
      product_cart: { product_id: string; quantity: number }[];
      return_url: string;
      metadata: Record<string, string>;
    };
    expect(params.product_cart).toEqual([{ product_id: process.env.DODO_PRODUCT_ID_STARTER, quantity: 1 }]);
    expect(params.metadata.user_id).toBe(userId);
    expect(params.return_url).toContain('einvoicecheck.ae');
  });

  it('sends trial_period_days for the free trial product', async () => {
    await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'trial' }));
    const params = callsTo('checkoutSessions.create')[0].args[0] as {
      subscription_data?: { trial_period_days?: number };
      product_cart: { product_id: string }[];
    };
    expect(params.product_cart[0].product_id).toBe(process.env.DODO_PRODUCT_ID_TRIAL);
    expect(params.subscription_data?.trial_period_days).toBe(PLANS.trial.trialPeriodDays);
  });

  it('rejects an unknown plan', async () => {
    const res = await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'enterprise' }));
    expect(res.status).toBe(400);
  });

  it('fails loudly if the product id env var is missing (never hardcodes one)', async () => {
    const prev = process.env.DODO_PRODUCT_ID_PRO;
    delete process.env.DODO_PRODUCT_ID_PRO;
    const res = await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'pro' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).toContain('DODO_PRODUCT_ID_PRO');
    process.env.DODO_PRODUCT_ID_PRO = prev;
  });
});

describe('subscribe → upgrade → cancel state machine', () => {
  it('walks the full lifecycle and keeps Redis limits in step', async () => {
    const keyDoc = await ApiKey.findOne({ userId }).lean();
    const redisKey = planLimitRedisKey(String(keyDoc!._id));
    const limitNow = async () => JSON.parse((await getRedisMock().get(redisKey))!);

    // 0. trial on signup
    expect((await limitNow()).rateLimitPerMinute).toBe(PLANS.trial.rateLimitPerMinute);

    // 1. SUBSCRIBE — checkout, then Dodo confirms with subscription.active
    await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'starter' }));
    await deliver('subscription.active', userId, 'sm_1', {
      product_id: process.env.DODO_PRODUCT_ID_STARTER,
      next_billing_date: '2026-08-14T00:00:00Z',
    });
    let user = await User.findById(userId).lean<UserDoc>();
    expect(user!.subscriptionStatus).toBe('active');
    expect(user!.plan).toBe('starter');
    expect((await limitNow()).rateLimitPerMinute).toBe(PLANS.starter.rateLimitPerMinute);

    // 2. UPGRADE — changePlan with an EXPLICIT proration mode
    const upRes = await changePlanRoute.POST(
      authed('http://x/api/billing/change-plan', userId, { plan: 'pro', proration: 'prorated_immediately' }),
    );
    expect(upRes.status).toBe(200);
    const [change] = callsTo('subscriptions.changePlan');
    expect(change.args[0]).toBe('sub_mock_1');
    expect(change.args[1]).toEqual({
      product_id: process.env.DODO_PRODUCT_ID_PRO,
      proration_billing_mode: 'prorated_immediately',
      quantity: 1,
    });
    await deliver('subscription.updated', userId, 'sm_2', { product_id: process.env.DODO_PRODUCT_ID_PRO });
    user = await User.findById(userId).lean<UserDoc>();
    expect(user!.plan).toBe('pro');
    expect((await limitNow()).rateLimitPerMinute).toBe(PLANS.pro.rateLimitPerMinute);

    // 3. CANCEL — at period end, confirmed by subscription.updated(cancelled)
    const cancelRes = await cancelRoute.POST(authed('http://x/api/billing/cancel', userId, {}));
    expect(cancelRes.status).toBe(200);
    const [cancelCall] = callsTo('subscriptions.update');
    expect(cancelCall.args[1]).toMatchObject({ cancel_at_next_billing_date: true });

    await deliver('subscription.updated', userId, 'sm_3', { status: 'cancelled' });
    user = await User.findById(userId).lean<UserDoc>();
    expect(user!.subscriptionStatus).toBe('cancelled');
    expect(user!.plan).toBe('trial');
    expect((await limitNow()).rateLimitPerMinute).toBe(PLANS.trial.rateLimitPerMinute);
  });
});

describe('customer portal + dunning recovery', () => {
  it('opens the customer portal via customers.customerPortal.create(...).link', async () => {
    await deliver('subscription.active', userId, 'p_1', { product_id: process.env.DODO_PRODUCT_ID_STARTER });
    const res = await portalRoute.POST(authed('http://x/api/billing/portal', userId, {}));
    const body = (await res.json()) as { portalUrl: string };
    expect(res.status).toBe(200);
    expect(body.portalUrl).toBe('https://test.dodopayments.com/portal/mock');
    expect(callsTo('customers.customerPortal.create')[0].args[0]).toBe('cus_mock_1');
  });

  it('409s the portal when there is no billing customer yet', async () => {
    const res = await portalRoute.POST(authed('http://x/api/billing/portal', userId, {}));
    expect(res.status).toBe(409);
  });

  it('on_hold → updatePaymentMethod(id, { type: new, return_url })', async () => {
    await deliver('subscription.active', userId, 'd_1', { product_id: process.env.DODO_PRODUCT_ID_STARTER });
    await deliver('subscription.on_hold', userId, 'd_2', { status: 'on_hold' });

    const res = await recoverRoute.POST(authed('http://x/api/billing/recover', userId, {}));
    expect(res.status).toBe(200);
    const [call] = callsTo('subscriptions.updatePaymentMethod');
    expect(call.args[0]).toBe('sub_mock_1');
    expect(call.args[1]).toMatchObject({ type: 'new' });
    expect((call.args[1] as { return_url: string }).return_url).toContain('einvoicecheck.ae');
  });
});

describe('plan → rate limit propagation (the contract app/api reads)', () => {
  it('writes a blob at the exact Redis key app/api reads, and app/api can parse it', async () => {
    await deliver('subscription.active', userId, 'rl_1', { product_id: process.env.DODO_PRODUCT_ID_PRO });
    const key = await ApiKey.findOne({ userId }).lean();

    // Same key name, computed by the API service's own helper.
    const apiKeyName = apiPlanLimitRedisKey(String(key!._id));
    expect(apiKeyName).toBe(planLimitRedisKey(String(key!._id)));

    const raw = await getRedisMock().get(apiKeyName);
    const parsed = parsePlanLimit(raw);
    expect(parsed).toEqual({
      plan: 'pro',
      rateLimitPerMinute: PLANS.pro.rateLimitPerMinute,
      monthlyQuota: PLANS.pro.monthlyQuota,
    });

    // Downgrade to trial: the API would now 429 anything above 10 rpm.
    await deliver('subscription.updated', userId, 'rl_2', { status: 'cancelled' });
    expect(parsePlanLimit(await getRedisMock().get(apiKeyName))?.rateLimitPerMinute).toBe(
      PLANS.trial.rateLimitPerMinute,
    );
  });
});

describe('usage (Mongo UsageEvent is the source of truth)', () => {
  it('aggregates metering events into a daily series and a quota view', async () => {
    const key = await ApiKey.findOne({ userId }).lean();
    const now = new Date();
    await UsageEvent.insertMany([
      { keyId: key!._id, endpoint: '/v1/validate', method: 'POST', statusCode: 200, outcome: 'valid', timestamp: now },
      { keyId: key!._id, endpoint: '/v1/validate', method: 'POST', statusCode: 200, outcome: 'invalid', timestamp: now },
      { keyId: key!._id, endpoint: '/v1/validate', method: 'POST', statusCode: 500, outcome: 'error', timestamp: now },
    ]);

    const res = await usageRoute.GET(authed('http://x/api/usage', userId));
    const body = (await res.json()) as { usage: { totals: { last30Days: number }; outcomes: Record<string, number>; quota: { plan: string; remaining: number } } };
    expect(res.status).toBe(200);
    expect(body.usage.totals.last30Days).toBe(3);
    expect(body.usage.outcomes).toEqual({ valid: 1, invalid: 1, error: 1 });
    expect(body.usage.quota.plan).toBe('trial');
    expect(body.usage.quota.remaining).toBe(PLANS.trial.monthlyQuota - 3);

    const summary = await usageSummary((await User.findById(userId).lean<UserDoc>())!._id, 'trial');
    expect(summary.days).toHaveLength(30);
    expect(summary.days.at(-1)!.total).toBe(3);
  });

  it('flags overage above the plan quota (billed as an on-demand charge, not a Dodo meter)', async () => {
    const user = (await User.findById(userId).lean<UserDoc>())!;
    await User.updateOne({ _id: userId }, { $set: { dodoSubscriptionId: 'sub_mock_1' } });
    const fresh = (await User.findById(userId).lean<UserDoc>())!;

    await chargeOverage(fresh, 1500, '50 validations over the Starter quota');
    const [call] = callsTo('subscriptions.charge');
    expect(call.args[0]).toBe('sub_mock_1');
    expect(call.args[1]).toMatchObject({ product_price: 1500 });
    expect(user.plan).toBe('trial');
  });
});
