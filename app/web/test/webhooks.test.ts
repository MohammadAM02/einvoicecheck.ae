import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockDodoPayments, signWebhook } from './helpers/dodoMock';
import { resetData, startStack, stopStack, getRedisMock } from './helpers/stack';

vi.mock('dodopayments', () => ({ default: MockDodoPayments }));

const { signup } = await import('@/lib/auth');
const { User, WebhookEvent } = await import('@/lib/models');
const { PLANS, planLimitRedisKey } = await import('@/lib/plans');
const { ApiKey } = await import('@/lib/models');
const webhookRoute = await import('@/app/api/webhooks/dodo/route');

type EventBody = Record<string, unknown>;

function subscriptionEvent(type: string, userId: string, over: Record<string, unknown> = {}): EventBody {
  return {
    business_id: 'biz_mock',
    type,
    timestamp: new Date().toISOString(),
    data: {
      payload_type: 'Subscription',
      subscription_id: 'sub_mock_1',
      status: 'active',
      product_id: process.env.DODO_PRODUCT_ID_STARTER,
      next_billing_date: '2026-08-14T00:00:00Z',
      customer: { customer_id: 'cus_mock_1', email: 'hook@example.com' },
      metadata: { user_id: userId },
      ...over,
    },
  };
}

function paymentEvent(type: string, userId: string): EventBody {
  return {
    business_id: 'biz_mock',
    type,
    timestamp: new Date().toISOString(),
    data: {
      payload_type: 'Payment',
      payment_id: 'pay_mock_1',
      subscription_id: 'sub_mock_1',
      customer: { customer_id: 'cus_mock_1', email: 'hook@example.com' },
      metadata: { user_id: userId },
    },
  };
}

/** POST a webhook the way Dodo would: raw JSON body + signature headers. */
async function deliver(body: EventBody, webhookId: string, opts: { corrupt?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const headers = signWebhook(raw, webhookId);
  if (opts.corrupt) headers['webhook-signature'] = 'v1,YmFkc2lnbmF0dXJlYmFkc2lnbmF0dXJlYmFkc2k=';
  const res = await webhookRoute.POST(
    new Request('http://x/api/webhooks/dodo', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: raw,
    }),
  );
  return { res, json: (await res.json()) as Record<string, unknown> };
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
  const { user } = await signup('hook@example.com', 'correct horse battery');
  userId = String(user._id);
});

describe('webhook signature verification (Standard Webhooks, via SDK unwrap)', () => {
  it('accepts a correctly signed payload', async () => {
    const { res, json } = await deliver(subscriptionEvent('subscription.active', userId), 'evt_ok_1');
    expect(res.status).toBe(200);
    expect(json.handled).toBe(true);
    expect(json.type).toBe('subscription.active');
  });

  it('REJECTS a bad signature with 401 and changes no state', async () => {
    const { res, json } = await deliver(
      subscriptionEvent('subscription.active', userId),
      'evt_bad_1',
      { corrupt: true },
    );
    expect(res.status).toBe(401);
    expect(json.reason).toBe('invalid signature');
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('none'); // untouched
    expect(await WebhookEvent.countDocuments({})).toBe(0); // not even recorded
  });

  it('rejects a payload whose body was tampered with after signing', async () => {
    const body = subscriptionEvent('subscription.active', userId);
    const raw = JSON.stringify(body);
    const headers = signWebhook(raw, 'evt_tamper_1');
    const res = await webhookRoute.POST(
      new Request('http://x/api/webhooks/dodo', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: raw.replace('sub_mock_1', 'sub_attacker'), // same headers, different bytes
      }),
    );
    expect(res.status).toBe(401);
  });

  it('rejects a delivery with no webhook-id header', async () => {
    const res = await webhookRoute.POST(
      new Request('http://x/api/webhooks/dodo', { method: 'POST', body: '{}' }),
    );
    expect(res.status).toBe(400);
  });
});

