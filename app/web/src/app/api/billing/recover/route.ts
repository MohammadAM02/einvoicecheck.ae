import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, startPaymentMethodUpdate } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dunning / on-hold recovery. Hands the customer a fresh payment-method flow
 * (`updatePaymentMethod(id, { type: 'new', return_url })`).
 */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  try {
    return NextResponse.json({ ok: true, paymentLink: await startPaymentMethodUpdate(user) });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not start recovery.' },
      { status },
    );
  }
}
