#!/usr/bin/env node
/**
 * SPIKE 001 — format-only converter + audit trail
 *
 * Prototype validating three feasibility questions:
 *   1. Format-only repair never touches data values.
 *   2. Every change is captured in a machine-readable audit trail.
 *   3. Data-semantic errors cause REFUSE (no fabricated output, ever).
 *
 * Run:
 *   node convert.js samples/00-valid.xml   (single file)
 *   node convert.js --all                  (run all samples/)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { XMLParser, XMLValidator } = require(
  'C:/Users/AMG/code/https-einvoicecheck.ae/app/api/node_modules/fast-xml-parser'
);

const ENGINE_VERSION = 'spike-001';

const PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  processEntities: false,
  trimValues: false,
  parseTagValue: false,
});

const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const money = (s) => parseFloat(String(s));
const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// fast-xml-parser with parseTagValue:false returns attributed elements as
// objects ({ '#text': ..., '@_currencyID': ... }). Unwrap the text so numeric
// checks see the value, not '[object Object]'. NaN from a present-but-garbage
// amount is treated as a DATA issue below — never silently skipped.
const textOf = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, '#text')
    ? v['#text']
    : v;

// Numeric value or null. null => the value is missing OR unparseable.
const numOf = (v) => {
  const s = textOf(v);
  if (s === undefined || s === null || String(s).trim() === '') return null;
  const n = parseFloat(String(s));
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------------
// DATA-SEMANTIC CLASSIFIER — mirrors the repo engine's ENG-* checks.
// Any hit means the converter REFUSES. It never invents or alters data.
// ---------------------------------------------------------------------------
function classifyDataSemantic(inv) {
  const issues = [];

  const required = [
    ['BT-1', '/cbc:ID', inv.ID],
    ['BT-2', '/cbc:IssueDate', inv.IssueDate],
    ['BT-3', '/cbc:InvoiceTypeCode', inv.InvoiceTypeCode],
    ['BT-5', '/cbc:DocumentCurrencyCode', inv.DocumentCurrencyCode],
  ];
  for (const [br, p, v] of required) {
    if (textOf(v) === undefined || String(textOf(v)).trim() === '') {
      issues.push({
        rule: `ENG-REQ-${br}`,
        path: p,
        message: `Required value (${br}) is missing. The converter cannot invent it.`,
      });
    }
  }

  const supTrn = textOf(inv?.AccountingSupplierParty?.Party?.PartyTaxScheme?.CompanyID);
  if (supTrn === undefined || !/^\d{15}$/.test(String(supTrn))) {
    issues.push({
      rule: 'ENG-TRN-01',
      path: '/cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
      message: 'Seller TRN (BT-31) must be 15 digits. The converter cannot invent it.',
    });
  }
  const buyTrn = textOf(inv?.AccountingCustomerParty?.Party?.PartyTaxScheme?.CompanyID);
  if (buyTrn === undefined || !/^\d{15}$/.test(String(buyTrn))) {
    issues.push({
      rule: 'ENG-TRN-03',
      path: '/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cbc:CompanyID',
      message: 'Buyer TRN (BT-48) must be 15 digits. The converter cannot invent it.',
    });
  }

  toArray(inv.InvoiceLine).forEach((ln, i) => {
    const net = numOf(ln.LineExtensionAmount);
    const qty = numOf(ln.InvoicedQuantity);
    const price = numOf(ln.Price?.PriceAmount);
    if (net === null || qty === null || price === null) {
      issues.push({
        rule: 'ENG-NUM-01',
        path: `/cac:InvoiceLine[${i}]/cbc:LineExtensionAmount`,
        message: 'Line amount (BT-131) is missing or not numeric. The converter cannot invent it.',
      });
    } else if (Math.abs(net - qty * price) > 0.005) {
      issues.push({
        rule: 'ENG-LINE-01',
        path: `/cac:InvoiceLine[${i}]/cbc:LineExtensionAmount`,
        message: 'Line net (BT-131) does not equal quantity times price. The converter cannot invent the amount.',
      });
    }
  });

  const taxTotal = inv.TaxTotal;
  if (taxTotal) {
    toArray(taxTotal.TaxSubtotal).forEach((st, i) => {
      const taxable = numOf(st.TaxableAmount);
      const taxAmt = numOf(st.TaxAmount);
      const pct = numOf(st.TaxCategory?.Percent);
      if (taxable === null || taxAmt === null || pct === null) {
        issues.push({
          rule: 'ENG-NUM-01',
          path: `/cac:TaxTotal/cac:TaxSubtotal[${i}]/cbc:TaxAmount`,
          message: 'Tax amount (BT-117) is missing or not numeric. The converter cannot invent it.',
        });
      } else if (Math.abs(taxAmt - (taxable * pct) / 100) > 0.005) {
        issues.push({
          rule: 'ENG-TAX-09',
          path: `/cac:TaxTotal/cac:TaxSubtotal[${i}]/cbc:TaxAmount`,
          message: 'VAT amount (BT-117) does not equal taxable amount times rate. The converter cannot invent the amount.',
        });
      }
    });
  }

  const t = inv.LegalMonetaryTotal;
  if (t) {
    const excl = numOf(t.TaxExclusiveAmount);
    const inc = numOf(t.TaxInclusiveAmount);
    const docTax = numOf(taxTotal?.TaxAmount);
    if (excl === null || inc === null || docTax === null) {
      issues.push({
        rule: 'ENG-NUM-01',
        path: '/cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount',
        message: 'Total amount (BT-109/112) is missing or not numeric. The converter cannot invent it.',
      });
    } else if (Math.abs(excl + docTax - inc) > 0.005) {
      issues.push({
        rule: 'ENG-TOT-15',
        path: '/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount',
        message: 'Tax-inclusive total (BT-112) does not equal tax-exclusive plus tax. The converter cannot invent the amount.',
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// DATA FINGERPRINT — data values the converter is FORBIDDEN to change.
// Pre/post repair fingerprints must match, or conversion is aborted.
// ---------------------------------------------------------------------------
function dataFingerprint(inv) {
  return JSON.stringify({
    ID: inv.ID,
    IssueDate: inv.IssueDate,
    InvoiceTypeCode: inv.InvoiceTypeCode,
    Currency: inv.DocumentCurrencyCode,
    SupTrn: inv.AccountingSupplierParty?.Party?.PartyTaxScheme?.CompanyID,
    BuyTrn: inv.AccountingCustomerParty?.Party?.PartyTaxScheme?.CompanyID,
    lineNets: toArray(inv.InvoiceLine).map((l) => l.LineExtensionAmount),
    docTax: inv.TaxTotal?.TaxAmount,
    totals: inv.LegalMonetaryTotal
      ? [
          inv.LegalMonetaryTotal.LineExtensionAmount,
          inv.LegalMonetaryTotal.TaxExclusiveAmount,
          inv.LegalMonetaryTotal.TaxInclusiveAmount,
          inv.LegalMonetaryTotal.PayableAmount,
        ]
      : [],
  });
}

// ---------------------------------------------------------------------------
// FORMAT REPAIRERS — each is tagged FMT-*, auditable, and only ever touches
// structure. Any repair that would require inventing content is out of scope.
// ---------------------------------------------------------------------------
const CBC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC_URI = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

function rChars(xml, audit) {
  const re = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
  const hits = xml.match(re);
  if (!hits) return xml;
  const out = xml.replace(re, '');
  audit.push({
    rule: 'FMT-CHARS-01', action: 'remove', target: '/text()',
    old: JSON.stringify(hits.slice(0, 3)), new: '',
    reason: 'Control characters are not allowed in XML. Removed them.',
  });
  return out;
}

function rPrefix(xml, audit) {
  let out = xml;
  const map = { Cbc: 'cbc', CBC: 'cbc', Cac: 'cac', CAC: 'cac' };
  for (const [from, to] of Object.entries(map)) {
    const declRe = new RegExp(`xmlns:${from}=`, 'g');
    const openRe = new RegExp(`<${from}:`, 'g');
    const closeRe = new RegExp(`</${from}:`, 'g');
    const total =
      (xml.match(declRe) || []).length +
      (xml.match(openRe) || []).length +
      (xml.match(closeRe) || []).length;
    if (total > 0) {
      out = out
        .replace(declRe, `xmlns:${to}=`)
        .replace(openRe, `<${to}:`)
        .replace(closeRe, `</${to}:`);
      audit.push({
        rule: 'FMT-PREFIX-01', action: 'rename', target: `prefix ${from}: -> ${to}:`,
        old: `${total} occurrence(s)`, new: 'lowercase UBL prefix',
        reason: 'Prefix case did not match the UBL convention.',
      });
    }
  }
  return out;
}

function rNsUri(xml, audit) {
  let out = xml;
  for (const [prefix, correct] of [['cbc', CBC_URI], ['cac', CAC_URI]]) {
    const re = new RegExp(`xmlns:${prefix}="([^"]*)"`, 'g');
    let m;
    while ((m = re.exec(xml)) !== null) {
      const val = m[1];
      if (val !== correct) {
        out = out.replace(m[0], `xmlns:${prefix}="${correct}"`);
        audit.push({
          rule: 'FMT-NS-01', action: 'replace', target: `/Invoice/@xmlns:${prefix}`,
          old: val, new: correct, reason: 'Namespace URI did not match the UBL 2.1 schema.',
        });
      }
    }
  }
  return out;
}

function rAddNsDecl(xml, audit) {
  // If a prefixed element is used but the root does not declare it, add the
  // declaration. No content is invented — the binding is pure format.
  const rootMatch = xml.match(/<([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/);
  if (!rootMatch) return xml;
  const [, rootTag, attrs] = rootMatch;
  let out = xml;
  let insert = '';
  for (const [prefix, uri] of [['cbc', CBC_URI], ['cac', CAC_URI]]) {
    const used = new RegExp(`<${prefix}:|</${prefix}:`).test(xml);
    const declared = new RegExp(`xmlns:${prefix}=`).test(attrs);
    if (used && !declared) {
      insert += ` xmlns:${prefix}="${uri}"`;
      audit.push({
        rule: 'FMT-NS-02', action: 'add', target: `/Invoice/@xmlns:${prefix}`,
        old: '(missing)', new: uri, reason: 'Namespace declaration was missing.',
      });
    }
  }
  if (insert) out = out.replace(rootMatch[0], `<${rootTag}${attrs}${insert}>`);
  return out;
}

function rDecl(xml, audit) {
  const decl = xml.match(/^<\?xml[^?]*\?>/);
  if (!decl) return xml;
  const before = decl[0];
  const after = before.replace(/encoding="ISO-8859-1"/i, 'encoding="utf-8"');
  if (after === before) return xml;
  audit.push({
    rule: 'FMT-DECL-01', action: 'replace', target: '/processing-instruction(xml)',
    old: before, new: after, reason: 'Declared encoding did not match UTF-8.',
  });
  return xml.replace(before, after);
}

const FIXERS = [rChars, rPrefix, rNsUri, rAddNsDecl, rDecl];

// ---------------------------------------------------------------------------
// PIPELINE
// ---------------------------------------------------------------------------
function convert(xml, opts = {}) {
  const mode = opts.mode === 'format' ? 'format' : 'full';
  const inputHash = sha256(xml);

  // 1. Always-safe sanitize: strip illegal XML characters (no data semantics).
  const preAudit = [];
  const sanitized = rChars(xml, preAudit);

  // 2. Well-formedness gate. If it will not parse, we do NOT guess structure —
  //    that would require inventing content. The document is unrepairable.
  const v0 = XMLValidator.validate(sanitized);
  if (v0 !== true) {
    return {
      status: 'REFUSED', reason: 'UNREPAIRABLE_FORMAT',
      detail: 'Document is not well-formed. Structural repair would require inventing content.',
      validateHint: v0.err ? v0.err.msg : v0, inputHash, audit: [], blocked: [],
    };
  }
  let inv;
  try {
    inv = PARSER.parse(sanitized).Invoice;
  } catch (e) {
    return {
      status: 'REFUSED', reason: 'UNREPAIRABLE_FORMAT',
      detail: 'Document could not be parsed. Structural repair would require inventing content.',
      parseHint: e.message, inputHash, audit: [], blocked: [],
    };
  }

  // 3. Data-semantic guard. Any hit → REFUSE in full mode. No partial output,
  //    ever. In format-demo mode we still repair, but surface the data issues
  //    as warnings — the output is a draft for review, never for submission.
  const blocked = classifyDataSemantic(inv);
  if (blocked.length > 0 && mode === 'full') {
    const dryAudit = [];
    for (const fix of FIXERS) fix(xml, dryAudit); // dry-run: report what WOULD change
    return {
      status: 'REFUSED', reason: 'DATA_SEMANTIC',
      detail: 'Invoice has data errors that a converter must not fix. Repair the data first.',
      blocked,
      wouldFix: [...new Set(dryAudit.map((a) => a.rule))],
      inputHash, audit: [],
    };
  }

  // 4. Apply format-only repairers with audit. rChars already ran in step 1.
  const audit = [...preAudit];
  const fpBefore = dataFingerprint(inv);
  let out = sanitized;
  for (const fix of FIXERS.slice(1)) out = fix(out, audit);

  // 5. Verify well-formedness after repair.
  const v1 = XMLValidator.validate(out);
  if (v1 !== true) {
    return {
      status: 'REFUSED', reason: 'UNREPAIRABLE_FORMAT',
      detail: 'Repairers could not produce a well-formed document. Remaining issue would require inventing content.',
      validateHint: v1.err ? v1.err.msg : v1, inputHash, audit, blocked: [],
    };
  }

  // 6. Data-integrity self-check: fingerprint before/after must match.
  let afterInv;
  try {
    afterInv = PARSER.parse(out).Invoice;
  } catch (e) {
    return {
      status: 'ERROR', reason: 'DATA_CHANGED',
      detail: 'Internal guard: repaired document could not be parsed. Aborting.',
      parseHint: e.message, inputHash, audit, blocked: [],
    };
  }
  if (dataFingerprint(afterInv) !== fpBefore) {
    return {
      status: 'ERROR', reason: 'DATA_CHANGED',
      detail: 'Internal guard: a repairer altered data values. Aborting.',
      inputHash, audit, blocked: [],
    };
  }

  const outputHash = sha256(out);
  return {
    status: audit.length ? 'CONVERTED' : 'NOOP',
    changed: audit.length > 0,
    inputHash, outputHash, audit, blocked: [],
    dataIssues: mode === 'format' ? blocked : [],
    convertedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    output: out,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  if (args.includes('--all')) {
    const dir = path.join(__dirname, 'samples');
    const files = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.xml$/.test(f)).sort();
    console.log('file | status | changed | reason | audit | blocked | guard');
    console.log('-----|--------|---------|--------|-------|---------|------');
    for (const f of files) {
      const xml = fs.readFileSync(path.join(dir, f), 'utf8');
      const r = convert(xml);
      console.log(
        [f, r.status, String(r.changed ?? '-'), r.reason ?? '-', r.audit?.length ?? 0, r.blocked?.length ?? 0, r.reason === 'DATA_CHANGED' ? 'FAIL' : 'ok'].join(' | ')
      );
    }
    return;
  }
  const file = args[0];
  if (!file) { console.error('Usage: node convert.js <file.xml> | --all'); process.exit(1); }
  const xml = fs.readFileSync(file, 'utf8');
  console.log(JSON.stringify(convert(xml), null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { convert };
