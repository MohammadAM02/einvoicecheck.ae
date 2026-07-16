import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { KeyError, revokeKey } from '@/lib/keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Revoke a key: deactivates it and removes its published rate limit. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await revokeKey(user._id, id);
    return NextResponse.json({ ok: true, revoked: id });
  } catch (err) {
    const status = err instanceof KeyError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof KeyError ? err.message : 'Could not revoke the key.' },
      { status },
    );
  }
}
