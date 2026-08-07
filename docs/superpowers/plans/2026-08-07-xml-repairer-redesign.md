# XML Repairer Redesign — Implementation Plan

> **For agentic workers:** Implement task-by-task in order. Each task ends with a verification gate and a commit. Do not skip tasks. Branch must be `feat/xml-converter-redesign` based on `origin/main` (deployed lineage). Local `main` is ABANDONED — never merge from it. Windows git-bash: use `/c/Users/abdul/https-einvoicecheck.ae` paths; `node` is v22.

**Goal:** Rename "XML Converter" → "XML Repairer", redesign the tool page to the approved "Guided Diff" UX, fix two engine false-positive bugs that reject valid official PINT-AE tax invoices, add the missing dual-tree parity test, and surface self-billing (389) as explicitly unsupported.

**Architecture:** The validation engine is duplicated in two trees — `app/api/src/rules/` (canonical) and `app/web/src/lib/rules/` (vendored byte-for-byte for the web Docker build). **Every engine change must land in BOTH trees.** The web page (`ConverterWorkspace` → `RepairerWorkspace`) calls the web proxy route `/api/tools/convert`, which proxies to the API's `POST /v1/convert`. A `sessionStorage` handoff carries repaired XML to the validator page.

**Tech Stack:** Node 20+/22, Fastify 5, Next.js 15 (App Router), React 19, Mongoose 9, ioredis, Vitest, libxmljs2, saxon-js.

**Spec (authoritative):** `docs/superpowers/specs/2026-08-07-xml-converter-redesign-design.md` — read §1, §5, §7, §8, §9, §10, §11 before starting.

## Global Constraints

- Engine changes land in BOTH `app/api/src/rules/` AND `app/web/src/lib/rules/` — identical bytes. (Parity test enforces this from Task 1 on.)
- `POST /v1/convert` and `/api/tools/convert` route paths NEVER change (contract stability).
- Rename scope: `/tools/xml-converter` → `/tools/xml-repairer`, **no redirect**. Old slug 404s.
- Copy rules: no "Refused" label (use "No changes made"); verdict labels: "Repaired — N fixes applied" / "No changes needed" / "No changes made" / "Internal error".
- sessionStorage key: `einvoicecheck:converter-handoff`, value `{ source: 'xml-repairer', xml: string }`.
- No payload persistence anywhere; `EINVOICECHECK_API_KEY` server-side only, never in client bundle.
- Design tokens (site CSS variables): `--accent:#087f6b; --navy:#102a43; --ink:#18324a; --bg:#f7f8f5; --bg-card:#fff; --border:#d7dfdc; --success:#087f5b; --success-subtle:#e8f7ef; --error:#b42318; --error-subtle:#fff0ee; --warn:#9a6700; --warn-subtle:#fff7df; --font-sans:'Inter'; --font-heading:'DM Sans'; --font-code:'JetBrains Mono'`. Radius: sm 6 / md 10 / lg 14 / full 9999.
- Reference UI: `sketches/xml-repairer/004-guided-diff/index.html` (approved winner). Sketches 001–003 are reference only.

---

### Task 1: Engine parity test (locks dual-tree sync BEFORE any engine edits)

**Files:**
- Create: `app/web/test/engine-parity.test.ts`

**Interfaces:**
- Produces: a failing gate if `app/api/src/rules/` and `app/web/src/lib/rules/` ever drift. All later engine tasks must keep this green.

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Shared engine files — schematron.js is intentionally excluded (service-local paths differ).
const SHARED = [
  'checks', 'codelists.js', 'engine.js', 'error.js', 'money.js',
  'normalize.js', 'registry.js', 'structure.js', 'xml.js',
];

function collectFiles(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectFiles(dir, next));
    else if (entry.name.endsWith('.js')) out.push(next);
  }
  return out;
}

function treeHash(root: string): string {
  const files = SHARED.flatMap((p) => {
    const full = join(root, p);
    try {
      return readdirSync(full, { withFileTypes: true }).map((e) => `${p}/${e.name}`)
        .filter((f) => f.endsWith('.js'));
    } catch { return [p]; }
  }).sort();
  const h = createHash('sha256');
  for (const f of files) h.update(f).update('\0').update(readFileSync(join(root, f)));
  return h.digest('hex');
}

