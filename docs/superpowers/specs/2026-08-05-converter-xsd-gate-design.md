# Converter XSD Gate + Client Validation Layers — Design

Date: 2026-08-05
Branch: feat/validate-schematron-wiring (extends the Schematron wiring work)
Status: Approved design

## Problem

The validator checks two of the three standard e-invoice validation layers:

| Layer | What it checks | Today |
|---|---|---|
| **Format** | well-formedness, encoding, illegal chars, namespace decls, prefix casing | Converter string-level (`FMT-*`) + DOM repairers |
| **Structure** | element order, cardinality, mandatory elements, datatypes, unknown elements | **Missing** — hand-written `structure.js` covers only 3 rules (IBR-001, BR-CO-18, BT-1) and explicitly cannot detect duplicate elements or element order |
| **Semantic** | business rules: VAT rates, TRN format, arithmetic, dates | `/v1/validate` Schematron interpreter + engine rules (`ibr-*`, `ENG-*`) |

Users pasting a real (broken) invoice get a flat wall of errors with no way to tell
*which kind* of problem they have — a structural problem (exporter emits wrong
element order) needs a different fix than a semantic one (VAT rate mismatch).

## Goals

1. **Add the missing Structure layer**: real UBL 2.1 XSD validation, so element
   order/cardinality/datatypes/unknown elements are detected instead of only the
   3 hand-written rules.
2. **Keep it non-blocking in the converter**: XSD violations are reported as
   `dataIssues`; the converter still repairs format and outputs. Rationale: XSD
   checks pure structure — no arithmetic — and the converter never invents data
   (proven by the existing fingerprint guard).
3. **Segment the client UX** so users see Format / Structure / Semantic groups
   with counts, not one overwhelming flat list.
4. Leave the Schematron interpreter untouched at `/v1/validate`.

## Decisions (from brainstorming)

- **Engine**: `libxmljs2` (native, full XSD 1.0). Risk: native module on Railway
  needs prebuilds matching the Node version. **Step 0 is a spike**: install
  `libxmljs2`, validate one official example against the vendored XSDs, confirm
  relative `import schemaLocation` chains resolve. Fallback if the build fights
  us: reassess (alternative is out-of-process xmllint, more moving parts).
- **Placement**: **A — XSD on the input** (after `addMissingNsDecl` +
  well-formedness gate, before the repairers). Reports the *incoming document's*
  real state. Accepted noise: wrong-case prefixes / missing declarations get
  flagged by XSD before the repairers fix them — accurate about the input.
  The fingerprint guard still proves no data was invented.
- **Behavior on XSD failure**: report as `dataIssues`, never `blocked`, in BOTH
  modes (`format`/`full`), surfaced on every outcome (CONVERTED, NOOP, REFUSED).
- **Client badges**: client-side only, derived from the existing `rule` field.
  No API shape change.
- **XSD source**: OASIS UBL 2.1 (the PINT pack ships no XSDs — only `.sch`/`.gc`).
  CreditNote XSD deferred until credit-note conversion ships.

## Components

### 1. Vendored OASIS UBL 2.1 XSDs

`docs/pint-ae-resources/ubl-2.1/` — official OASIS UBL 2.1 schema tree, layout
preserved so relative imports resolve:

```
docs/pint-ae-resources/ubl-2.1/
  maindoc/UBL-Invoice-2.1.xsd
  common/UBL-CommonAggregateComponents-2.1.xsd
  common/UBL-CommonExtensionComponents-2.1.xsd
  commonbasiccomponents/UBL-CommonBasicComponents-2.1.xsd
  common/UBL-UnqualifiedDataTypes-2.1.xsd
  common/UBL-QualifiedDataTypes-2.1.xsd
  common/UBL-CodeList-2.1.xsd
  common/UBL-DataTypeDefinition-2.1.xsd
```

Exact file list follows the OASIS UBL-2.1 release zip layout — preserved as
vendored, not reorganized.

### 2. New `app/api/src/rules/convert/xsd.js`

```js
// Loads the vendored UBL 2.1 XSD set once at module load via libxmljs2.
// Exports validateXsd(xml) -> { issues: [{rule, path, message, severity}], evalErrors }
//
// rule: 'XSD-01' (structural violation) or 'XSD-ERR' (validator could not run)
// severity: 'error'
// path: best-effort from the libxml2 error message (element name extraction);
//       '' when not extractable
```

