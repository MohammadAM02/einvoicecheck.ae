import type { Types } from 'mongoose';
import { connectMongo } from './db';
import { User, WebhookEvent, type UserDoc } from './models';
import { publishPlanLimits } from './ratelimit';
import { PLANS, planForPaypalPlanId, type PlanId, type SubscriptionStatus } from './plans';
import {
  cancelPayPalSubscription,
  createPayPalSubscription,
  revisePayPalSubscription,
  verifyPayPalWebhook,
} from './paypal';

export class BillingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createCheckout(user: UserDoc, plan: PlanId): Promise<string> {
  if (plan === 'trial') throw new BillingError('The free tier does not require checkout.', 400);

  const subscription = await createPayPalSubscription({
    userId: String(user._id),
    email: user.email,
    plan,
  });

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        paypalSubscriptionId: subscription.subscriptionId,
        paypalPlanId: process.env[PLANS[plan].paypalPlanIdEnv as string] ?? null,
      },
    },
  );

  return subscription.approvalUrl;
}

export async function changePlan(
  user: UserDoc,
  plan: PlanId,
): Promise<{ plan: PlanId; approvalUrl: string | null }> {
  if (plan === 'trial') {
    throw new BillingError('Cancel the paid subscription to return to the free tier.', 400);
  }
  if (!user.paypalSubscriptionId) {
    throw new BillingError('No PayPal subscription exists. Start a checkout instead.', 409);
  }
  if (user.plan === plan && user.subscriptionStatus === 'active') {
    throw new BillingError(`You are already on the ${PLANS[plan].name} plan.`, 409);
  }

  const result = await revisePayPalSubscription(user.paypalSubscriptionId, plan);
  return { plan, approvalUrl: result.approvalUrl };
}

export async function cancelSubscription(user: UserDoc): Promise<void> {
  if (!user.paypalSubscriptionId) {
    throw new BillingError('No active PayPal subscription to cancel.', 409);
  }

  await cancelPayPalSubscription(user.paypalSubscriptionId);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        plan: 'trial',
        subscriptionStatus: 'cancelled' satisfies SubscriptionStatus,
        currentPeriodEnd: null,
      },
    },
  );
  await publishPlanLimits(user._id, 'trial');
}

export const PAYPAL_HANDLED_EVENTS = [
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
] as const;
export type PayPalHandledEvent = (typeof PAYPAL_HANDLED_EVENTS)[number];

type PayPalWebhookResource = {
  id?: string;
  plan_id?: string;
  custom_id?: string;
  status?: string;
  billing_agreement_id?: string;
  subscriber?: { payer_id?: string; email_address?: string };
  payer?: { payer_info?: { payer_id?: string; email?: string } };
  billing_info?: { next_billing_time?: string };
};

type PayPalWebhookPayload = {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource?: PayPalWebhookResource;
};

export type WebhookResult = {
  status: number;
  handled: boolean;
  deduped: boolean;
  type?: string;
  reason?: string;
};

function subscriptionIdFor(payload: PayPalWebhookPayload): string | null {
  const resource = payload.resource ?? {};
  if (payload.event_type?.startsWith('BILLING.SUBSCRIPTION.')) return resource.id ?? null;
  return resource.billing_agreement_id ?? null;
}

async function resolveUser(payload: PayPalWebhookPayload): Promise<UserDoc | null> {
  const resource = payload.resource ?? {};
  if (resource.custom_id) {
    const byCustomId = await User.findById(resource.custom_id).lean<UserDoc>();
    if (byCustomId) return byCustomId;
  }

  const subscriptionId = subscriptionIdFor(payload);
  if (subscriptionId) {
    const bySubscription = await User.findOne({ paypalSubscriptionId: subscriptionId }).lean<UserDoc>();
    if (bySubscription) return bySubscription;
  }

  const email =
    resource.subscriber?.email_address?.toLowerCase() ??
    resource.payer?.payer_info?.email?.toLowerCase();
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

async function recordWebhook(webhookId: string, type: string): Promise<void> {
  try {
    await WebhookEvent.create({ webhookId, type });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) return;
    throw err;
  }
}

