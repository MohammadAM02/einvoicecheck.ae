import type { Types } from 'mongoose';
import { connectMongo } from './db';
import { User, WebhookEvent, type UserDoc } from './models';
import { publishPlanLimits } from './ratelimit';
import { PLANS, planForProductId, productIdFor, type PlanId, type SubscriptionStatus } from './plans';
import { getDodoClient, returnUrl } from './dodo';

export class BillingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------- checkout */
/**
 * Hosted checkout. Product IDs come from env (never hardcoded). The user id
 * rides along in metadata so the webhook can resolve the account even before
 * we know the subscription id.
 */
export async function createCheckout(user: UserDoc, plan: PlanId): Promise<string> {
  const client = getDodoClient();
  const cfg = PLANS[plan];

  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: productIdFor(plan), quantity: 1 }],
    ...(cfg.trialPeriodDays
      ? { subscription_data: { trial_period_days: cfg.trialPeriodDays } }
      : {}),
    customer: user.dodoCustomerId
      ? { customer_id: user.dodoCustomerId }
      : { email: user.email, name: user.email },
    return_url: returnUrl(`plan=${plan}`),
    metadata: { user_id: String(user._id), plan },
  } as never);

  const url = (session as { checkout_url?: string })?.checkout_url;
  if (!url) throw new BillingError('Dodo Payments did not return a checkout_url.', 502);
  return url;
}

/* --------------------------------------------------------------- portal */
export async function createPortalLink(user: UserDoc): Promise<string> {
  if (!user.dodoCustomerId) {
    throw new BillingError('No billing customer yet — subscribe to a paid plan first.', 409);
  }
  const client = getDodoClient();
  const session = await client.customers.customerPortal.create(user.dodoCustomerId);
  const link = (session as { link?: string })?.link;
  if (!link) throw new BillingError('Dodo Payments did not return a customer portal link.', 502);
  return link;
}

/* ---------------------------------------------------------- plan change */
export type ProrationMode =
  | 'prorated_immediately'
  | 'full_immediately'
  | 'difference_immediately';

/**
 * Upgrade / downgrade an existing subscription. Proration mode is ALWAYS
 * explicit — `prorated_immediately` by default (customer pays the difference
 * for the remainder of the period).
 */
export async function changePlan(
  user: UserDoc,
  plan: PlanId,
  proration: ProrationMode = 'prorated_immediately',
): Promise<{ plan: PlanId }> {
  if (!user.dodoSubscriptionId) {
    throw new BillingError('No active subscription to change. Start a checkout instead.', 409);
  }
  if (plan === 'trial') {
    throw new BillingError('Cannot change plan into the free trial. Cancel instead.', 400);
  }
  const client = getDodoClient();
  await client.subscriptions.changePlan(user.dodoSubscriptionId, {
    product_id: productIdFor(plan),
    proration_billing_mode: proration,
    quantity: 1,
  });
  // Local state is confirmed by the subscription.updated webhook, but reflect
  // the intent immediately so the dashboard is not stale for the user.
  await User.updateOne({ _id: user._id }, { $set: { plan } });
  await publishPlanLimits(user._id, plan);
  return { plan };
}

/* --------------------------------------------------------------- cancel */
/** Cancel at the end of the current billing period (no refund clawback). */
export async function cancelSubscription(user: UserDoc): Promise<void> {
  if (!user.dodoSubscriptionId) {
    throw new BillingError('No active subscription to cancel.', 409);
  }
  const client = getDodoClient();
  await client.subscriptions.update(user.dodoSubscriptionId, {
    cancel_at_next_billing_date: true,
    cancel_reason: 'cancelled_by_customer',
  });
  await User.updateOne({ _id: user._id }, { $set: { cancelAtPeriodEnd: true } });
}

/* ------------------------------------------------------- dunning / hold */
/**
 * On-hold recovery: hand the customer a fresh payment-method flow. This is the
 * ONLY supported recovery path for `subscription.on_hold`.
 */
