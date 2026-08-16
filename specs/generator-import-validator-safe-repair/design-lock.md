# Invoice Import — parked design lock

**Date:** 2026-08-16

**Status:** Parked — not approved for planning or implementation
**Branch:** `fileconverter`

## Decision

Invoice Import is not a separate tool or conversion engine. It is a second input mode inside the existing XML Generator:

```text
CSV / Generator JSON
  → browser import adapter
  → existing Generator input `{ template, data }`
  → existing backend Generator
  → PINT-AE XML
  → existing full XML validation gate
```

The backend Generator remains the only component that creates XML. Its existing fail-closed gate runs XML format parsing, UBL XSD validation, shared business rules, and full PINT-AE Schematron before returning generated XML. The separate Validator remains the formal human-facing report surface.

## Locked decisions

1. Add **Import invoice data** inside XML Generator beside the manual form; no top-level Importer or Converter.
2. Accept one published EInvoiceCheck CSV format and Generator JSON `{ template, data }`; do not accept the Validator's larger canonical JSON DTO.
3. Accept one to 50 invoices in CSV or JSON. Reuse the existing single-invoice Generator once per invoice; no batch-generation engine.
4. Preserve successful XML when other invoices fail. Report the exact invoice, source row, field, and correction.
5. Provide individual XML downloads and one ZIP of all successful XML documents. Never combine invoices into one XML.
6. Open each failed invoice prefilled in the existing manual Generator form; no spreadsheet editor or guessed repairs.
7. Parse the source container in the browser, send normalized invoice objects to the backend Generator, and persist nothing. Copy must not imply normalized invoice data stays local.
8. Show **XML generated** and offer **View in Validator** for the formal report. Do not automatically validate the same output twice.
9. Keep server-side input validation and the Generator's existing fail-closed complete XML pipeline gate.
10. Reject every populated unsupported or unknown field exactly; never silently drop or reinterpret it.
11. Scope claims to full technical preflight for supported Generator templates and fields—not universal PINT-AE coverage, FTA accreditation, ASP acceptance, transmission, or archival.

## Excluded

- PDF, image, OCR, Word, and native XLSX ingestion.
- Arbitrary column mapping or header guessing.
- Validator canonical JSON as Generator input.
- A second XML generation/conversion engine.
- Source-file uploads, temporary files, persistence, or import history.
- New API contracts or batch-generation endpoints.

## Observed repo facts

- `POST /v1/generate` already accepts `{ template, data }` and generates one XML invoice.
- `app/api/src/rules/generate/generate.js` already calls `validateXmlDocument()` and fails closed on the complete XML pipeline.
- `POST /v1/preflight` is canonical-JSON data preflight only; XSD and full Schematron apply after XML exists.
- `GeneratorWorkspace` and a batch Validator capped at 50 already exist.
- CSV and ZIP dependencies are not installed; any dependency choice requires a future approved plan.

## Resume condition

Do not plan or implement until the user explicitly reopens the parked feature. On resume, route this lock through the Hermes Research → Specify → Analyze → Plan → approval gates.