function paypalIds(payload: PayPalWebhookPayload): Record<string, unknown> {
  const resource = payload.resource ?? {};
  const subscriptionId = subscriptionIdFor(payload);
  return {
    ...(subscriptionId ? { paypalSubscriptionId: subscriptionId } : {}),
    ...(resource.plan_id ? { paypalPlanId: resource.plan_id } : {}),
    ...(resource.subscriber?.payer_id
      ? { paypalPayerId: resource.subscriber.payer_id }
      : resource.payer?.payer_info?.payer_id
        ? { paypalPayerId: resource.payer.payer_info.payer_id }
        : {}),
  };
}

export async function handlePayPalWebhook(
  rawBody: string,
  headers: Record<string, string>,
): Promise<WebhookResult> {
  const verified = await verifyPayPalWebhook(rawBody, headers);
  if (!verified) {
    return { status: 401, handled: false, deduped: false, reason: 'invalid signature' };
  }

  let event: PayPalWebhookPayload;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookPayload;
  } catch {
    return { status: 400, handled: false, deduped: false, reason: 'invalid JSON' };
  }

  if (!event.id || !event.event_type) {
    return { status: 400, handled: false, deduped: false, reason: 'missing event id or event type' };
  }

  const webhookId = `paypal_${event.id}`;
  await connectMongo();

  const already = await WebhookEvent.findOne({ webhookId }).lean();
  if (already) {
    return { status: 200, handled: false, deduped: true, type: event.event_type };
  }

  if (!(PAYPAL_HANDLED_EVENTS as readonly string[]).includes(event.event_type)) {
    await recordWebhook(webhookId, event.event_type);
    return { status: 200, handled: false, deduped: false, type: event.event_type, reason: 'ignored event' };
  }

  const user = await resolveUser(event);
  if (!user) {
    await recordWebhook(webhookId, event.event_type);
    return { status: 200, handled: false, deduped: false, type: event.event_type, reason: 'no matching user' };
  }

  const resource = event.resource ?? {};
  const ids = paypalIds(event);
  const mappedPlan = planForPaypalPlanId(resource.plan_id);
  const periodEnd = resource.billing_info?.next_billing_time
    ? new Date(resource.billing_info.next_billing_time)
    : null;

  switch (event.event_type as PayPalHandledEvent) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const plan = mappedPlan ?? user.plan;
      await applyState(
        user._id,
        {
          ...ids,
          plan,
          subscriptionStatus: 'active' satisfies SubscriptionStatus,
          lastPaymentStatus: 'succeeded',
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
        plan,
      );
      break;
    }
    case 'BILLING.SUBSCRIPTION.UPDATED': {
      const status = resource.status?.toUpperCase();
      if (status === 'CANCELLED' || status === 'EXPIRED') {
        await applyState(
          user._id,
          { ...ids, plan: 'trial', subscriptionStatus: 'cancelled' satisfies SubscriptionStatus, currentPeriodEnd: null },
          'trial',
        );
      } else if (status === 'SUSPENDED') {
        await applyState(
          user._id,
          { ...ids, plan: 'trial', subscriptionStatus: 'on_hold' satisfies SubscriptionStatus },
          'trial',
        );
      } else {
        const plan = mappedPlan ?? user.plan;
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
      }
      break;
    }
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      await applyState(
        user._id,
        {
          ...ids,
          plan: 'trial',
          subscriptionStatus: 'on_hold' satisfies SubscriptionStatus,
          lastPaymentStatus: 'failed',
        },
        'trial',
      );
      break;
    }
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      await applyState(
        user._id,
        { ...ids, plan: 'trial', subscriptionStatus: 'cancelled' satisfies SubscriptionStatus, currentPeriodEnd: null },
        'trial',
      );
      break;
    }
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      await applyState(user._id, { ...ids, lastPaymentStatus: 'failed' }, null);
      break;
    }
    case 'PAYMENT.SALE.COMPLETED': {
      await applyState(user._id, { ...ids, lastPaymentStatus: 'succeeded' }, null);
      break;
    }
    case 'PAYMENT.SALE.REFUNDED':
    case 'PAYMENT.SALE.REVERSED': {
      await applyState(user._id, { ...ids, lastPaymentStatus: 'failed' }, null);
      break;
    }
  }

  await recordWebhook(webhookId, event.event_type);
  return { status: 200, handled: true, deduped: false, type: event.event_type };
}
