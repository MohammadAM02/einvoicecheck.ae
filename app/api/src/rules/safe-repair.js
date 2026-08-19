// app/api/src/rules/safe-repair.js — Validator-integrated safe repair (Part B).
//
// analyzeSafeRepair(xml, opts?) → SafeRepairAnalysis
//
// Builds at most TWO metadata-only repairs in memory:
//   1. FMT-DECL-01 — encoding declaration ISO-8859-1 → utf-8, only when the
//      received string is cleanly decoded (no U+FFFD replacement characters).
//   2. FMT-NS-02  — add a missing exact-lowercase cbc:/cac: xmlns declaration
//      on a recognizably UBL 2.1 Invoice/CreditNote root.
//
// Everything else is diagnosis-only and never rewritten: forbidden XML
// characters, existing wrong namespace URIs, unbound prefix aliases, missing or
// incorrect root namespaces, structure, and semantics. There is no URI typo
// allowlist and no structural repair.
//
// The canonical fingerprint baseline is parsed from the UNTOUCHED original
// string BEFORE any mutation (this closes the pre-parse sanitizer gap: a
// control character can no longer be deleted before the comparison). The
// candidate must reproduce the identical canonical invoice model or the
// candidate is aborted.
//
// The candidate is always judged by the complete validateXmlDocument()
// pipeline; the analysis returns that verdict (candidate.validation) and
// whether it is eligible under Strict mode (candidate.strictEligible). The
// candidate XML is NEVER returned: the caller materializes repaired output
// only behind an explicit UI action and must verify it against candidateHash.
// Pure module: no route wiring, no auth/rate-limiting/usage metering. One
// request consumes one validation unit even though the candidate is validated
// internally.
import { createHash } from 'node:crypto';
import { parseUblInvoice } from './xml.js';
import { validateXmlDocument } from './xml-validation.js';

export const CBC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
export const CAC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

const INVOICE_NS = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const CREDIT_NOTE_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';

const BOM = String.fromCharCode(0xfeff);
const REPLACEMENT = String.fromCharCode(0xfffd); // U+FFFD

function isSpaceCode(code) {
  return code === 32 || code === 9 || code === 10 || code === 13;
}

/** XML 1.0 forbidden code points: C0 controls (minus TAB/LF/CR), FFFE/FFFF. */
function isForbiddenCode(code) {
  return (
    (code >= 0x00 && code <= 0x08) ||
    code === 0x0b ||
    code === 0x0c ||
    (code >= 0x0e && code <= 0x1f) ||
    code === 0xfffe ||
    code === 0xffff
  );
}

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Audit entry — every metadata change is machine-readable and replayable. */
function auditEntry(rule, action, target, oldValue, newValue, reason) {
  return { rule, action, target, old: oldValue, new: newValue, reason };
}

/**
 * Canonical JSON of the invoice model with recursively sorted keys. The digest
 * only changes when a data value changes — never on whitespace, attribute
 * order, declaration spelling, or quote style.
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

/** SHA-256 of the sorted-key canonical JSON of a parsed invoice model. */
export function dataFingerprint(invoice) {
  return sha256(canonicalJson(invoice));
}

/** 1-based line and column (and 0-based char index) of an offset in `xml`. */
function locate(xml, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < xml.length; i += 1) {
    if (xml.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column, charIndex: index };
}

/**
 * ENG-FMT-CHARS-01 — report every forbidden XML 1.0 code point with its
 * position. NEVER deleted: removing a control character can change a supplier
 * name, note, identifier, or other invoice value before any fingerprint is
 * taken.
 */
function findForbiddenChars(xml) {
  const findings = [];
  for (let i = 0; i < xml.length; i += 1) {
    if (!isForbiddenCode(xml.charCodeAt(i))) continue;
    const { line, column } = locate(xml, i);
    const code = xml.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    findings.push({
      rule: 'ENG-FMT-CHARS-01',
      path: '/',
      severity: 'error',
      message:
        `Forbidden XML character U+${code} found at line ${line}, column ${column} ` +
        `(character ${i}). XML 1.0 forbids control characters; EInvoiceCheck ` +
        'reports the position and never deletes the character because removing it can change invoice data.',
      fix: 'Remove the character in the source system that produced the XML, then validate again.',
      line,
      column,
      charIndex: i,
    });
  }
  return findings;
}

