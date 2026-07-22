import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { createLemonCheckout, LemonNotConfiguredError } from '@/lib/lemon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Start a Lemon Squeezy hosted checkout. Returns the checkout_url to redirect to.
 * Plan must be 'starter' or 'pro' (trial is not a paid checkout).
 */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  let body: { plan?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* validated below */
  }

  if (body.plan !== 'starter' && body.plan !== 'pro') {
    return NextResponse.json(
      { ok: false, error: 'Unknown plan. Must be "starter" or "pro".' },
      { status: 400 },
    );
  }

  try {
    const checkoutUrl = await createLemonCheckout(
      body.plan,
      user.email,
      String(user._id),
    );
    return NextResponse.json({ ok: true, checkoutUrl });
  } catch (err) {
    if (err instanceof LemonNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    const message = err instanceof Error ? err.message : 'Could not start checkout.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
