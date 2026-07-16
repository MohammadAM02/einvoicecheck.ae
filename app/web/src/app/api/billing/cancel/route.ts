import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, cancelSubscription } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cancel at period end. Final state lands via the subscription.updated webhook. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  try {
    await cancelSubscription(user);
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not cancel.' },
      { status },
    );
  }
}
