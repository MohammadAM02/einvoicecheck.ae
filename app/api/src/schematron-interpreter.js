/**
 * PINT AE Schematron interpreter — NODE-ONLY.
 *
 * Parses the official Peppol PINT AE .sch files (UBL validation + jurisdiction
 * rules), evaluates every <assert> against an invoice XML, and emits failures
 * in the engine's normalized error shape ({ path, rule, severity, message,
 * fix }).
 *
 * Custom XPath functions (u:*) are ported 1:1 from the <xsl:function> blocks
 * in the .sch. XPath evaluation uses fontoxpath (XPath 3.1) over a jsdom DOM.
 *
 * Lives OUTSIDE src/rules/: the rules tree is vendored byte-identical to the
 * browser tool (app/web/src/lib/rules), so only browser-safe adapters may
 * live there. This module is imported by the route layer (validate.js) and
 * the API tests; the vendored rules tree keeps only the browser-safe
 * schematronRule adapter (schematron.js).
 *
 * Files: app/api/schematron/*.sch (vendored from docs.peppol.eu/poac/ae/v1.0.1)
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import fp from 'fontoxpath';

const SCH_NS = 'http://purl.oclc.org/dsdl/schematron';
const SCH_DIR = path.join(import.meta.dirname, '..', 'schematron');
const SCH_FILES = ['PINT-UBL-validation-preprocessed.sch', 'PINT-jurisdiction-aligned-rules.sch'];

// ---------------------------------------------------------------------------
// Custom XPath functions — ported from the <xsl:function> blocks in the .sch.
// ---------------------------------------------------------------------------

/** GLN / GTIN-13 check digit (mod 10). */
function uGln(val) {
  const s = String(val);
  if (!/^\d+$/.test(s) || s.length < 2) return false;
  const len = s.length - 1;
  const digits = [...s.slice(0, len)].map((c) => c.charCodeAt(0) - 48).reverse();
  let sum = 0;
  for (let i = 0; i < len; i++) sum += digits[i] * (1 + (((i + 1) % 2) * 2));
  return (10 - (sum % 10)) % 10 === Number(s[len]);
}

/** Norwegian org no. check digit (mod 11). */
function uMod11(val) {
  const s = String(val);
  if (!/^\d+$/.test(s) || s.length < 2) return false;
  const len = s.length - 1;
  const digits = [...s.slice(0, len)].map((c) => c.charCodeAt(0) - 48).reverse();
  let sum = 0;
  for (let i = 0; i < len; i++) sum += digits[i] * ((i % 6) + 2);
  return Number(s) > 0 && (11 - (sum % 11)) % 11 === Number(s[len]);
}

/** Decimal tolerance check. */
function uSlack(exp, val, slack) {
  const e = Number(exp), v = Number(val), sl = Number(slack);
  return e + sl >= v && e - sl <= v;
}

/** IBAN-style mod 97-08 check. */
function uMod970208(val) {
  const s = String(val);
  if (s.length < 10) return false;
  const check = s.slice(8, 10);
  const calc = String(97 - (Number(s.slice(0, 8)) % 97));
  return Number(check) === Number(calc);
}

/** Italian IPA code: exactly 6 alphanumeric. */
function uCheckCodiceIPA(arg) {
  const s = String(arg);
  return /^[A-Za-z0-9]{6}$/.test(s);
}

/** Italian fiscal code: 16 (CF) or 11 (all digits). */
function uCheckCF(arg) {
  const s = String(arg);
  if (s.length === 16) return uCheckCF16(s);
  if (s.length === 11) return /^\d+$/.test(s);
  return false;
}

/** Italian fiscal code 16 format. */
function uCheckCF16(arg) {
  const s = String(arg);
  return /^[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z\d]{3}\d[A-Za-z]$/.test(s);
}

/** Italian VAT: 'IT' prefix + 11-digit valid PIVA. */
function uCheckPIVAseIT(arg) {
  const s = String(arg);
  if (!/^IT$/i.test(s.slice(0, 2))) return true;
  const codice = s.slice(2);
  return /^\d{11}$/.test(codice) && uCheckPIVA(codice) === 0;
}

/** Italian VAT check digit: 0 = valid. */
function uCheckPIVA(arg) {
  const s = String(arg);
  if (!/^\d+$/.test(s)) return 1;
  return uAddPIVA(s, 0) % 10;
}

/** Italian VAT recursive sum. */
function uAddPIVA(arg, pari) {
  const s = String(arg);
  if (!/^\d+$/.test(s) || s.length === 0) return 0;
  const mapper = pari === 1 ? '0246813579'[Number(s[0])] : s[0];
  return Number(mapper) + uAddPIVA(s.slice(1), pari === 0 ? 1 : 0);
}

/** Australian ABN check (mod 89). */
function uAbn(val) {
  const s = String(val);
  if (!/^\d{11}$/.test(s)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const cp = s.charCodeAt(i) - (i === 0 ? 49 : 48);
    sum += cp * weights[i];
  }
  return sum % 89 === 0;
}

