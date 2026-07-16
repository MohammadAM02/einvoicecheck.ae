import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { BillingError, changePlan, type ProrationMode } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';
import { isPlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRORATION_MODES: ProrationMode[] = [
  'prorated_immediately',
  'full_immediately',
  'difference_immediately',
];

/** Upgrade / downgrade an existing subscription with an explicit proration mode. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let body: { plan?: unknown; proration?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* validated below */
  }
  if (!isPlanId(body.plan)) {
    return NextResponse.json({ ok: false, error: 'Unknown plan.' }, { status: 400 });
  }
  const proration = PRORATION_MODES.includes(body.proration as ProrationMode)
    ? (body.proration as ProrationMode)
    : 'prorated_immediately';

  try {
    const result = await changePlan(user, body.plan, proration);
    return NextResponse.json({ ok: true, plan: result.plan, proration });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const status = err instanceof BillingError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not change the plan.' },
      { status },
    );
  }
}
