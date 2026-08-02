/**
 * Converter engine — public API (Task 3 of the converter-engine proposal).
 *
 *   convert(xml, opts?) → ConvertResult
 *
 * Pure module: no route wiring, no auth/rate-limiting/usage metering (Task 4).
 * Engine version is converter-local and independent of the shared rules
 * package.
 */
export { convert, convertWithRepairers, ENGINE_VERSION } from './pipeline.js';
