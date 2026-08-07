# XML Invoice Generator — Implementation Plan

> **For agentic workers:** Implement task-by-task in order. Each task ends with a verification gate and a commit. Do not skip tasks. Branch must be `feat/xml-generator` based on `origin/main` (deployed lineage). Windows git-bash: use `/c/Users/abdul/https-einvoicecheck.ae` paths; `node` is v22.

**Goal:** Ship the XML Invoice Generator — a free tool page that builds PINT-AE 1.0.4 UBL XML from a form (official sample skeletons), computes totals with engine math, and hands off to the validator (the one validation authority).

**Architecture:** Generator core lives in `app/api/src/rules/generate/` (single tree — like `convert/`, no web vendored copy). API endpoint `POST /v1/generate`; web proxy `/api/tools/generate`; page `/tools/xml-generator` (`GeneratorWorkspace` + `generator-client`). Handoff via existing sessionStorage key `einvoicecheck:converter-handoff` with `source: 'xml-generator'` (validator allowlist extended). Spike proof: `spikes/003-xml-generator/` (carried on this branch).

**Spec (authoritative):** `docs/superpowers/specs/2026-08-08-xml-generator-design.md`.

## Global Constraints

- Generator core is **API-only** (no dual-tree copy; parity test untouched).
- `POST /v1/convert`, `/v1/validate`, `/api/tools/convert` paths NEVER change. New endpoints only.
- Only the validator page may render validity claims; generator copy says "ready", never "valid".
- sessionStorage key stays `einvoicecheck:converter-handoff`; new source value `'xml-generator'` (validator accepts `'xml-repairer'` AND `'xml-generator'`).
- Design tokens (site CSS variables): `--accent:#087f6b; --navy:#102a43; --ink:#18324a; --bg:#f7f8f5; --bg-card:#fff; --border:#d7dfdc; --success:#087f5b; --success-subtle:#e8f7ef; --error:#b42318; --error-subtle:#fff0ee; --warn:#9a6700; --warn-subtle:#fff7df; --font-sans:'Inter'; --font-heading:'DM Sans'; --font-code:'JetBrains Mono'`. Radii: sm 6 / md 10 / lg 14 / full 9999.
- Reference UI: `RepairerWorkspace.tsx` stepper/dropzone/next-panel patterns; sketches 004 language.

---

### Task 1: Generator core — skeletons, token engine, totals (`app/api/src/rules/generate/`)

**Files:**
- Create: `app/api/src/rules/generate/skeletons/standard-tax-invoice.xml`
- Create: `app/api/src/rules/generate/skeletons/summary-tax-invoice.xml`
- Create: `app/api/src/rules/generate/skeletons/standard-tax-credit-note.xml`
- Create: `app/api/src/rules/generate/templates.js`
- Create: `app/api/src/rules/generate/totals.js`
- Create: `app/api/src/rules/generate/generate.js`
- Create: `app/api/src/rules/generate/index.js`

**Interfaces:**
- Consumes: official samples (read-only) from `app/api/pint-ae-resources/trn-invoice/example/` and `trn-creditnote/example/`; `money.js` (`round2`); `codelists.js` (`VAT_CATEGORY_CODES`); `convert/xsd.js` (`validateXsd`) as runtime oracle.
- Produces: `generateInvoice(data) → { xml, template }`, `TEMPLATES`, `GENERATOR_VERSION`.

- [ ] **Step 1: Build the skeletons** — tokenize the three official samples (data values → `{{TOKEN}}`, one `{{LINE_BLOCK}}` for the InvoiceLine, `{{TAX_SUBTOTAL_BLOCK}}` for TaxSubtotal, totals tokens). Keep element order/namespaces/attributes byte-identical otherwise. Per spec §6.2. Do NOT reorder anything.
- [ ] **Step 2: `templates.js`** — registry per spec §6.3: id → { skeletonPath, invoiceTypeCode, customizationId: 'urn:peppol:pint:billing-1@ae-1', categories, name }.
- [ ] **Step 3: `totals.js`** — `computeTotals(lines, rates)` → { lineExtension, byCategory: {code: {taxable, tax}}, taxTotal, taxExclusive, taxInclusive, payable }. AE: taxable included, tax 0. Uses `round2` from `../money.js` — identical semantics to the engine (ENG-TAX-09 cannot fail on generated docs).
- [ ] **Step 4: `generate.js`** — input validation per spec §6.4 (TRN 15-digit format reused from `../checks/trn.js` export — check its export shape first; if it only exposes a rule, implement the format check inline mirroring ENG-TRN-02: `/^[0-9]{15}$/`), render (static tokens + dynamic `LINE_BLOCK` join + `TAX_SUBTOTAL_BLOCK` per category present), escape ALL values, numeric guards (no NaN/Infinity), unresolved-token audit (throw listing leftovers), runtime XSD oracle (throw on any XSD issue).
- [ ] **Step 5: Verification** — write a quick check script OR reuse the spike's approach:
  Run: `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && node --input-type=module -e "..."` generating one valid invoice per template and asserting `validateXsd(xml).issues.length === 0`, `validateInvoice(xml).valid === true`.
  Expected: all three templates generate XSD-clean, engine-valid invoices.
