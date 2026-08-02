// engine.js is the rule engine vendored verbatim from app/api (plain JS, untyped).
// Kept in sync with packages/rules/src/ — the canonical source of truth.
import { validateInvoice as runEngine } from './rules/engine.js';

/**
 * Typed wrapper around the REAL rule engine.
 *
 * `src/lib/rules/**` is a byte-for-byte copy of `app/api/src/rules/**` - the same
 * engine.js / registry.js / checks/* the paid `POST /v1/validate` endpoint runs.
 * It is vendored (not imported across packages) because the web Dockerfile only
 * copies `app/web/src`, so a cross-package relative import would not survive the
 * container build. `test/tool-engine-parity.test.ts` hashes both trees and fails
 * the build if they ever drift, so the free tool and the paid API cannot diverge.
 *
 * Do not add rules here. Rules live in app/api/src/rules and are copied down.
 */

export type ValidationError = {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
};

export type ValidationResult = {
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: ValidationError[];
};

/** Max payload the free tool accepts (bytes of UTF-8 text). */
export const MAX_DOCUMENT_BYTES = 256 * 1024;

/**
 * Validate a pasted document. The engine's normalizeInput() already accepts a
 * raw string and decides XML vs JSON, so we hand it the text untouched: same
 * input -> same output as the API.
 */
export function validateDocument(text: string): ValidationResult {
  return runEngine(text) as ValidationResult;
}
