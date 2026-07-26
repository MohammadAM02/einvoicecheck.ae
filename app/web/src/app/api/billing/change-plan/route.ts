import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, changePlan } from '@/lib/billing';
import { PayPalApiError, PayPalNotConfiguredError } from '@/lib/paypal';
import { isPlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revise a PayPal subscription; buyer re-consent may be required. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let body: { plan?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { /* validated below */ }

  if (!isPlanId(body.plan) || body.plan === 'trial') {
    return NextResponse.json(
      { ok: false, error: 'Unknown paid plan. Must be "starter" or "pro".' },
      { status: 400 },
    );
  }

  try {
    const result = await changePlan(user, body.plan);
    return NextResponse.json({ ok: true, plan: result.plan, approvalUrl: result.approvalUrl });
  } catch (err) {
    if (err instanceof PayPalNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError || err instanceof PayPalApiError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not change the plan.' },
      { status },
    );
  }
}
