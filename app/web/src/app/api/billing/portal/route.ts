import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, createPortalLink } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Dodo customer portal — invoices, payment methods, cancellation. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  try {
    return NextResponse.json({ ok: true, portalUrl: await createPortalLink(user) });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not open the portal.' },
      { status },
    );
  }
}
