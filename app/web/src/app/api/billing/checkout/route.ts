import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, createCheckout } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';
import { isPlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Start a Dodo Payments hosted checkout. Returns the checkout_url to redirect to. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let body: { plan?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* validated below */
  }
  if (!isPlanId(body.plan)) {
    return NextResponse.json({ ok: false, error: 'Unknown plan.' }, { status: 400 });
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
