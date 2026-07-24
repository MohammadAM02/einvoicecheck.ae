import { NextResponse } from 'next/server';
import { MAX_DOCUMENT_BYTES, validateDocument } from '@/lib/validation';
import { checkToolRateLimit, clientIp } from '@/lib/toolRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/tools/validate/batch
 *
 * Batch validation endpoint — validates an array of invoices in one request.
 * Accepts the same document formats as the single-document endpoint (canonical
 * JSON, UBL 2.1 / PINT AE XML) and runs the same rule engine on each.
 *
 * Requests are subject to the same IP rate limit as the single-document
 * endpoint; each invoice in the batch consumes one unit of the hourly budget.
 *
 * Example request body:
 *   { "invoices": ["<Invoice>…</Invoice>", "{\"invoiceType\":\"388\",…}"] }
 *
 * Response shape:
 *   {
 *     "ok": true,
 *     "results": [
 *       { "index": 0, "valid": false, "errors": [...] },
 *       { "index": 1, "valid": true,  "errors": []    }
 *     ],
 *     "rateLimit": { ... }
 *   }
 */
const TOOL = 'uae-e-invoice-validator';

type BatchRequestBody = { invoices?: unknown };

type BatchItemResult = {
  index: number;
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: {
    path: string;
    rule: string;
    severity: 'error' | 'warning';
    message: string;
    fix?: string;
  }[];
};

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

  if (invoices.length === 0) {
    return NextResponse.json(
      { ok: false, error: '"invoices" array must contain at least one document.' },
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
  const limit = await checkToolRateLimit(TOOL, ip);

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

  // Validate each invoice sequentially (can optimise with Promise.all later)
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

    try {
      const result = validateDocument(doc);
      results.push({
        index: i,
        valid: result.valid,
        invoiceType: result.invoiceType,
        schemaVersion: result.schemaVersion,
        errors: result.errors,
      });
    } catch (e) {
      results.push({
        index: i,
        valid: false,
        invoiceType: null,
        schemaVersion: '',
        error: `Validation engine error: ${e instanceof Error ? e.message : 'Unknown error'}`,
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
