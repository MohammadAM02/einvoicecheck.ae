import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { callsTo, installPayPalFetchMock, resetPayPalCalls } from './helpers/paypalMock';
import { getRedisMock, resetData, startStack, stopStack } from './helpers/stack';

installPayPalFetchMock();

const { signup, createSessionToken, sessionCookieHeader } = await import('@/lib/auth');
const { ApiKey, User } = await import('@/lib/models');
const { PLANS, planLimitRedisKey } = await import('@/lib/plans');
const { resetPayPalTokenCache } = await import('@/lib/paypal');
const checkoutRoute = await import('@/app/api/billing/checkout/route');
const changePlanRoute = await import('@/app/api/billing/change-plan/route');
const cancelRoute = await import('@/app/api/billing/cancel/route');
const webhookRoute = await import('@/app/api/webhooks/paypal/route');

function authed(url: string, userId: string, body: unknown) {
  const cookie = sessionCookieHeader(createSessionToken(userId)).split(';')[0];
  return new Request(url, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

async function deliver(eventType: string, userId: string, eventId: string, planId = process.env.PAYPAL_PLAN_ID_STARTER) {
  const body = JSON.stringify({
    id: eventId,
    event_type: eventType,
    resource: {
      id: 'I-PAYPAL-MOCK',
      plan_id: planId,
      custom_id: userId,
      status: 'ACTIVE',
      subscriber: { payer_id: 'PAYER-MOCK', email_address: 'billing@example.com' },
      billing_info: { next_billing_time: '2026-08-14T00:00:00Z' },
    },
  });
  return webhookRoute.POST(new Request('http://x/api/webhooks/paypal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/mock',
      'paypal-transmission-id': eventId,
      'paypal-transmission-sig': 'signature-mock',
      'paypal-transmission-time': new Date().toISOString(),
    },
    body,
  }));
}

let userId: string;
beforeAll(async () => startStack());
afterAll(async () => stopStack());
beforeEach(async () => {
  await resetData();
  resetPayPalCalls();
  resetPayPalTokenCache();
  userId = String((await signup('billing@example.com', 'correct horse battery')).user._id);
});

describe('PayPal billing', () => {
  it('creates a paid subscription approval and rejects checkout for free', async () => {
    const paid = await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'starter' }));
    expect(paid.status).toBe(200);
    expect(((await paid.json()) as { checkoutUrl: string }).checkoutUrl).toContain('sandbox.paypal.com');
    expect(callsTo('/v1/billing/subscriptions')).toHaveLength(1);

    const free = await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'trial' }));
    expect(free.status).toBe(400);
  });

  it('activates and revises entitlements from verified webhooks', async () => {
    await checkoutRoute.POST(authed('http://x/api/billing/checkout', userId, { plan: 'starter' }));
    await deliver('BILLING.SUBSCRIPTION.ACTIVATED', userId, 'WH-ACTIVE');
    expect((await User.findById(userId).lean())?.plan).toBe('starter');

    const revised = await changePlanRoute.POST(authed('http://x/api/billing/change-plan', userId, { plan: 'pro' }));
    expect(revised.status).toBe(200);
    expect(((await revised.json()) as { approvalUrl: string }).approvalUrl).toContain('ba_token=revise');
    await deliver('BILLING.SUBSCRIPTION.UPDATED', userId, 'WH-UPDATED', process.env.PAYPAL_PLAN_ID_PRO);
    expect((await User.findById(userId).lean())?.plan).toBe('pro');
  });

  it('cancels immediately and restores free Redis limits', async () => {
    await User.updateOne({ _id: userId }, { $set: { paypalSubscriptionId: 'I-PAYPAL-MOCK', plan: 'pro', subscriptionStatus: 'active' } });
    const res = await cancelRoute.POST(authed('http://x/api/billing/cancel', userId, {}));
    expect(res.status).toBe(200);
    const user = await User.findById(userId).lean();
    expect(user?.plan).toBe('trial');
    expect(user?.subscriptionStatus).toBe('cancelled');

    const key = await ApiKey.findOne({ userId }).lean();
    const limits = JSON.parse((await getRedisMock().get(planLimitRedisKey(String(key!._id))))!);
    expect(limits.rateLimitPerMinute).toBe(PLANS.trial.rateLimitPerMinute);
  });
});