/** XML declaration at document start (optional BOM/whitespace), or null. */
function getDeclaration(xml) {
  const s = xml.startsWith(BOM) ? xml.slice(1) : xml;
  const trimmed = s.trimStart();
  if (!trimmed.startsWith('<?xml')) return null;
  const end = trimmed.indexOf('?>');
  if (end === -1) return null;
  return trimmed.slice(0, end + 2);
}

/** Encoding attribute value of the declaration (lowercased), or null. */
function declEncoding(decl) {
  const enc = decl.indexOf('encoding');
  if (enc === -1) return null;
  let i = enc + 8;
  while (i < decl.length && isSpaceCode(decl.charCodeAt(i))) i += 1;
  if (decl[i] !== '=') return null;
  i += 1;
  while (i < decl.length && isSpaceCode(decl.charCodeAt(i))) i += 1;
  const q = decl[i];
  if (q !== '"' && q !== "'") return null;
  const end = decl.indexOf(q, i + 1);
  if (end === -1) return null;
  return decl.slice(i + 1, end).toLowerCase();
}

/**
 * FMT-DECL-01 — rewrite `ISO-8859-1` → `utf-8` in the XML declaration. Runs
 * only after the caller verified the string is cleanly decoded (no U+FFFD).
 * Returns the new string; pushes one audit entry when changed.
 */
function fixEncodingDecl(xml, audit) {
  const decl = getDeclaration(xml);
  if (!decl || declEncoding(decl) !== 'iso-8859-1') return xml;
  const enc = decl.indexOf('encoding');
  let i = enc + 8;
  while (i < decl.length && isSpaceCode(decl.charCodeAt(i))) i += 1;
  i += 1; // '='
  while (i < decl.length && isSpaceCode(decl.charCodeAt(i))) i += 1;
  const q = decl[i];
  const end = decl.indexOf(q, i + 1);
  const fixed = decl.slice(0, i + 1) + 'utf-8' + decl.slice(end);
  audit.push(auditEntry(
    'FMT-DECL-01', 'replace', '/processing-instruction(xml)',
    decl, fixed,
    'Declared encoding did not match UTF-8.'
  ));
  return xml.replace(decl, fixed);
}

/** Root element open tag info, or null when the document shape is unexpected. */
function rootInfo(xml) {
  const s = xml.startsWith(BOM) ? xml.slice(1) : xml;
  let i = 0;
  while (i < s.length && isSpaceCode(s.charCodeAt(i))) i += 1;
  if (s.startsWith('<?xml', i)) {
    const end = s.indexOf('?>', i);
    if (end === -1) return null;
    i = end + 2;
    while (i < s.length && isSpaceCode(s.charCodeAt(i))) i += 1;
  }
  if (s[i] !== '<') return null;
  const nameMatch = s.slice(i + 1).match(/^[A-Za-z_][A-Za-z0-9_.:-]*/);
  if (!nameMatch) return null;
  const rawName = nameMatch[0];
  const name = rawName.split(':').pop();

  // Scan to the end of the open tag, respecting quoted attribute values.
  let j = i + 1 + rawName.length;
  let quote = '';
  while (j < s.length) {
    const ch = s[j];
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      break;
    }
    j += 1;
  }
  if (j >= s.length) return null;
  const openTag = s.slice(i, j + 1);
  const attrs = openTag.slice(1 + rawName.length, -1);

  // Default xmlns value: the xmlns attribute whose name is exactly 'xmlns'.
  let defaultNs;
  let pos = attrs.indexOf('xmlns');
  while (pos !== -1) {
    let k = pos + 5;
    while (k < attrs.length && isSpaceCode(attrs.charCodeAt(k))) k += 1;
    if (attrs[k] === '=') {
      k += 1;
      while (k < attrs.length && isSpaceCode(attrs.charCodeAt(k))) k += 1;
      const q = attrs[k];
      if (q === '"' || q === "'") {
        const endQ = attrs.indexOf(q, k + 1);
        if (endQ !== -1) defaultNs = attrs.slice(k + 1, endQ);
      }
      break;
    }
    pos = attrs.indexOf('xmlns', pos + 1);
  }

  return { name, attrs, defaultNs, openTag };
}

