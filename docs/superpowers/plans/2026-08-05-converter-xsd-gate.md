# Converter XSD Gate + Client Validation Layers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real UBL 2.1 XSD structural validation to the converter engine (non-blocking `dataIssues`) and segment the web validator's error list into Format / Structure / Semantic layer badges.

**Architecture:** Two independent deliverables. (1) Server: a new `xsd.js` module in `app/api/src/rules/convert/` loads vendored OASIS UBL 2.1 XSDs via `libxmljs2` at startup; the converter pipeline calls `validateXsd()` after the well-formedness gate and merges issues into `dataIssues` on every outcome — never `blocked`. (2) Client: a `rule → layer` mapper in `validation-ui.ts` plus layer badges + filtering in `ValidationSummary`/`ValidationIssueList`. The Schematron interpreter at `/v1/validate` is untouched.

**Tech Stack:** Node ESM, fastify, libxmljs2 (native XSD 1.0), fontoxpath/jsdom (existing), fast-xml-parser, vitest (API + web), React + @testing-library/react (web).

## Global Constraints

- `libxmljs2` is a native module — Railway build must find prebuilds for the pinned Node version. **Spike (Task 1) gates everything.**
- XSD issues NEVER enter `blocked` — non-blocking by design, in both `format` and `full` modes.
- XSD issues surface on EVERY outcome: CONVERTED, NOOP, REFUSED.
- XSD eval failure on a document → surfaced as a dataIssue (fail-closed), never a silent pass.
- XSD schema load failure at startup → throw at module load (fail loud).
- Fingerprint guard must remain unchanged and passing — proof that no data was invented.
- The web badges are CLIENT-ONLY — no API shape change, no server `category` field.
- Rule → layer mapping: `format` = `ENG-PARSE-*`, `FMT-*`; `structure` = `XSD-*`, `ENG-XSD-*`; `semantic` = everything else.
- No change to `/v1/validate`, `schematron.js` interpreter, or the Schematron route wiring.
- CreditNote-2.1.xsd is out of scope.

---

### Task 1: Spike — prove libxmljs2 + vendored UBL 2.1 XSDs work

**Files:**
- Create: `spikes/004-xsd-spike/package.json`
- Create: `spikes/004-xsd-spike/spike-test.mjs`
- Create: `docs/pint-ae-resources/ubl-2.1/README.md`

**Interfaces:**
- Consumes: nothing (throwaway spike)
- Produces: a go/no-go on `libxmljs2` + the exact vendored XSD layout. If go, Task 2 uses the same layout; if no-go, stop and reassess (per spec Risk section).

- [ ] **Step 1: Download the OASIS UBL 2.1 XSD set**

```bash
mkdir -p spikes/004-xsd-spike/ubl-2.1
cd spikes/004-xsd-spike/ubl-2.1
# OASIS UBL 2.1 XSD zip (canonical release artifact)
curl -L -o ubl-2.1.zip "https://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/UBL-2.1.zip" \
  || curl -L -o ubl-2.1.zip "https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.zip"
unzip -o ubl-2.1.zip
rm ubl-2.1.zip
find . -name "UBL-Invoice-2.1.xsd" -o -name "UBL-CommonAggregateComponents-2.1.xsd"
```

Expected: the zip extracts with `maindoc/`, `common/`, `commonbasiccomponents/` subdirectories containing the UBL 2.1 schema files. If both URLs 404, fetch the release from the OASIS UBL TC page (`https://www.oasis-open.org/committees/tc_home.php?wg_abbrev=ubl` → "2.1 XSD" artifact) and note the actual URL in the README.

- [ ] **Step 2: Install libxmljs2 in the spike**

```bash
cd spikes/004-xsd-spike
npm init -y
npm install libxmljs2
```

Expected: install succeeds (native prebuild or local build). Record the Node version (`node --version`) — this is the Railway-compat data point.

- [ ] **Step 3: Write the spike test**