- [ ] **Step 6: Commit**
```bash
git add app/api/src/rules/generate/
git commit -m "feat(engine): generator core — official-sample skeletons, token engine, computed totals, XSD runtime oracle"
```

---

### Task 2: `POST /v1/generate` endpoint + tests

**Files:**
- Create: `app/api/src/routes/generate.js`
- Modify: `app/api/src/app.js` (or wherever `routes/convert.js` is registered — mirror it)
- Create: `app/api/test/generate.test.js`

**Interfaces:**
- Consumes: `generateInvoice`, `TEMPLATES`; existing auth/rate-limit/usage patterns from `routes/convert.js`.
- Produces: `POST /v1/generate` with 200/400/401/429/503 shapes per spec §7.

- [ ] **Step 1: Route** — copy `routes/convert.js` skeleton (key check, rate limit, usage event); body `{ template, data }`; call `generateInvoice`; map validation errors to `{ ok:false, error, fieldErrors }` 400; success `{ ok:true, xml, template, engineVersion }`. Register in app alongside convert.
- [ ] **Step 2: Tests (`generate.test.js`)** — per spec §9:
  - per-template golden: POST valid fixture → 200, xml parses, `validateXsd` 0 issues, `validateInvoice` valid=true
  - 400: missing template, unknown template, bad TRN, unknown category, empty lines, missing required fields (assert `fieldErrors`)
  - escaping: supplier name with `& < > " '` → 200 and entities present
  - auth: no key → 401
- [ ] **Step 3: Run the API suite** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npm test` → all pass (previous 107 + new generate tests).
- [ ] **Step 4: Commit**
```bash
git add app/api/src/routes/generate.js app/api/src/app.js app/api/test/generate.test.js
git commit -m "feat(api): POST /v1/generate — template-driven PINT-AE XML generation with field-level 400s"
```

---

### Task 3: Web proxy `/api/tools/generate`

**Files:**
- Create: `app/web/src/app/api/tools/generate/route.ts`

**Interfaces:**
- Consumes: `checkToolRateLimit`, `clientIp` from `@/lib/toolRateLimit`.
- Produces: proxy to `POST /v1/generate`; `TOOL = 'uae-e-invoice-generator'`; `MAX_BYTES = 64 * 1024`; fail-closed errors per spec §5.5; rateLimit envelope.

- [ ] **Step 1: Write the route** — mirror `/api/tools/convert/route.ts` exactly (apiBaseUrl normalization, apiKeyHeader, rate limit, error strings with "generator" wording, keep `EINVOICECHECK_API_KEY`).
- [ ] **Step 2: Verify** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx tsc --noEmit` → clean.
- [ ] **Step 3: Commit**
```bash
git add app/web/src/app/api/tools/generate/route.ts
git commit -m "feat(web): /api/tools/generate proxy — rate-limited free-tool path to /v1/generate"
```

---

### Task 4: Slug, nav, page metadata

**Files:**
- Modify: `app/web/src/lib/site.ts`
- Modify: `app/web/src/app/tools/[slug]/page.tsx`
- Modify: `app/web/src/components/Chrome.tsx`

**Interfaces:**
- Produces: slug `xml-generator` in TOOL_SLUGS, nav "XML Generator", TOOLS entry + render condition per spec §5.1.

