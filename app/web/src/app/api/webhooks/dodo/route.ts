import { NextResponse } from 'next/server';
import { handleDodoWebhook } from '@/lib/billing';
import { BillingNotConfiguredError } from '@/lib/dodo';

/**
 * Dodo Payments webhook endpoint — https://einvoicecheck.ae/api/webhooks/dodo
 *
 * Standard Webhooks: HMAC-SHA256 over `webhook-id . webhook-timestamp . raw_body`.
 * The body MUST be read raw (request.text()) — any parsing/re-serialisation
 * changes the bytes and the HMAC no longer matches. `runtime = 'nodejs'` and
 * `dynamic = 'force-dynamic'` keep Next from caching or transforming it.
 *
 * Verification uses the SDK's unwrap(). The SDK's unverified (unsafe) unwrap
 * variant is never called anywhere in this codebase.
 * Idempotency key is `webhook-id`; replays are dropped with a 200.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  try {
    const result = await handleDodoWebhook(rawBody, headers);
    return NextResponse.json(
      {
        ok: result.status < 400,
        handled: result.handled,
        deduped: result.deduped,
        ...(result.type ? { type: result.type } : {}),
        ...(result.reason ? { reason: result.reason } : {}),
      },
      { status: result.status },
    );
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    // Return 500 so Dodo retries — the idempotency ledger makes that safe.
    return NextResponse.json({ ok: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
