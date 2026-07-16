import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { usageSummary } from '@/lib/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json({ ok: true, usage: await usageSummary(user._id, user.plan) });
}
