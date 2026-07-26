import { NextResponse } from 'next/server';
import { handlePayPalWebhook } from '@/lib/billing';
import { PayPalApiError, PayPalNotConfiguredError } from '@/lib/paypal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PayPal webhook endpoint: https://einvoicecheck.ae/api/webhooks/paypal */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  try {
    const result = await handlePayPalWebhook(rawBody, headers);
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
    if (err instanceof PayPalNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    if (err instanceof PayPalApiError && err.status >= 400 && err.status < 500) {
      return NextResponse.json({ ok: false, error: 'Webhook verification failed.' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
