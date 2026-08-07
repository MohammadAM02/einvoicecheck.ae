import { validateInvoice } from '../engine.js';

/**
 * classifyDataSemantic(xml) → { blocked, repairable }
 *
 * The production classifier does not reimplement ENG-* rules — it IS the
 * engine. Key fact: fast-xml-parser (the engine's parser) is
 * namespace-oblivious — wrong prefix case, bad/missing xmlns URIs, and unbound
 * prefixes NEVER produce engine errors. Format defects are therefore invisible
 * to the engine, and any error the engine DOES report is data-semantic →
 * REFUSE. The converter never invents data.
 *
 * repairable ⇔ zero errors. A post-gate ENG-PARSE-01 (wrong root element,
 * validator/parser disagreement) is beyond the repairers' scope — the pipeline
 * maps it to UNREPAIRABLE_FORMAT.
 */
export function classifyDataSemantic(xml) {
  const validation = validateInvoice(xml, 'application/xml');
  const blocked = validation.errors
    .filter((e) => e.severity === 'error')
    .map((e) => ({ rule: e.rule, path: e.path, message: e.message }));
  // Warnings never block repair, but they MUST surface (e.g. the explicit
  // ENG-TYPE-01/SELF-BILLING unsupported notice for type 389).
  const warnings = validation.errors
    .filter((e) => e.severity === 'warning')
    .map((e) => ({ rule: e.rule, path: e.path, message: e.message, fix: e.fix, severity: 'warning' }));
  return { blocked, warnings, repairable: blocked.length === 0 };
}
