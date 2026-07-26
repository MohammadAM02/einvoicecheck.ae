import crypto from 'node:crypto';
import type { PlanId } from './plans';
import { paypalPlanIdFor } from './plans';

export type PayPalEnvironment = 'sandbox' | 'live';

export function paypalEnvironment(): PayPalEnvironment {
  return process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
}

export function paypalBaseUrl(): string {
  return paypalEnvironment() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID &&
      process.env.PAYPAL_PLAN_ID_STARTER &&
      process.env.PAYPAL_PLAN_ID_PRO,
  );
}

export class PayPalNotConfiguredError extends Error {
  status = 503;

  constructor(detail?: string) {
    super(
      detail ??
        'PayPal billing is not configured. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID and both PAYPAL_PLAN_ID_* values in Railway.',
    );
  }
}

export class PayPalApiError extends Error {
  status: number;
  debugId?: string;

  constructor(message: string, status: number, debugId?: string) {
    super(message);
    this.status = status;
    this.debugId = debugId;
  }
}

type AccessToken = { value: string; expiresAt: number };
let cachedToken: AccessToken | null = null;

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new PayPalNotConfiguredError();
  return { clientId, clientSecret };
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const { clientId, clientSecret } = credentials();
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const text = await response.text();
  let body: { access_token?: string; expires_in?: number; error_description?: string } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    /* handled below */
  }

  if (!response.ok || !body.access_token) {
    throw new PayPalApiError(
      body.error_description ?? `PayPal OAuth failed (${response.status}).`,
      response.status,
    );
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(60, body.expires_in ?? 300) * 1000,
  };
  return cachedToken.value;
}

export function resetPayPalTokenCache(): void {
  cachedToken = null;
}

type PayPalRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  requestId?: string;
};

export async function paypalRequest<T>(
  path: string,
  options: PayPalRequestOptions = {},
): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.requestId ? { 'PayPal-Request-Id': options.requestId } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    cache: 'no-store',
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    const details = Array.isArray(body.details)
      ? body.details
          .map((item) => {
            if (!item || typeof item !== 'object') return '';
            const row = item as Record<string, unknown>;
            return String(row.description ?? row.issue ?? '');
          })
          .filter(Boolean)
          .join(' ')
      : '';
    throw new PayPalApiError(
      details || String(body.message ?? `PayPal request failed (${response.status}).`),
      response.status,
      typeof body.debug_id === 'string' ? body.debug_id : undefined,
    );
  }

  return body as T;
}

export function paypalReturnUrl(): string {
  return (
    process.env.PAYPAL_RETURN_URL ??
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://einvoicecheck.ae').replace(/\/$/, '')}/dashboard?checkout=success`
  );
}

export function paypalCancelUrl(): string {
  return (
    process.env.PAYPAL_CANCEL_URL ??
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://einvoicecheck.ae').replace(/\/$/, '')}/dashboard?checkout=cancelled`
  );
}

type PayPalLink = { href?: string; rel?: string; method?: string };
type PayPalSubscriptionResponse = {
  id?: string;
  status?: string;
  links?: PayPalLink[];
};

function approvalUrl(response: PayPalSubscriptionResponse): string | null {
  return response.links?.find((link) => link.rel === 'approve')?.href ?? null;
}

export async function createPayPalSubscription(input: {
  userId: string;
  email: string;
  plan: PlanId;
}): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const response = await paypalRequest<PayPalSubscriptionResponse>('/v1/billing/subscriptions', {
    method: 'POST',
    requestId: crypto.randomUUID(),
    body: {
      plan_id: paypalPlanIdFor(input.plan),
      custom_id: input.userId,
      subscriber: { email_address: input.email },
      application_context: {
        brand_name: 'einvoicecheck.ae',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: paypalReturnUrl(),
        cancel_url: paypalCancelUrl(),
      },
    },
  });

  const url = approvalUrl(response);
  if (!response.id || !url) {
    throw new PayPalApiError('PayPal did not return a subscription ID and approval URL.', 502);
  }
  return { subscriptionId: response.id, approvalUrl: url };
}

export async function revisePayPalSubscription(
  subscriptionId: string,
  plan: PlanId,
): Promise<{ approvalUrl: string | null }> {
  const response = await paypalRequest<PayPalSubscriptionResponse>(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/revise`,
    {
      method: 'POST',
      requestId: crypto.randomUUID(),
      body: { plan_id: paypalPlanIdFor(plan) },
    },
  );
  return { approvalUrl: approvalUrl(response) };
}

export async function cancelPayPalSubscription(subscriptionId: string): Promise<void> {
  await paypalRequest<void>(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    {
      method: 'POST',
      requestId: crypto.randomUUID(),
      body: { reason: 'Cancelled by customer from einvoicecheck.ae dashboard' },
    },
  );
}

export async function verifyPayPalWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new PayPalNotConfiguredError('PAYPAL_WEBHOOK_ID is not configured.');

  const transmissionId = headers['paypal-transmission-id'];
  const transmissionTime = headers['paypal-transmission-time'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];
  const transmissionSig = headers['paypal-transmission-sig'];
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  let webhookEvent: Record<string, unknown>;
  try {
    webhookEvent = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return false;
  }

  const result = await paypalRequest<{ verification_status?: string }>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      },
    },
  );

  return result.verification_status === 'SUCCESS';
}
