# Converter Engine — Implementation Spec for Coding Agent

> **Target:** Task 3 of `docs/superpowers/plans/2026-08-01-converter-engine-proposal.md`
> **Prerequisite:** Task 1 complete — `@einvoicecheck/rules` shared package at `packages/rules/` (verified on main, v1.0.0, exports `validateInvoice`/`parseUblInvoice`/`normalizeInput`). Wiring required by this task: add `"@einvoicecheck/rules": "file:../../packages/rules"` to `app/api/package.json` + `npm install` — the API has not yet been repointed (routes still import `../rules/engine.js`).
> **Reference spike:** `spikes/001-converter-format-only/convert.js` — pipeline shape validated
> **Architecture:** Separate route `POST /v1/convert` (not a `?convert=format` flag on `/validate`). This task ships the pure converter module; route wiring + auth/rate-limit/usage-metering is Task 4 — see the "Route contract (Task 4)" section below.
> **Review:** amended 2026-08-02 per code review (F1–F17) — classifier semantics, fingerprint model, NOOP invariant, test fixes.

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

The spike's `classifyDataSemantic()` reimplements `ENG-REQ-*`, `ENG-TRN-*`, `ENG-LINE-01`, `ENG-TAX-09`, `ENG-TOT-15`, `ENG-NUM-01`. That drifts from the real engine. The production classifier does not reimplement rules — it **is** the engine:

```js
import { validateInvoice } from '@einvoicecheck/rules';

/**
 * classifyDataSemantic(xml) → { blocked, repairable }
 *
 * Key fact: fast-xml-parser (the engine's parser) is namespace-oblivious —
 * wrong prefix case, bad/missing xmlns URIs, and unbound prefixes NEVER
 * produce engine errors. Format defects are therefore invisible to the
 * engine, and any error the engine DOES report is data-semantic → REFUSE.
 *
 * repairable ⟺ zero errors. A post-gate ENG-PARSE-01 (wrong root element,
 * validator/parser disagreement) is beyond the repairers' scope — the
 * pipeline maps it to UNREPAIRABLE_FORMAT.
 */
export function classifyDataSemantic(xml) {
  const validation = validateInvoice(xml, 'application/xml');
  const blocked = validation.errors.filter((e) => e.severity === 'error');
  return { blocked, repairable: blocked.length === 0 };
}
```

Semantics:
- **Zero engine errors** → proceed to DOM format repair. The engine never sees the format defects, so they cannot trigger a refusal.
- **Any `ENG-*` error** → data-semantic → `REFUSED(DATA_SEMANTIC)` in full mode; reported as `dataIssues` warnings in format mode.
- **`ENG-PARSE-01` alone** → `REFUSED(UNREPAIRABLE_FORMAT)` — nothing to repair (wrong root element or structural defect the gate missed).
- **No hand-maintained rule logic, ever.**

### Repairer list (same 5, DOM-based)

