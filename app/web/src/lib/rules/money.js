/**
 * Deterministic money helpers. UAE e-invoicing amounts are carried to 2
 * decimal places (fils). All comparisons round both operands to 2 dp and
 * allow a half-fils tolerance so representation noise never trips a rule.
 */

export function round2(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return NaN;
  // Round half away from zero at 2 dp (avoids banker's-rounding surprises).
  const x = Number(n);
  return Math.sign(x) * Math.round((Math.abs(x) + Number.EPSILON) * 100) / 100;
}

const TOLERANCE = 0.005; // half a fils

export function moneyEq(a, b) {
  const ra = round2(a);
  const rb = round2(b);
  if (Number.isNaN(ra) || Number.isNaN(rb)) return false;
  return Math.abs(ra - rb) < TOLERANCE;
}

export function isNumber(n) {
  return n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n));
}

export function fmt(n) {
  return isNumber(n) ? round2(n).toFixed(2) : String(n);
}