```js
// spikes/004-xsd-spike/spike-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const xsdPath = path.join('ubl-2.1', 'maindoc', 'UBL-Invoice-2.1.xsd');
const schema = libxmljs.parseXml(fs.readFileSync(xsdPath, 'utf8'));

// Official PINT AE example — valid UBL 2.1 structure
const xml = fs.readFileSync(
  path.join('..', '..', 'app', 'api', 'schematron', 'examples', 'Standard tax invoice.xml'),
  'utf8');
const doc = libxmljs.parseXml(xml);

const ok = doc.validate(schema);
console.log('valid:', ok);
if (!ok) {
  console.log('validation errors:', doc.validationErrors.map((e) => e.message));
}

// Deliberately broken: swap element order (IssueDate after InvoiceTypeCode)
const broken = xml.replace(
  '<cbc:ID>', '<cbc:ID>').replace('<cbc:IssueDate>', '<cbc:IssueDate>');
const brokenDoc = libxmljs.parseXml(broken);
console.log('broken-valid:', brokenDoc.validate(schema));
console.log('broken errors:', brokenDoc.validationErrors.map((e) => e.message));
```

Expected: the official example validates (or fails with *only* datatype-level issues — record the truth), and the broken variant reports errors. The KEY acceptance criteria: **relative `import schemaLocation` chains resolve** — if libxml2 complains "failed to load external entity" for `common/…xsd`, the spike must switch to loading via `file://` base URIs or concatenating the schema files; record the working approach for Task 2.

- [ ] **Step 4: Run the spike**

```bash
cd spikes/004-xsd-spike
node spike-test.mjs
```

Expected: prints `valid: true` (or a truthful list of errors for the official example) and shows the broken variant failing. This step PROVES the engine choice before any production code.

- [ ] **Step 5: Write the vendored-dir README (source + license) even if the spike is throwaway**

```markdown
# UBL 2.1 XSD (vendored)

Source: OASIS UBL 2.1 (https://docs.oasis-open.org/ubl/os-UBL-2.1/).
License: OASIS Open — vendorable; see OASIS UBL 2.1 license terms at the source URL.
Purpose: structural (XSD) validation for the converter engine's XSD gate.
Layout preserved from the official zip so relative import schemaLocation chains resolve.
```

- [ ] **Step 6: Commit the spike + README**

```bash
git add spikes/004-xsd-spike docs/pint-ae-resources/ubl-2.1/README.md
git commit -m "spike(xsd): libxmljs2 + vendored UBL 2.1 XSD proof"
```

Expected: committed. If the spike failed, do NOT commit — stop and reassess with the user.

---

### Task 2: Vendor the UBL 2.1 XSD set + add libxmljs2 dependency

**Files:**
- Create: `docs/pint-ae-resources/ubl-2.1/maindoc/UBL-Invoice-2.1.xsd` (+ the full official tree — aggregate/basic/extension/data-type components)
- Modify: `app/api/package.json` (add `libxmljs2`)

**Interfaces:**
- Consumes: Task 1's verified XSD layout + working libxmljs2 load approach
- Produces: `docs/pint-ae-resources/ubl-2.1/**/*.xsd` on disk; `libxmljs2` in `app/api/package.json` — Task 3 imports it

- [ ] **Step 1: Copy the verified XSD tree into the repo**

```bash
mkdir -p docs/pint-ae-resources/ubl-2.1
cp -r spikes/004-xsd-spike/ubl-2.1/maindoc docs/pint-ae-resources/ubl-2.1/
cp -r spikes/004-xsd-spike/ubl-2.1/common docs/pint-ae-resources/ubl-2.1/
cp -r spikes/004-xsd-spike/ubl-2.1/commonbasiccomponents docs/pint-ae-resources/ubl-2.1/
# and any other top-level dirs the official layout has (commonqualifieddatatypes, etc.)
```

Expected: `docs/pint-ae-resources/ubl-2.1/` mirrors the official zip layout, preserving relative import paths. The spec's file list (`maindoc/`, `common/`, `commonbasiccomponents/`) is the minimum; include whatever the real zip contains for imports to resolve.

