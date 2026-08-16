# Generator Import + Validator Safe Repair — Implementation Spec

**Date:** 2026-08-16

**Status:** Draft implementation specification; planning only

**Branch:** `fileconverter`
**Implementation approval:** Not granted by this document

## Goal

Simplify EInvoiceCheck around two clear jobs:

1. **Generator** accepts manual data or imported structured invoice data and creates PINT-AE XML.
2. **Validator** remains the single authority for judging XML and gains a narrow, explicit safe-repair action.

The standalone XML Repairer and `POST /v1/convert` retire. Repair logic that remains useful moves behind Validator and every generated or repaired XML candidate is judged by the existing `validateXmlDocument()` pipeline.

## Product shape

```text
Structured invoice data
  ├── Manual Generator form
  └── Import CSV / Generator JSON
          ↓
     existing Generator
          ↓
       PINT-AE XML
          ↓
  validateXmlDocument()

Existing XML
          ↓
       Validator
  ├── report findings
  └── offer narrow safe repairs when available
          ↓
  fingerprint + validateXmlDocument(candidate)
```

`validateXmlDocument()` is the final-XML authority for Validator, Generator, batch validation, and every repair candidate. Canonical JSON preflight remains separate because XSD and XML Schematron do not apply until XML exists.

---

# Part A — Import invoice data inside Generator

## User experience

Add a second Generator entry mode beside the existing manual form:

- **Build manually**
- **Import invoice data**

Import is not a new top-level tool, route, API product, or generation engine. It is a browser-side adapter that turns a supported file into the Generator's existing `{ template, data }` contract.

## Supported inputs

### Generator JSON

Accept either:

```json
{
  "template": "standard-tax-invoice",
  "data": {
    "invoiceNumber": "INV-001",
    "issueDate": "2026-08-16",
    "dueDate": "2026-09-15",
    "supplier": { "trn": "100000000000003", "name": "Supplier LLC" },
    "customer": { "trn": "100000000000403", "name": "Buyer LLC" },
    "lines": [
      { "name": "Consulting", "quantity": 1, "unitPrice": 1000, "category": "S" }
    ]
  }
}
```

or an array containing one to 50 objects of that exact shape.

This is **Generator JSON**, not the larger canonical JSON DTO accepted by `/v1/preflight`. Do not auto-detect or silently map the Validator DTO.

### Fixed CSV

Publish one downloadable CSV template with these columns:

```text
template,invoiceNumber,issueDate,dueDate,supplierTrn,supplierName,customerTrn,customerName,lineName,quantity,unitPrice,category
```

Each row represents one invoice line. Rows sharing an `invoiceNumber` are grouped into one invoice. Repeated invoice-level fields must match exactly across grouped rows; conflicting template, date, party, or TRN values fail that invoice with row-specific errors.

Unknown columns are allowed only when every value in the column is blank. Any populated unknown or unsupported field fails the affected import instead of being dropped or guessed.

## Parsing and privacy

- Parse CSV and JSON in the browser.
- Keep the original source container in browser memory only.
- Send normalized `{ template, data }` invoice objects to the existing Generator endpoint one invoice at a time or with small bounded concurrency.
- Do not upload or persist the original CSV/JSON file.
- Product copy must be accurate: the source file stays local, but normalized invoice data is sent to the backend Generator.
- Reject files containing zero invoices or more than 50 invoices before generation begins.

A standards-compliant CSV parser should be used rather than a handwritten parser. The implementing agent may choose one maintained browser-compatible CSV dependency and one maintained ZIP dependency, provided it records the bundle/security rationale and updates the lockfile. Avoid adding any broader import framework.

## Import preview

Before generation, show:

- detected invoice count;
- invoice numbers and templates;
- line counts;
- source rows;
- parse and mapping errors;
- conflicting repeated fields;
- unsupported fields;
- which invoices are ready to generate.

The browser preview is convenience validation only. The backend Generator remains authoritative and must validate every submitted object.

## Batch generation

- Support one to 50 invoices per import for both CSV and JSON.
- Reuse the existing single-invoice `generateXml()` / `/v1/generate` path per invoice.
- Do not add a batch-generation API.
- Do not use unbounded `Promise.all()`; use sequential processing or modest bounded concurrency.
- Preserve successful invoices if others fail.
- Each result retains the source invoice number and rows that produced it.
- Retrying failed invoices must not regenerate successful invoices unless the user explicitly requests it.

## Results and correction

For every successful invoice:

- show **XML generated**;
- offer an individual XML download;
- offer **View in Validator** using the existing in-memory handoff;
- never claim the Generator itself is the formal validation report surface.

For every failed invoice:

- show the exact invoice, source row, field, and backend correction message;
- offer **Open in manual Generator**;
- prefill the existing Generator form with that invoice's supported data;
- preserve the rest of the batch result while the user edits one invoice.

Provide **Download all successful XML** as a ZIP. Each invoice remains a separate XML file with a filesystem-safe, collision-resistant name derived from its invoice number. Never combine multiple invoices into one XML document.

## Generator invariants

