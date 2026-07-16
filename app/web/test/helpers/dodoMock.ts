import crypto from 'node:crypto';

/**
 * Mocked `dodopayments` SDK.
 *
 * There are NO Dodo credentials in this environment, so nothing here talks to
 * Dodo. The mock records every call so tests can assert the exact API surface
 * we depend on (checkoutSessions.create, customers.customerPortal.create,
 * subscriptions.changePlan / update / updatePaymentMethod / charge).
 *
 * `webhooks.unwrap()` is a FAITHFUL reimplementation of the Standard Webhooks
 * verifier the real SDK uses: HMAC-SHA256 over `id.timestamp.rawBody` keyed on
 * the base64-decoded secret, compared against the `v1,<b64>` signature. That
 * lets us prove OUR raw-body handling and rejection path, but it does NOT prove
 * the real SDK's verifier — only a live test-mode delivery can.
 */
export type DodoCall = { method: string; args: unknown[] };
export const dodoCalls: DodoCall[] = [];

export function resetDodoCalls(): void {
  dodoCalls.length = 0;
}

function record(method: string, ...args: unknown[]): void {
  dodoCalls.push({ method, args });
}

export function callsTo(method: string): DodoCall[] {
  return dodoCalls.filter((c) => c.method === method);
}

/** Build the signature headers exactly as Dodo would for a given raw body. */
export function signWebhook(
  rawBody: string,
  webhookId: string,
  secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY as string,
  timestamp = Math.floor(Date.now() / 1000).toString(),
): Record<string, string> {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signed = `${webhookId}.${timestamp}.${rawBody}`;
  const sig = crypto.createHmac('sha256', key).update(signed).digest('base64');
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${sig}`,
  };
}

export class MockDodoPayments {
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
    record('constructor', options);
  }

  checkoutSessions = {
    create: async (body: unknown) => {
      record('checkoutSessions.create', body);
      return { session_id: 'cks_mock', checkout_url: 'https://test.dodopayments.com/checkout/mock' };
    },
  };

  customers = {
    customerPortal: {
      create: async (customerId: string) => {
        record('customers.customerPortal.create', customerId);
        return { link: 'https://test.dodopayments.com/portal/mock' };
      },
    },
  };

  subscriptions = {
    changePlan: async (id: string, body: unknown) => {
      record('subscriptions.changePlan', id, body);
      return undefined;
    },
    update: async (id: string, body: unknown) => {
      record('subscriptions.update', id, body);
      return { subscription_id: id };
    },
    updatePaymentMethod: async (id: string, body: unknown) => {
      record('subscriptions.updatePaymentMethod', id, body);
      return { payment_link: 'https://test.dodopayments.com/pay/mock' };
    },
    charge: async (id: string, body: unknown) => {
      record('subscriptions.charge', id, body);
      return { payment_id: 'pay_mock' };
    },
  };

  webhooks = {
    unwrap: (rawBody: string, opts: { headers: Record<string, string>; key?: string }) => {
      record('webhooks.unwrap', rawBody, opts.headers);
      const id = opts.headers['webhook-id'];
      const timestamp = opts.headers['webhook-timestamp'];
      const header = opts.headers['webhook-signature'];
      const secret = opts.key ?? process.env.DODO_PAYMENTS_WEBHOOK_KEY;
      if (!id || !timestamp || !header || !secret) throw new Error('missing webhook headers');

      const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
      const expected = crypto
        .createHmac('sha256', key)
        .update(`${id}.${timestamp}.${rawBody}`)
        .digest('base64');

      const ok = header
        .split(' ')
        .map((part) => part.split(',')[1])
        .some((candidate) => {
          if (!candidate) return false;
          const a = Buffer.from(candidate);
          const b = Buffer.from(expected);
          return a.length === b.length && crypto.timingSafeEqual(a, b);
        });
      if (!ok) throw new Error('Webhook signature verification failed');

      return JSON.parse(rawBody);
    },
    // The SDK's unverified ("unsafe") unwrap variant is deliberately NOT
    // implemented here: if any production path ever reached for it, these tests
    // would fail loudly rather than silently skipping signature verification.
  };
}