- [ ] **Step 2: Install libxmljs2 in the API package**

```bash
cd app/api
npm install libxmljs2
```

Expected: `libxmljs2` appears in `app/api/package.json` dependencies with the resolved version. Same Node version as the spike (verify `node --version`).

- [ ] **Step 3: Commit**

```bash
git add docs/pint-ae-resources/ubl-2.1 app/api/package.json app/api/package-lock.json
git commit -m "chore(xsd): vendor OASIS UBL 2.1 schema set + libxmljs2 dep"
```

Expected: committed. Do NOT write any code using libxmljs2 yet — next task.

---

### Task 3: Implement `xsd.js` (load schema, validate, map errors)

**Files:**
- Create: `app/api/src/rules/convert/xsd.js`
- Test: `app/api/test/xsd.test.js`

**Interfaces:**
- Consumes: vendored `docs/pint-ae-resources/ubl-2.1/**` (Task 2); `libxmljs2` (Task 2)
- Produces:
  - `export function validateXsd(xml: string): { issues: Array<{ rule: string; path: string; message: string; severity: 'error' }>, evalErrors: Array<{ rule: string; message: string; error: string }> }`
  - `rule` is `'XSD-01'` for a structural violation, `'XSD-ERR'` for a validator failure
  - Module-load throw if the schema cannot be compiled

- [ ] **Step 1: Write the failing test**

```js
// app/api/test/xsd.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateXsd } from '../src/rules/convert/xsd.js';

const EXAMPLES = path.join(import.meta.dirname, '..', 'schematron', 'examples');
const read = (name) => fs.readFileSync(path.join(EXAMPLES, name), 'utf8');
const STANDARD = read('Standard tax invoice.xml');

describe('validateXsd (UBL 2.1 structural gate)', () => {
  it('returns zero issues for a known-good UBL invoice', () => {
    const r = validateXsd(STANDARD);
    expect(r.evalErrors).toEqual([]);
    expect(r.issues.filter((i) => i.rule === 'XSD-01').length).toBe(0);
  });

  it('flags an unknown element', () => {
    const xml = STANDARD.replace('<cbc:ID>', '<cbc:ID>\n    <cbc:TotallyUnknownElement>1</cbc:TotallyUnknownElement>');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01' && i.message.includes('TotallyUnknownElement'))).toBe(true);
  });

  it('flags element order violations', () => {
    const xml = STANDARD.replace(
      '<cbc:IssueDate>', '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n    <cbc:IssueDate>');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01')).toBe(true);
  });

  it('flags a missing mandatory element', () => {
    const xml = STANDARD.replace(/<cbc:IssueDate>.*?<\/cbc:IssueDate>\n/, '');
    const r = validateXsd(xml);
    expect(r.issues.some((i) => i.rule === 'XSD-01')).toBe(true);
  });

  it('surfaces a validator error as XSD-ERR (fail-closed)', () => {
    const r = validateXsd('<not-an-invoice/>');
    expect(r.evalErrors.length + r.issues.filter((i) => i.rule === 'XSD-ERR').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app/api && npx vitest run test/xsd.test.js`
Expected: FAIL — `Cannot find module '../src/rules/convert/xsd.js'`

- [ ] **Step 3: Implement `xsd.js`**

