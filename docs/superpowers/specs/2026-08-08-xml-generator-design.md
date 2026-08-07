# XML Invoice Generator — Design Spec

**Date:** 2026-08-08
**Status:** Approved for implementation
**Branch base:** `feat/xml-generator` (from `origin/main` = deployed lineage; `feat/xml-converter-redesign` was fast-forwarded into main)
**Spike:** `spikes/003-xml-generator/` (committed locally on `feat/xml-converter-redesign`, carried into this branch) — token-skeleton approach PROVEN: generated XML passes `convert` (NOOP) + `validateInvoice` (valid) with 0 XSD issues; AE reverse-charge confirmed; XML escaping verified.

---

## 1. Context & Ground Truth

The product is an XML-only UAE e-invoice preflight suite (JSON compatibility being removed). Current tools:

| Tool | Job | Verdict authority |
|---|---|---|
| `/tools/xml-repairer` | Fix format defects (5 classes: chars, decl, xmlns decls, prefix case, NS URIs); REFUSES data/semantic errors | "No changes needed" / "Repaired — N fixes" — never "valid" |
| `/tools/uae-e-invoice-validator` | Full semantic check (Format/Structure/Semantic layers) | **The only page that says "Preflight passed"** |

**The gap:** businesses without XML (Excel/ERP/PDF data) have no path into the suite. The repairer can't fix structure (by design — that requires inventing content, see `2026-08-05-converter-xsd-gate-design.md`), so the correct product move is to *generate* structure correctly in the first place: a generator whose output is XSD-valid by construction, then hand off to the validator — the one authority.

**Spike evidence (`spikes/003-xml-generator/check.js`, all 4 fixtures pass):**
- `standard-good` → convert NOOP, 0 XSD issues, valid=true
- `ae-summary-good` (S + AE dual subtotal, rate 5 / tax 0) → NOOP, 0 XSD issues, valid=true — the AE reverse-charge engine fix (2026-08-07) makes summary generation correct
- `adversarial` (`Falcon & Sons <Trading> "LLC" Ltd`) → escaped `&amp; &lt; &gt; &quot; &#39;`, valid=true
- `bad-trn` (`"12345"`) → convert REFUSED, 0 XSD issues, `ENG-TRN-02/BT-31` — structure clean, semantics honest

## 2. Goals

1. Let a user **build a PINT-AE 1.0.4 UBL XML invoice from a form** — structure guaranteed (official sample skeletons), totals computed (engine math), data-entry checks live.
2. **One validation authority:** the generator never claims "valid"; its primary CTA hands off to the validator via the existing sessionStorage pattern.
3. Fit the **XML-only** direction: output is UBL 2.1 XML; form state is internal React state, never a public JSON contract.
4. Preserve the security posture: no payload persistence, server-side key, IP rate limiting (same as `/api/tools/convert`).

## 3. Non-Goals (v1)

