# Converter Engine — Implementation Spec for Coding Agent

> **Target:** Task 3 of `docs/superpowers/plans/2026-08-01-converter-engine-proposal.md`
> **Prerequisite:** Task 1 complete (`@einvoicecheck/rules` shared package at `packages/rules/`)
> **Reference spike:** `spikes/001-converter-format-only/convert.js` — pipeline shape validated
> **Architecture:** Separate route `POST /v1/convert` (not a `?convert=format` flag on `/validate`)

## What stays from the spike

The spike's **pipeline shape** is correct. Keep it:

```
sanitize → well-formedness gate → data-semantic classifier → (refuse | repair) →
re-validate → data-integrity fingerprint → audit + SHA-256 hashes
```

The spike's **refuse semantics** are correct. Keep all three refusal reasons:

| Status | Reason | When |
|--------|--------|------|
| `REFUSED` | `UNREPAIRABLE_FORMAT` | XML won't parse; structural repair would invent content |
| `REFUSED` | `DATA_SEMANTIC` | Invoice has data errors (TRN, amounts, arithmetic); converter never invents data |
| `ERROR` | `DATA_CHANGED` | Fingerprint guard caught a repairer altering data — internal defect, abort |

The spike's **fingerprint guard** and **audit model** are correct. Keep them.

## What changes from the spike

### 1. ESM, not CommonJS

Everything is `import`/`export`. No `require()`, no `module.exports`.

### 2. DOM-based repairers, not regex

The spike uses regex for all 5 repairers (`rChars`, `rPrefix`, `rNsUri`, `rAddNsDecl`, `rDecl`).
Regex repairers produce **aggregated audit entries** (63 prefix renames → 1 row).
Production needs **per-node audit entries** with exact XPath targets.

Replace with `@xmldom/xmldom`:

```bash
cd app/api && npm install @xmldom/xmldom
```

Each repairer now:
- Receives a parsed DOM `Document`
- Mutates it in-place
- Returns `{ changed: boolean, audit: AuditEntry[] }`
- Audit entries carry: `{ rule, action, target (XPath), old, new, reason }`

The pipeline serializes the DOM back to XML with `XMLSerializer` after all repairers run.

**Critical risk:** DOM serialization can reorder attributes, introduce/remove whitespace, or change quote style. The fingerprint guard **must** catch any data drift, and the re-validation step **must** catch any structural breakage. Adversarial test required.

### 3. Classifier from shared rules, not hand-maintained

The spike's `classifyDataSemantic()` reimplements `ENG-REQ-*`, `ENG-TRN-*`, `ENG-LINE-01`, `ENG-TAX-09`, `ENG-TOT-15`, `ENG-NUM-01`. This will drift from the real engine.

Replace with: call `validateInvoice()` from `@einvoicecheck/rules` and classify which errors are data-semantic:

```js
import { validateInvoice } from '@einvoicecheck/rules';

function classify(invoice, errors) {
  const blocked = [];
  const formatOnly = [];
  for (const e of errors) {
    // Format-only rules: missing namespace decls, encoding, prefix case
    // → the converter CAN fix these
    if (e.rule.startsWith('FMT-')) {
      formatOnly.push(e);
    } else {
      // Everything else: data-semantic → converter MUST refuse
      blocked.push(e);
    }
  }
  return { blocked, formatOnly };
}
```

Wait — the engine doesn't produce `FMT-*` errors. It produces `ENG-*` errors. The classifier needs to distinguish:

- **Data-semantic (REFUSE):** any error the engine would report — TRN, amounts, VAT, totals, required fields
- **Format-only (OK to repair):** errors the engine CAN'T see because the XML won't parse (bad prefixes, missing NS decls, illegal chars, wrong encoding)

So the classifier logic is simpler than I thought:

```js
// If validateInvoice() produces ANY ENG-* error → data-semantic → REFUSE
// The format repairers fix things the engine never sees (well-formedness issues)
```

The classifier calls `normalizeInput()` (which calls `parseUblInvoice()`). If parsing fails with a structural error, that's format-only — the repairers can fix it. If parsing succeeds but validation produces errors, those are data-semantic.