- Imported invoices use the same Generator templates, calculations, escaping, and backend validation as manual invoices.
- The browser must not compute authoritative XML or totals for imported invoices.
- `generateInvoice()` continues to fail closed unless generated XML passes `validateXmlDocument()`.
- One failed invoice never deletes another successful result.
- Unknown or unsupported populated fields are never ignored.
- No PDF, OCR, image, Word, arbitrary spreadsheet mapping, native XLSX, or AI field guessing.

---

# Part B — Fold safe repair into Validator

## Product change

Retire the standalone XML Repairer as a product surface:

- remove it from primary navigation, tool lists, dashboard links, sitemap generation, and active product copy;
- remove `RepairerWorkspace`, its dedicated browser client, and its free-tool proxy;
- permanently redirect `/tools/xml-repairer` to the main Validator so old links do not dead-end;
- remove `POST /v1/convert`, its OpenAPI tag, route wiring, quota expectations, and active API documentation;
- do not create `/v1/repair` or another standalone public repair API.

Historical design documents may remain as history. Current product and API documentation must describe Validator-integrated safe repair only.

The Generator currently imports generic `downloadXml` and `copyXml` helpers from `repairer-client.ts`; move those helpers to a neutral browser utility before deleting the Repairer client.

## Validator interaction

Validation remains read-only by default. After validating an XML document, Validator may show **Apply safe repairs** only when a deterministic candidate is available.

The UI has two policies:

- **Strict** — default. Return or download repaired XML only when the candidate passes the complete `validateXmlDocument()` pipeline.
- **Format-only** — under Advanced options. Permit download of the same safe candidate when unresolved XSD or semantic errors remain, with a prominent **Format repaired — invoice still has blocking issues** warning and the complete findings visible.

Neither policy may alter invoice business values or invent missing structure/data. “Format-only” changes the return policy, not the allowed repair set.

The original XML remains available throughout preview, repair, validation, and reset.

## Allowed automatic repairs

Only two automatic repairs remain.

### 1. Encoding declaration normalization

Rewrite an existing `ISO-8859-1` declaration to `utf-8` only when the received JavaScript string appears cleanly decoded and contains no Unicode replacement character (`U+FFFD`) or other detected decoding failure.

If clean decoding cannot be established, report the encoding problem and refuse to create a candidate. Do not attempt byte transcoding in this feature.

### 2. Missing exact UBL `cbc` / `cac` declarations

Add an absent namespace declaration only when all of these are true:

- the used prefix is exactly lowercase `cbc` or `cac`;
- the prefix is used but unbound;
- the document is recognizably a UBL Invoice or CreditNote with the expected root namespace;
- the binding is the official UBL 2.1 CommonBasicComponents or CommonAggregateComponents URI;
- no conflicting binding already exists.

After adding the declaration, run fingerprint and full validation. Do not add arbitrary namespaces, infer bindings from unknown element names, or repair a missing/incorrect root namespace.

## Diagnosis-only findings

The following are never auto-repaired:

### Forbidden XML characters

Detect and report the forbidden code point and best available line/column or byte/character offset. Never delete it. The current pre-parse sanitizer is unsafe because deleting a control character can change a supplier name, note, identifier, or other invoice value before the existing fingerprint is taken.

### Existing incorrect namespace URI

Never overwrite an existing URI. Report:

- prefix;
- received URI;
- expected official URI;
- practical source-system correction.

There is no URI typo allowlist. The repository contains only a synthetic missing-`-2` fixture, not production evidence of a recurring customer typo.

### Prefix casing and aliases

Do not normalize prefix case. XML prefixes are aliases; a differently-cased prefix is valid when correctly bound to the right URI. Unbound aliases receive a binding error. Correctly bound aliases receive no style warning.

### Structural and semantic defects

Missing elements, wrong element order, invalid datatypes, TRNs, VAT categories, dates, totals, and all other XSD/Schematron/business failures remain findings only. Safe repair never writes or recalculates them.

## Repair candidate pipeline

```text
original XML
  → inspect for diagnosis-only blockers
  → build the two allowed metadata-only repairs in memory
  → parse original and candidate into canonical invoice models
  → compare canonical fingerprints
  → abort on any business-value difference
  → validateXmlDocument(candidate)
  → apply Strict or Format-only presentation policy
```

The fingerprint must cover the original XML before any mutation. This closes the current gap where forbidden characters are removed before the fingerprint baseline is created.

Every candidate response includes:

- original and candidate SHA-256 hashes;
- a machine-readable audit of each metadata change;
- the full candidate validation result;
- whether the candidate is eligible under Strict mode;
- no persisted payload.

## API integration

Preferred shape: extend the existing `/v2/validate` result with an optional safe-repair analysis/candidate rather than introducing another public repair endpoint. The implementing agent may choose an equivalent validator-scoped internal shape if it produces a smaller, clearer change, but these constraints are fixed:

