import { createHash } from 'node:crypto';
import { parseUblInvoice } from '../xml.js';
import { XMLValidator } from 'fast-xml-parser';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { classifyDataSemantic } from './classifier.js';
import { fingerprint } from './fingerprint.js';
import * as repairers from './repairers.js';

/** Converter-local engine version (independent of the shared rules package). */
export const ENGINE_VERSION = '1.0.0';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

const hasDeclaration = (xml) => /^\s*<\?xml/.test(xml);
const getDeclaration = (xml) => {
  const m = xml.match(/^\s*<\?xml[^?]*\?>/);
  return m ? m[0] : null;
};

/** XMLSerializer drops the prolog — re-apply the (already fixed) declaration. */
function ensureDeclaration(serialized, declared) {
  if (!hasDeclaration(declared) || hasDeclaration(serialized)) return serialized;
  const decl = getDeclaration(declared);
  return decl ? `${decl}\n${serialized}` : serialized;
}

/** REFUSED result — audits from every stage are preserved, never dropped. */
function refuse(reason, detail, {
  inputHash, preAudit = [], audit = [], blocked = [], wouldFix, parseHint,
} = {}) {
  return {
    status: 'REFUSED', reason, detail,
    inputHash,
    audit: [...preAudit, ...audit],
    blocked, dataIssues: [], output: undefined,
    engineVersion: ENGINE_VERSION, convertedAt: new Date().toISOString(),
    ...(wouldFix !== undefined ? { wouldFix } : {}),
    ...(parseHint !== undefined ? { parseHint } : {}),
  };
}

/** ERROR result — internal defect (fingerprint guard), abort. */
function error(reason, detail, {
  inputHash, preAudit = [], audit = [], parseHint,
} = {}) {
  return {
    status: 'ERROR', reason, detail,
    inputHash,
    audit: [...preAudit, ...audit],
    blocked: [], dataIssues: [], output: undefined,
    engineVersion: ENGINE_VERSION, convertedAt: new Date().toISOString(),
    ...(parseHint !== undefined ? { parseHint } : {}),
  };
}

/**
 * Pipeline orchestrator.
 *
 *   sanitize → encoding decl → missing xmlns decl → well-formedness gate →
 *   data-semantic classifier → (refuse | repair) → re-validate →
 *   data-integrity fingerprint → audit + SHA-256 hashes
 *
 * domRepairers is injectable for the adversarial fingerprint-guard test; the
 * public convert() always uses the production DOM_REPAIRERS.
 */