| Repairer | Rule ID | What it fixes | DOM approach |
|----------|---------|---------------|--------------|
| Sanitize illegal chars | `FMT-CHARS-01` | Strip `\x00-\x08`, `\x0B\x0C`, `\x0E-\x1F`, `\xFFFE\xFFFF` | Runs on raw string BEFORE parsing (can't use DOM for invalid chars) |
| Prefix case | `FMT-PREFIX-01` | `Cbc:` → `cbc:`, `CAC:` → `cac:` | Rename elements/attributes in DOM (node.localName/node.prefix) |
| Namespace URI | `FMT-NS-01` | Wrong `xmlns:cbc="..."` URI | Set `xmlns` attributes on root element |
| Missing NS decl | `FMT-NS-02` | Add `xmlns:cac="..."` when used but not declared | SetAttribute on documentElement |
| Encoding decl | `FMT-DECL-01` | `encoding="ISO-8859-1"` → `encoding="utf-8"` | Runs on raw string BEFORE parse; after serialize, ensure the `utf-8` declaration survived (re-apply if the serializer drops the prolog) |

**Sanitize and encoding MUST run on raw strings** (illegal chars break DOM parsing; encoding is in the XML prolog which DOM doesn't expose well). Prefix case, NS URI, and missing NS run on the DOM.

## File Structure

```
app/api/src/rules/convert/
├── index.js          # Public API: convert(xml, opts) — main pipeline + ENGINE_VERSION constant
├── repairers.js      # 5 repairers (2 string-level: sanitizeChars, fixEncodingDecl; 3 DOM) + dryRun(xml)
├── classifier.js     # classifyDataSemantic(xml) using shared validateInvoice()
├── audit.js          # AuditEntry model + helpers (control chars JSON-escaped on output)
├── fingerprint.js    # dataFingerprint(canonicalInvoice) → SHA-256 of sorted-key JSON
└── pipeline.js       # Pipeline orchestrator (sanitize→decl→gate→classify→repair→verify→fingerprint→audit)

app/api/test/
├── convert.test.js   # Full test suite (see test cases below)
└── fixtures/convert/ # Sample XML files copied from the spike + 06-unbound-prefix.xml (test 12)
```

## Route contract (Task 4 — wiring is NOT this task)

`POST /v1/convert` — request: `{ xml: string, mode?: 'format' | 'full' }` (or raw XML body with `Content-Type: application/xml`); response: `ConvertResult` JSON. Must mirror the existing route's security posture (`app/api/src/routes/validate.js`): API-key auth, rate limiting, usage metering, no payload persistence. Task 4 wires the route + web UI; this task only ships the module. NOTE: the proposal's `?convert=format` flag on `/validate` is superseded by this architecture — amend Task 4's description accordingly.

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
  engineVersion: string;     // converter-local ENGINE_VERSION constant
  convertedAt: string;       // ISO 8601
}

// NOOP invariant: status === 'NOOP' ⟺ output === input, outputHash === inputHash,
// audit === []. The original bytes are returned unchanged — the DOM is never
// serialized when nothing changed.

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
import { validateInvoice, parseUblInvoice } from '@einvoicecheck/rules';
import { XMLValidator } from 'fast-xml-parser';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { classifyDataSemantic } from './classifier.js';
import { fingerprint } from './fingerprint.js';
import * as repairers from './repairers.js';

// refuse()/error() are small helpers building the ConvertResult:
// { status, reason?, detail?, ...extra, audit: [...], blocked: [], output: undefined }
export function convert(xml, opts = {}) {
  const mode = opts.mode === 'format' ? 'format' : 'full';
  const inputHash = sha256(xml);

  // 1. String-level repair — illegal chars and the encoding decl cannot be
  //    handled via DOM; both must run before any parse
  const sanitizeAudit = [];
  const sanitized = repairers.sanitizeChars(xml, sanitizeAudit);     // FMT-CHARS-01
  const declAudit = [];
  const declared = repairers.fixEncodingDecl(sanitized, declAudit);  // FMT-DECL-01

  // 2. Well-formedness gate (namespace-unaware: wrong-case/unbound prefixes
  //    pass here — they are the DOM repairers' job)
  if (XMLValidator.validate(declared) !== true) {
    return refuse('UNREPAIRABLE_FORMAT',
      'Document is not well-formed. Structural repair would require inventing content.',
      { inputHash, sanitizeAudit, declAudit });
  }

  // 3. Classify with the REAL engine. fast-xml-parser is namespace-oblivious,
  //    so format defects produce ZERO engine errors — any error here is
  //    data-semantic → REFUSE. A post-gate ENG-PARSE-01 (e.g. wrong root
  //    element) is beyond the repairers' scope → UNREPAIRABLE.
  const { blocked, repairable } = classifyDataSemantic(declared);
  if (!repairable) {
    const parseOnly = blocked.length === 1 && blocked[0].rule === 'ENG-PARSE-01';
    if (parseOnly) {
      return refuse('UNREPAIRABLE_FORMAT', 'Document could not be parsed.',
        { inputHash, sanitizeAudit, declAudit, parseHint: blocked[0].message });
    }
    if (mode === 'full') {
      return refuse('DATA_SEMANTIC', 'Invoice has data errors that a converter must not fix.', {
        inputHash, sanitizeAudit, declAudit, blocked,
        wouldFix: repairers.dryRun(declared), // throwaway parse: what WOULD change
      });
    }
    // format mode: continue — data issues become warnings (dataIssues below)
  }

  // 4. Fingerprint BEFORE repair — over the canonical invoice model (data
  //    values only; whitespace/attribute-order drift cannot false-positive)
  const invoiceBefore = parseUblInvoice(declared); // cannot throw here (step 3 passed)
  const fpBefore = fingerprint(invoiceBefore);

  // 5. DOM-based format repair. Parse is guarded: @xmldom's namespace
  //    strictness on unbound prefixes is unverified — never crash the pipeline
  let doc;
  try {
    doc = new DOMParser().parseFromString(declared, 'text/xml');
  } catch (e) {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not parse the document structure.',
      { inputHash, sanitizeAudit, declAudit, parseHint: e.message });
  }

  const repairAudit = [];
  for (const repairer of DOM_REPAIRERS) { // order: rPrefix → rNsUri → rAddNsDecl
    const { audit } = repairer(doc);
    repairAudit.push(...audit);
  }

  // 6. Serialize + re-validate. ensureDeclaration re-applies the XML
  //    declaration if the serializer dropped it (FMT-DECL-01 must be
  //    observable in the output).
  const output = ensureDeclaration(
    new XMLSerializer().serializeToString(doc), hadDeclaration(declared));
  if (XMLValidator.validate(output) !== true) {
    return refuse('UNREPAIRABLE_FORMAT', 'Repairers could not produce a well-formed document.',
      { inputHash, sanitizeAudit, declAudit, audit: repairAudit });
  }

  // 7. Fingerprint guard: same canonical model, must be identical
  let invoiceAfter;
  try {
    invoiceAfter = parseUblInvoice(output);
  } catch (e) {
    return error('DATA_CHANGED', 'Repaired document could not be parsed.',
      { inputHash, sanitizeAudit, declAudit, audit: repairAudit });
  }
  if (fingerprint(invoiceAfter) !== fpBefore) {
    return error('DATA_CHANGED', 'A repairer altered data values. Aborting.',
      { inputHash, sanitizeAudit, declAudit, audit: repairAudit });
  }

  // 8. Success — NOOP invariant: nothing changed ⇒ original bytes come back.
  //    anyChange counts ALL audits (string-level included), not just DOM
  //    repairers — an input with stripped illegal chars is CONVERTED, not NOOP.
  const anyChange = sanitizeAudit.length + declAudit.length + repairAudit.length > 0;
  const outputHash = anyChange ? sha256(output) : inputHash;

  return {
    status: anyChange ? 'CONVERTED' : 'NOOP',
    inputHash, outputHash,
    audit: [...sanitizeAudit, ...declAudit, ...repairAudit],
    blocked: [],
    dataIssues: mode === 'format' ? blocked : [],
    output: anyChange ? output : declared,
    engineVersion: ENGINE_VERSION, // converter-local constant — see Deliverables
    convertedAt: new Date().toISOString(),
  };
}
```

## Test Cases (write these FIRST)

### 1. Valid XML passes through unchanged
- Input: `samples/00-valid.xml` (valid PINT AE invoice)
- Expected: `status: NOOP`, `output` identical to input (short-circuit — original bytes returned, DOM never serialized), `outputHash === inputHash`, 0 audit entries

### 2. Format-only defects repaired
- Input: `samples/01-format-only.xml` (illegal chars, `Cbc:`, wrong NS URI, ISO-8859-1)
- Expected: `status: CONVERTED`, 4 repairer rules fire — FMT-CHARS-01, FMT-DECL-01, FMT-PREFIX-01, FMT-NS-01 — re-parsed output validates, `utf-8` declaration preserved in output
- Assert: fingerprint before == fingerprint after (data unchanged)
- Note: FMT-NS-02 cannot fire on this fixture (both `xmlns:` are declared) — it is covered by test 6

### 3. Data-semantic errors refused
- Input: `samples/02-data-semantic.xml` (bad TRN, bad totals, bad VAT)
- Expected: `status: REFUSED, reason: DATA_SEMANTIC`, `blocked` array non-empty, no output
- Assert: `blocked.length >= 4` (TRN, LINE, TAX, TOT)

### 4. Mixed: refuse, no partial repair
- Input: `samples/03-mixed.xml` (format defects + data errors)
- Expected: `status: REFUSED`, `wouldFix` lists format repairs (from `repairers.dryRun()`), no output
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

### 11. Format mode: repair, don't refuse
- Input: `samples/02-data-semantic.xml` with `mode: 'format'`
- Expected: `status: CONVERTED` (or `NOOP` if the sample has no format defects), `dataIssues` populated with the blocked `ENG-*` errors (`blocked.length >= 4`), audit present
- Assert: data issues reported as warnings, never `REFUSED(DATA_SEMANTIC)` in format mode

### 12. Unbound wrong-case prefix (adversarial, namespace edge)
- Input: `fixtures/convert/06-unbound-prefix.xml` — a valid invoice using `Cbc:` with NO `xmlns:Cbc` declared
- Expected: either `status: CONVERTED` (FMT-PREFIX-01 + FMT-NS-02 audits) or `status: REFUSED, reason: UNREPAIRABLE_FORMAT` if `@xmldom/xmldom` rejects the unbound prefix at parse/serialize — NEVER `ERROR`, NEVER a thrown exception (step-5 try/catch). Pin the actual outcome at spike time.

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
"@einvoicecheck/rules": "file:../../packages/rules",
"@xmldom/xmldom": "^0.9.x"
// or "@xmldom/xmldom": "^0.8.x"
```
Then run `npm install` in `app/api`. The `file:` reference is the proposal's sanctioned Task-1 wiring — the API has not been repointed yet, so the converter's imports will not resolve without it.

