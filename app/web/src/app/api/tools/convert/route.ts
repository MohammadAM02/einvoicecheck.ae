import { NextResponse } from 'next/server';
import { checkToolRateLimit, clientIp } from '@/lib/toolRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Free-tool converter endpoint — ZERO LOGIN. No API key, no email, no cookie.
 *
 * Proxies to the paid POST /v1/convert endpoint so the browser tool runs
 * the SAME converter pipeline as the API. Format-only repair with audit
 * trail and refusal guardrails. Preflight only — not FTA-accredited.
 *
 * Abuse control is an IP rate limit in the shared Redis.
 * Nothing about the submitted XML is persisted here.
 */
const TOOL = 'uae-e-invoice-converter';
const API_CONVERT_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.einvoicecheck.ae'}/v1/convert`;
const MAX_BYTES = 256 * 1024;

export async function POST(request: Request) {
  let xml: string;
  let mode: string | undefined;

  try {
    const body = (await request.json()) as { xml?: unknown; mode?: unknown };
    xml = typeof body.xml === 'string' ? body.xml.trim() : '';
    mode = typeof body.mode === 'string' && (body.mode === 'format' || body.mode === 'full')
      ? body.mode : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!xml) {
    return NextResponse.json(
      { ok: false, error: 'Paste a UBL 2.1 / PINT AE XML invoice first.' },
      { status: 400 },
    );
  }

  if (Buffer.byteLength(xml, 'utf8') > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Document is larger than ${Math.round(MAX_BYTES / 1024)} KB. Use the API for files this size.` },
      { status: 413 },
    );
  }

  const limit = await checkToolRateLimit(TOOL, clientIp(request));

  if (limit.unavailable) {
    return NextResponse.json(
      { ok: false, error: 'The free tool is temporarily unavailable (rate-limit store unreachable). Try again shortly, or use the API.' },
      { status: 503 },
    );
  }

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Free-tool limit reached: ${limit.limit} conversions per hour from one IP. It resets in ${Math.ceil(limit.resetSeconds / 60)} minutes — or run the same operation through the API with no hourly cap.`,
        rateLimit: { limit: limit.limit, remaining: 0, resetSeconds: limit.resetSeconds },
      },
      { status: 429 },
    );
  }

  try {
    const apiRes = await fetch(API_CONVERT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mode ? { xml, mode } : { xml }),
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { ok: false, error: data.message ?? data.error ?? `Conversion failed with HTTP ${apiRes.status}.` },
        { status: apiRes.status },
      );
    }

    return NextResponse.json({
      ok: true,
      result: data,
      rateLimit: {
        limit: limit.limit,
        remaining: limit.remaining,
        resetSeconds: limit.resetSeconds,
        degraded: limit.degraded,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the converter API. Try again shortly.' },
      { status: 502 },
    );
  }
}
