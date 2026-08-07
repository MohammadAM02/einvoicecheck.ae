import { NextResponse } from 'next/server';
import { checkToolRateLimit, clientIp } from '@/lib/toolRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Free-tool generator endpoint — ZERO LOGIN. No API key, no email, no cookie.
 *
 * Proxies to the paid POST /v1/generate endpoint so the browser tool runs
 * the SAME generator pipeline as the API. Generates PINT-AE 1.0.4 UBL XML
 * from a form payload. Structure guaranteed by official sample skeletons;
 * totals computed with engine math.
 *
 * Abuse control is an IP rate limit in the shared Redis.
 * Nothing about the submitted form data is persisted here.
 */
const TOOL = 'uae-e-invoice-generator';
const MAX_BYTES = 64 * 1024;

/**
 * Resolve the API base URL and normalize it to an absolute http(s) URL.
 * NEXT_PUBLIC_API_BASE_URL may be stored without a scheme (e.g.
 * "api-production-09ce.up.railway.app") — fetch() rejects scheme-less
 * URLs with a TypeError, which surfaces as a confusing "could not reach"
 * 502 instead of the real error.
 */
function apiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.einvoicecheck.ae';
  if (/^https?:\/\//i.test(base)) return base;
  return `https://${base}`;
}
const API_GENERATE_URL = `${apiBaseUrl()}/v1/generate`;

/**
 * Server-side API key used by the free tool to call the paid generator API.
 * The key lives in the server env only (never shipped to the browser);
 * the client hits this route with no auth. Without it the free tool
 * cannot work — fail loudly rather than return a confusing 401.
 */
function apiKeyHeader(): Record<string, string> {
  const key = process.env.EINVOICECHECK_API_KEY;
  if (!key) {
    throw new Error('EINVOICECHECK_API_KEY is not configured on the server.');
  }
  return { 'x-api-key': key };
}

export async function POST(request: Request) {
  let template: string;
  let data: unknown;

  try {
    const body = (await request.json()) as { template?: unknown; data?: unknown };
    template = typeof body.template === 'string' ? body.template.trim() : '';
    data = body.data;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!template) {
    return NextResponse.json(
      { ok: false, error: 'Select an invoice template first.' },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: 'Fill in the invoice form first.' },
      { status: 400 },
    );
  }

  const payload = JSON.stringify({ template, data });
  if (Buffer.byteLength(payload, 'utf8') > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Form payload is larger than ${Math.round(MAX_BYTES / 1024)} KB.` },
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
        error: `Free-tool limit reached: ${limit.limit} generations per hour from one IP. It resets in ${Math.ceil(limit.resetSeconds / 60)} minutes — or run the same operation through the API with no hourly cap.`,
        rateLimit: { limit: limit.limit, remaining: 0, resetSeconds: limit.resetSeconds },
      },
      { status: 429 },
    );
  }

  let apiKey: Record<string, string>;
  try {
    apiKey = apiKeyHeader();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'The generator tool is not configured yet. Please try again later.' },
      { status: 503 },
    );
  }

  try {
    const apiRes = await fetch(API_GENERATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...apiKey },
      body: payload,
    });

    const responseData = await apiRes.json();

    if (!apiRes.ok) {
      return NextResponse.json(
        { ok: false, error: responseData.message ?? responseData.error ?? `Generation failed with HTTP ${apiRes.status}.` },
        { status: apiRes.status },
      );
    }

    return NextResponse.json({
      ok: true,
      result: responseData,
      rateLimit: {
        limit: limit.limit,
        remaining: limit.remaining,
        resetSeconds: limit.resetSeconds,
        degraded: limit.degraded,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the generator API. Try again shortly.' },
      { status: 502 },
    );
  }
}