/**
 * Copy of `xml` with comments and CDATA removed so prefix-usage and binding
 * scans cannot false-positive on non-element text.
 */
function withoutCommentsAndCdata(xml) {
  let out = '';
  let i = 0;
  while (i < xml.length) {
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i + 4);
      if (end === -1) return out;
      i = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9);
      if (end === -1) return out;
      i = end + 3;
      continue;
    }
    out += xml[i];
    i += 1;
  }
  return out;
}

/**
 * Every distinct prefix spelling used in element open/self-closing tag names.
 * Anchored at '<' followed by a name, so attribute names and text content
 * cannot false-positive (xmlns:... declarations are handled via findBinding).
 */
function usedPrefixSpellings(xml) {
  const scan = withoutCommentsAndCdata(xml);
  const out = new Set();
  for (const m of scan.matchAll(/<[A-Za-z_][A-Za-z0-9_.-]*:[A-Za-z0-9_.-]+/g)) {
    out.add(m[0].slice(1).split(':')[0]);
  }
  return out;
}

/** First `xmlns:<prefix>="…"` declaration anywhere in the document, or null. */
function findBinding(xml, prefix) {
  const scan = withoutCommentsAndCdata(xml);
  const needle = `xmlns:${prefix}`;
  let pos = scan.indexOf(needle);
  while (pos !== -1) {
    let i = pos + needle.length;
    while (i < scan.length && isSpaceCode(scan.charCodeAt(i))) i += 1;
    if (scan[i] === '=') {
      i += 1;
      while (i < scan.length && isSpaceCode(scan.charCodeAt(i))) i += 1;
      const quote = scan[i];
      if (quote === '"' || quote === "'") {
        const end = scan.indexOf(quote, i + 1);
        if (end !== -1) return { uri: scan.slice(i + 1, end) };
      }
    }
    pos = scan.indexOf(needle, pos + 1);
  }
  return null;
}

/**
 * ENG-FMT-NS-URI-01 — report an existing (wrong) namespace URI for a used
 * cbc/cac prefix spelling. Never overwritten: no URI typo allowlist exists.
 */
function wrongUriFinding(prefix, uri, expected, rootName) {
  return {
    rule: 'ENG-FMT-NS-URI-01',
    path: rootName ? `/${rootName}/@xmlns:${prefix}` : `/@xmlns:${prefix}`,
    severity: 'error',
    message:
      `xmlns:${prefix} is declared as "${uri}" but the official UBL 2.1 binding is ` +
      `"${expected}". EInvoiceCheck never overwrites an existing namespace URI.`,
    fix: `Update the source system to declare xmlns:${prefix}="${expected}".`,
    line: null,
    column: null,
    charIndex: null,
  };
}

/**
 * ENG-FMT-NS-BIND-01 — a cbc/cac prefix spelling is used but never declared.
 * XML prefixes are aliases: a differently-cased spelling is valid when bound to
 * the right URI, but an unbound alias is a namespace binding error. Never
 * auto-bound here (only the exact lowercase spelling may be repaired).
 */
function unboundAliasFinding(prefix, rootName) {
  return {
    rule: 'ENG-FMT-NS-BIND-01',
    path: rootName ? `/${rootName}` : '/',
    severity: 'error',
    message:
      `The prefix "${prefix}:" is used but never declared. EInvoiceCheck does not bind ` +
      'or rename aliases automatically; declare it in the source system.',
    fix: `Declare xmlns:${prefix}="…" on an element that contains the usage.`,
    line: null,
    column: null,
    charIndex: null,
  };
}

/**
 * ENG-FMT-ROOT-NS-01 — the root element is not a UBL 2.1 Invoice/CreditNote
 * with the expected default namespace, so the missing-declaration repair's
 * conditions do not hold. Never auto-repaired.
 */
