import { createHash } from 'node:crypto';

/**
 * Canonical JSON of the invoice model with recursively sorted keys. The digest
 * therefore only changes when a data value changes — never on whitespace,
 * attribute order, or quote style introduced by DOM serialization.
 */
function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * dataFingerprint(canonicalInvoice) → SHA-256 of sorted-key JSON.
 * Pre/post repair fingerprints must match or the pipeline aborts with
 * ERROR / DATA_CHANGED (a repairer altered data — internal defect).
 */
export function dataFingerprint(invoice) {
  return createHash('sha256').update(canonicalJson(invoice), 'utf8').digest('hex');
}

export const fingerprint = dataFingerprint;
