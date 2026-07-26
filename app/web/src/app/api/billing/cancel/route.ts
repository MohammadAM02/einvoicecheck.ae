import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, cancelSubscription } from '@/lib/billing';
import { PayPalApiError, PayPalNotConfiguredError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cancel the PayPal subscription immediately and return to free limits. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  try {
    await cancelSubscription(user);
    return NextResponse.json({ ok: true, cancelled: true });
  } catch (err) {
    if (err instanceof PayPalNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError || err instanceof PayPalApiError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not cancel.' },
      { status },
    );
  }
}
