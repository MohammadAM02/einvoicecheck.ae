import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { KeyError, createKey, listKeys } from '@/lib/keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json({ ok: true, keys: await listKeys(user._id) });
}

/** Create a key. The raw value appears in this response ONCE and never again. */
export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

  let body: { name?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* name is optional */
  }

  try {
    const { raw, key } = await createKey(user._id, String(body.name ?? 'API key'), user.plan);
    return NextResponse.json({
      ok: true,
      key,
      apiKey: raw,
      notice: 'Copy this key now. It is shown exactly once and stored only as a SHA-256 hash.',
    });
  } catch (err) {
    const status = err instanceof KeyError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof KeyError ? err.message : 'Could not create the key.' },
      { status },
    );
  }
}
