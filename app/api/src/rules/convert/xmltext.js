/**
 * fast-xml-parser with parseTagValue:false returns attributed elements as
 * objects ({ '#text': '500.00', '@_currencyID': 'AED' }). These helpers unwrap
 * the raw text so numeric checks see the value, not '[object Object]'.
 *
 * Spike 001 found the silent-skip fault this prevents: parseFloat() on the
 * wrapper object returned NaN and arithmetic/VAT/totals checks skipped the
 * field. A present-but-unparseable amount is treated as null (blocking), never
 * silently skipped.
 */
export function textOf(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, '#text')
    ? v['#text']
    : v;
}

/** Numeric value or null. null => missing OR unparseable (blocking). */
export function numOf(v) {
  const s = textOf(v);
  if (s === undefined || s === null || String(s).trim() === '') return null;
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : null;
}
