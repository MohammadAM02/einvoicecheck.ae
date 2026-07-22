import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db';
import { User, WebhookEvent, type UserDoc } from '@/lib/models';
import { publishPlanLimits } from '@/lib/ratelimit';
import {
  verifyLemonSignature,
  planForLemonVariant,
  LEMON_HANDLED_EVENTS,
  type LemonWebhookPayload,
  type LemonHandledEvent,
} from '@/lib/lemon';
import type { PlanId, SubscriptionStatus } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookResult = {
  status: number;
  handled: boolean;
  deduped: boolean;
  type?: string;
  reason?: string;
};

async function resolveUser(payload: LemonWebhookPayload): Promise<UserDoc | null> {
  const customUserId = payload.meta?.custom_data?.user_id;
  if (customUserId) {
    const user = await User.findById(customUserId).lean<UserDoc>();
    if (user) return user;
  }

  const email = payload.data?.attributes?.user_email?.toLowerCase();
  if (email) {
    return User.findOne({ email }).lean<UserDoc>();
  }

  return null;
}

async function applyState(
  userId: string,
  set: Record<string, unknown>,
  plan: PlanId | null,
): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: set });
  if (plan) await publishPlanLimits(userId as unknown as import('mongoose').Types.ObjectId, plan);
}

async function recordWebhook(webhookId: string, type: string): Promise<boolean> {
  try {
    await WebhookEvent.create({ webhookId, type });
    return true;
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) return false;
    throw err;
  }
}

/**
 * Lemon Squeezy webhook handler.
 * Verifies HMAC signature, resolves the user, and applies subscription state.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  if (!signature) {
    return NextResponse.json(
      { status: 400, handled: false, reason: 'missing x-signature header' },
      { status: 400 },
    );
  }

  // Verify signature
  try {
    const valid = verifyLemonSignature(rawBody, signature);
    if (!valid) {
      return NextResponse.json(
        { status: 401, handled: false, reason: 'invalid signature' },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { status: 500, handled: false, reason: 'webhook secret not configured' },
      { status: 500 },
    );
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json(
      { status: 400, handled: false, reason: 'invalid JSON' },
      { status: 400 },
    );
  }

  const eventName = payload.meta?.event_name;
  const eventId = payload.data?.id;

  if (!eventName || !eventId) {
    return NextResponse.json(
      { status: 400, handled: false, reason: 'missing event_name or id' },
      { status: 400 },
    );
  }

  await connectMongo();

  // Dedup
  const already = await WebhookEvent.findOne({
    webhookId: `lemon_${eventId}`,
  }).lean();
  if (already) {
    return NextResponse.json({
      status: 200,
      handled: false,
      deduped: true,
      type: eventName,
    });
  }

  if (!(LEMON_HANDLED_EVENTS as readonly string[]).includes(eventName)) {
    await recordWebhook(`lemon_${eventId}`, eventName);
    return NextResponse.json({
      status: 200,
      handled: false,
      deduped: false,
      type: eventName,
      reason: 'ignored event',
    });
  }

  const user = await resolveUser(payload);
  if (!user) {
    await recordWebhook(`lemon_${eventId}`, eventName);
    return NextResponse.json({
      status: 200,
      handled: false,
      deduped: false,
      type: eventName,
      reason: 'no matching user',
    });
  }

  const attrs = payload.data?.attributes ?? {};
  const variantPlan = planForLemonVariant(attrs.variant_id ?? '');
  const plan: PlanId = variantPlan ?? user.plan ?? 'trial';

  switch (eventName as LemonHandledEvent) {
    case 'subscription_created':
    case 'subscription_payment_success': {
      await applyState(String(user._id), {
        plan,
        subscriptionStatus: 'active' satisfies SubscriptionStatus,
        lemonSubscriptionId: payload.data.id,
        lemonCustomerId: attrs.customer_id,
        cancelAtPeriodEnd: false,
      }, plan);
      break;
    }
    case 'subscription_updated': {
      const cancelled = attrs.cancelled;
      await applyState(String(user._id), {
        plan: cancelled ? 'trial' : plan,
        subscriptionStatus: cancelled
          ? ('cancelled' satisfies SubscriptionStatus)
          : ('active' satisfies SubscriptionStatus),
        lemonSubscriptionId: payload.data.id,
        lemonCustomerId: attrs.customer_id,
        cancelAtPeriodEnd: Boolean(attrs.cancelled),
      }, cancelled ? 'trial' : plan);
      break;
    }
    case 'subscription_cancelled':
    case 'subscription_expired': {
      await applyState(String(user._id), {
        plan: 'trial',
        subscriptionStatus: 'cancelled' satisfies SubscriptionStatus,
        cancelAtPeriodEnd: false,
      }, 'trial');
      break;
    }
    case 'subscription_payment_failed': {
      await applyState(String(user._id), {
        lastPaymentStatus: 'failed',
        lemonSubscriptionId: payload.data.id,
        lemonCustomerId: attrs.customer_id,
      }, null);
      break;
    }
  }

  await recordWebhook(`lemon_${eventId}`, eventName);

  return NextResponse.json({
    status: 200,
    handled: true,
    deduped: false,
    type: eventName,
  });
}