- **No OCR / PDF import** (follow-up; future "Import from PDF" button on this page).
- **No doc-level allowance/charge** — lines only; totals math stays unambiguous (follow-up: composable AllowanceCharge blocks from the 29 official examples).
- **No mixed-category subtotals beyond each template's demonstrated set** (each v1 template supports exactly the VAT categories its official sample shows).
- **No self-billed (389)** — excluded from the type dropdown (not vendored; the validator's explicit-unsupported banner stays the answer).
- **No optional-field sprawl** — v1 emits the sample skeleton's *required core* (parties, TRN, dates, lines, totals). Payment terms, delivery, Arabic names, attachments: follow-ups.
- **No changes to `/v1/convert`, `/v1/validate`, or the repairer.**
- **No JSON output anywhere.** The paid API evolution (`/v1/generate` for API users) is a separate decision, noted in §10.

## 4. Flow

```
/tools/xml-generator
  [ Step 1 — Build ]
    Document ▸ Parties ▸ Lines        (live data-entry checks)
    computed totals strip             (engine money.js semantics)
    live XML preview                  (right column, debounced)
  [ Download XML ] [ Copy ] [ Start over ]
  [ Step 2 — Validate ]
    "Validate this invoice →" ──sessionStorage──► /tools/uae-e-invoice-validator
      (einvoicecheck:converter-handoff, source 'xml-generator') — auto-fills + auto-validates
```

## 5. Component Changes (web)

### 5.1 New page `/tools/xml-generator`

- `app/web/src/lib/site.ts`: `TOOL_SLUGS` += `'xml-generator'`
- `app/web/src/app/tools/[slug]/page.tsx`: TOOLS entry + render condition `slug === 'xml-generator'` → `<GeneratorWorkspace />`
  - h1: `XML Generator`
  - title: `Free UAE e-invoice XML generator — build PINT-AE XML from a form`
  - targetKeyword: `UAE e-invoice XML generator`
  - blurb/description: build-first wording; "structure built from the official FTA examples; your data is never sent to a server"; keep the preflight framing
- `app/web/src/components/Chrome.tsx`: nav `{ href: '/tools/xml-generator', label: 'XML Generator' }` (before XML Repairer)

### 5.2 `app/web/src/components/GeneratorWorkspace.tsx` (new, 'use client', createElement style)

State machine: `idle → building → ready → validating → handed-off`, plus error state.

**Stepper** (same visual language as RepairerWorkspace): Step 1 "Build" → Step 2 "Validate" (flips to active when XML is ready).

**Step 1 body — the form:**

1. **Document section:**
   - Template select (drives skeleton + category set + type code): `Standard tax invoice` (388/380), `Summary tax invoice` (386? — use the official sample's type code, AE categories), `Standard tax credit note` (381). Label each with the official sample name.
   - Invoice number (required), Issue date (required, `YYYY-MM-DD`, not in the future per ENG-REQ-19 semantics), Due date (optional, ≥ issue date per ENG-REQ-26), Currency fixed `AED`.
   - Read-only chip: `Profile: PINT-AE billing 1.0.4` (CustomizationID is fixed, never editable).
2. **Parties section:** Supplier TRN (live 15-digit check mirroring `ENG-TRN-02`, paste-friendly strip of spaces/dashes, inline error, blocks submit while red), Supplier name (required), Customer TRN (same check), Customer name (required).
3. **Lines section:** repeatable rows — Description, Quantity, Unit price, VAT category dropdown (filtered per template: standard → `S`; summary → `S`, `AE`; credit note → `S`; show official names + rate: "S — Standard rate (5%)", "AE — VAT Reverse Charge (notional 5%, tax 0)"). Rate auto-fills from category (`codelists.js` expectedRates). **Line extension computed live** (qty × price, `round2`), displayed, not typed. Add line / remove line; start with one empty row.
4. **Computed totals strip** (sticky, below form): LineExtensionAmount = Σ line nets; TaxExclusive = LineExtension; per-category TaxAmount (S: 5% of its taxable; AE: 0); TaxInclusive = exclusive + tax; Payable = inclusive. Uses the engine's `money.js` semantics — generated docs cannot fail ENG-LINE-05 / ENG-TAX-08 / ENG-TAX-09 / document-total arithmetic.

**Live XML preview** (right column, JetBrains Mono, debounced ~300ms): the generated XML string, updated on every change. Shown once the form is complete enough to generate (minimal validation: required fields + ≥1 line).

**Actions:** `Download XML` (`downloadXml('invoice.xml', xml)` pattern from repairer-client), `Copy`, `Start over` (clears form + sessionStorage handoff key, dirty-form "leave page?" confirm).

**Step 2 — Validate panel** (next-panel style, shown when XML is ready): primary button `Validate this invoice →` writes `sessionStorage.setItem('einvoicecheck:converter-handoff', JSON.stringify({ source: 'xml-generator', xml }))` then `router.push('/tools/uae-e-invoice-validator')`.

**Legend strip** (anti-confusion vocabulary): *"While you type: data-entry checks · Structure: guaranteed (official template) · Final verdict: the Checker."*

**Fill with sample:** button prefills the official Standard tax invoice's data (same demo instinct as Repairer's "Try a sample").

### 5.3 `app/web/src/lib/generator-client.ts` (new)

- `generateXml(data: GenerateInput, signal?): Promise<{ ok: true; xml: string; template: string }>` — POST `/api/tools/generate`; error handling mirroring `repairer-client` (`GeneratorClientError`).
- Reuse `downloadXml`/`copyXml` from `repairer-client` (import, no duplication).

### 5.4 Validator handoff source allowlist

`app/web/src/components/validation/ValidatorWorkspace.tsx` — the Task 8 hook currently accepts only `source === 'xml-repairer'`. Extend to `['xml-repairer', 'xml-generator'].includes(parsed.source)`. One-line change + test update.

### 5.5 Web proxy `app/web/src/app/api/tools/generate/route.ts` (new)

Mirror of `/api/tools/convert/route.ts`:
- `const TOOL = 'uae-e-invoice-generator';` (rate-limit namespace), `MAX_BYTES = 64 * 1024` (form payload is small)
- Proxies `POST /v1/generate` with `EINVOICECHECK_API_KEY` server-side; same fail-closed errors ("The generator tool is not configured yet…", "Could not reach the generator API…"); same `rateLimit` envelope.

## 6. Generator Core (`app/api/src/rules/generate/`)

### 6.1 Files

| File | Role |
|---|---|
| `skeletons/standard-tax-invoice.xml` | Tokenized official sample (from `pint-ae-resources/trn-invoice/example/Standard tax invoice.xml`) |
| `skeletons/summary-tax-invoice.xml` | Tokenized official sample (AE dual subtotal) |
| `skeletons/standard-tax-credit-note.xml` | Tokenized official sample (from `trn-creditnote/example/Standard tax credit Note.xml`) |
| `templates.js` | Template registry: id → { skeleton path, invoiceTypeCode, customizationId, categories, name, lineFragment (see 6.3) } |
| `generate.js` | `generateInvoice(data)` → `{ xml, template }` — validates input, renders skeleton, escapes, computes totals |
| `totals.js` | `computeTotals(lines, categoryRates)` → line/tax/document totals using `money.js` (`round2`, 2-dp semantics) |
| `index.js` | Public API: `generateInvoice`, `TEMPLATES`, `GENERATOR_VERSION` |

### 6.2 Token engine (spike-proven, productionized)

- Skeleton = byte-copy of the official sample with data values replaced by `{{TOKEN}}`.
- **Static tokens** (document/parties): `{{SUPPLIER_TRN}}`, `{{SUPPLIER_NAME}}`, `{{CUSTOMER_TRN}}`, `{{CUSTOMER_NAME}}`, `{{INVOICE_NUMBER}}`, `{{ISSUE_DATE}}`, `{{DUE_DATE}}`, `{{INVOICE_TYPE_CODE}}`, `{{CURRENCY}}`.
- **Dynamic lines:** the skeleton keeps ONE `InvoiceLine` block tokenized as `{{LINE_BLOCK}}`; the generator renders the line block per line (`{{LINE_NAME}}`, `{{LINE_QTY}}`, `{{LINE_PRICE}}`, `{{LINE_EXT}}`, `{{LINE_CATEGORY}}`, `{{LINE_RATE}}`), joined, and substitutes the concatenation. This solves the spike's "fixed line count" limitation.
- **Totals tokens:** `{{LINE_EXTENSION_TOTAL}}`, `{{TAX_EXCLUSIVE_TOTAL}}`, per-category `{{TAX_SUBTOTAL_BLOCK}}` (rendered per category present), `{{TAX_TOTAL}}`, `{{TAX_INCLUSIVE_TOTAL}}`, `{{PAYABLE_TOTAL}}`.
- **Escaping is mandatory for every substituted value** (`& < > " '` → `&amp; &lt; &gt; &quot; &#39;`) — the spike's adversarial fixture proves the failure mode. Numeric tokens validated as numbers before substitution (no `NaN`/`Infinity` can enter the XML).
- **Required-token audit:** after render, assert zero unresolved `{{TOKEN}}` remain (fail loudly — a leaked token is a generator bug, same precedent as the codelist drift check).

### 6.3 Templates (v1)

| id | Source sample | Type code | Categories |
|---|---|---|---|
| `standard-tax-invoice` | Standard tax invoice.xml | 388 | S |
| `summary-tax-invoice` | Summary tax invoice.xml | 386 | S, AE (dual subtotal: S taxable, AE taxable with rate 5, tax 0) |
| `standard-tax-credit-note` | Standard tax credit Note.xml | 381 | S |

(The official sample "Standard tax invoice.xml" carries 380; v1 uses the code from each sample verbatim — type-code selection beyond the samples is a follow-up.)

### 6.4 Input validation (`generateInvoice` — 400-class, deterministic, mirrors engine rules)

- Required: invoiceNumber non-empty; issueDate `YYYY-MM-DD` parseable; supplier/customer `{trn, name}` non-empty; ≥1 line; every line `{name, quantity>0, unitPrice≥0, category in template.categories}`.
- TRN: 15 digits (reuse `app/api/src/rules/checks/trn.js` format logic — server-side, no dual-tree concern).
- Category not in template set → 400 with the allowed list.
- Unsupported template id → 400.

### 6.5 Runtime + CI guarantees

- **Runtime XSD oracle:** after rendering, run `validateXsd(xml)` (reuse `app/api/src/rules/convert/xsd.js`); if ANY XSD issue → throw (generator bug — the skeleton must be XSD-valid; fail loudly, never ship broken structure).
- **CI gates (`app/api/test/generate.test.js`):** for each template — valid fixture → `validateXsd` 0 issues, `convert(xml, {mode:'full'})` NOT REFUSED, `validateInvoice(xml)` valid=true; bad TRN → generate 400; escaping fixture → entities present, no raw `&`/`<`; unresolved-token audit passes. The engine suites are the generator's free test oracle.

## 7. API Endpoint — `POST /v1/generate` (new)

- **Auth:** `x-api-key` (same as `/v1/validate`); rate-limited + usage-metered per existing patterns.
- **Body:** `{ template: 'standard-tax-invoice' | 'summary-tax-invoice' | 'standard-tax-credit-note', data: { invoiceNumber, issueDate, dueDate?, supplier: {trn, name}, customer: {trn, name}, lines: [{name, quantity, unitPrice, category}] } }`
- **200:** `{ ok: true, xml, template, engineVersion }` — `engineVersion` = `GENERATOR_VERSION`.
- **400:** `{ ok: false, error, fieldErrors?: {field: message}[] }` for validation failures.
- **401/429/503:** same shapes as `/v1/convert`.
- Route file: `app/api/src/routes/generate.js`; registered in the Fastify app alongside convert/validate (mirror `convert.js` registration — same key check, rate limit, usage event).

## 8. Security & Privacy

1. **No payload persistence.** The generator route stores nothing about the submitted invoice; the form lives in browser memory only; the sessionStorage handoff is same-tab, auto-cleared by the validator (extended allowlist in §5.4) and on "Start over".
2. **Server-side enforcement.** `EINVOICECHECK_API_KEY` server-side only (web proxy holds it; never in the client bundle — same audit as the repairer).
3. **Abuse control.** IP rate limit in shared Redis for `/api/tools/generate` (namespace `uae-e-invoice-generator`), same fail-closed semantics; `/v1/generate` inherits the paid API rate/usage paths.
4. **Client-side safety.** Download via Blob URL (revoked after use); copy via Clipboard API.
5. **Honest framing.** The page carries the site `GUARDRAIL` plus a draft banner: *"Machine-drafted preflight file. Review every field before use — not FTA-accredited, not transmitted to the FTA."* The generator never renders "Preflight passed" — only the validator does (one-validation-authority rule).
6. **Pre-launch audit checklist.**
   - [ ] No `EINVOICECHECK_API_KEY` in client bundles (`NEXT_PUBLIC_` prefix check).
   - [ ] sessionStorage key cleared after validator read and on generator reset.
   - [ ] Download Blob URL revoked after use.
   - [ ] Generated fixtures pass `validateXsd` (0 issues) + engine suites in CI.
   - [ ] Live check: generate → handoff → validator auto-validates (`source: 'xml-generator'`).

## 9. Testing

- **API:** `generate.test.js` — per-template golden fixtures (valid → engine-valid), 400 cases (missing fields, bad TRN, unknown category/template, empty lines), escaping adversarial case, unresolved-token audit, XSD oracle fires on a deliberately-broken skeleton (unit-inject).
- **Web:** `generator-workspace.test.tsx` — renders stepper + sections; category dropdown filtered per template; line extension + totals computed live; XML preview updates; "Validate this invoice →" writes sessionStorage + router.push; "Fill with sample" prefills; no "valid" claims rendered. Extend `validator-handoff.test.tsx` — `source: 'xml-generator'` auto-validates.
- **Regression:** `tool-page-copy`, `navigation`, `engine-parity`, full API + web suites stay green.
- **Manual E2E:** build → download → validate handoff on the deployed API.

## 10. Out of Scope / Follow-ups

- **PDF → XML import** ("Import from PDF" button on this page — extraction feeds the same form DTO; spike 002 + this core are the two proven halves).
- **More templates** from the remaining official examples (commercial, exports, FTZ, e-commerce, margin scheme, doc-level allowance/charge variants, reverse charge…).
- **Optional PINT-AE fields** (payment terms, delivery, Arabic names, attachments, OrderReference/PayeeParty toggles).
- **Self-billing (389)** — stays explicitly unsupported (validator banner).
- **Paid `/v1/generate` evolution** (quota/plan mapping, generation history) — separate spec when API users ask.
- **OCR / scanned input** — separate workstream.

## Self-Review

- **One authority:** generator/repairer never claim validity; only the validator does; handoff covers both sources.
- **Type consistency:** `GeneratorWorkspace`, `generator-client.ts`, `generateXml`, `generateInvoice`, `TEMPLATES`, sessionStorage key `einvoicecheck:converter-handoff` + `source: 'xml-generator'` — identical across spec/plan/tasks.
- **Dual-tree:** generator lives in `app/api` only (like `convert/`); no web vendored copy; parity test untouched.
- **Spike lineage:** production core = spike approach + dynamic-line blocks + per-template category sets + XSD runtime oracle + unresolved-token audit.
