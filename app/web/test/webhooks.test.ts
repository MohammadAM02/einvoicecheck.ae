import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installPayPalFetchMock, resetPayPalCalls, setPayPalVerificationStatus } from './helpers/paypalMock';
import { resetData, startStack, stopStack } from './helpers/stack';

installPayPalFetchMock();
const { signup } = await import('@/lib/auth');
const { User, WebhookEvent } = await import('@/lib/models');
const { resetPayPalTokenCache } = await import('@/lib/paypal');
const webhookRoute = await import('@/app/api/webhooks/paypal/route');

function request(body: Record<string, unknown>, headers = true) {
  return new Request('http://x/api/webhooks/paypal', {
    method: 'POST',
    headers: headers ? {
      'content-type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/mock',
      'paypal-transmission-id': String(body.id),
      'paypal-transmission-sig': 'signature-mock',
      'paypal-transmission-time': new Date().toISOString(),
    } : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function event(eventType: string, userId: string, id: string) {
  return {
    id,
    event_type: eventType,
    resource: {
      id: 'I-PAYPAL-MOCK',
      plan_id: process.env.PAYPAL_PLAN_ID_STARTER,
      custom_id: userId,
      status: 'ACTIVE',
      subscriber: { payer_id: 'PAYER-MOCK', email_address: 'hook@example.com' },
    },
  };
}

let userId: string;
beforeAll(async () => startStack());
afterAll(async () => stopStack());
beforeEach(async () => {
  await resetData();
  resetPayPalCalls();
  resetPayPalTokenCache();
  userId = String((await signup('hook@example.com', 'correct horse battery')).user._id);
});

describe('PayPal webhooks', () => {
  it('rejects missing or failed signature verification', async () => {
    expect((await webhookRoute.POST(request(event('BILLING.SUBSCRIPTION.ACTIVATED', userId, 'NOHEAD'), false))).status).toBe(401);
    setPayPalVerificationStatus('FAILURE');
    expect((await webhookRoute.POST(request(event('BILLING.SUBSCRIPTION.ACTIVATED', userId, 'BAD')))).status).toBe(401);
    expect((await User.findById(userId).lean())?.subscriptionStatus).toBe('none');
  });

  it('deduplicates replayed event IDs', async () => {
    const body = event('BILLING.SUBSCRIPTION.ACTIVATED', userId, 'REPLAY');
    expect(((await (await webhookRoute.POST(request(body))).json()) as { handled: boolean }).handled).toBe(true);
    const replay = await webhookRoute.POST(request(body));
    expect(((await replay.json()) as { deduped: boolean }).deduped).toBe(true);
    expect(await WebhookEvent.countDocuments({ webhookId: 'paypal_REPLAY' })).toBe(1);
  });

  it('drops suspended and cancelled subscriptions to free access', async () => {
    await webhookRoute.POST(request(event('BILLING.SUBSCRIPTION.ACTIVATED', userId, 'ACTIVE')));
    await webhookRoute.POST(request(event('BILLING.SUBSCRIPTION.SUSPENDED', userId, 'SUSPENDED')));
    expect((await User.findById(userId).lean())?.plan).toBe('trial');
    expect((await User.findById(userId).lean())?.subscriptionStatus).toBe('on_hold');
    await webhookRoute.POST(request(event('BILLING.SUBSCRIPTION.CANCELLED', userId, 'CANCELLED')));
    expect((await User.findById(userId).lean())?.subscriptionStatus).toBe('cancelled');
  });

  it('acknowledges unrelated events without changing access', async () => {
    const res = await webhookRoute.POST(request(event('CUSTOMER.DISPUTE.CREATED', userId, 'IGNORE')));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { handled: boolean }).handled).toBe(false);
  });
});
