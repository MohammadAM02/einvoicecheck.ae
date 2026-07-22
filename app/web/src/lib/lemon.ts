/**
 * Lemon Squeezy payment integration (REST API).
 * Runs alongside the existing Dodo Payments integration.
 * Both are Merchant of Record — the user chooses at checkout.
 *
 * API reference: https://docs.lemonsqueezy.com/api
 */
export type LemonEnvironment = 'test' | 'live';

export function lemonEnvironment(): LemonEnvironment {
  return process.env.LEMON_SQUEEZY_ENVIRONMENT === 'live' ? 'live' : 'test';
}

export function isLemonConfigured(): boolean {
  return Boolean(process.env.LEMON_SQUEEZY_API_KEY);
}

export class LemonNotConfiguredError extends Error {
  status = 503;
  constructor() {
    super(
      'Lemon Squeezy billing is not configured yet: LEMON_SQUEEZY_API_KEY is unset.',
    );
  }
}

const BASE_URL = 'https://api.lemonsqueezy.com/v1';

function lemonHeaders(): Record<string, string> {
  if (!isLemonConfigured()) throw new LemonNotConfiguredError();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
  };
}

/** Store slug from env — the product "store" in Lemon Squeezy. */
export function lemonStoreId(): string {
  const id = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!id) throw new Error('LEMON_SQUEEZY_STORE_ID is not set.');
  return id;
}

/** Variant IDs for each plan (from env). */
export function lemonVariantId(plan: 'starter' | 'pro'): string {
  const key = plan === 'starter' ? 'LEMON_VARIANT_ID_STARTER' : 'LEMON_VARIANT_ID_PRO';
  const id = process.env[key];
  if (!id) throw new Error(`${key} is not set. Create the "${plan}" variant in Lemon Squeezy.`);
  return id;
}

/* ------------------------------------------------------------------ */
/*  Checkout                                                            */
/* ------------------------------------------------------------------ */

export async function createLemonCheckout(
  plan: 'starter' | 'pro',
  email: string,
  userId: string,
): Promise<string> {
  const variantId = lemonVariantId(plan);
  const res = await fetch(`${BASE_URL}/checkouts`, {
    method: 'POST',
    headers: lemonHeaders(),
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: { user_id: userId, plan },
          },
          product_options: {
            redirect_url: process.env.NEXT_PUBLIC_SITE_URL
              ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=lemon_success`
              : 'https://einvoicecheck.ae/dashboard?checkout=lemon_success',
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: lemonStoreId() } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Lemon Squeezy checkout failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error('Lemon Squeezy did not return a checkout URL.');
  return url;
}

/* ------------------------------------------------------------------ */
/*  Webhooks                                                           */
/* ------------------------------------------------------------------ */

export const LEMON_HANDLED_EVENTS = [
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_expired',
  'subscription_payment_success',
  'subscription_payment_failed',
] as const;
export type LemonHandledEvent = (typeof LEMON_HANDLED_EVENTS)[number];

export type LemonWebhookPayload = {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string; plan?: string };
  };
  data: {
    id: string;
    type: string;
    attributes?: {
      status?: string;
      variant_id?: number;
      customer_id?: number;
      renews_at?: string;
      ends_at?: string;
      cancelled?: boolean;
      user_email?: string;
    };
  };
};

/**
 * Verify the Lemon Squeezy webhook signature (HMAC-SHA256).
 * The signing secret is set via LEMON_SQUEEZY_WEBHOOK_SECRET env var.
 */
export function verifyLemonSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error('LEMON_SQUEEZY_WEBHOOK_SECRET is not set.');

  // Lemon Squeezy uses HMAC-SHA256
  const crypto = require('crypto') as typeof import('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

/** Map Lemon Squeezy variant_id back to our plan id. */
export function planForLemonVariant(variantId: number | string): 'starter' | 'pro' | null {
  const id = String(variantId);
  if (id === process.env.LEMON_VARIANT_ID_STARTER) return 'starter';
  if (id === process.env.LEMON_VARIANT_ID_PRO) return 'pro';
  return null;
}