export async function startPaymentMethodUpdate(user: UserDoc): Promise<string | null> {
  if (!user.dodoSubscriptionId) {
    throw new BillingError('No subscription on hold.', 409);
  }
  const client = getDodoClient();
  const res = await client.subscriptions.updatePaymentMethod(user.dodoSubscriptionId, {
    type: 'new',
    return_url: returnUrl('recovery=1'),
  } as never);
  return (res as { payment_link?: string; link?: string })?.payment_link ??
    (res as { link?: string })?.link ??
    null;
}

/* ------------------------------------------------------- overage charge */
/**
 * Overage. Dodo has NO metering primitive — Mongo `UsageEvent` (written by
 * app/api) is the source of truth for consumption, and anything above the plan
 * quota is billed as an explicit on-demand charge against the subscription.
 */
export async function chargeOverage(
  user: UserDoc,
  amountCents: number,
  description: string,
): Promise<unknown> {
  if (!user.dodoSubscriptionId) throw new BillingError('No subscription to charge.', 409);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new BillingError('Overage amount must be a positive integer (minor units).', 400);
  }
  const client = getDodoClient();
  return client.subscriptions.charge(user.dodoSubscriptionId, {
    product_price: amountCents,
    product_description: description,
  } as never);
}

/* -------------------------------------------------------------- webhook */
export const HANDLED_EVENTS = [
  'subscription.active',
  'subscription.renewed',
  'subscription.updated',
  'subscription.on_hold',
  'subscription.failed',
  'payment.succeeded',
  'payment.failed',
] as const;
export type HandledEvent = (typeof HANDLED_EVENTS)[number];

type DodoWebhookPayload = {
  type: string;
  timestamp?: string;
  data?: {
    payload_type?: string;
    subscription_id?: string;
    status?: string;
    product_id?: string;
    next_billing_date?: string;
    cancel_at_next_billing_date?: boolean;
    customer?: { customer_id?: string; email?: string };
    metadata?: Record<string, string>;
  };
};

export type WebhookResult = {
  status: number;
  handled: boolean;
  deduped: boolean;
  type?: string;
  reason?: string;
};

/** Resolve the account this event belongs to. Metadata first, then ids. */
async function resolveUser(payload: DodoWebhookPayload): Promise<UserDoc | null> {
  const data = payload.data ?? {};
  const metaUserId = data.metadata?.user_id;
  if (metaUserId) {
    const byMeta = await User.findById(metaUserId).lean<UserDoc>();
    if (byMeta) return byMeta;
  }
  if (data.subscription_id) {
    const bySub = await User.findOne({ dodoSubscriptionId: data.subscription_id }).lean<UserDoc>();
    if (bySub) return bySub;
  }
  const customerId = data.customer?.customer_id;
  if (customerId) {
    const byCustomer = await User.findOne({ dodoCustomerId: customerId }).lean<UserDoc>();
    if (byCustomer) return byCustomer;
  }
  const email = data.customer?.email?.toLowerCase();
  if (email) return User.findOne({ email }).lean<UserDoc>();
  return null;
}

async function applyState(
  userId: Types.ObjectId,
  set: Record<string, unknown>,
  plan: PlanId | null,
): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: set });
  if (plan) await publishPlanLimits(userId, plan);
}

/**
 * Persist the processed-webhook marker. A concurrent duplicate delivery may have
 * inserted it first (unique index → 11000); because the state change is
 * declarative and idempotent, that is safe to treat as success.
 */
async function recordWebhook(webhookId: string, type: string): Promise<void> {
  try {
    await WebhookEvent.create({ webhookId, type });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) return;
    throw err;
  }
}

/**
 * Verify + dispatch one Dodo webhook.
 *
 * Verification is done by the SDK's `unwrap()` — Standard Webhooks, HMAC-SHA256
 * over `webhook-id . webhook-timestamp . raw_body`. The SDK's unverified (unsafe)
 * unwrap variant is never called. The RAW body string must be passed in
 * untouched or the HMAC breaks.
 *
 * Idempotency: `webhook-id` is the key. It is inserted into `webhook_events`
 * (unique index) BEFORE any state change, so a replay of the same delivery is
 * dropped and produces exactly zero additional state changes.
 */
