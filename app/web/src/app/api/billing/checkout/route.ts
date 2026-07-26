import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, createCheckout } from '@/lib/billing';
import { PayPalApiError, PayPalNotConfiguredError } from '@/lib/paypal';
import { isPlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Start a PayPal subscription approval flow. */
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
    return NextResponse.json({ ok: true, checkoutUrl: await createCheckout(user, body.plan) });
  } catch (err) {
    if (err instanceof PayPalNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError || err instanceof PayPalApiError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not start checkout.' },
      { status },
    );
  }
}