function rootNsFinding(rootName, received) {
  const expected = rootName === 'CreditNote' ? CREDIT_NOTE_NS : INVOICE_NS;
  return {
    rule: 'ENG-FMT-ROOT-NS-01',
    path: `/${rootName || 'root'}`,
    severity: 'error',
    message:
      `The root element must be a UBL 2.1 ${rootName || 'Invoice/CreditNote'} with default namespace ` +
      `"${expected}" before a missing cbc/cac declaration can be added; received "${received ?? '(none)'}".`,
    fix: `Correct the root namespace to "${expected}" in the source system.`,
    line: null,
    column: null,
    charIndex: null,
  };
}

/**
 * FMT-NS-02 — add a missing xmlns declaration for the exact-lowercase `cbc` /
 * `cac` prefix when ALL of these hold:
 *   - the used spelling is exactly lowercase `cbc` or `cac`;
 *   - the prefix is used but unbound (no xmlns:<prefix> anywhere);
 *   - the document is recognizably a UBL Invoice/CreditNote with the expected
 *     default root namespace;
 *   - the binding is the official UBL 2.1 URI.
 * Otherwise the situation is diagnosis-only (findings pushed to `findings`).
 * Mixed-case aliases (Cbc:/CBC:) are never renamed and never auto-bound; an
 * unbound alias is a binding-error finding, a correctly bound alias receives
 * no style warning.
 */
function addMissingNsDecl(xml, audit, findings) {
  const root = rootInfo(xml);
  const official = { cbc: CBC_URI, cac: CAC_URI };

  // Only meaningful on an Invoice/CreditNote root (name match is the first
  // recognizability check; the namespace check below completes it).
  if (!root || (root.name !== 'Invoice' && root.name !== 'CreditNote')) return xml;

  const expectedRootNs = root.name === 'CreditNote' ? CREDIT_NOTE_NS : INVOICE_NS;
  let rootNsReported = false;

  let insert = '';
  for (const [canonical, uri] of Object.entries(official)) {
    for (const spelling of usedPrefixSpellings(xml)) {
      if (spelling.toLowerCase() !== canonical) continue;
      const binding = findBinding(xml, spelling);
      if (binding) {
        // Already bound. A correct binding is left untouched (valid aliases get
        // no warning); a wrong URI is diagnosis-only — never overwritten.
        if (binding.uri !== uri) {
          findings.push(wrongUriFinding(spelling, binding.uri, uri, root.name));
        }
        continue;
      }
      // Used but unbound.
      if (spelling !== canonical) {
        // Alias spelling (Cbc:, CBC:, …): binding error, never auto-bound.
        findings.push(unboundAliasFinding(spelling, root.name));
        continue;
      }
      // Exact lowercase spelling: repairable only when the root carries the
      // expected UBL 2.1 default namespace; never repair a missing/incorrect
      // root namespace.
      if (root.defaultNs !== expectedRootNs) {
        if (!rootNsReported) {
          findings.push(rootNsFinding(root.name, root.defaultNs));
          rootNsReported = true;
        }
        continue;
      }
      // Self-closing roots cannot carry the declaration — leave to XSD.
      if (root.openTag.endsWith('/>')) continue;
      insert += ` xmlns:${spelling}="${uri}"`;
      audit.push(auditEntry(
        'FMT-NS-02', 'add', `/${root.name}/@xmlns:${spelling}`,
        '(missing)', uri,
        'Namespace declaration was missing.'
      ));
    }
  }
  if (!insert) return xml;
  return xml.replace(root.openTag, root.openTag.slice(0, -1) + insert + '>');
}

const DEFAULT_REPAIRERS = { fixEncodingDecl, addMissingNsDecl };

