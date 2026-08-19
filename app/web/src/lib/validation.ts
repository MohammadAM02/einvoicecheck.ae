/**
 * Server-side client for the strict validation API.
 *
 * The free tool does not run a separate browser rule engine: `validateDocument`
 * forwards the paid `POST /v2/validate` XML-only layered result. The server-side
 * `x-api-key` is read from `process.env.EINVOICECHECK_API_KEY` at call time —
 * is never shipped to the browser or echoed back in error messages. Canonical
 * JSON data preflight is a separate API contract at `POST /v1/preflight`.
 *
 * Env is read at call time (not module scope) so tests can stub it without
 * re-importing modules.
 */

export type XmlValidationIssue = {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
  line: number | null;
  column: number | null;
  xmlPath: string | null;
};

export type XmlValidationLayer = {
  status: 'passed' | 'failed' | 'skipped';
  issues: XmlValidationIssue[];
};

/** Layered result of the strict XML pipeline (mirrors app/api XmlValidationResult). */
export type XmlValidationResult = {
  valid: boolean;
  inputFormat: 'xml';
  validationScope: 'pint-ae-ubl-xml';
  invoiceType: string | null;
  schemaVersion: string;
  format: XmlValidationLayer;
  structure: XmlValidationLayer;
  semantic: XmlValidationLayer;
  /** Additive Validator-integrated safe-repair analysis (Part B), when present. */
  safeRepair?: SafeRepairAnalysis;
};

/** Machine-readable record of one metadata change in the repair candidate. */
export type SafeRepairAuditEntry = {
  rule: string;
  action: 'rename' | 'replace' | 'add' | 'remove';
  target: string;
  old: string;
  new: string;
  reason: string;
};

/** Diagnosis-only finding — never auto-repaired. */
export type SafeRepairFinding = {
  rule: string;
  path: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
  line: number | null;
  column: number | null;
  charIndex: number | null;
};

/**
 * The validated repair candidate. The candidate XML itself is never part of the
 * response — the browser materializes it with the same deterministic transforms
 * (lib/safe-repair.ts) and verifies candidateHash before presenting it.
 */
export type SafeRepairCandidate = {
  originalHash: string;
  candidateHash: string;
  audit: SafeRepairAuditEntry[];
  /** Full validateXmlDocument() layered result of the candidate. */
  validation: XmlValidationResult;
  /** Candidate passes the complete pipeline (Strict-mode eligibility). */
  strictEligible: boolean;
};

export type SafeRepairAnalysis = {
  available: boolean;
  originalHash: string;
  findings: SafeRepairFinding[];
  candidate: SafeRepairCandidate | null;
};

/** Max payload the free tool accepts (bytes of UTF-8 text). */
export const MAX_DOCUMENT_BYTES = 256 * 1024;

/** Same sniff the API uses: a document is XML if it starts with '<'. */
export function looksLikeXml(text: string): boolean {
  return text.trimStart().startsWith('<');
}

/**
 * Resolve the API base URL and normalize it to an absolute http(s) URL.
 * NEXT_PUBLIC_API_BASE_URL may be stored without a scheme (e.g.
 * "api-production-09ce.up.railway.app") — fetch() rejects scheme-less
 * URLs with a TypeError, which surfaces as a confusing error.
 */
function apiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.einvoicecheck.ae';
  if (/^https?:\/\//i.test(base)) return base;
  return `https://${base}`;
}

/**
 * Upstream/config failure. `message` is always safe to show end users:
 * it is either our own copy or a message forwarded verbatim from the API
 * (the API's error bodies are user-facing text, never credentials).
 */
export class ValidationApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ValidationApiError';
  }
}

const UPSTREAM_TIMEOUT_MS = 30_000;

/**
 * Validate a pasted XML document against the strict API pipeline.
 *
 * @throws ValidationApiError — 503 when the key is missing, the upstream is
 *   unreachable/times out, or the upstream answers non-2xx (safe message
 *   forwarded). Never includes the API key.
 */
export async function validateDocument(text: string): Promise<XmlValidationResult> {
  const key = process.env.EINVOICECHECK_API_KEY;
  if (!key) {
    throw new ValidationApiError('Validation is not configured on the server yet. Please try again later.', 503);
  }

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}/v2/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/xml', 'x-api-key': key },
      body: text,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new ValidationApiError('Could not reach the validation API. Try again shortly.', 503);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data !== null && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Validation failed with HTTP ${res.status}.`;
    // The upstream status is OUR infrastructure status, not the caller's: the
    // free tool carries no credentials, so any upstream failure is a service
    // problem, not the user's. Forward the safe message, always as 503.
    throw new ValidationApiError(message, 503);
  }

  return data as XmlValidationResult;
}
