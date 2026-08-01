import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, userFromToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const user = await userFromToken(token);

  const res = NextResponse.json({ signedIn: Boolean(user) });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