// fontoxpath v3 passes the dynamic context as the FIRST JS parameter of every
// custom function — the leading `ctx` arg must be skipped.
fp.registerCustomXPathFunction('u:gln', ['xs:string'], 'xs:boolean', (ctx, v) => uGln(v));
fp.registerCustomXPathFunction('u:mod11', ['xs:string'], 'xs:boolean', (ctx, v) => uMod11(v));
fp.registerCustomXPathFunction('u:slack', ['xs:decimal', 'xs:decimal', 'xs:decimal'], 'xs:boolean', (ctx, e, v, s) => uSlack(e, v, s));
fp.registerCustomXPathFunction('u:mod97-0208', ['xs:string'], 'xs:boolean', (ctx, v) => uMod970208(v));
fp.registerCustomXPathFunction('u:checkCodiceIPA', ['xs:string'], 'xs:boolean', (ctx, v) => uCheckCodiceIPA(v));
fp.registerCustomXPathFunction('u:checkCF', ['xs:string'], 'xs:boolean', (ctx, v) => uCheckCF(v));
fp.registerCustomXPathFunction('u:checkCF16', ['xs:string'], 'xs:boolean', (ctx, v) => uCheckCF16(v));
fp.registerCustomXPathFunction('u:checkPIVAseIT', ['xs:string'], 'xs:boolean', (ctx, v) => uCheckPIVAseIT(v));
fp.registerCustomXPathFunction('u:checkPIVA', ['xs:string'], 'xs:integer', (ctx, v) => uCheckPIVA(v));
fp.registerCustomXPathFunction('u:addPIVA', ['xs:string', 'xs:integer'], 'xs:integer', (ctx, v, p) => uAddPIVA(v, p));
fp.registerCustomXPathFunction('u:abn', ['xs:string'], 'xs:boolean', (ctx, v) => uAbn(v));

// ---------------------------------------------------------------------------
// Compile the Schematron: patterns -> rules -> asserts.
// ---------------------------------------------------------------------------

const ASSERTS = [];
const NS_MAP = {};

function compile() {
  for (const file of SCH_FILES) {
    const xml = fs.readFileSync(path.join(SCH_DIR, file), 'utf8');
    const doc = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
    const all = (el, name) => Array.from(el.getElementsByTagNameNS(SCH_NS, name));

    for (const ns of all(doc, 'ns')) {
      const prefix = ns.getAttribute('prefix');
      if (prefix) NS_MAP[prefix] = ns.getAttribute('uri');
    }
    for (const pattern of all(doc, 'pattern')) {
      for (const rule of all(pattern, 'rule')) {
        const context = rule.getAttribute('context');
        for (const a of all(rule, 'assert')) {
          ASSERTS.push({
            id: a.getAttribute('id'),
            flag: a.getAttribute('flag') || 'fatal',
            context,
            test: a.getAttribute('test'),
            message: a.textContent.replace(/\s+/g, ' ').trim().replace(/^\[[^\]]*\]-/, ''),
          });
        }
      }
    }
  }
}
compile();

const nsResolver = (prefix) => NS_MAP[prefix] ?? null;

/** Build an XPath-ish path for an element node, e.g. /Invoice/cac:Party[2]. */
function xpathOf(node) {
  const parts = [];
  let n = node;
  while (n && n.nodeType === 1) {
    const name = n.prefix ? `${n.prefix}:${n.localName}` : n.localName;
    const siblings = n.parentNode
      ? Array.from(n.parentNode.childNodes).filter(
          (c) => c.nodeType === 1 && c.prefix === n.prefix && c.localName === n.localName
        )
      : [n];
    parts.unshift(siblings.length > 1 ? `${name}[${siblings.indexOf(n) + 1}]` : name);
    n = n.parentNode;
  }
  return '/' + parts.join('/');
}

/** Schematron contexts are XSLT match patterns. Absolute branches (/a) evaluate
 * as-is against the document; relative branches (a/b) match at any depth, so
 * they get a // prefix. Union branches are handled independently. */
function matchPattern(context) {
  return context
    .split('|')
    .map((b) => b.trim())
    .map((b) => (b.startsWith('/') ? b : '//' + b))
    .join(' | ');
}

/**
 * Evaluate the compiled Schematron against an invoice XML string.
 *
 * @returns {{ valid: boolean, errors: Array, evaluated: number, totalAsserts: number, evalErrors: Array }}
 */
export function validateSchematron(xml) {
  const doc = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
  const errors = [];
  const evalErrors = [];
  let evaluated = 0;

  for (const a of ASSERTS) {
    let contextNodes;
    try {
      contextNodes = fp.evaluateXPathToNodes(matchPattern(a.context), doc, null, null, { namespaceResolver: nsResolver });
    } catch {
      continue; // context expression invalid on this doc — nothing to test
    }
    for (const node of contextNodes) {
      evaluated++;
      let ok;
      try {
        ok = fp.evaluateXPathToBoolean(a.test, node, null, null, { namespaceResolver: nsResolver });
      } catch (e) {
        // Fail-closed: an assert that cannot be evaluated must not silently
        // pass. Surface it as an error (invalidating the document) so a rule
        // that can't run is visible, not a free pass. Kept in evalErrors too
        // for the route's diagnostic log.
        evalErrors.push({ rule: a.id, message: a.message, error: e.message });
        errors.push({
          path: xpathOf(node),
          rule: a.id,
          severity: a.flag === 'warning' ? 'warning' : 'error',
          message: `${a.message} (assert could not be evaluated: ${e.message})`,
          fix: '',
        });
        continue;
      }
      if (!ok) {
        errors.push({
          path: xpathOf(node),
          rule: a.id,
          severity: a.flag === 'warning' ? 'warning' : 'error',
          message: a.message,
          fix: '',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    evaluated,
    totalAsserts: ASSERTS.length,
    evalErrors,
  };
}
