import { NextResponse } from 'next/server';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Waitlist capture - STUB.
 *
 * TODO(E2): replace this file-backed append with the real signup path:
 *   1. persist the lead in the datastore shared with app/api (Mongo),
 *   2. create the account + issue an API key on confirmation (real auth),
 *   3. hand the lead to Dodo Payments checkout when billing goes live.
 *
 * Until then this is a plain file append. On Railway the container filesystem is
 * ephemeral, so E2 MUST swap the store before this is relied on for real leads.
 * No credentials are read or required by this route.
 */
const STORE_PATH = process.env.WAITLIST_STORE_PATH ?? path.join(process.cwd(), 'data', 'waitlist.jsonl');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = {
  email?: unknown;
  company?: unknown;
  volume?: unknown;
  stack?: unknown;
  source?: unknown;
};

function asString(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = asString(payload.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const record = {
    email,
    company: asString(payload.company),
    volume: asString(payload.volume, 32),
    stack: asString(payload.stack),
    source: asString(payload.source, 64) || 'unknown',
    createdAt: new Date().toISOString(),
  };

  try {
    await mkdir(path.dirname(STORE_PATH), { recursive: true });
    await appendFile(STORE_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not save your signup. Try again shortly.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