describe('engine parity', () => {
  it('web vendored engine is byte-identical to the canonical app/api engine', () => {
    const api = treeHash(join(process.cwd(), '..', 'api', 'src', 'rules'));
    const web = treeHash(join(process.cwd(), 'src', 'lib', 'rules'));
    expect(web).toBe(api);
  });
});
```

- [ ] **Step 2: Run it — must PASS (trees are currently identical)**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts`
Expected: 1 test, PASS. (If it fails, stop — trees are already drifted; reconcile before continuing.)

- [ ] **Step 3: Commit**

```bash
git add app/web/test/engine-parity.test.ts
git commit -m "test(web): engine parity gate — web vendored rules must match app/api rules"
```

---

### Task 2: Engine fix — line-level AllowanceCharge parsing (Bug 1)

**Files:**
- Modify: `app/api/src/rules/xml.js` (lines ~92–105, the `lines` map)
- Modify: `app/web/src/lib/rules/xml.js` (same change, identical bytes)
- Create: `app/api/test/engine-official-samples.test.js`

**Interfaces:**
- Consumes: existing `toArray`, `num`, `amount`, `text` helpers in `xml.js`.
- Produces: `parseUblInvoice()` lines now carry real `allowance` and `charge` sums; `lineArithmetic.js` ENG-LINE-05 stops false-failing on official tax invoices.

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { convert } from '../src/rules/convert/index.js';

const sample = (name) =>
  readFileSync(new URL(`../pint-ae-resources/trn-invoice/example/${name}`, import.meta.url), 'utf8');

