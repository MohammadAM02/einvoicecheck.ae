import { NextResponse } from 'next/server';
import { MAX_DOCUMENT_BYTES, looksLikeXml, validateDocument } from '@/lib/validation';
import type { XmlValidationResult } from '@/lib/validation';
import { reserveToolRateLimit, clientIp } from '@/lib/toolRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/validate/batch
 *
 * Batch validation endpoint — validates an array of UBL 2.1 / PINT AE XML
 * invoices in one request. Each document is proxied sequentially to the paid
 * strict `POST /v2/validate` (see src/lib/validation.ts); non-XML documents
 * are rejected per-index without calling the API. Canonical JSON preflight is
 * available through the API (POST /v1/preflight), not here.
 *
 * Requests are subject to the same IP rate limit as the single-document
 * endpoint; each invoice in the batch consumes one unit of the hourly budget.
 *
 * Example request body:
 *   { "invoices": ["<Invoice>…</Invoice>", "<Invoice>…</Invoice>"] }
 *
 * Response shape:
 *   {
 *     "ok": true,
 *     "results": [
 *       { "index": 0, "valid": false, "format": {…}, "structure": {…}, "semantic": {…} },
 *       { "index": 1, "valid": true,  "format": {…}, "structure": {…}, "semantic": {…} }
 *     ],
 *     "rateLimit": { ... }
 *   }
 */
const TOOL = 'uae-e-invoice-validator';

type BatchRequestBody = { invoices?: unknown };

type BatchItemResult = { index: number } & XmlValidationResult;

type BatchItemError = {
  index: number;
  valid: false;
  invoiceType: null;
  schemaVersion: string;
  error: string;
};

export async function POST(request: Request) {
  let invoices: string[];

  try {
    const body = (await request.json()) as BatchRequestBody;
    const raw = body.invoices;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { ok: false, error: '"invoices" must be an array of strings.' },
        { status: 400 },
      );
    }
    invoices = raw.map((s) => (typeof s === 'string' ? s.trim() : ''));
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (invoices.length < 2) {
    return NextResponse.json(
      { ok: false, error: '"invoices" array must contain at least two documents.' },
      { status: 400 },
    );
  }

  if (invoices.length > 50) {
    return NextResponse.json(
      { ok: false, error: 'Batch size exceeds maximum of 50 invoices per request.' },
      { status: 413 },
    );
  }

  // Check size of each document
  for (let i = 0; i < invoices.length; i++) {
    if (Buffer.byteLength(invoices[i], 'utf8') > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invoice at index ${i} is larger than ${Math.round(MAX_DOCUMENT_BYTES / 1024)} KB. Use the API for files this size.`,
        },
        { status: 413 },
      );
    }
  }

  const ip = clientIp(request);
  // Reserve one free-tool unit per ACCEPTED invoice, atomically, BEFORE any
  // validation. Malformed/empty documents are not accepted and consume
  // nothing; if the whole batch cannot be reserved, reject it entirely so no
  // partial quota is consumed (A-009/A-010).
  const accepted = invoices.filter((doc) => doc && looksLikeXml(doc));
  const limit = await reserveToolRateLimit(TOOL, ip, accepted.length);

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
        error: `Free-tool limit reached: ${limit.limit} validations per hour from one IP. It resets in ${Math.ceil(limit.resetSeconds / 60)} minutes — or run the same check through the API with no hourly cap.`,
        rateLimit: { limit: limit.limit, remaining: 0, resetSeconds: limit.resetSeconds },
      },
      { status: 429 },
    );
  }

  // Validate each invoice sequentially against the API.
  const results: (BatchItemResult | BatchItemError)[] = [];

  for (let i = 0; i < invoices.length; i++) {
    const doc = invoices[i];
    if (!doc) {
      results.push({
        index: i,
        valid: false,
        invoiceType: null,
        schemaVersion: '',
        error: 'Empty document at this index.',
      });
      continue;
    }

    if (!looksLikeXml(doc)) {
      results.push({
        index: i,
        valid: false,
        invoiceType: null,
        schemaVersion: '',
        error: `Document at index ${i} is not XML. The free validator accepts UBL 2.1 / PINT AE XML only; canonical JSON preflight is available through the API (POST /v1/preflight).`,
      });
      continue;
    }

    try {
      const result = await validateDocument(doc);
      results.push({ index: i, ...result });
    } catch (e) {
      results.push({
        index: i,
        valid: false,
        invoiceType: null,
        schemaVersion: '',
        error: e instanceof Error ? e.message : 'Validation failed.',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    results,
    rateLimit: {
      limit: limit.limit,
      remaining: limit.remaining,
      resetSeconds: limit.resetSeconds,
      degraded: limit.degraded,
    },
  });
}
