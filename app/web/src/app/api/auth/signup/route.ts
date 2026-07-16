import { NextResponse } from 'next/server';
import { AuthError, createSessionToken, sessionCookieHeader, signup } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sign up. Creates the account AND auto-provisions its first API key.
 * The raw key is in this response and never retrievable again.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const { user, rawKey } = await signup(String(body.email ?? ''), String(body.password ?? ''));
    const res = NextResponse.json({
      ok: true,
      user: { id: String(user._id), email: user.email, plan: user.plan },
      apiKey: rawKey,
      notice: 'Copy this key now. It is shown exactly once and stored only as a SHA-256 hash.',
    });
    res.headers.set('set-cookie', sessionCookieHeader(createSessionToken(String(user._id))));
    return res;
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof AuthError ? err.message : 'Could not create the account.' },
      { status },
    );
  }
}