export function convertWithRepairers(xml, opts = {}, domRepairers = repairers.DOM_REPAIRERS) {
  const mode = opts.mode === 'format' ? 'format' : 'full';
  const inputHash = sha256(xml);

  if (typeof xml !== 'string' || xml.trim() === '') {
    return refuse('UNREPAIRABLE_FORMAT', 'Input is empty or not an XML string.', { inputHash });
  }

  // 1–2. String-level repair — illegal chars, the encoding decl, and missing
  //       xmlns declarations cannot be handled via DOM: illegal chars break
  //       parsing, the decl lives in the prolog, and @xmldom throws on
  //       unbound prefixes before a DOM can exist to repair.
  const preAudit = [];
  const sanitized = repairers.sanitizeChars(xml, preAudit);        // FMT-CHARS-01
  const declared = repairers.fixEncodingDecl(sanitized, preAudit); // FMT-DECL-01
  const prepared = repairers.addMissingNsDecl(declared, preAudit); // FMT-NS-02

  // 3. Well-formedness gate (namespace-unaware: wrong-case/unbound prefixes
  //    pass here — they are the repairers' job).
  const gate = XMLValidator.validate(prepared);
  if (gate !== true) {
    return refuse('UNREPAIRABLE_FORMAT',
      'Document is not well-formed. Structural repair would require inventing content.',
      { inputHash, preAudit, parseHint: gate?.err?.msg ?? 'Unknown XML validation error' });
  }

  // 4. Classify with the REAL engine. fast-xml-parser is namespace-oblivious,
  //    so format defects produce ZERO engine errors — any error here is
  //    data-semantic → REFUSE. A post-gate ENG-PARSE-01 (e.g. wrong root
  //    element) is beyond the repairers' scope → UNREPAIRABLE.
  const { blocked, repairable } = classifyDataSemantic(prepared);
  if (!repairable) {
    const parseOnly = blocked.length === 1 && blocked[0].rule.startsWith('ENG-PARSE-01');
    if (parseOnly) {
      return refuse('UNREPAIRABLE_FORMAT', 'Document could not be parsed.',
        { inputHash, preAudit, parseHint: blocked[0].message });
    }
    if (mode === 'full') {
      return refuse('DATA_SEMANTIC', 'Invoice has data errors that a converter must not fix.', {
        inputHash, preAudit, blocked,
        wouldFix: repairers.dryRun(prepared), // throwaway parse: what WOULD change
      });
    }
    // format mode: continue — data issues become warnings (dataIssues below).
  }

  // 5. Fingerprint BEFORE repair — over the canonical invoice model (data
  //    values only; whitespace/attribute-order drift cannot false-positive).
  let invoiceBefore;
  let fpBefore;
  try {
    invoiceBefore = parseUblInvoice(prepared);
    fpBefore = fingerprint(invoiceBefore);
  } catch (e) {
    return refuse('UNREPAIRABLE_FORMAT', 'Document could not be parsed.',
      { inputHash, preAudit, parseHint: e.message });
  }

  // 6. DOM-based format repair. Parse is guarded: @xmldom's namespace
  //    strictness is unverified in general — never crash the pipeline.
  let doc;
  try {
    doc = new DOMParser().parseFromString(prepared, 'text/xml');
  } catch (e) {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not parse the document structure.',
      { inputHash, preAudit, parseHint: e.message });
  }
  if (!doc || !doc.documentElement || doc.documentElement.tagName === 'parsererror') {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not parse the document structure.',
      { inputHash, preAudit });
  }

  const repairAudit = [];
  for (const repairer of domRepairers) { // order: rPrefix → rNsUri
    const { audit } = repairer(doc);
    repairAudit.push(...audit);
  }

  // 7. Serialize + re-validate. ensureDeclaration re-applies the XML
  //    declaration if the serializer dropped it (FMT-DECL-01 must be
  //    observable in the output).
  let output;
  try {
    output = ensureDeclaration(new XMLSerializer().serializeToString(doc), prepared);
  } catch (e) {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not serialize the document.',
      { inputHash, preAudit, audit: repairAudit, parseHint: e.message });
  }
  if (XMLValidator.validate(output) !== true) {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not produce a well-formed document.',
      { inputHash, preAudit, audit: repairAudit });
  }

  // 8. Fingerprint guard: same canonical model, must be identical.
  let invoiceAfter;
  try {
    invoiceAfter = parseUblInvoice(output);
  } catch (e) {
    return error('DATA_CHANGED', 'Repaired document could not be parsed.',
      { inputHash, preAudit, audit: repairAudit });
  }
  if (fingerprint(invoiceAfter) !== fpBefore) {
    return error('DATA_CHANGED', 'A repairer altered data values. Aborting.',
      { inputHash, preAudit, audit: repairAudit });
  }

  // 9. Success — NOOP invariant: nothing changed ⇔ original bytes come back.
  //    anyChange counts ALL audits (string-level included) — an input with
  //    stripped illegal chars is CONVERTED, not NOOP.
  const anyChange = preAudit.length + repairAudit.length > 0;
  const outputHash = anyChange ? sha256(output) : inputHash;

  return {
    status: anyChange ? 'CONVERTED' : 'NOOP',
    inputHash, outputHash,
    audit: [...preAudit, ...repairAudit],
    blocked: [],
    dataIssues: mode === 'format' ? blocked : [],
    output: anyChange ? output : prepared,
    engineVersion: ENGINE_VERSION,
    convertedAt: new Date().toISOString(),
  };
}

/** Public API: convert(xml, opts?) → ConvertResult. */
export function convert(xml, opts = {}) {
  return convertWithRepairers(xml, opts, repairers.DOM_REPAIRERS);
}