- [ ] **Step 1: site.ts** — add `'xml-generator'` to `TOOL_SLUGS` (order: after `'xml-repairer'`).
- [ ] **Step 2: [slug]/page.tsx** — TOOLS entry (h1/title/targetKeyword/description/blurb per spec §5.1), import `GeneratorWorkspace`, render condition `slug === 'xml-generator'` → `<GeneratorWorkspace />` (before the fallback "Tool ships next" branch).
- [ ] **Step 3: Chrome.tsx** — nav entry `{ href: '/tools/xml-generator', label: 'XML Generator' }` (place before XML Repairer).
- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npx vitest run test/tool-page-copy.test.ts test/navigation.test.tsx` green (navigation test asserts nav destinations — may need its snapshot updated; if it asserts a fixed nav list, update the expectation to include the new entry, that is an intended change).
- [ ] **Step 5: Commit**
```bash
git add app/web/src/lib/site.ts "app/web/src/app/tools/[slug]/page.tsx" app/web/src/components/Chrome.tsx app/web/test/navigation.test.tsx
git commit -m "feat(web): XML Generator slug, nav entry, and tool-page metadata"
```

---

### Task 5: `generator-client.ts` + `GeneratorWorkspace.tsx` (the form)

**Files:**
- Create: `app/web/src/lib/generator-client.ts`
- Create: `app/web/src/components/GeneratorWorkspace.tsx`
- Modify: `app/web/src/app/globals.css` (append `.generator-*` classes)

**Interfaces:**
- Consumes: `generateXml(data, signal)` (new client, POST `/api/tools/generate`), `downloadXml`/`copyXml` (import from `@/lib/repairer-client`), `trackEvent` (`generator_*` events), `useRouter` (`next/navigation`), `VAT_CATEGORY_CODES`-derived category options (hardcode the v1 set with official names per spec §6.3 — S, AE for summary).
- Produces: `GeneratorWorkspace` state machine `idle → building → ready → handed-off` + error; form sections (Document/Parties/Lines), computed totals strip, live XML preview, actions, Validate handoff.

- [ ] **Step 1: Client** — `GenerateInput`/`GenerateLine` types, `generateXml(data, signal?)`, `GeneratorClientError`; reuse download/copy from repairer-client.
- [ ] **Step 2: Component skeleton** — stepper (Build → Validate), two-column layout (form left / preview right on desktop, stacked on mobile), `createElement` style like `RepairerWorkspace`.
- [ ] **Step 3: Document + Parties sections** — template select (3 options, official names), invoice number, issue/tue date inputs, AED chip, supplier/customer TRN (15-digit live check: strip non-digits, `/^[0-9]{15}$/`, inline error, block submit) + name inputs.
- [ ] **Step 4: Lines section + totals** — repeatable rows (description, qty, unit price, category dropdown filtered per template with rate label), computed line extension + totals strip (client-side mirror of `totals.js` semantics — `Math.round(x*100)/100`; the server recomputes and is authoritative; the preview shows the server result once generated).
- [ ] **Step 5: Generate + preview** — debounced `generateXml` when form minimally valid (required fields + ≥1 line); show returned XML in the preview pane (JetBrains Mono, monospace, scroll); show field errors from the 400 `fieldErrors` inline.
- [ ] **Step 6: Actions + handoff** — Download XML (`downloadXml('invoice.xml', xml)`), Copy, Start over (clears state + sessionStorage handoff), "Validate this invoice →" (writes `{ source: 'xml-generator', xml }` + `router.push('/tools/uae-e-invoice-validator')`), "Fill with sample" (official Standard tax invoice data), dirty-form leave confirm, legend strip + draft banner + GUARDRAIL per spec §8.5.
- [ ] **Step 7: Verify** — `npx tsc --noEmit` clean; `npx vitest run test/tool-page-copy.test.ts test/validator-workspace.test.tsx` green.
- [ ] **Step 8: Commit**
```bash
git add app/web/src/lib/generator-client.ts app/web/src/components/GeneratorWorkspace.tsx app/web/src/app/globals.css
git commit -m "feat(web): GeneratorWorkspace — form, computed totals, live XML preview, validate-next handoff"
```

---

### Task 6: Validator handoff allowlist

**Files:**
- Modify: `app/web/src/components/validation/ValidatorWorkspace.tsx`

**Interfaces:**
- Produces: handoff hook accepts `source: 'xml-generator'` in addition to `'xml-repairer'`.

- [ ] **Step 1: Extend the check** — in the Task-8 hook, change `parsed?.source === 'xml-repairer'` to `['xml-repairer', 'xml-generator'].includes(parsed?.source)`.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit**
```bash
git add app/web/src/components/validation/ValidatorWorkspace.tsx
git commit -m "feat(web): validator handoff accepts xml-generator source"
```

---

### Task 7: Web tests

**Files:**
- Create: `app/web/test/generator-workspace.test.tsx`
- Modify: `app/web/test/validator-handoff.test.tsx` (add xml-generator source case)

**Interfaces:**
- Consumes: `GeneratorWorkspace`, `ValidatorWorkspace` via `@testing-library/react`.

- [ ] **Step 1: GeneratorWorkspace tests** (mock `@/lib/generator-client` via `vi.hoisted`, mock `next/navigation` + `@/lib/analytics`; follow `test/repairer-workspace.test.tsx` conventions):
  - renders stepper + Document/Parties/Lines sections, no validity claims (queryByText(/Preflight passed/) null)
  - category dropdown filtered per template (summary shows AE)
  - live line extension + totals computed (qty 5 × price 1000 → 5000.00, tax 250.00 at S)
  - XML preview updates after generate (mock returns a fixed XML; assert it renders)
  - "Validate this invoice →" writes sessionStorage `einvoicecheck:converter-handoff` containing `xml-generator` and calls router.push
  - bad TRN blocks submit (generateXml NOT called)
- [ ] **Step 2: validator-handoff** — add: `sessionStorage.setItem(..., JSON.stringify({ source: 'xml-generator', xml: '<Invoice/>' }))` → auto-validates + key cleared.
- [ ] **Step 3: Run web suite** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npm test` → all pass (baseline 17 files + 1 new). Fix selector/copy mismatches only.
- [ ] **Step 4: Commit**
```bash
git add app/web/test/generator-workspace.test.tsx app/web/test/validator-handoff.test.tsx
git commit -m "test(web): generator workspace + xml-generator handoff tests"
```

