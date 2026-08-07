# Strict UBL XSD Validation Design

**Status:** Approved design; implementation not started  
**Date:** 2026-08-07  
**Scope:** EInvoiceCheck validator, converter/generator XSD reuse, and public validator proxy

## Problem

EInvoiceCheck's validator can parse XML into a usable object even when the source XML is structurally invalid. The well-formedness gate now rejects mismatched XML tags, but the validator still does not apply the official UBL 2.1 XSD gate to the original submitted XML.

That permits structural defects such as wrong namespace URIs, invalid element order, missing required elements, and invalid UBL datatypes to reach semantic rules. A document that is not a valid UBL 2.1 Invoice or CreditNote must not receive `valid: true`.

The converter already has native `libxmljs2` XSD validation, and the generator has a second Invoice/CreditNote implementation. These must converge on one XSD authority rather than becoming additional copies.

## Decisions

- XSD validation is **blocking** for strict XML validation.
- The validation order is:
  1. XML well-formedness
  2. UBL 2.1 XSD structure
  3. Existing semantic/rule engine
- A malformed XML document stops at Format. Structure and Semantic are `skipped`.
- An XSD-invalid document has a failed Structure layer, but Semantic still runs to provide fuller diagnostics.
- The validator never repairs, normalizes, or silently substitutes the submitted XML.
- Invoice and CreditNote use their matching official UBL 2.1 schemas.
- The public web validator and paid API use the same server-side validation path.
- The public validator accepts XML only.
- Canonical JSON remains available only as explicitly labelled authenticated data preflight.
- `/v1/validate` becomes XML-only immediately. JSON receives HTTP 400 with a pointer to `/v1/preflight`.
- `/v2/validate` provides the new structured response. Existing `/v1/validate` response shape remains compatible for XML clients.
- No claim of official Schematron coverage is added unless the repository can prove the exact engine and artefact used. Existing semantic validation remains accurately described.
- Google-indexed wording is out of scope for this change.

## Architecture

```text
Public web validator
  -> server-side proxy with server-only API key
  -> POST /v2/validate
  -> API-side native validation

/v2/validate
  -> XML only
  -> well-formedness gate
  -> Invoice/CreditNote XSD gate
  -> existing semantic engine
  -> structured layer response

/v1/validate
  -> XML only
  -> existing flat response adapter

/v1/preflight
  -> canonical JSON data checks
  -> explicit data-preflight scope
  -> not PINT-AE structural conformance

/v1/convert
  -> existing repair pipeline
  -> same neutral XSD implementation after repair

/generate
  -> existing generator
  -> same neutral XSD implementation as runtime oracle
```

The web application must not maintain a second browser-side validation engine for this path. Its server route proxies the API and forwards the API result to the UI.

## Components

### 1. Neutral XSD module

Create one API-side XSD module outside `rules/convert/`. It will:

- Load the vendored UBL 2.1 Invoice and CreditNote schemas once at startup.
- Resolve the schemas' relative imports using the existing `file://` base URL approach.
- Select the schema from the XML root document type.
- Return structural issues and validator-evaluation errors in a stable internal shape.
- Preserve the existing `validateXsd` and generator call sites through small compatibility wrappers or equivalent import updates.

The existing converter module and generator-specific module must not remain independent XSD implementations. The neutral module is the only implementation; wrappers exist solely to avoid unnecessary consumer breakage.

### 2. Validator routes and adapters

- Add `/v2/validate` as the authoritative strict XML validation contract.
- Keep `/v1/validate`'s current response shape for XML clients, backed by the same validation flow through an adapter.
- Reject JSON at `/v1/validate` with a clear 400 response naming `/v1/preflight`.
- Add or expose `/v1/preflight` for canonical JSON data checks. Its response must explicitly identify the result as data preflight and must not imply UBL/PINT-AE structural conformance.
- Update OpenAPI schemas and route documentation to distinguish XML validation from JSON data preflight.

### 3. Web proxy and presentation