**Revised approach:** The classifier IS the engine's parser. If the engine can parse the invoice, classification runs and any engine error → REFUSE. If the engine can't parse, format repairers attempt to fix structure, then re-parse.

### Repairer list (same 5, DOM-based)

| Repairer | Rule ID | What it fixes | DOM approach |
|----------|---------|---------------|--------------|
| Sanitize illegal chars | `FMT-CHARS-01` | Strip `\x00-\x08`, `\x0B\x0C`, `\x0E-\x1F`, `\xFFFE\xFFFF` | Runs on raw string BEFORE parsing (can't use DOM for invalid chars) |
| Prefix case | `FMT-PREFIX-01` | `Cbc:` → `cbc:`, `CAC:` → `cac:` | Rename elements/attributes in DOM (node.localName/node.prefix) |
| Namespace URI | `FMT-NS-01` | Wrong `xmlns:cbc="..."` URI | Set `xmlns` attributes on root element |
| Missing NS decl | `FMT-NS-02` | Add `xmlns:cac="..."` when used but not declared | SetAttribute on documentElement |
| Encoding decl | `FMT-DECL-01` | `encoding="ISO-8859-1"` → `encoding="utf-8"` | Runs on raw string before parse OR on XMLSerializer output |

**Sanitize and encoding MUST run on raw strings** (illegal chars break DOM parsing; encoding is in the XML prolog which DOM doesn't expose well). Prefix case, NS URI, and missing NS run on the DOM.

## File Structure

```
app/api/src/rules/convert/
├── index.js          # Public API: convert(xml, opts) — main pipeline
├── repairers.js      # 5 repairer functions (2 string-level, 3 DOM-level)
├── classifier.js     # classifyDataSemantic(invoice) using validateInvoice()
├── audit.js          # AuditEntry model + helpers
├── fingerprint.js    # dataFingerprint(invoice) → SHA-256-able string
└── pipeline.js       # Pipeline orchestrator (sanitize→gate→classify→repair→verify→fingerprint→audit)

app/api/test/
└── convert.test.js   # Full test suite (see test cases below)
```

## Interfaces

### `convert(xml, opts?)` → `ConvertResult`

```ts
interface ConvertOptions {
  mode?: 'format' | 'full';  // default: 'full'
}

interface ConvertResult {
  status: 'CONVERTED' | 'NOOP' | 'REFUSED' | 'ERROR';
  reason?: 'UNREPAIRABLE_FORMAT' | 'DATA_SEMANTIC' | 'DATA_CHANGED';
  detail?: string;
  parseHint?: string;

  inputHash: string;         // SHA-256 of input XML
  outputHash?: string;       // SHA-256 of output XML (CONVERTED/NOOP only)

  audit: AuditEntry[];       // Every change, every repairer
  blocked: BlockedIssue[];   // Data-semantic issues that caused REFUSE
  dataIssues: BlockedIssue[];// Warnings in format mode (draft for review)

  output?: string;           // Repaired XML (CONVERTED/NOOP only)
  engineVersion: string;
  convertedAt: string;       // ISO 8601
}

interface AuditEntry {
  rule: string;     // e.g. 'FMT-PREFIX-01'
  action: string;   // 'rename' | 'replace' | 'add' | 'remove'
  target: string;   // XPath to the affected node
  old: string;
  new: string;
  reason: string;
}

interface BlockedIssue {
  rule: string;     // e.g. 'ENG-TRN-01/BR-01'
  path: string;     // e.g. '/supplier/trn'
  message: string;
}
```

## Pipeline Pseudocode

```js
export function convert(xml, opts = {}) {
  const mode = opts.mode === 'format' ? 'format' : 'full';
  const inputHash = sha256(xml);

  // 1. Sanitize illegal XML chars (string-level — must run before DOM parse)
  const sanitizeAudit = [];
  const sanitized = repairers.sanitizeChars(xml, sanitizeAudit);

  // 2. Well-formedness gate
  const v0 = XMLValidator.validate(sanitized);
  if (v0 !== true) {
    return REFUSED('UNREPAIRABLE_FORMAT', 'Document is not well-formed. Structural repair would require inventing content.', { inputHash });
  }

  // 3. Parse + classify
  let inv;
  try { inv = PARSER.parse(sanitized).Invoice; } catch (e) {
    return REFUSED('UNREPAIRABLE_FORMAT', 'Document could not be parsed.', { inputHash, parseHint: e.message });
  }

  // 3a. Data-semantic classification: run the REAL engine
  const validation = validateInvoice(sanitized, 'application/xml');
  const blocked = validation.errors.filter(e => e.severity === 'error');

  if (blocked.length > 0 && mode === 'full') {
    return REFUSED('DATA_SEMANTIC', 'Invoice has data errors that a converter must not fix.', {
      inputHash, blocked,
      wouldFix: repairers.listFormatFixes(sanitized), // dry-run: what WOULD change
    });
  }

  // 4. DOM-based format repair
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(sanitized, 'text/xml');
  const fpBefore = fingerprint(doc);

  const repairAudit = [];
  let anyChange = false;
  for (const repairer of DOM_REPAIRERS) {
    const { changed, audit } = repairer(doc);
    if (changed) anyChange = true;
    repairAudit.push(...audit);
  }

  // 5. Serialize + re-validate
  const serializer = new XMLSerializer();
  const output = serializer.serializeToString(doc);
  const v1 = XMLValidator.validate(output);
  if (v1 !== true) {
    return REFUSED('UNREPAIRABLE_FORMAT', 'Repairers could not produce a well-formed document.', { inputHash, audit: repairAudit });
  }

  // 6. Fingerprint guard: re-parse output and compare fingerprints
  let outDoc;
  try { outDoc = PARSER.parse(output).Invoice; } catch (e) {
    return ERROR('DATA_CHANGED', 'Repaired document could not be parsed.', { inputHash, audit: repairAudit });
  }
  if (fingerprint(outDoc) !== fpBefore) {
    return ERROR('DATA_CHANGED', 'A repairer altered data values. Aborting.', { inputHash, audit: repairAudit });
  }

  // 7. Success
  const outputHash = sha256(output);
  const audit = [...sanitizeAudit, ...repairAudit];

  return {
    status: anyChange ? 'CONVERTED' : 'NOOP',
    inputHash, outputHash,
    audit,
    blocked: [],
    dataIssues: mode === 'format' ? blocked : [],
    output,
    engineVersion: ENGINE_VERSION,
    convertedAt: new Date().toISOString(),
  };
}
```

## Test Cases (write these FIRST)

### 1. Valid XML passes through unchanged
- Input: `samples/00-valid.xml` (valid PINT AE invoice)
- Expected: `status: NOOP`, `output` identical to input, 0 audit entries

### 2. Format-only defects repaired
- Input: `samples/01-format-only.xml` (illegal chars, `Cbc:`, wrong NS URI, ISO-8859-1)
- Expected: `status: CONVERTED`, all 5 repairers fire, re-parsed output validates
- Assert: fingerprint before == fingerprint after (data unchanged)

### 3. Data-semantic errors refused
- Input: `samples/02-data-semantic.xml` (bad TRN, bad totals, bad VAT)
- Expected: `status: REFUSED, reason: DATA_SEMANTIC`, `blocked` array non-empty, no output
- Assert: `blocked.length >= 4` (TRN, LINE, TAX, TOT)

### 4. Mixed: refuse, no partial repair
- Input: `samples/03-mixed.xml` (format defects + data errors)
- Expected: `status: REFUSED`, `wouldFix` lists format repairs, no output
- Assert: format was NOT applied (original preserved)

### 5. Unrepairable: refuse, never guess
- Input: `samples/04-unrepairable.xml` (unclosed root element)
- Expected: `status: REFUSED, reason: UNREPAIRABLE_FORMAT`, no output

### 6. Missing namespace declaration: repaired
- Input: `samples/05-missing-ns.xml` (uses `cac:` but no `xmlns:cac`)
- Expected: `status: CONVERTED`, 1 audit entry (FMT-NS-02), fingerprint matches

### 7. Adversarial: rogue repairer mutating data (regression)
- Write a temporary repairer that changes `cbc:ID` value
- Add to pipeline, run on valid XML
- Expected: `status: ERROR, reason: DATA_CHANGED`, no output
- Then remove rogue repairer

### 8. DOM round-trip preserves XML structure
- Parse valid XML → serialize without any repair → re-parse
- Assert: re-parsed Invoice.ID == original Invoice.ID
- Assert: re-parsed Invoice line count == original line count
- Assert: fingerprint before == fingerprint after

### 9. Empty/missing TRN handled explicitly
- xml with `<cbc:CompanyID></cbc:CompanyID>` on supplier
- Expected: `ENG-TRN-01` in blocked (data-semantic → REFUSE)
- The converter must never invent a TRN

### 10. fast-xml-parser #text unwrapping
- xml with `currencyID="AED"` on line amounts
- Assert: `textOf()` correctly unwraps `{ '#text': '500.00', '@_currencyID': 'AED' }` → `'500.00'`
- Assert: `numOf()` correctly parses to `500`
- Assert: `numOf(null)` → `null` (blocking, never silent skip)

## DOM Repairer Implementation Notes

### rPrefix (FMT-PREFIX-01) — DOM-based

```js
// Old regex approach (aggregated):
// xml.replace(/<Cbc:/g, '<cbc:').replace(/<\/Cbc:/g, '</cbc:')

// New DOM approach (per-node):
function rPrefix(doc, audit) {
  const map = { Cbc: 'cbc', CBC: 'cbc', Cac: 'cac', CAC: 'cac' };
  let changed = false;
  for (const [from, to] of Object.entries(map)) {
    // Find all elements with this prefix
    const xpath = `//*[starts-with(name(), "${from}:")]`;
    const nodes = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < nodes.snapshotLength; i++) {
      const el = nodes.snapshotItem(i);
      const newName = el.localName; // same local, different prefix
      // DOM Level 2 doesn't support rename — reconstruct
      const newEl = doc.createElementNS(el.namespaceURI, `${to}:${el.localName}`);
      // copy attributes, children
      while (el.attributes.length > 0) {
        const attr = el.attributes[0];
        newEl.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
        el.removeAttributeNode(attr);
      }
      while (el.firstChild) newEl.appendChild(el.firstChild);
      el.parentNode.replaceChild(newEl, el);
      audit.push({ rule: 'FMT-PREFIX-01', action: 'rename', target: getXPath(newEl),
        old: `${from}:${el.localName}`, new: `${to}:${el.localName}`,
        reason: 'Prefix case did not match UBL convention.' });
      changed = true;
    }
  }
  return { changed, audit };
}
```

**Risk:** `@xmldom/xmldom` may not support `evaluate()` (XPath). Check at spike time. Fallback: recursive tree walk with `getElementsByTagNameNS` or manual traversal.

### rNsUri (FMT-NS-01) — DOM-based

```js
function rNsUri(doc, audit) {
  const correct = {
    cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  };
  let changed = false;
  const root = doc.documentElement;
  for (const [prefix, uri] of Object.entries(correct)) {
    const attrName = `xmlns:${prefix}`;
    const current = root.getAttribute(attrName);
    if (current && current !== uri) {
      root.setAttribute(attrName, uri);
      audit.push({
        rule: 'FMT-NS-01', action: 'replace',
        target: `/Invoice/@${attrName}`,
        old: current, new: uri,
        reason: 'Namespace URI did not match UBL 2.1 schema.',
      });
      changed = true;
    }
  }
  return { changed, audit };
}
```

### rAddNsDecl (FMT-NS-02) — DOM-based

```js
function rAddNsDecl(doc, audit) {
  const decls = {
    cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  };
  let changed = false;
  const root = doc.documentElement;

  // Check if prefix is used anywhere in the document but not declared
  for (const [prefix, uri] of Object.entries(decls)) {
    const used = root.getElementsByTagNameNS(uri, '*').length > 0 ||
                 [...root.attributes].some(a => a.prefix === prefix);
    const declared = root.hasAttribute(`xmlns:${prefix}`);
    if (used && !declared) {
      root.setAttribute(`xmlns:${prefix}`, uri);
      audit.push({
        rule: 'FMT-NS-02', action: 'add',
        target: `/Invoice/@xmlns:${prefix}`,
        old: '(missing)', new: uri,
        reason: 'Namespace declaration was missing.',
      });
      changed = true;
    }
  }
  return { changed, audit };
}
```

## Dependencies to Add

```json
// app/api/package.json — add to dependencies:
"@xmldom/xmldom": "^0.9.x"
// or
"@xmldom/xmldom": "^0.8.x"  // check latest stable for XPath support
```

## Files NOT to touch

- `packages/rules/src/*` — shared rules package (Task 1, immutable for this task)
- `app/api/src/routes/validate.js` — existing validate endpoint
- `app/api/src/rules/engine.js` — still exists; converter imports from shared package
- `app/web/*` — UI wiring is Task 4, not Task 3

## Spike Samples

The spike's sample files are at `spikes/001-converter-format-only/samples/`.
Copy them to `app/api/test/fixtures/convert/` for the test suite.

## Deliverables Checklist (coding agent must produce all of these)

- [ ] `app/api/src/rules/convert/index.js` — `convert(xml, opts)` public API
- [ ] `app/api/src/rules/convert/pipeline.js` — orchestrator
- [ ] `app/api/src/rules/convert/repairers.js` — 5 repairers (2 string, 3 DOM)
- [ ] `app/api/src/rules/convert/classifier.js` — `classifyDataSemantic(invoice)` using shared rules
- [ ] `app/api/src/rules/convert/audit.js` — AuditEntry helpers
- [ ] `app/api/src/rules/convert/fingerprint.js` — `dataFingerprint(doc)` pre/post hash
- [ ] `app/api/test/convert.test.js` — 10 test cases (write FIRST, red-green)
- [ ] `app/api/test/fixtures/convert/` — sample XML files copied from spike
- [ ] `app/api/package.json` — add `@xmldom/xmldom` dependency
- [ ] `npm test` passes all 10 new convert tests + existing 19 API tests
- [ ] Adversarial test: verify fingerprint guard catches a rogue repairer

## Pitfalls (from the spike README)

1. **fast-xml-parser with `parseTagValue: false`**: attributed elements parse as objects `{ '#text': ..., '@_currencyID': ... }`. Always use `textOf()` / `numOf()` to unwrap. `numOf(null)` → `null` → blocking, never silent skip (Fault #1).

2. **DOM serialization**: `XMLSerializer` may reorder attributes, change quote style, or add/remove whitespace. The fingerprint guard and re-validation step must handle this. Test with adversarial round-trips.

3. **Encoding re-declaration**: `encoding="ISO-8859-1"` → `encoding="utf-8"` is only safe when content is ASCII-clean. Production needs byte-level encoding detection. For now, the repairer fires only when the decl exists and differs — the fingerprint guard catches any corruption.

4. **Classifier must NOT reimplement engine rules**: Import `validateInvoice` from `@einvoicecheck/rules`. Any `ENG-*` error → data-semantic → REFUSE. Never duplicate rule logic.

5. **DOM repairers are per-node**: Unlike regex (which can batch 63 renames into 1 audit row), DOM repairers produce 1 audit entry per affected node. This is correct behaviour — the spike said regex audit was "best-effort."

6. **`@xmldom/xmldom` XPath support**: Check if `evaluate()` is available. If not, use recursive traversal or `getElementsByTagName` with namespace awareness.

## Self-Check Before Shipping

- [ ] All 10 test cases pass
- [ ] Existing 19 API tests still pass (no regression)
- [ ] `node spikes/001-converter-format-only/convert.js --all` still produces the same table
- [ ] Adversarial test PASSES (rogue repairer caught by fingerprint guard)
- [ ] Fingerprint guard tested with valid → repair → re-parse cycle
- [ ] No `require()` anywhere — all ESM
- [ ] No hand-maintained rule logic in classifier — imports from `@einvoicecheck/rules`