export async function handleDodoWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<WebhookResult> {
  const webhookId = headers['webhook-id'];
  if (!webhookId) {
    return { status: 400, handled: false, deduped: false, reason: 'missing webhook-id header' };
  }

  const client = getDodoClient();
  let event: DodoWebhookPayload;
  try {
    event = (await client.webhooks.unwrap(rawBody, {
      headers,
      key: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    })) as unknown as DodoWebhookPayload;
  } catch {
    return { status: 401, handled: false, deduped: false, reason: 'invalid signature' };
  }

  await connectMongo();

  // Idempotency fast-path. The processed-marker is written AFTER the state
  // change (end of this function), NEVER before — so if applyState throws
  // transiently we leave no marker, the route surfaces the error, and Dodo's
  // retry re-applies rather than being silently deduped into a lost update.
  // Safe to re-run because every applyState case is a declarative $set.
  const already = await WebhookEvent.findOne({ webhookId }).lean();
  if (already) {
    return { status: 200, handled: false, deduped: true, type: event.type };
  }

  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) {
    await recordWebhook(webhookId, event.type);
    return { status: 200, handled: false, deduped: false, type: event.type, reason: 'ignored event' };
  }

  const user = await resolveUser(event);
  if (!user) {
    await recordWebhook(webhookId, event.type);
    return { status: 200, handled: false, deduped: false, type: event.type, reason: 'no matching user' };
  }

  const data = event.data ?? {};
  const productPlan = planForProductId(data.product_id);
  const periodEnd = data.next_billing_date ? new Date(data.next_billing_date) : null;
  const ids: Record<string, unknown> = {};
  if (data.subscription_id) ids.dodoSubscriptionId = data.subscription_id;
  if (data.customer?.customer_id) ids.dodoCustomerId = data.customer.customer_id;

  switch (event.type as HandledEvent) {
    case 'subscription.active': {
      const plan = productPlan ?? user.plan;
      await applyState(
        user._id,
        {
          ...ids,
          plan,
          subscriptionStatus: 'active' satisfies SubscriptionStatus,
          cancelAtPeriodEnd: false,
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
        plan,
      );
      break;
    }
    case 'subscription.renewed': {
      const plan = productPlan ?? user.plan;
      await applyState(
        user._id,
        {
          ...ids,
          plan,
          subscriptionStatus: 'active' satisfies SubscriptionStatus,
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
        plan,
      );
      break;
    }
    case 'subscription.updated': {
      // A cancellation lands here as status=cancelled: strip entitlements back
      // to the trial tier so the API starts 429-ing above trial limits.
      const cancelled = data.status === 'cancelled' || data.status === 'expired';
      const plan: PlanId = cancelled ? 'trial' : (productPlan ?? user.plan);
      await applyState(
        user._id,
        {
          ...ids,
          plan,
          subscriptionStatus: cancelled
            ? ('cancelled' satisfies SubscriptionStatus)
            : ('active' satisfies SubscriptionStatus),
          cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
        plan,
      );
      break;
    }
    case 'subscription.on_hold': {
      // Recoverable. Entitlements drop to trial while dunning runs.
      await applyState(
        user._id,
        { ...ids, plan: 'trial', subscriptionStatus: 'on_hold' satisfies SubscriptionStatus },
        'trial',
      );
      break;
    }
    case 'subscription.failed': {
      // Terminal — the initial mandate never took.
      await applyState(
        user._id,
        { ...ids, plan: 'trial', subscriptionStatus: 'failed' satisfies SubscriptionStatus },
        'trial',
      );
      break;
    }
    case 'payment.succeeded': {
      await applyState(user._id, { ...ids, lastPaymentStatus: 'succeeded' }, null);
      break;
    }
    case 'payment.failed': {
      await applyState(user._id, { ...ids, lastPaymentStatus: 'failed' }, null);
      break;
    }
  }

  // Mark processed ONLY after the state change succeeded. If applyState threw,
  // execution never reaches here, no marker is written, and Dodo's retry
  // re-applies — no lost update. A concurrent duplicate that raced past the
  // findOne check hits the unique index and is absorbed by recordWebhook.
  await recordWebhook(webhookId, event.type);
  return { status: 200, handled: true, deduped: false, type: event.type };
}
