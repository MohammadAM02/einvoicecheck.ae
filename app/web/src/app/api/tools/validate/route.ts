import { NextResponse } from 'next/server';
import { MAX_DOCUMENT_BYTES, ValidationApiError, looksLikeXml, validateDocument } from '@/lib/validation';
import type { XmlValidationResult } from '@/lib/validation';
import { checkToolRateLimit, clientIp } from '@/lib/toolRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Free-tool validation endpoint - ZERO LOGIN. No API key, no email, no cookie.
 *
 * It proxies to the paid strict `POST /v2/validate` (see src/lib/validation.ts),
 * so the errors shown in the browser are the errors the API returns - never a
 * fabricated or simplified result. Preflight only: this does not transmit
 * anything to the FTA or to an accredited ASP.
 *
 * The free tool is XML-only: canonical JSON preflight is available through the
 * API (POST /v1/preflight), not here.
 *
 * Abuse control is an IP rate limit in the shared Redis (src/lib/toolRateLimit.ts).
 * Nothing about the submitted invoice is persisted here.
 */
const TOOL = 'uae-e-invoice-validator';

export async function POST(request: Request) {
  let document: string;

  try {
    const body = (await request.json()) as { document?: unknown };
    document = typeof body.document === 'string' ? body.document.trim() : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!document) {
    return NextResponse.json(
      { ok: false, error: 'Paste a UBL 2.1 / PINT AE XML invoice first.' },
      { status: 400 },
    );
  }

  if (!looksLikeXml(document)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'The free validator is XML-only: paste a UBL 2.1 / PINT AE XML invoice. Canonical JSON preflight is available through the API (POST /v1/preflight).',
      },
      { status: 400 },
    );
  }

  if (Buffer.byteLength(document, 'utf8') > MAX_DOCUMENT_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `Document is larger than ${Math.round(MAX_DOCUMENT_BYTES / 1024)} KB. Use the API for files this size.`,
      },
      { status: 413 },
    );
  }

  const limit = await checkToolRateLimit(TOOL, clientIp(request));

  if (limit.unavailable) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'The free tool is temporarily unavailable (rate-limit store unreachable). Try again shortly, or use the API.',
      },
      { status: 503 },
    );
  }

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Free-tool limit reached: ${limit.limit} validations per hour from one IP. It resets in ${Math.ceil(limit.resetSeconds / 60)} minutes - or run the same check through the API with no hourly cap.`,
        rateLimit: { limit: limit.limit, remaining: 0, resetSeconds: limit.resetSeconds },
      },
      { status: 429 },
    );
  }

  let result: XmlValidationResult;
  try {
    result = await validateDocument(document);
  } catch (e) {
    if (e instanceof ValidationApiError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: 'Validation failed. Please try again shortly.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result,
    rateLimit: {
      limit: limit.limit,
      remaining: limit.remaining,
      resetSeconds: limit.resetSeconds,
      degraded: limit.degraded,
    },
  });
}
