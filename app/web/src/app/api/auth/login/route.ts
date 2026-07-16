import { NextResponse } from 'next/server';
import { AuthError, createSessionToken, login, sessionCookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const user = await login(String(body.email ?? ''), String(body.password ?? ''));
    const res = NextResponse.json({
      ok: true,
      user: { id: String(user._id), email: user.email, plan: user.plan },
    });
    res.headers.set('set-cookie', sessionCookieHeader(createSessionToken(String(user._id))));
    return res;
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 500;
    return NextResponse.json(
      { ok: false, error: err instanceof AuthError ? err.message : 'Could not sign in.' },
      { status },
    );
  }
}
