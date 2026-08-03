// Spike 003 — fontoxpath as the Schematron interpreter (no Saxon, no Java).
// Proves: (a) XSLT-2.0-era XPath (the .sch's checksum functions) evaluates,
//         (b) namespaced asserts evaluate against the real invoice DOM.
const fs = require('fs');
const { DOMParser } = require('slimdom');
const {
  evaluateXPathToBoolean,
  evaluateXPathToNumber,
  evaluateXPathToStrings,
} = require('fontoxpath');

const domParser = new DOMParser();
const xml = fs.readFileSync('sample-valid.xml', 'utf8');
const invoiceDoc = domParser.parseFromString(xml, 'text/xml');
const root = invoiceDoc.documentElement;

// Namespace resolver from the invoice's own xmlns declarations.
const nsMap = {};
for (const a of root.attributes) {
  if (a.prefix === 'xmlns' || a.localName === 'xmlns') {
    nsMap[a.localName === 'xmlns' ? '' : a.localName] = a.value;
  }
}
const resolveNs = (prefix) => nsMap[prefix] || '';

const results = [];
const check = (name, cond, detail = '') => {
  results.push(!!cond);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// (a) u:gln checksum — the .sch's GLN validation function, as one XPath 3.1 let-expression.
// GLN 4006381333931 is a canonical valid GS1 test GLN.
const glnExprFor = (g) => `let $length := string-length('${g}') - 1,
    $digits := reverse(for $i in string-to-codepoints(substring('${g}', 0, $length + 1)) return $i - 48),
    $weightedSum := sum(for $i in (0 to $length - 1) return $digits[$i + 1] * (1 + ((($i + 1) mod 2) * 2)))
  return (10 - ($weightedSum mod 10)) mod 10 = number(substring('${g}', $length + 1, 1))`;
const gln = '4006381333931';
const glnBad = gln.slice(0, -1) + '8'; // corrupt check digit

check('u:gln accepts valid GLN', evaluateXPathToBoolean(glnExprFor(gln), root) === true);
check('u:gln rejects corrupt GLN', evaluateXPathToBoolean(glnExprFor(glnBad), root) === false);

// (b) real assertion shapes from the .sch, against the invoice DOM:
//     count of invoice lines >= 1 (IBR-016 family) with namespaces resolved
const lineCount = evaluateXPathToNumber(`count(/${root.localName}/cac:InvoiceLine)`, root, null, null, resolveNs);
check('IBR-016: at least one InvoiceLine', lineCount >= 1, `count=${lineCount}`);

// issue date present + YYYY-MM-DD (IBR-003 / IBR-073 family)
const issueDate = evaluateXPathToStrings(`/${root.localName}/cbc:IssueDate`, root, null, null, resolveNs)[0];
check('IBR-003: issue date present', Boolean(issueDate), issueDate);
check('IBR-073: issue date is YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(issueDate), issueDate);

// numbers: prove arithmetic-styled XPath works — note the explicit number()
// cast: fontoxpath's evaluateXPathToNumber returns NaN on element nodes that
// carry attributes (currencyID), so the interpreter must cast in XPath.
const taxAmt = evaluateXPathToNumber(`number(/${root.localName}/cac:TaxTotal/cbc:TaxAmount)`, root, null, null, resolveNs);
const taxable = evaluateXPathToNumber(`number(/${root.localName}/cac:TaxTotal/cac:TaxSubtotal/cbc:TaxableAmount)`, root, null, null, resolveNs);
check('BR-S-09 shape: VAT = taxable x 5%', Math.abs(taxAmt - taxable * 0.05) < 0.005, `${taxAmt} vs ${taxable * 0.05}`);

const failed = results.filter((r) => !r);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