---

### Task 8: Full verification + branch state

- [ ] **Step 1: API suite** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/api && npm test` → all pass (107 baseline + generate tests).
- [ ] **Step 2: Web suite** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npm test` → all pass.
- [ ] **Step 3: Parity** — `cd /c/Users/abdul/https-einvoicecheck.ae/app/web && npx vitest run test/engine-parity.test.ts` → PASS (generator must not touch the dual trees).
- [ ] **Step 4: Grep hygiene** — `cd /c/Users/abdul/https-einvoicecheck.ae && grep -rn "XML Converter\|xml-converter\|ConverterWorkspace\|converter-client" app/web/src app/api/src || echo CLEAN` → CLEAN.
- [ ] **Step 5: Spec audit (§8.6)**:
  - [ ] No `EINVOICECHECK_API_KEY` in client bundles (`grep -rn "EINVOICECHECK_API_KEY" app/web/src --include="*.tsx"` → only server routes / display-only snippets).
  - [ ] sessionStorage key cleared after validator read + on generator reset.
  - [ ] Download Blob URL revoked after use.
  - [ ] Generated fixtures pass XSD oracle + engine suites (Task 1/2 gates).
  - [ ] Manual E2E against deployed API: generate → handoff → validator auto-validates.
- [ ] **Step 6: Push**
```bash
cd /c/Users/abdul/https-einvoicecheck.ae
git status --short   # expect: only intended changes (ignore tsconfig.tsbuildinfo + untracked .railway-config-pull-* / src/compliance / packages/rules/node_modules)
git push -u origin feat/xml-generator
```
(After owner review/merge to `origin/main`, Railway auto-deploys both services from git — no `railway up`.)

---

## Self-Review Notes (run before handing off)

- **Spec coverage:** §5 (page/client/proxy) → Tasks 3–5; §6 (core) → Task 1; §7 (endpoint) → Task 2; §8 (security) → Task 8 Step 5; §9 (testing) → Tasks 2/7/8. No gaps.
- **Type consistency:** `GeneratorWorkspace`, `generator-client`, `generateXml`, `generateInvoice`, `TEMPLATES`, `source: 'xml-generator'`, sessionStorage key `einvoicecheck:converter-handoff` — identical across all tasks.
- **One authority:** no task may render a validity claim outside the validator page; handoff is the only bridge.
- **Single-tree rule:** generator core is API-only; the parity test (Task 8 Step 3) enforces that nothing leaked into the web vendored rules.