No XPath support in `@xmldom/xmldom` (neither 0.8.x nor 0.9.x) — `evaluate()` will NOT exist; use recursive traversal or `getElementsByTagName` per pitfall 6.

## Files NOT to touch

- `packages/rules/*` — shared rules package (Task 1, immutable for this task; only `app/api/package.json` gains the `file:` dependency)
- `app/api/src/routes/validate.js` — existing validate endpoint
- `app/api/src/rules/engine.js` — untouched; converter imports from `@einvoicecheck/rules`. No `convert` export is wired into engine.js (the proposal's original idea is superseded — `ENGINE_VERSION` is converter-local)
- `app/web/*` — UI wiring is Task 4, not Task 3

## Spike Samples

The spike's sample files are at `spikes/001-converter-format-only/samples/`.
Copy them to `app/api/test/fixtures/convert/` for the test suite. Create one
additional fixture: `06-unbound-prefix.xml` — a valid invoice using `Cbc:` with
NO `xmlns:Cbc` declared (drives test 12).

## Deliverables Checklist (coding agent must produce all of these)

- [ ] `app/api/src/rules/convert/index.js` — `convert(xml, opts)` public API + `ENGINE_VERSION` constant
- [ ] `app/api/src/rules/convert/pipeline.js` — orchestrator (NOOP short-circuit; audits on every refusal)
- [ ] `app/api/src/rules/convert/repairers.js` — 5 repairers (2 string, 3 DOM) + `dryRun(xml)`
- [ ] `app/api/src/rules/convert/classifier.js` — `classifyDataSemantic(xml)` using shared `validateInvoice()`
- [ ] `app/api/src/rules/convert/audit.js` — AuditEntry helpers
- [ ] `app/api/src/rules/convert/fingerprint.js` — `dataFingerprint(canonicalInvoice)` → SHA-256
- [ ] `app/api/test/convert.test.js` — 12 test cases (write FIRST, red-green)
- [ ] `app/api/test/fixtures/convert/` — sample XML files copied from spike + `06-unbound-prefix.xml`
- [ ] `app/api/package.json` — add `@einvoicecheck/rules` (`file:../../packages/rules`) + `@xmldom/xmldom`; run `npm install`
- [ ] `npm test` passes all 12 new convert tests + existing 19 API tests
- [ ] Adversarial test: verify fingerprint guard catches a rogue repairer
- [ ] Route contract (this doc's "Route contract" section) reviewed by a human before Task 4 starts

## Pitfalls (from the spike README)

1. **fast-xml-parser with `parseTagValue: false`**: attributed elements parse as objects `{ '#text': ..., '@_currencyID': ... }`. Always use `textOf()` / `numOf()` to unwrap. `numOf(null)` → `null` → blocking, never silent skip (Fault #1).

2. **DOM serialization**: `XMLSerializer` may reorder attributes, change quote style, or add/remove whitespace. The fingerprint guard and re-validation step must handle this. Test with adversarial round-trips.

3. **Encoding re-declaration**: `encoding="ISO-8859-1"` → `encoding="utf-8"` is only safe when content is ASCII-clean. Production needs byte-level encoding detection. For now, the repairer fires only when the decl exists and differs — the fingerprint guard catches any corruption.

4. **Classifier must NOT reimplement engine rules**: Import `validateInvoice` from `@einvoicecheck/rules`. Any `ENG-*` error → data-semantic → REFUSE. Never duplicate rule logic.

5. **DOM repairers are per-node**: Unlike regex (which can batch 63 renames into 1 audit row), DOM repairers produce 1 audit entry per affected node. This is correct behaviour — the spike said regex audit was "best-effort."

6. **`@xmldom/xmldom` XPath support**: `evaluate()` is NOT available (neither 0.8.x nor 0.9.x). Use recursive traversal or `getElementsByTagName` with namespace awareness.

7. **`@xmldom/xmldom` namespace strictness**: behavior on unbound prefixes (`Cbc:` without `xmlns:Cbc`) is unverified — it may tolerate, mangle, or reject at parse/serialize time. Step-5 parse is wrapped in try/catch → `REFUSED(UNREPAIRABLE_FORMAT)`; test 12 pins the outcome. If the serializer drops the XML declaration, re-apply it (`ensureDeclaration`) — FMT-DECL-01 must be observable in output.

8. **fast-xml-parser is namespace-oblivious**: wrong prefix case, bad/missing `xmlns:` URIs, and unbound prefixes NEVER produce engine errors. That is why the classifier's repairable test is "zero `ENG-*` errors" — NOT "parse failed → repair". A post-gate parse failure (`ENG-PARSE-01`, e.g. wrong root element) is beyond the repairers' scope → `UNREPAIRABLE_FORMAT`.

## Self-Check Before Shipping

- [ ] All 12 test cases pass
- [ ] Existing 19 API tests still pass (no regression)
- [ ] `node spikes/001-converter-format-only/convert.js --all` still produces the same table
- [ ] Adversarial test PASSES (rogue repairer caught by fingerprint guard)
- [ ] Fingerprint guard tested with valid → repair → re-parse cycle
- [ ] NOOP invariant verified: valid input → `output === input`, `outputHash === inputHash`, empty audit
- [ ] Format-mode test passes (`dataIssues` populated, `CONVERTED`/`NOOP`, never `REFUSED`)
- [ ] `@einvoicecheck/rules` import resolves (`npm install` with the `file:` dependency)
- [ ] No `require()` anywhere — all ESM
- [ ] No hand-maintained rule logic in classifier — imports from `@einvoicecheck/rules`