/**
 * Analyze a (possibly invalid) XML document for the two approved metadata
 * repairs. The candidate XML is never persisted and never returned; the
 * analysis carries its full validation verdict so the caller can apply Strict
 * or Format-only presentation policy and materialize the repaired output
 * itself behind an explicit UI action (verifying it against candidateHash).
 *
 * @param {string} xml  the ORIGINAL document (fingerprint baseline source)
 * @param {object} [opts]
 * @param {object} [opts.repairers]  injectable for adversarial tests
 * @returns {{
 *   available: boolean,           // a deterministic candidate exists
 *   originalHash: string,
 *   findings: Array<{rule, path, severity, message, fix, line, column, charIndex}>,
 *   candidate: null | {
 *     originalHash: string,
 *     candidateHash: string,
 *     audit: Array<{rule, action, target, old, new, reason}>,
 *     validation: object,         // full validateXmlDocument() layered result
 *     strictEligible: boolean,    // candidate.validation.valid
 *   },
 * }}
 */
export function analyzeSafeRepair(xml, opts = {}) {
  const audit = [];
  const findings = [];
  const repairers = opts.repairers || DEFAULT_REPAIRERS;

  if (typeof xml !== 'string' || xml.trim() === '') {
    return {
      available: false,
      originalHash: typeof xml === 'string' ? sha256(xml) : sha256(''),
      findings,
      candidate: null,
    };
  }

  const originalHash = sha256(xml);

  // 1. Forbidden characters — diagnosis only, never deleted.
  const forbidden = findForbiddenChars(xml);
  if (forbidden.length > 0) {
    return { available: false, originalHash, findings: forbidden, candidate: null };
  }

  // 2. Encoding declaration. Refuse when a clean decode cannot be established;
  //    no byte transcoding exists in this feature.
  const decl = getDeclaration(xml);
  if (decl && declEncoding(decl) === 'iso-8859-1') {
    if (xml.includes(REPLACEMENT)) {
      findings.push({
        rule: 'ENG-FMT-DECL-01',
        path: '/processing-instruction(xml)',
        severity: 'error',
        message:
          'The declaration says ISO-8859-1 but the received text contains replacement characters ' +
          '(U+FFFD), so a clean decode cannot be established. EInvoiceCheck will not guess at transcoding.',
        fix: 'Re-export the invoice as UTF-8 in the source system, then validate again.',
        line: null,
        column: null,
        charIndex: null,
      });
      return { available: false, originalHash, findings, candidate: null };
    }
  }

  // 3. Apply the two metadata-only repairs in memory.
  let candidate = repairers.fixEncodingDecl(xml, audit);
  candidate = repairers.addMissingNsDecl(candidate, audit, findings);

  if (audit.length === 0) {
    // Nothing changed: diagnosis findings (if any) ride along, no candidate.
    return { available: false, originalHash, findings, candidate: null };
  }

  // 4. Fingerprint guard — baseline from the UNTOUCHED original (never the
  //    mutated string), candidate must reproduce the identical business model.
  let fingerprintBefore;
  try {
    fingerprintBefore = dataFingerprint(parseUblInvoice(xml));
  } catch {
    return { available: false, originalHash, findings, candidate: null };
  }
  let fingerprintAfter;
  try {
    fingerprintAfter = dataFingerprint(parseUblInvoice(candidate));
  } catch {
    findings.push({
      rule: 'ENG-FMT-GUARD-01',
      path: '/',
      severity: 'error',
      message: 'The repaired candidate could not be parsed. The candidate was aborted.',
      fix: '',
      line: null,
      column: null,
      charIndex: null,
    });
    return { available: false, originalHash, findings, candidate: null };
  }
  if (fingerprintAfter !== fingerprintBefore) {
    findings.push({
      rule: 'ENG-FMT-GUARD-01',
      path: '/',
      severity: 'error',
      message: 'A repair changed invoice business values. The candidate was aborted.',
      fix: '',
      line: null,
      column: null,
      charIndex: null,
    });
    return { available: false, originalHash, findings, candidate: null };
  }

  // 5. The candidate is judged by the complete pipeline: format, UBL 2.1 XSD
  //    structure, shared business rules and full PINT-AE Schematron.
  const validation = validateXmlDocument(candidate);

  return {
    available: true,
    originalHash,
    findings,
    candidate: {
      originalHash,
      candidateHash: sha256(candidate),
      audit,
      validation,
      strictEligible: validation.valid,
    },
  };
}