```js
// app/api/src/rules/convert/xsd.js
import fs from 'node:fs';
import path from 'node:path';
import libxmljs from 'libxmljs2';

const UBL_DIR = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'docs', 'pint-ae-resources', 'ubl-2.1');
const MAIN_DOC = path.join(UBL_DIR, 'maindoc', 'UBL-Invoice-2.1.xsd');

// Load + compile once at module load. Failure here must fail the deploy loudly —
// a missing schema means the gate cannot run (fail-closed at startup).
let schema;
try {
  schema = libxmljs.parseXml(fs.readFileSync(MAIN_DOC, 'utf8'));
} catch (e) {
  throw new Error(`UBL 2.1 XSD schema failed to load from ${MAIN_DOC}: ${e.message}`);
}

function pathFromMessage(message) {
  const m = message.match(/\{.*\}([A-Za-z0-9]+)/);
  return m ? `/${m[1]}` : '';
}

/**
 * Structural (XSD) validation gate. Non-blocking by design: issues are reported
 * to the caller, which decides how to surface them (converter dataIssues).
 *
 * Fail-closed: if libxml2 cannot even validate the document, that surfaces as
 * an XSD-ERR issue — never a silent pass.
 */
export function validateXsd(xml) {
  const issues = [];
  const evalErrors = [];

  let doc;
  try {
    doc = libxmljs.parseXml(xml);
  } catch (e) {
    evalErrors.push({ rule: 'XSD-ERR', message: 'Document could not be parsed for XSD validation.', error: e.message });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error' });
    return { issues, evalErrors };
  }

  let ok;
  try {
    ok = doc.validate(schema);
  } catch (e) {
    evalErrors.push({ rule: 'XSD-ERR', message: 'XSD validation threw.', error: e.message });
    issues.push({ rule: 'XSD-ERR', path: '', message: `XSD validation could not run: ${e.message}`, severity: 'error' });
    return { issues, evalErrors };
  }

  if (!ok) {
    for (const err of doc.validationErrors || []) {
      issues.push({
        rule: 'XSD-01',
        path: pathFromMessage(err.message || ''),
        message: (err.message || 'Unknown XSD violation').trim(),
        severity: 'error',
      });
    }
  }

  return { issues, evalErrors };
}
```

Note: if Task 1's spike proved relative imports fail under `parseXml(xmlString)`, adapt the load to the working approach the spike recorded (e.g. `libxmljs.parseXml(..., { baseUrl: 'file://' + MAIN_DOC })` or concatenation). The test is the contract — the load approach is an implementation detail.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app/api && npx vitest run test/xsd.test.js`
Expected: PASS — all 5 tests. If the "known-good" test fails because the official example has datatype quirks (some PINT AE examples are not fully XSD-conformant), adjust that assertion to the truth from Task 1's spike and note it in a comment — the contract is "0 XSD-01 for a doc the spike proved valid".

- [ ] **Step 5: Commit**

```bash
git add app/api/src/rules/convert/xsd.js app/api/test/xsd.test.js
git commit -m "feat(xsd): UBL 2.1 structural validation gate (validateXsd)"
```

Expected: committed, tests green.

---

### Task 4: Wire the XSD gate into the converter pipeline

**Files:**
- Modify: `app/api/src/rules/convert/pipeline.js` (after the well-formedness gate, ~line 90; result assembly ~line 175; `refuse()` helper ~line 28)
- Modify: `app/api/src/rules/convert/index.js` (only if `convert` needs to expose xsdIssues — verify; the pipeline returns them already)
- Test: `app/api/test/convert.test.js` (add cases)

**Interfaces:**
- Consumes: `validateXsd(xml)` from Task 3
- Produces: every `convert()` result includes `dataIssues` with XSD issues appended — CONVERTED, NOOP, and REFUSED all carry them. `blocked` never contains XSD issues.

- [ ] **Step 1: Write the failing tests (append to convert.test.js)**

