import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, createCheckout } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';
import { isPlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Backward-compatible checkout endpoint.
 *
 * The original route name referenced Lemon Squeezy, but Dodo Payments is the
 * single active merchant-of-record integration. Keep this alias temporarily so
 * old clients do not break; new code must call /api/billing/checkout.
 */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let body: { plan?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* validated below */
  }

  if (!isPlanId(body.plan) || body.plan === 'trial') {
    return NextResponse.json(
      { ok: false, error: 'Unknown paid plan. Must be "starter" or "pro".' },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ ok: true, checkoutUrl: await createCheckout(user, body.plan) });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not start checkout.' },
      { status },
    );
  }
}