- Schema load at startup: `libxmljs.parseXml` on `UBL-Invoice-2.1.xsd` (which
  pulls the common schemas via relative import). Load failure → throw at module
  load (fail loud — same precedent as the codelists drift check).
- `validateXsd(xml)`: `doc.validate(schema)`; map `validationErrors` to issues;
  keep `evalErrors` for diagnostics when libxml2 itself errors on the doc.
- XSD eval failure on a document → surfaced as a dataIssue (fail-closed,
  consistent with the Schematron fail-closed fix).

### 3. Pipeline change (`app/api/src/rules/convert/pipeline.js`)

Insert after the well-formedness gate (step 3), before the classifier (step 4):

```
sanitize → encoding decl → xmlns decl → well-formedness gate
  → [XSD gate → xsdIssues]          ← NEW
  → classifier → (refuse | repair)
  → re-validate → fingerprint guard → output
```

- `const xsdIssues = validateXsd(prepared)` (guarded — never crash the pipeline).
- Carry `xsdIssues` through the result on every path:
  - CONVERTED/NOOP success: `dataIssues: [...(mode === 'format' ? blocked : []), ...xsdIssues]`
  - REFUSED responses: include `xsdIssues` so the diagnostic survives refusal.
- XSD issues NEVER enter `blocked` — non-blocking by design.

### 4. Client layer badges (`app/web/`)

- New mapper in `app/web/src/lib/validation-ui.ts` (or a new small module):

```ts
// rule -> layer
// format:    ENG-PARSE-*, FMT-*
// structure: XSD-*, ENG-XSD-*
// semantic:  everything else (ibr-*, ibr-*-ae, aligned-*, ENG-*)
```

- `ValidationSummary` (`app/web/src/components/validation/ValidationSummary.tsx`):
  render three badges with counts — Format / Structure / Semantic — alongside the
  existing error/warning counts.
- `ValidationIssueList`: filter by the selected layer. Default: all. Clicking a
  badge filters the list. ("All" badge optional; default view = all.)
- Presentation only — no API shape change.

## Data flow (end to end)

```
Customer XML
  → /v1/convert: sanitize → decl → xmlns → well-formed → XSD gate (issues)
    → classifier → repair → fingerprint → output + dataIssues (incl. XSD)
  → /v1/validate (unchanged): Schematron + engine → semantic errors
Web tool: result → ValidationSummary (3 layer badges) + filtered IssueList
```

## Error handling

- XSD schema missing/corrupt at startup → throw (deploy fails loudly, not at
  request time).
- XSD eval error on a doc → dataIssue `XSD-ERR` + evalErrors log (fail-closed).
- Fingerprint guard unchanged: proves repairers never altered data values, so
  "XSD didn't invent data" holds by construction.

## Testing

- **Spike (step 0)**: `libxmljs2` + vendored XSDs + one official example → XSD
  validates/errors as expected, relative imports resolve.
- `xsd.js` unit: known-valid invoice → 0 issues; element-order violation →
  issue; missing mandatory element → issue; unknown element → issue.
- Pipeline unit: XSD-violating input → CONVERTED/NOOP with `dataIssues`
  populated, fingerprint passes; valid input → no XSD issues; REFUSED path
  preserves xsdIssues.
- Web: badge counts match the grouped errors; filtering narrows the list;
  regression on existing validator tool tests.
- Sanity corpus: official pack examples — expected: several flag XSD issues
  (they are not all XSD-conformant). This is the accurate input-state story.

## Out of scope (explicit)

- CreditNote-2.1.xsd — deferred until credit-note conversion ships.
- Replacing the fontoxpath Schematron interpreter with Saxon / compiled `.xslt`
  (full parity goal) — separate work, tracked in the gap analysis.
- Server-side `category` field on API errors — the badges are client-only by
  decision (user's client-perspective framing).
- `structure.js` removal — kept; it covers rules XSD does not (IBR-001 URN
  pattern is a semantic-adjacent check; BR-CO-18/BT-1 are PINT-AE-specific).
  Revisit if XSD proves to supersede it.

## Risks

- **`libxmljs2` native build on Railway** — primary risk; spike first. If
  prebuilds don't match, options: pin Node version, add build toolchain to the
  Docker image, or fall back to xmllint subprocess (extra binary in container).
- XSD-on-input noise (repairer-fixable items flagged) — accepted per placement A.
- Vendored XSD license: OASIS UBL 2.1 is OASIS Open — vendorable; note the
  license in the vendored dir README.
