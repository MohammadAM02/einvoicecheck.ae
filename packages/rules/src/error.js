/**
 * Normalized validation-error object. Every rule emits errors in exactly this
 * shape so consumers (and the OpenAPI schema) see one stable contract.
 *
 *  path     - JSON pointer-ish path into the canonical invoice model
 *  rule     - stable rule identifier (our engine id + cited spec rule)
 *  severity - 'error' (invalidates) | 'warning' (advisory, still valid)
 *  message  - human-readable explanation
 *  fix      - concrete, copy-pasteable remediation hint
 */
export function err(path, rule, message, fix, severity = 'error') {
  return { path, rule, severity, message, fix };
}

export function warn(path, rule, message, fix) {
  return err(path, rule, message, fix, 'warning');
}