- no replacement standalone repair API;
- ordinary validation remains read-only;
- repair output is never returned without an explicit UI action;
- the candidate is always judged by `validateXmlDocument()`;
- one request consumes one validation unit even if the server evaluates a candidate internally;
- no secrets or invoice payloads are logged or persisted;
- existing `/v2/validate` clients must continue to understand the base validation result (additive response evolution only).

## Universal validation rule

Use `validateXmlDocument()` for every final XML artifact EInvoiceCheck judges or returns:

- direct `/v2/validate` XML;
- legacy XML validation adapter;
- Generator output;
- batch Validator documents;
- safe-repair candidates.

Do not use it directly for canonical JSON preflight. Do not run separate partial XSD/business/Schematron classifiers around a final XML candidate. Tool-specific code may prepare input or shape output, but technical validity comes from one core.

---

# Expected code areas

The exact decomposition is left to the implementing agent, but the change is expected to stay near these areas:

## Generator import

- `app/web/src/components/GeneratorWorkspace.tsx`
- one focused import parser/model module under `app/web/src/lib/`
- optionally one focused import UI component under `app/web/src/components/`
- `app/web/src/lib/generator-client.ts`
- neutral XML download/copy utility extracted from `repairer-client.ts`
- `app/web/public/templates/` for the published CSV template
- Generator/import tests under `app/web/test/`
- `app/web/package.json` and lockfile only for justified CSV/ZIP dependencies
- existing Generator CSS area in `app/web/src/app/globals.css`

## Validator safe repair and retirement

- `app/api/src/rules/xml-validation.js`
- a focused safe-repair candidate module under `app/api/src/rules/`
- shared schemas and `/v2/validate` route wiring
- deletion or reduction of `app/api/src/rules/convert/`
- removal of `app/api/src/routes/convert.js` and registration/tagging
- Validator API/core tests; removal or replacement of converter tests
- `ValidatorWorkspace`, validation client/types, and validation result UI
- removal of Repairer workspace/client/proxy and their tests/styles
- navigation, tool metadata, dashboard/tool links, What We Check, sitemap, and active docs
- redirect for `/tools/xml-repairer`

Avoid unrelated refactors. `GeneratorWorkspace.tsx` is already large; the agent has freedom to extract import-specific UI/state rather than making it substantially larger.

# Acceptance summary

The implementation is acceptable when:

1. Manual Generator behavior remains intact.
2. Fixed CSV and Generator JSON imports support one to 50 invoices.
3. Parsing is local, unknown populated fields fail, and source files are not persisted.
4. Partial batch success is preserved and failed invoices can open prefilled in the manual Generator.
5. Successful XML downloads individually and as a ZIP of separate files.
6. Every imported invoice still passes through the existing backend Generator and `validateXmlDocument()` gate.
7. Standalone Repairer navigation/page/client/proxy and `/v1/convert` are gone; the old page redirects to Validator.
8. Validator offers only the two approved metadata repairs.
9. Forbidden characters, existing wrong namespace URIs, valid prefix casing differences, structure, and semantics are never rewritten.
10. Fingerprint comparison starts from the untouched original XML and aborts on any business-value change.
11. Strict is default; Format-only is clearly advanced and never claims validity.
12. All candidate findings come from `validateXmlDocument()` and include full XSD and Schematron coverage.
13. Existing Validator, Generator, batch, quota, usage, navigation, accessibility, mobile, and build checks remain green after obsolete Repairer assertions are intentionally replaced.

# Verification expectations

At implementation time, install dependencies from the committed lockfiles, then run at minimum:

```text
app/api: npm test -- --run
app/web: npm test -- --run
app/web: npm run build
git diff --check
```

Add focused checks for:

- CSV quoting, commas, newlines, BOM, duplicate headers, conflicting invoice rows, empty and >50 imports;
- JSON object/array contracts and unknown populated fields;
- partial success, retry-failed-only, manual-form prefill, filename collisions, and ZIP contents;
- forbidden-character diagnosis without mutation;
- clean and corrupted encoding cases;
- exact missing `cbc`/`cac` repair boundaries;
- valid mixed-case namespace aliases remaining untouched;
- wrong existing namespace URI diagnosis without replacement;
- fingerprint adversarial mutation failure;
- Strict versus Format-only UI behavior;
- full XSD and Schematron candidate results;
- `/v1/convert` removal and old browser route redirect;
- no repairer references in active navigation, dashboard, sitemap, or current product copy.

Current planning baseline could not execute because this worktree has no installed `vitest` or `next` binaries. That is an environment prerequisite for implementation, not evidence that the current tests pass or fail.

# Agent freedom

The implementing agent may choose:

- component boundaries for the import and safe-repair UI;
- one suitable CSV parser and one ZIP library;
- sequential versus modest bounded generation concurrency;
- the additive `/v2/validate` safe-repair response shape;
- exact presentation of previews, audit rows, and Advanced options;
- whether obsolete Repairer CSS is deleted wholesale or reduced after proving no remaining consumers.

The agent may not expand repair scope, add another repair API, persist payloads, silently drop imported fields, add PDF/XLSX/OCR mapping, or weaken full XML validation. Any such need returns to product review first.