- The free validator's server route calls `/v2/validate` using a server-side API key.
- No API key is exposed to the browser.
- The UI renders Format, Structure, and Semantic layer status/counts from the v2 response.
- The UI displays the structured issue fields when present and does not invent missing line, column, or XML path values.

## v2 response contract

```json
{
  "valid": false,
  "inputFormat": "xml",
  "validationScope": "pint-ae-ubl-xml",
  "invoiceType": "Invoice",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "format": {
    "status": "passed",
    "issues": []
  },
  "structure": {
    "status": "failed",
    "issues": [
      {
        "rule": "XSD-01",
        "severity": "error",
        "message": "Element ... is not expected.",
        "fix": "Correct the UBL document structure.",
        "line": 18,
        "column": 7,
        "xmlPath": "/Invoice/..."
      }
    ]
  },
  "semantic": {
    "status": "passed",
    "issues": []
  }
}
```

Each layer status is one of `passed`, `failed`, or `skipped`. The top-level `valid` is true only when all required layers pass. Optional location values are `null` when the underlying parser or validator does not provide reliable data.

The v2 response retains all findings from the selected policy: XSD findings are returned in Structure, and semantic findings are returned even when Structure failed. A Format failure is the hard stop and skips later layers.

## Error and deployment handling

- Missing or corrupt XSD resources at startup fail the API process loudly. The service must not start while claiming to have a structural gate it cannot load.
- A per-document XSD parse/evaluation failure produces a Structure `XSD-ERR` issue, sets the Structure layer to `failed`, and cannot produce `valid: true`.
- Existing semantic rule crashes remain safe fixed client messages with detailed server-side logs.
- Parser and XSD messages must not expose secrets or internal filesystem paths. Client-facing messages use safe diagnostics; details are limited to useful parser/XSD information.
- API authentication and rate limiting remain server-side concerns. The web proxy does not forward secrets to clients.
- Deployment verification must test the deployed commit, not only local source or unit tests.

## Testing and acceptance

### Unit and route tests

- Known-good Invoice returns zero XSD issues.
- Known-good CreditNote returns zero XSD issues.
- Wrong Invoice namespace fails Structure.
- Wrong CreditNote namespace fails Structure.
- Unknown element fails Structure.
- Missing required element fails Structure.
- Invalid element order fails Structure.
- Invalid UBL datatype fails Structure.
- Mismatched closing tag fails Format with parser detail and skips Structure/Semantic.
- XSD-invalid input still returns semantic findings under the selected diagnostic policy.
- XSD resource/evaluation failures are fail-closed.
- `/v1/validate` rejects JSON with HTTP 400 and migration guidance.
- `/v1/preflight` accepts canonical JSON and identifies its data-preflight scope.
- `/v2/validate` response schema enforces layer statuses and rich issue fields.
- v1 XML adapter preserves the existing flat response contract.
- Converter and generator suites continue to pass while using the neutral XSD authority.
- Web proxy tests confirm the server-side API call and v2 response rendering.

### Production acceptance

After deployment, exercise the exact production artefacts with:

1. `invalid-01-malformed-xml.xml`: Format failure, `ENG-PARSE-01`, no semantic-only misdiagnosis.
2. `valid-comprehensive-pint-ae.xml`: continues through all gates without a false structural failure.
3. A valid CreditNote fixture: passes the matching CreditNote XSD.
4. Wrong-namespace Invoice and CreditNote fixtures: fail Structure.

Record the deployed commit and results in `.hermes/critic-loop.md`. Do not mark the work resolved from local tests alone.

## Out of scope

- Replacing the existing semantic engine with a new Schematron runtime.
- Claiming official Schematron coverage without exact artefact/evidence.
- XML repair behavior or automatic repair suggestions inside validation.
- Canonical JSON becoming a substitute for final UBL XML validation.
- Google search/indexing or unrelated legal/UX findings.
- FTA accreditation, legal transmission, signing, or archival claims.