```js
  // ——— XSD gate ———
  it('valid XML gets no XSD issues', () => {
    const r = convert(fixture('00-valid.xml'));
    const xsdIssues = r.dataIssues.filter((d) => d.rule === 'XSD-01' || d.rule === 'XSD-ERR');
    expect(xsdIssues).toEqual([]);
  });

  it('structurally-broken XML is converted with XSD issues in dataIssues (not blocked)', () => {
    const xml = fixture('00-valid.xml').replace(
      '<cbc:IssueDate>', '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n    <cbc:IssueDate>');
    const r = convert(xml);
    expect(r.status).toBe('CONVERTED'); // or NOOP — repairers may not change it; either is fine
    expect(r.blocked).toEqual([]);     // XSD never blocks
    const xsdIssues = r.dataIssues.filter((d) => d.rule === 'XSD-01');
    expect(xsdIssues.length).toBeGreaterThan(0);
  });

  it('XSD issues survive a REFUSED outcome', () => {
    const xml = fixture('02-data-semantic.xml'); // data errors -> REFUSE in full mode
    const r = convert(xml, { mode: 'full' });
    expect(r.status).toBe('REFUSED');
    // dataIssues must be an array (possibly with XSD issues appended) — the
    // diagnostic must not be dropped just because the result is REFUSED.
    expect(Array.isArray(r.dataIssues)).toBe(true);
  });

  it('fingerprint guard still passes when XSD issues are present', () => {
    const xml = fixture('00-valid.xml').replace(
      '<cbc:IssueDate>', '<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>\n    <cbc:IssueDate>');
    const r = convert(xml);
    // CONVERTED implies the fingerprint guard passed (repairers changed nothing
    // of value) — asserting status CONVERTED/NOOP and blocked==[] is sufficient;
    // DATA_CHANGED would surface as status 'ERROR'.
    expect(r.status).not.toBe('ERROR');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app/api && npx vitest run test/convert.test.js`