describe('webhook idempotency (webhook-id is the key)', () => {
  it('applies the same delivery exactly once when replayed', async () => {
    const event = subscriptionEvent('subscription.active', userId);

    const first = await deliver(event, 'evt_replay_1');
    expect(first.res.status).toBe(200);
    expect(first.json.handled).toBe(true);
    expect(first.json.deduped).toBe(false);

    const second = await deliver(event, 'evt_replay_1'); // same webhook-id
    expect(second.res.status).toBe(200);
    expect(second.json.handled).toBe(false);
    expect(second.json.deduped).toBe(true);

    expect(await WebhookEvent.countDocuments({ webhookId: 'evt_replay_1' })).toBe(1);

    // Prove exactly ONE state change: a replayed cancel-after-active must not
    // resurrect an older state. Sequence: active -> replay(active) -> user is
    // still exactly the post-active state.
    const user = await User.findById(userId).lean();
    expect(user?.plan).toBe('starter');
    expect(user?.subscriptionStatus).toBe('active');
    expect(user?.dodoSubscriptionId).toBe('sub_mock_1');
  });

  it('a replay after a later event does not roll state backwards', async () => {
    await deliver(subscriptionEvent('subscription.active', userId), 'evt_seq_1');
    await deliver(
      subscriptionEvent('subscription.updated', userId, { status: 'cancelled' }),
      'evt_seq_2',
    );
    // Dodo retries the first (already-processed) delivery.
    const replay = await deliver(subscriptionEvent('subscription.active', userId), 'evt_seq_1');
    expect(replay.json.deduped).toBe(true);

    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('cancelled'); // NOT flipped back to active
    expect(user?.plan).toBe('trial');
  });
});

describe('the 7 handled events', () => {
  it('subscription.active → active + plan entitlements + Redis limits', async () => {
    const { json } = await deliver(subscriptionEvent('subscription.active', userId), 'e1');
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('active');
    expect(user?.plan).toBe('starter');
    expect(user?.dodoCustomerId).toBe('cus_mock_1');
    expect(user?.currentPeriodEnd).toBeTruthy();

    const key = await ApiKey.findOne({ userId }).lean();
    const published = JSON.parse((await getRedisMock().get(planLimitRedisKey(String(key!._id))))!);
    expect(published.rateLimitPerMinute).toBe(PLANS.starter.rateLimitPerMinute);
  });

  it('subscription.renewed → stays active, period extended', async () => {
    await deliver(subscriptionEvent('subscription.active', userId), 'e2a');
    const { json } = await deliver(
      subscriptionEvent('subscription.renewed', userId, { next_billing_date: '2026-09-14T00:00:00Z' }),
      'e2b',
    );
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('active');
    expect(new Date(user!.currentPeriodEnd!).toISOString()).toBe('2026-09-14T00:00:00.000Z');
  });

  it('subscription.updated (upgrade to pro) → plan + limits follow the product id', async () => {
    await deliver(subscriptionEvent('subscription.active', userId), 'e3a');
    const { json } = await deliver(
      subscriptionEvent('subscription.updated', userId, {
        product_id: process.env.DODO_PRODUCT_ID_PRO,
      }),
      'e3b',
    );
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.plan).toBe('pro');

    const key = await ApiKey.findOne({ userId }).lean();
    const published = JSON.parse((await getRedisMock().get(planLimitRedisKey(String(key!._id))))!);
    expect(published.rateLimitPerMinute).toBe(PLANS.pro.rateLimitPerMinute);
  });

  it('subscription.on_hold → recoverable, entitlements drop to trial', async () => {
    await deliver(subscriptionEvent('subscription.active', userId), 'e4a');
    const { json } = await deliver(
      subscriptionEvent('subscription.on_hold', userId, { status: 'on_hold' }),
      'e4b',
    );
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('on_hold');
    expect(user?.plan).toBe('trial');

    const key = await ApiKey.findOne({ userId }).lean();
    const published = JSON.parse((await getRedisMock().get(planLimitRedisKey(String(key!._id))))!);
    expect(published.rateLimitPerMinute).toBe(PLANS.trial.rateLimitPerMinute);
  });

  it('subscription.failed → terminal, entitlements drop to trial', async () => {
    const { json } = await deliver(
      subscriptionEvent('subscription.failed', userId, { status: 'failed' }),
      'e5',
    );
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('failed');
    expect(user?.plan).toBe('trial');
  });

  it('payment.succeeded → recorded', async () => {
    const { json } = await deliver(paymentEvent('payment.succeeded', userId), 'e6');
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.lastPaymentStatus).toBe('succeeded');
  });

  it('payment.failed → recorded', async () => {
    const { json } = await deliver(paymentEvent('payment.failed', userId), 'e7');
    expect(json.handled).toBe(true);
    const user = await User.findById(userId).lean();
    expect(user?.lastPaymentStatus).toBe('failed');
  });

  it('an unhandled event type is acknowledged but changes nothing', async () => {
    const { res, json } = await deliver(subscriptionEvent('dispute.opened', userId), 'e8');
    expect(res.status).toBe(200);
    expect(json.handled).toBe(false);
    const user = await User.findById(userId).lean();
    expect(user?.subscriptionStatus).toBe('none');
  });
});