describe('official PINT-AE samples (engine false-positive regression)', () => {
  it('Standard tax invoice.xml repairs cleanly (line-level allowance+charge parsed)', async () => {
    const res = await convert(sample('Standard tax invoice.xml'), { mode: 'full' });
    expect(res.status).not.toBe('REFUSED');
    expect(res.blocked).toEqual([]);
  });

  it('Summary tax invoice.xml repairs cleanly (AE reverse-charge handled)', async () => {
    const res = await convert(sample('Summary tax invoice.xml'), { mode: 'full' });
    expect(res.status).not.toBe('REFUSED');
    expect(res.blocked).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npx vitest run test/engine-official-samples.test.js`
Expected: both FAIL (Standard tax invoice REFUSED with ENG-LINE-05; Summary REFUSED with ENG-VAT-04/ENG-TAX-09). This test will be fully green only after Task 3 too — it is the combined regression gate.

- [ ] **Step 3: Implement the fix in `app/api/src/rules/xml.js`**

Replace the `lines` map body so each line computes allowance/charge from the repeatable `AllowanceCharge`:

```js
  const lines = toArray(doc[lineKey]).map((ln, i) => {
    const item = toArray(ln.Item)[0] || {};
    const cat = toArray(item.ClassifiedTaxCategory)[0] || {};
    const price = toArray(ln.Price)[0] || {};
    // UBL allows multiple AllowanceCharge per line: ChargeIndicator false =
    // allowance (subtracted), true = charge (added). Amount is authoritative.
    let allowance = 0;
    let charge = 0;
    for (const ac of toArray(ln.AllowanceCharge)) {
      const amt = num(amount(ac.Amount)) ?? 0;
      if (text(ac.ChargeIndicator) === 'true') charge += amt;
      else allowance += amt;
    }
    return {
      id: text(ln.ID) ?? String(i + 1),
      quantity: num(amount(ln[qtyKey])),
      unitPrice: num(amount(price.PriceAmount)),
      lineExtensionAmount: num(amount(ln.LineExtensionAmount)),
      allowance,
      charge,
      taxCategory: { code: text(cat.ID), rate: num(text(cat.Percent)) },
      itemName: text(item.Name),
    };
  });
```

- [ ] **Step 4: Copy to web tree, identical bytes**

Run: `cp app/api/src/rules/xml.js app/web/src/lib/rules/xml.js`

- [ ] **Step 5: Run the parity test (must stay green) + the new test (may still show Summary failing on AE — that's Task 3)**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/src/rules/xml.js app/web/src/lib/rules/xml.js app/api/test/engine-official-samples.test.js
git commit -m "fix(engine): parse line-level AllowanceCharge in xml.js — ENG-LINE-05 no longer false-fails tax invoices with discounts/charges"
```

---

### Task 3: Engine fix — AE (reverse-charge) category handling (Bug 2)

**Files:**
- Modify: `app/api/scripts/generate-codelists.mjs` (line 23, `expectedRates`)
- Modify: `app/api/src/rules/codelists.js` + `app/web/src/lib/rules/codelists.js` (AE entry)
- Modify: `app/api/src/rules/checks/vatCategory.js` + web copy
- Modify: `app/api/src/rules/checks/taxBreakdown.js` + web copy

**Interfaces:**
- Produces: `codelists.js` AE `expectedRate: null` (sentinel = "not enforced"); `vatCategory.js` skips rate equality for AE; `taxBreakdown.js` skips ENG-TAX-09 arithmetic for AE.

- [ ] **Step 1: Change the generator source of truth**

In `app/api/scripts/generate-codelists.mjs`, change:
```js
const expectedRates = { S: 5, Z: 0, E: 0, O: 0, AE: 0, N: 5 };
```
to:
```js
// AE (VAT Reverse Charge) carries a NOTIONAL rate (5 or 0) in official PINT-AE
// samples; the binding invariant is seller tax amount 0 (buyer self-assesses).
// null = rate not enforced by the semantic engine.
const expectedRates = { S: 5, Z: 0, E: 0, O: 0, AE: null, N: 5 };
```
And in the emission line (`expectedRate: ${expectedRates[code] ?? 0}`), change to emit `null` for AE — e.g. `expectedRate: ${expectedRates[code] === null ? 'null' : (expectedRates[code] ?? 0)}`.

- [ ] **Step 2: Re-generate both codelists**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && node scripts/generate-codelists.mjs`
Expected: prints generation summary; writes `app/api/src/rules/codelists.js` AND `app/web/src/lib/rules/codelists.js` with `"AE": { name: "VAT Reverse Charge", expectedRate: null }`.
Verify: `grep -n '"AE"' app/api/src/rules/codelists.js app/web/src/lib/rules/codelists.js` → both show `expectedRate: null`.

- [ ] **Step 3: Update `vatCategory.js` (both trees, identical)**

In `checkCategory`, after `const expected = VAT_CATEGORY_CODES[code].expectedRate;`:
```js
  // AE carries a notional rate (5 or 0); the binding invariant is tax amount 0
  // (enforced in taxBreakdown.js). Skip strict rate equality for AE.
  if (code === 'AE') return;
```
(This returns before the missing-rate and rate-mismatch branches — a missing rate stays OK, any notional rate passes.)

- [ ] **Step 4: Update `taxBreakdown.js` (both trees, identical)**

In the ENG-TAX-09 block, guard the arithmetic:
```js
      // BR-S-09: tax = taxable x rate/100 (SKIPPED for AE — reverse charge,
      // seller tax amount is 0 by definition; buyer self-assesses).
      if (code !== 'AE' && isNumber(st.taxableAmount) && isNumber(rate) && isNumber(st.taxAmount)) {
```

- [ ] **Step 5: Run the regression test — must now pass fully**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npx vitest run test/engine-official-samples.test.js`
Expected: both tests PASS (Standard tax invoice not REFUSED; Summary tax invoice not REFUSED).

- [ ] **Step 6: Run the FULL API suite (regression)**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npm test`
Expected: all suites pass (baseline was 19/19 + 2 new). Watch for `validate.test.js`/`engine.test.js` regressions from the AE change — if a prior test asserted AE at rate 0 errors, update that test to the new contract.

- [ ] **Step 7: Parity test still green**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/api/scripts/generate-codelists.mjs app/api/src/rules/codelists.js app/web/src/lib/rules/codelists.js app/api/src/rules/checks/vatCategory.js app/web/src/lib/rules/checks/vatCategory.js app/api/src/rules/checks/taxBreakdown.js app/web/src/lib/rules/checks/taxBreakdown.js
git commit -m "fix(engine): AE reverse-charge rate not enforced; tax arithmetic skipped — official Summary tax invoice passes"
```

---

### Task 4: Surface self-billing (389) as explicitly unsupported

**Files:**
- Modify: `app/api/src/rules/checks/invoiceType.js` + web copy
- Create/Modify: `app/api/test/engine-official-samples.test.js` (add 389 case)

**Interfaces:**
- Produces: warning `ENG-TYPE-01/SELF-BILLING` on any invoice with type `389`; UI banner keyed on that rule ID.

- [ ] **Step 1: Add the failing test case**

Append to `app/api/test/engine-official-samples.test.js`:
```js
  it('self-billed invoice (389) returns an explicit unsupported warning, not a silent pass', async () => {
    const xml = sample('Standard tax invoice.xml').replace('<cbc:InvoiceTypeCode>380', '<cbc:InvoiceTypeCode>389');
    const res = await convert(xml, { mode: 'full' });
    const warned = (res.blocked || []).some((b) => b.rule === 'ENG-TYPE-01/SELF-BILLING')
      || (res.dataIssues || []).some((d) => d.rule === 'ENG-TYPE-01/SELF-BILLING');
    expect(warned).toBe(true);
  });
```
(389 is a warning, not an error — the converter may still repair/NOOP it; the assertion is that the warning exists.)

- [ ] **Step 2: Implement in `invoiceType.js` (both trees, identical)**

In `evaluate(inv)`, after the missing-code check and before the unknown-code check:
```js
    if (code === '389') {
      out.push(
        warn(
          '/invoiceType',
          'ENG-TYPE-01/SELF-BILLING',
          'Self-billed invoice (389) is not yet supported by this validator. Structural checks ran, but self-billing business rules (PINT-AE Self-Billing 1.0.4) are not vendored, so results are incomplete.',
          'Use an accredited ASP for self-billed invoices, or validate a supplier-issued invoice (388) instead.'
        )
      );
      return out;
    }
```

- [ ] **Step 3: Run the new test + full API suite**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npx vitest run test/engine-official-samples.test.js && npm test`
Expected: new 389 test PASS; full suite green.

- [ ] **Step 4: Web UI notice — `app/web/src/components/validation/ValidationSummary.tsx`**

Add a distinct banner rendered when any error/warning has `rule === 'ENG-TYPE-01/SELF-BILLING'`:
```
Self-billed invoices are not fully validated
This document is type 389 (self-billed invoice). Structural checks ran, but
self-billing business rules are not vendored, so results are incomplete. Use an
accredited ASP for self-billed invoices.
```
Style with the site's `--warn`/`--warn-subtle` tokens, distinct from normal warning rows, placed at the top of the summary.

- [ ] **Step 5: Parity test green + commit**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts` → PASS.

```bash
git add app/api/src/rules/checks/invoiceType.js app/web/src/lib/rules/checks/invoiceType.js app/api/test/engine-official-samples.test.js app/web/src/components/validation/ValidationSummary.tsx
git commit -m "feat(engine): explicit ENG-TYPE-01/SELF-BILLING warning for 389 + UI coverage banner"
```

---

### Task 5: Rename — XML Converter → XML Repairer

**Files:**
- Modify: `app/web/src/lib/site.ts` (line 28 `TOOL_SLUGS`)
- Modify: `app/web/src/app/tools/[slug]/page.tsx` (TOOLS map key, h1, title, description, targetKeyword, blurb, context copy, render condition)
- Modify: `app/web/src/components/Chrome.tsx` (line 38 nav entry)
- Rename: `app/web/src/components/ConverterWorkspace.tsx` → `RepairerWorkspace.tsx`
- Rename: `app/web/src/lib/converter-client.ts` → `repairer-client.ts`
- Modify: `app/web/src/app/api/tools/convert/route.ts` (TOOL namespace + error strings; route path unchanged)

**Interfaces:**
- Produces: slug `xml-repairer`, component `RepairerWorkspace`, client module `repairer-client`, nav "XML Repairer". `/tools/xml-converter` will 404 after deploy (intended, no redirect).

- [ ] **Step 1: Slug + page metadata**

`app/web/src/lib/site.ts`:
```ts
export const TOOL_SLUGS = ['uae-e-invoice-validator', 'pint-ae-validator', 'trn-format-checker', 'xml-repairer'] as const;
```
`app/web/src/app/tools/[slug]/page.tsx` — change the TOOLS key `'xml-converter'` → `'xml-repairer'`, and:
- `h1: 'XML Repairer'`
- `title: 'Free UBL XML repairer — fix format defects before validation'`
- `targetKeyword: 'UBL XML repairer'`
- description/blurb: repair-first wording (keep the "never touches data" promise; drop "audit trail included" from the meta description — it's now in Technical details)
- render condition: `slug === 'xml-repairer'` renders `<RepairerWorkspace />`
- keep `import { RepairerWorkspace }` (rename import to match Step 3)

- [ ] **Step 2: Nav**

`app/web/src/components/Chrome.tsx` line 38:
```tsx
{ href: '/tools/xml-repairer', label: 'XML Repairer' },
```

- [ ] **Step 3: Rename component + client files**

```bash
cd /c/Users/abdul/https-einvoicecheck.ae/app/web
git mv src/components/ConverterWorkspace.tsx src/components/RepairerWorkspace.tsx
git mv src/lib/converter-client.ts src/lib/repairer-client.ts
```
Update inside `RepairerWorkspace.tsx`: imports `from '@/lib/repairer-client'`; `ConverterClientError` → `RepairerClientError` (rename the class in `repairer-client.ts` too); component export `RepairerWorkspace`; analytics events `converter_input_selected` → `repairer_input_selected`, same for `_error`, `_submitted`, `_result`.

- [ ] **Step 4: Proxy route namespace + copy**

`app/web/src/app/api/tools/convert/route.ts`: `const TOOL = 'uae-e-invoice-repairer';` and user-facing strings "converter" → "repairer" (`The repairer tool is not configured yet`, `Could not reach the repairer API`). Keep `/api/tools/convert` path, keep `EINVOICECHECK_API_KEY` env name.

- [ ] **Step 5: Grep for stragglers — no old slug/name left in web src**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && grep -rn "xml-converter\|XML Converter\|ConverterWorkspace\|converter-client" src/ || echo CLEAN`
Expected: `CLEAN` (analytics event names and rate-limit namespace already updated; `convertXml` function name may stay — it calls `/api/tools/convert`).

- [ ] **Step 6: Commit (component internals still old UX — Task 6 rewrites it)**

```bash
git add app/web/src/lib/site.ts app/web/src/app/tools/[slug]/page.tsx app/web/src/components/Chrome.tsx app/web/src/components/RepairerWorkspace.tsx app/web/src/lib/repairer-client.ts app/web/src/app/api/tools/convert/route.ts
git commit -m "refactor(web): rename XML Converter to XML Repairer — slug, nav, component, client, analytics"
```

---

### Task 6: Vendor official PINT-AE 1.0.4 sample XMLs

**Files:**
- Create: `app/web/public/samples/standard-tax-invoice.xml`
- Create: `app/web/public/samples/summary-tax-invoice.xml`
- Create: `app/web/public/samples/standard-tax-credit-note.xml`

**Interfaces:**
- Produces: three static XML files served at `/samples/*.xml`, used by "Try a sample" in Task 7.

- [ ] **Step 1: Copy from the deployed API bundle**

```bash
cd /c/Users/abdul/https-einvoicecheck.ae
cp "app/api/pint-ae-resources/trn-invoice/example/Standard tax invoice.xml" app/web/public/samples/standard-tax-invoice.xml
cp "app/api/pint-ae-resources/trn-invoice/example/Summary tax invoice.xml" app/web/public/samples/summary-tax-invoice.xml
cp "app/api/pint-ae-resources/trn-creditnote/example/Standard tax credit Note.xml" app/web/public/samples/standard-tax-credit-note.xml
```
Add a one-line provenance comment at the top of each file after the XML declaration is NOT possible (must stay valid XML) — instead record provenance in `app/web/public/samples/README.md`:
```
Sources: app/api/pint-ae-resources/trn-invoice/example/* and trn-creditnote/example/*
on origin/main (PINT-AE 1.0.4 official OpenPeppol examples, Apache-2.0).
```

- [ ] **Step 2: Verify files are valid XML + loadable**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && node -e "const fs=require('fs'); for (const f of ['standard-tax-invoice','summary-tax-invoice','standard-tax-credit-note']) { const s=fs.readFileSync('public/samples/'+f+'.xml','utf8'); console.log(f, s.includes('<Invoice')||s.includes('<CreditNote') ? 'OK' : 'BAD ROOT'); }"`
Expected: all three OK.

- [ ] **Step 3: Commit**

```bash
git add app/web/public/samples/
git commit -m "feat(web): vendor official PINT-AE 1.0.4 example XMLs for repairer samples"
```

---

### Task 7: Rewrite `RepairerWorkspace.tsx` — Guided Diff UX

**Files:**
- Rewrite: `app/web/src/components/RepairerWorkspace.tsx`
- Modify: `app/web/src/lib/repairer-client.ts` (drop `mode`, add download/copy helpers)

**Interfaces:**
- Consumes: `convertXml(xml, signal)` from `repairer-client` (mode arg dropped; returns `{ result: ConvertResult }`); `readXmlFile`; sample fetches from `/samples/*.xml`; `trackEvent`.
- Produces: `RepairerWorkspace` with state machine `idle → ready → repairing → result`; writes `einvoicecheck:converter-handoff` sessionStorage on validate-next; download/copy via Blob/Clipboard.

**Reference:** `sketches/xml-repairer/004-guided-diff/index.html` — port its layout/behavior to the React component using site design tokens. The sketch's simulated `simulateRepair()` maps to the real `convertXml()`.

- [ ] **Step 1: Client — drop mode, add helpers (`repairer-client.ts`)**

Remove the `mode` param from `convertXml(xml, signal)` (keep the POST to `/api/tools/convert`). Add:
```ts
export function downloadXml(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
export async function copyXml(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}
```

- [ ] **Step 2: Component skeleton — stepper + input zone**

Port from the sketch: two-step stepper (Repair format → Validate) with `.step.active/.done` dot styling; single drop-anywhere zone handling paste, drop, upload, plus "Try a sample" loading `/samples/standard-tax-invoice.xml` via `fetch().then(r => r.text())`; "Start repair" button disabled until content present. Map the sketch's `dropzone`, `paste`, `editLink` behavior 1:1 to React state (`dropzoneHidden`, `documentText`, `fileName`).

- [ ] **Step 3: Repair progress animation**

Port the sketch's `STEPS` checklist (read document → scan illegal chars → check namespaces/prefix case → verify declaration → data-integrity fingerprint) as an animated progress list shown during `repairing`. Drive it with `setInterval` while `convertXml()` is in flight; reveal the result when the promise resolves.

- [ ] **Step 4: Result view — verdict + split diff**

Port from the sketch:
- Verdict card by status: `CONVERTED` → "Repaired — N fixes applied" (green) + diff; `NOOP` → "No changes needed" (no diff); `REFUSED` → "No changes made" + `reasonText()` (no diff); `ERROR` → "Internal error" + retry.
- Split before/after diff (`pre` columns, `.dl.del` red strikethrough / `.dl.add` green, byte badges) — only for CONVERTED. Diff by comparing input text to `result.output` line-by-line (port `lineDiff`/`escapeHtml` from the sketch).
- Actions: Download (`downloadXml('repaired-invoice.xml', output)`), Copy (`copyXml`), Start over.
- "Step 2 — Validate" panel: writes sessionStorage handoff `{ source: 'xml-repairer', xml: output }`, then `router.push('/tools/uae-e-invoice-validator')` (use `useRouter` from `next/navigation`).
- Technical details accordion: audit table (rule/action/target/old→new), hashes, engine version.
- 389 notice: if any result issue has rule `ENG-TYPE-01/SELF-BILLING`, render the coverage banner (reuse the Task 4 banner markup).

- [ ] **Step 5: A11y + cleanup**

- Focus moves to error/verdict on state change (port the sketch's `errorRef` focus pattern).
- `AbortController` cancels in-flight repair on unmount/reset; Blob URLs revoked after download.
- No `mode` param sent to the API (route still accepts it for compat — page never sends it).

- [ ] **Step 6: Verify it builds + existing tests still pass**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx tsc --noEmit` → no new type errors.
Run: `npx vitest run test/tool-page-copy.test.ts test/validator-workspace.test.tsx` → PASS (existing; new component tests come in Task 9).

- [ ] **Step 7: Commit**

```bash
git add app/web/src/components/RepairerWorkspace.tsx app/web/src/lib/repairer-client.ts
git commit -m "feat(web): Guided Diff repairer UX — stepper, progress, verdict + split diff, download/copy, validate-next handoff"
```

---

### Task 8: Validator handoff hook (sessionStorage read)

**Files:**
- Modify: `app/web/src/components/validation/ValidatorWorkspace.tsx`

**Interfaces:**
- Consumes: sessionStorage key `einvoicecheck:converter-handoff` written by Task 7.
- Produces: pre-filled + auto-validated document when the user arrives from the repairer.

- [ ] **Step 1: Add the mount hook**

In `ValidatorWorkspace`, add a `useEffect` on mount (only when `context === 'tool'`):
```ts
useEffect(() => {
  if (context !== 'tool') return;
  try {
    const raw = sessionStorage.getItem('einvoicecheck:converter-handoff');
    if (!raw) return;
    sessionStorage.removeItem('einvoicecheck:converter-handoff');
    const parsed = JSON.parse(raw) as { source?: string; xml?: string };
    if (parsed?.source === 'xml-repairer' && typeof parsed.xml === 'string' && parsed.xml.trim()) {
      setDocumentText(parsed.xml);
      void validate(parsed.xml, 'repaired.xml');
    }
  } catch { /* malformed/stale — silently ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [context]);
```
Use the existing `validate()` function (already defined in the component). Safe against missing/malformed values.

- [ ] **Step 2: Verify build + handoff test exists in Task 9**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx tsc --noEmit` → no new type errors.

- [ ] **Step 3: Commit**

```bash
git add app/web/src/components/validation/ValidatorWorkspace.tsx
git commit -m "feat(web): validator pre-fills + auto-validates repaired XML from sessionStorage handoff"
```

---

### Task 9: Web component tests

**Files:**
- Create: `app/web/test/repairer-workspace.test.tsx`
- Create: `app/web/test/validator-handoff.test.tsx`

**Interfaces:**
- Consumes: `RepairerWorkspace`, `ValidatorWorkspace` (via `@testing-library/react`).

- [ ] **Step 1: Repairer workspace tests**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RepairerWorkspace } from '@/components/RepairerWorkspace';

vi.mock('@/lib/repairer-client', () => ({
  convertXml: vi.fn(async () => ({ result: {
    status: 'CONVERTED', reason: undefined, inputHash: 'in', outputHash: 'out',
    audit: [{ rule: 'FMT-NS-01', action: 'replace', target: '/Invoice@xmlns', old: 'a', new: 'b', reason: 'ns' }],
    blocked: [], dataIssues: [], output: '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
    engineVersion: 'engine-1.0.4', convertedAt: new Date().toISOString(),
  }, rateLimit: { limit: 20, remaining: 19, resetSeconds: 60, degraded: false } })),
  readXmlFile: vi.fn(),
  downloadXml: vi.fn(),
  copyXml: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); });

describe('RepairerWorkspace', () => {
  it('shows no mode toggle (single repair mode)', () => {
    render(<RepairerWorkspace />);
    expect(screen.queryByText(/Full \(refuse on data errors\)/)).toBeNull();
    expect(screen.queryByText(/Format \(repair \+ warn\)/)).toBeNull();
  });
  it('renders verdict + download/copy/validate on CONVERTED', async () => {
    render(<RepairerWorkspace />);
    fireEvent.change(screen.getByPlaceholderText(/Paste UBL/), { target: { value: '<Invoice/>' } });
    fireEvent.click(screen.getByRole('button', { name: /Start repair/i }));
    await waitFor(() => expect(screen.getByText(/Repaired — 1 fixes applied/)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Download repaired XML/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Validate repaired invoice/i })).toBeTruthy();
  });
  it('writes sessionStorage handoff on validate-next', async () => {
    render(<RepairerWorkspace />);
    fireEvent.change(screen.getByPlaceholderText(/Paste UBL/), { target: { value: '<Invoice/>' } });
    fireEvent.click(screen.getByRole('button', { name: /Start repair/i }));
    await waitFor(() => screen.getByRole('button', { name: /Validate repaired invoice/i }));
    fireEvent.click(screen.getByRole('button', { name: /Validate repaired invoice/i }));
    expect(sessionStorage.getItem('einvoicecheck:converter-handoff')).toContain('xml-repairer');
  });
});
```
Adjust selectors to match the actual component labels. If `screen.getByPlaceholderText` is brittle, add a `data-testid` to the textarea and query by it.

- [ ] **Step 2: Validator handoff tests**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ValidatorWorkspace } from '@/components/validation/ValidatorWorkspace';

vi.mock('@/lib/validation-client', () => ({
  validateInvoiceDocument: vi.fn(async () => ({ result: { valid: true, invoiceType: '388', schemaVersion: 'urn:peppol:pint:billing-1@ae-1', errors: [] } })),
  readInvoiceFile: vi.fn(),
}));

beforeEach(() => sessionStorage.clear());

describe('ValidatorWorkspace handoff', () => {
  it('pre-fills + auto-validates from sessionStorage, then clears it', async () => {
    sessionStorage.setItem('einvoicecheck:converter-handoff', JSON.stringify({ source: 'xml-repairer', xml: '<Invoice/>' }));
    render(<ValidatorWorkspace context="tool" />);
    await waitFor(() => expect(sessionStorage.getItem('einvoicecheck:converter-handoff')).toBeNull());
    expect(screen.getByText(/No errors/i)).toBeTruthy(); // adjust to actual summary copy
  });
  it('ignores malformed handoff silently', async () => {
    sessionStorage.setItem('einvoicecheck:converter-handoff', 'not-json');
    render(<ValidatorWorkspace context="tool" />);
    expect(screen.getByPlaceholderText(/Paste/)).toBeTruthy(); // stays in idle state
  });
});
```
Add missing imports (`screen`) and adjust copy assertions to the real component.

- [ ] **Step 3: Run web suite (regression gate)**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npm test`
Expected: all web tests pass (baseline 14 files + 2 new). Fix any selector/copy mismatches. Note: `mongodb-memory-server` may download a binary on first run — allow time.

- [ ] **Step 4: Commit**

```bash
git add app/web/test/repairer-workspace.test.tsx app/web/test/validator-handoff.test.tsx
git commit -m "test(web): repairer Guided Diff workspace + validator handoff tests"
```

---

### Task 10: Full verification + branch state

- [ ] **Step 1: API suite**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npm test`
Expected: all pass (19 baseline + official-samples + 389 cases).

- [ ] **Step 2: Web suite**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npm test`
Expected: all pass.

- [ ] **Step 3: Parity**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts`
Expected: PASS.

- [ ] **Step 4: Grep hygiene**

Run: `cd /c/Users/abdul/https-einvoicecheck.ae && grep -rn "XML Converter\|xml-converter\|ConverterWorkspace\|converter-client" app/web/src app/api/src || echo CLEAN`
Expected: `CLEAN` (only `/api/tools/convert` and `/v1/convert` contract paths may remain).

- [ ] **Step 5: Spec audit checklist (§8 Security & Privacy)**

- [ ] No `EINVOICECHECK_API_KEY` reference in client bundles (`NEXT_PUBLIC_` prefix check: `grep -rn "EINVOICECHECK_API_KEY" app/web/src --include="*.tsx"` → only server routes).
- [ ] sessionStorage key cleared after validator read + on repairer reset.
- [ ] Download Blob URL revoked after use.
- [ ] Official tax-invoice samples pass both `/v1/convert` and `/v1/validate` (engine fixes).
- [ ] 389 returns the explicit unsupported warning.

- [ ] **Step 6: Final commit if any stragglers, then push the branch**

```bash
cd /c/Users/abdul/https-einvoicecheck.ae
git status --short   # expect: only intended changes (ignore tsconfig.tsbuildinfo + untracked .railway-config-pull-* / src/compliance)
git push -u origin feat/xml-converter-redesign
```

---

## Self-Review Notes (run before handing off)

- **Spec coverage:** §5 (page rewrite) → Tasks 5/7; §6 (samples) → Task 6; §7 (rename) → Task 5; §8 (security) → Task 10 Step 5; §9 (engine fixes + parity) → Tasks 1–3; §10 (testing) → Tasks 9/10; §11.1 (389) → Task 4. No gaps.
- **Type consistency:** `RepairerWorkspace`, `repairer-client`, `convertXml(xml, signal)`, sessionStorage key `einvoicecheck:converter-handoff`, rule ID `ENG-TYPE-01/SELF-BILLING` — identical across all tasks.
- **Dual-tree rule:** every engine file edit names both `app/api/src/rules/` and `app/web/src/lib/rules/` paths; parity test (Task 1) is the enforcement gate.