Expected: FAIL — XSD issues missing from `dataIssues` (the gate isn't wired yet).

- [ ] **Step 3: Wire the gate into the pipeline**

In `pipeline.js`, import the gate:

```js
import { validateXsd } from './xsd.js';
```

After the well-formedness gate (`XMLValidator.validate(prepared)` — before the classifier), add:

```js
  // 3.5 XSD structural gate — non-blocking by design. Reports the input's real
  // structural state (element order, cardinality, datatypes, unknown elements).
  // Never enters `blocked`; surfaced on every outcome via dataIssues.
  let xsdIssues = [];
  try {
    xsdIssues = validateXsd(prepared).issues;
  } catch (e) {
    xsdIssues = [{ rule: 'XSD-ERR', path: '', message: `XSD gate failed: ${e.message}`, severity: 'error' }];
  }
```

In the `refuse()` calls, thread `xsdIssues` through — add it to the result object each refuse returns. The cleanest: change `refuse()` to always include `dataIssues: [...(xsdIssues ?? []), ...(opts.dataIssues ?? [])]` — but since `refuse` is a shared helper, instead pass `xsdIssues` via the options param and append in each call site:

```js
// in refuse(), add dataIssues support:
return {
  status: 'REFUSED', reason, detail,
  inputHash,
  audit: [...preAudit, ...audit],
  blocked,
  dataIssues: [...(xsdIssues ?? []), ...(opts.dataIssues ?? [])],
  output: undefined,
  engineVersion: ENGINE_VERSION, convertedAt: new Date().toISOString(),
  ...(wouldFix !== undefined ? { wouldFix } : {}),
  ...(parseHint !== undefined ? { parseHint } : {}),
};
```

and pass `xsdIssues` at each `refuse(...)` call site (3 sites in the pipeline). In the success return, append:

```js
  return {
    status: anyChange ? 'CONVERTED' : 'NOOP',
    inputHash, outputHash,
    audit: [...preAudit, ...repairAudit],
    blocked: [],
    dataIssues: [...(mode === 'format' ? blocked : []), ...xsdIssues],
    output: anyChange ? output : prepared,
    engineVersion: ENGINE_VERSION,
    convertedAt: new Date().toISOString(),
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app/api && npx vitest run test/convert.test.js test/xsd.test.js`
Expected: PASS — all old convert tests still green (NOOP invariant, format repairs, fingerprint) and the 4 new XSD tests pass.

- [ ] **Step 5: Run the full API suite**

Run: `cd app/api && npx vitest run`
Expected: 77+ tests pass (all existing + new). No regressions in validate/route/convert tests.

- [ ] **Step 6: Commit**

```bash
git add app/api/src/rules/convert/pipeline.js app/api/test/convert.test.js
git commit -m "feat(convert): wire UBL 2.1 XSD gate into pipeline (non-blocking dataIssues)"
```

Expected: committed, full suite green.

---

### Task 5: Client layer mapper + badges + filtering (web)

**Files:**
- Modify: `app/web/src/lib/validation-ui.ts` (add `layerOf(rule)` + `LAYER_LABELS`)
- Modify: `app/web/src/components/validation/ValidationSummary.tsx` (render badges, hold filter state, pass filtered issues)
- Modify: `app/web/src/components/validation/ValidationIssueList.tsx` (accept + apply layer filter)
- Test: `app/web/test/validation-ui.test.ts` (add mapper tests)
- Test: `app/web/test/validation-summary.test.tsx` (add badge tests)

**Interfaces:**
- Consumes: `ValidationIssue` type from `validation-ui.ts` (existing)
- Produces:
  - `export type ValidationLayer = 'format' | 'structure' | 'semantic'`
  - `export function layerOf(rule: string): ValidationLayer`
  - `export const LAYER_LABELS: Record<ValidationLayer, string>` — `{ format: 'Format', structure: 'Structure', semantic: 'Semantic' }`
  - `ValidationIssueList` gains an optional `filter?: ValidationLayer | 'all'` prop
  - `ValidationSummary` renders three layer badges with counts + an "All" reset

- [ ] **Step 1: Write the failing mapper tests (append to validation-ui.test.ts)**

```ts
import { layerOf } from '@/lib/validation-ui';

describe('layerOf', () => {
  it('classifies format rules', () => {
    expect(layerOf('ENG-PARSE-01')).toBe('format');
    expect(layerOf('FMT-CHARS-01')).toBe('format');
    expect(layerOf('FMT-NS-02')).toBe('format');
  });

  it('classifies structure rules', () => {
    expect(layerOf('XSD-01')).toBe('structure');
    expect(layerOf('ENG-XSD-01')).toBe('structure');
  });

  it('classifies everything else as semantic', () => {
    expect(layerOf('ibr-073')).toBe('semantic');
    expect(layerOf('ibr-132-ae')).toBe('semantic');
    expect(layerOf('ENG-VAT-01')).toBe('semantic');
    expect(layerOf('aligned-ibrp-002-ae')).toBe('semantic');
    expect(layerOf('ENG-SCH-01')).toBe('semantic');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd app/web && npx vitest run test/validation-ui.test.ts`
Expected: FAIL — `layerOf is not a function`

- [ ] **Step 3: Implement the mapper**

In `validation-ui.ts`, append:

```ts
export type ValidationLayer = 'format' | 'structure' | 'semantic';

export const LAYER_LABELS: Record<ValidationLayer, string> = {
  format: 'Format',
  structure: 'Structure',
  semantic: 'Semantic',
};

export function layerOf(rule: string): ValidationLayer {
  if (/^ENG-PARSE-/.test(rule) || /^FMT-/.test(rule)) return 'format';
  if (/^XSD-/.test(rule) || /^ENG-XSD-/.test(rule)) return 'structure';
  return 'semantic';
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd app/web && npx vitest run test/validation-ui.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing badge tests (append to validation-summary.test.tsx)**

```tsx
  it('renders layer badges with counts', () => {
    const result: ValidationResult = {
      valid: false,
      invoiceType: '388',
      schemaVersion: 'PINT AE 1.0',
      errors: [
        { path: '/', rule: 'ENG-PARSE-01', severity: 'error', message: 'parse' },
        { path: '/', rule: 'XSD-01', severity: 'error', message: 'structure' },
        { path: '/', rule: 'ibr-073', severity: 'error', message: 'semantic' },
        { path: '/', rule: 'ENG-VAT-01', severity: 'error', message: 'semantic 2' },
      ],
    };
    render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    expect(screen.getByText('Format')).toBeTruthy();
    expect(screen.getByText('Structure')).toBeTruthy();
    expect(screen.getByText('Semantic')).toBeTruthy();
    // counts: 1 format, 1 structure, 2 semantic
    expect(screen.getByText('1 Format')).toBeTruthy();
    expect(screen.getByText('1 Structure')).toBeTruthy();
    expect(screen.getByText('2 Semantic')).toBeTruthy();
  });

  it('filters the issue list when a layer badge is clicked', async () => {
    const user = userEvent.setup();
    const result: ValidationResult = {
      valid: false,
      invoiceType: '388',
      schemaVersion: 'PINT AE 1.0',
      errors: [
        { path: '/a', rule: 'XSD-01', severity: 'error', message: 'structure issue' },
        { path: '/b', rule: 'ibr-073', severity: 'error', message: 'semantic issue' },
      ],
    };
    render(h(ValidationSummary, { result, rateLimit, onReset: vi.fn() }));

    await user.click(screen.getByText('1 Structure'));
    expect(screen.getByText('structure issue')).toBeTruthy();
    expect(screen.queryByText('semantic issue')).toBeNull();
  });
```

- [ ] **Step 6: Run to verify failure**

Run: `cd app/web && npx vitest run test/validation-summary.test.tsx`
Expected: FAIL — no badges rendered, no filter

- [ ] **Step 7: Implement badges + filtering**

In `ValidationSummary.tsx`:

```tsx
import { LAYER_LABELS, layerOf, type ValidationLayer, type ValidationIssue } from '@/lib/validation-ui';
```

Add state + derive counts:

```tsx
const [layerFilter, setLayerFilter] = useState<ValidationLayer | 'all'>('all');
const counts = { format: 0, structure: 0, semantic: 0 } as Record<ValidationLayer, number>;
for (const issue of result.errors) counts[layerOf(issue.rule)]++;
const visibleIssues = layerFilter === 'all'
  ? result.errors
  : result.errors.filter((issue) => layerOf(issue.rule) === layerFilter);
```

Render the badges between the summary copy and the issue list:

```tsx
h('div', { className: 'validation-layers', 'aria-label': 'Validation layers' },
  h('button', {
    type: 'button',
    className: `validation-layer-badge${layerFilter === 'all' ? ' is-active' : ''}`,
    onClick: () => setLayerFilter('all'),
  }, `All (${result.errors.length})`),
  (Object.keys(LAYER_LABELS) as ValidationLayer[]).map((layer) =>
    h('button', {
      type: 'button',
      key: layer,
      className: `validation-layer-badge${layerFilter === layer ? ' is-active' : ''}`,
      onClick: () => setLayerFilter(layer),
    }, `${counts[layer]} ${LAYER_LABELS[layer]}`),
  ),
),
h(ValidationIssueList, { issues: visibleIssues, filter: layerFilter }),
```

In `ValidationIssueList.tsx`, accept the filter prop (used for a visually muted "hidden layers" state — the parent already filters; the prop keeps the list self-documenting):

```tsx
export function ValidationIssueList({ issues, filter = 'all' }: {
  issues: ValidationIssueType[];
  filter?: 'all' | import('@/lib/validation-ui').ValidationLayer;
}): React.ReactElement | null {
  if (issues.length === 0) return null;
  return h('div', {
    className: `validation-issue-list${filter === 'all' ? '' : ' is-filtered'}`,
    'data-filter': filter,
  }, ...);
}
```

- [ ] **Step 8: Run to verify pass**

Run: `cd app/web && npx vitest run test/validation-summary.test.tsx test/validation-ui.test.ts`
Expected: PASS

- [ ] **Step 9: Run the full web test suite**

Run: `cd app/web && npx vitest run`
Expected: all web tests pass (existing tool-page, workspace, validation tests unaffected — the badges are additive).

- [ ] **Step 10: Commit**

```bash
git add app/web/src/lib/validation-ui.ts app/web/src/components/validation/ValidationSummary.tsx app/web/src/components/validation/ValidationIssueList.tsx app/web/test/validation-ui.test.ts app/web/test/validation-summary.test.tsx
git commit -m "feat(web): validation layer badges (format/structure/semantic) with filtering"
```

Expected: committed, web suite green.

---

### Task 6: End-to-end verification + sanity corpus

**Files:**
- Modify: none (verification only)
- Test: `app/api/test/convert.test.js` (add one corpus sanity case) — optional if covered

**Interfaces:**
- Consumes: everything from Tasks 1-5
- Produces: evidence that the full stack works on the official pack examples

- [ ] **Step 1: Run the XSD gate against all 16 official pack examples**

```bash
cd app/api
node --input-type=module -e "
import fs from 'node:fs'; import path from 'node:path'; import { validateXsd } from './src/rules/convert/xsd.js';
const dir = path.join('..', 'docs', 'pint-ae-resources', 'trn-invoice', 'example');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.xml')).sort()) {
  const r = validateXsd(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log(f.padEnd(45), 'issues:', r.issues.length, r.issues.slice(0, 2).map((i) => i.message.slice(0, 60)));
}
"
```

Expected: each example prints its issue count. The official examples are NOT guaranteed XSD-conformant — this is the accurate input-state story. Record the counts in the commit message or a note; no test asserts specific counts (they're a corpus observation, not a contract).

- [ ] **Step 2: Run the converter + validator end-to-end on one broken example**

```bash
cd app/api
node --input-type=module -e "
import { convert } from './src/rules/convert/index.js'; import { validateInvoice } from './src/rules/engine.js'; import fs from 'node:fs';
const xml = fs.readFileSync('./test/fixtures/convert/01-format-only.xml', 'utf8');
const c = convert(xml);
const v = validateInvoice(c.output, 'application/xml');
console.log('convert:', c.status, 'xsdIssues:', c.dataIssues.filter((d) => d.rule.startsWith('XSD')).length);
console.log('validate:', v.valid, v.errors.length, 'errors');
"
```

Expected: converter repairs format, XSD issues (if any) present in dataIssues, validator runs on the output. Prints a truthful pipeline trace.

- [ ] **Step 3: Run both full suites one final time**

Run: `cd app/api && npx vitest run && cd ../web && npx vitest run`
Expected: API suite green, web suite green.

- [ ] **Step 4: Commit the corpus note (no code)**

```bash
cd /c/Users/AMG/code/https-einvoicecheck.ae/.claude/worktrees/code-review-plan
git add docs/pint-ae-resources/README.md 2>/dev/null || true
# if a README with the corpus observation exists; otherwise skip this step
```

Expected: nothing to commit (corpus observation lives in the conversation/report) — mark step skipped if so.

---

## Self-Review

**1. Spec coverage:**
- XSD engine libxmljs2 → Tasks 1-3 ✓
- Vendored OASIS UBL 2.1 XSDs → Task 2 ✓
- Placement A (XSD on input, after namespace prep + well-formedness gate, before repairers) → Task 4 Step 3 ✓
- Non-blocking, both modes, every outcome → Task 4 ✓
- Client-only badges, no API change → Task 5 ✓
- rule → layer mapping exact prefixes → Task 5 Step 3 ✓
- Fingerprint guard unchanged → Task 4 (asserted in tests) ✓
- Spike gates everything → Task 1 ✓
- CreditNote deferred → Global Constraints ✓
- `structure.js` kept → Global Constraints (no removal) ✓

**2. Placeholder scan:** All code blocks are complete. The only conditional is Task 1 Step 4's "record the truth" for the official example's XSD validity — that's a spike observation, not a placeholder. Task 6 Step 4 allows skipping an optional commit.

**3. Type consistency:**
- `validateXsd` returns `{ issues, evalErrors }` — Task 3 defines, Task 4 consumes `.issues` ✓
- `rule` values `XSD-01`/`XSD-ERR` — Task 3 defines, Task 4 tests filter on them ✓
- `layerOf(rule): ValidationLayer`, `LAYER_LABELS`, `ValidationLayer` — Task 5 defines and uses ✓
- `ValidationIssueList` filter prop typed as `'all' | ValidationLayer` — Task 5 consistent ✓
- `dataIssues` array shape — existing pipeline contract preserved, XSD issues appended ✓
