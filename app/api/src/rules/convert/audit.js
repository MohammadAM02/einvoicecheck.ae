/**
 * Audit entry model for the converter.
 *
 * Every change a repairer makes is recorded as an AuditEntry so consumers can
 * review or replay exactly what was altered: which rule fired, what action was
 * taken, the exact XPath target, the old and new value, and the reason.
 */

export function auditEntry(rule, action, target, oldValue, newValue, reason) {
  return { rule, action, target, old: oldValue, new: newValue, reason };
}

/**
 * Control characters are not representable in most downstream consumers
 * (logs, databases, JSON renderers). Escape values that contain them so the
 * audit trail stays readable and safe to render.
 */
export function escapeForAudit(value) {
  if (typeof value !== 'string') return value;
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(value)
    ? JSON.stringify(value)
    : value;
}
