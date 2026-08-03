# UAE e-invoice preflight validation API

Deterministic **preflight** validation for UAE **PINT AE / UBL 2.1** invoices.
Send an invoice (JSON or XML), get back a normalized, remediable list of what is
wrong before you hand it to an accredited ASP.

> **Positioning guardrail — preflight validation only.**
> This service is **NOT** FTA-accredited, does **NOT** transmit legal
> e-invoices, does **NOT** replace an accredited Access Service Provider (ASP),
> and does **NOT** provide statutory archival. It lints invoices; it does not
> file them.

Stack (locked): **Fastify 5 + MongoDB (Mongoose) + Redis**. API-key auth,
per-key Redis rate limiting, usage-metering events written to Mongo.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/v1/validate` | API key | Preflight-validate a UAE invoice (JSON or UBL 2.1 / PINT AE XML) |
| `GET`  | `/usage` | API key | Per-key usage metering (all-time / 30d / today + outcome breakdown) |
| `GET`  | `/health` | none | Liveness + readiness (checks Mongo + Redis) |

### Auth
Send the key as either header:
```
x-api-key: pdk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Authorization: Bearer pdk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Missing/invalid key → `401`. Over the per-key rate limit → `429` (with
`Retry-After` and `x-ratelimit-*` headers).

### `POST /v1/validate` response
```json
{
  "valid": true,
  "invoiceType": "388",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "errors": [
    { "path": "/supplier/trn", "rule": "ENG-TRN-02/BT-31",
      "severity": "error", "message": "...", "fix": "..." }
  ]
}
```
`valid` is `true` when there are no `severity:"error"` items (warnings do not
invalidate). Output is **deterministic**: identical input → identical output.

### Input formats
1. **Canonical JSON** (this API's invoice DTO) — `Content-Type: application/json`.
   See `test/helpers/fixtures.js` → `validInvoice()` for the exact shape.
2. **Raw UBL 2.1 / PINT AE XML** — `Content-Type: application/xml`.
3. **JSON envelope** — `{ "document": "<Invoice>...</Invoice>" }`.

---

## Rule engine

One module per rule under `src/rules/checks/`, wired through an ordered
`registry.js` and run by `engine.js`. Errors are normalized to
`{ path, rule, severity, message, fix }`. To add the official XSD/Schematron
layer later, register it ahead of the semantic rules (anchors marked
`TODO(pint-ae-xsd)` in `src/rules/xml.js`).

### Implemented checks and the official rules they enforce

| Engine rule | Enforces | Official basis (fetched July 2026) |
|---|---|---|
| `ENG-TYPE-01` | Invoice type present + recognised | BT-3 / UNCL1001 (PINT AE); UAE mandatory-fields v1.0 |
| `ENG-REQ-*` | Core mandatory header/party/total fields | UAE Electronic Invoice mandatory fields v1.0 (MoF, 23 Feb 2026) — 51 mandatory fields |
| `ENG-TRN-*` | Seller TRN mandatory + **15 numeric digits**; buyer TRN 15 digits when present | FTA VAT TRN = 15 digits; PINT AE BT-31 / BT-48 |
| `ENG-CUR-*` | Currency present + ISO 4217; **AED** tax accounting currency for non-AED invoices | PINT AE **IBR-005 / IBR-CL-04 / IBR-053 / IBR-077**; UAE Guidelines v1.1 (VAT reported in AED) |
| `ENG-VAT-*` | VAT category ∈ {S, Z, E, O, AE, N} + rate consistency (S ⇒ 5%, Z/E/O ⇒ 0) | [AE VAT category code list](https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/codelist/Aligned-TaxCategoryCodes/); EN 16931 BR-S/BR-Z/BR-E |
| `ENG-LINE-*` | Line net = quantity × unit price (± line allowance/charge) | BT-131; EN 16931 BR-CO-4 (PINT AE) |
| `ENG-TAX-*` | Per-category tax = taxable × rate; taxable reconciles to line nets | EN 16931 BR-S-08 / BR-S-09 (PINT AE VAT breakdown) |
| `ENG-TOT-*` | Document totals reconcile (line sum → tax-exclusive → tax → tax-inclusive → payable) | PINT AE **IBR-CO-10 / IBR-CO-13 / IBR-CO-14 / IBR-CO-15 / IBR-CO-16** |

The `IBR-CO-*` and `IBR-005/IBR-CL-04` identifiers are taken directly from the
PINT AE business-rule set:
<https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/trn-invoice/businessrule/>.
Per-VAT-category rules (`BR-S-08/09`) are the EN 16931 rules PINT AE inherits;
the exact PINT-AE schematron IDs should be confirmed against the official
package — see `TODO(pint-ae-xsd)`.

### What is intentionally NOT implemented (V1 preflight scope)
- **PINT AE rule layer IS implemented** as deterministic JS: `ENG-SCH-01`
  (IBR-073 date format, IBR-CO-11 prepaid ≤ payable) and `ENG-XSD-01`
  structural XSD-lite (IBR-024 CustomizationID, BR-CO-18 line-id uniqueness,
  BT-1 invoice-number length). This is a rule-driven layer, not the official
  engine — see the next bullet.
- Full official UBL/PINT AE **XSD** + complete **Schematron runner** (vendored
  `.sch` executed via a Java/WASM runner) — not implemented; anchored via
  `TODO(pint-ae-xsd)` in `xml.js`. `schematron.js` is the adapter point.
- XML **digital signature**, **AS4** transmission, and the Peppol participant
  lookup — these belong to an accredited ASP, not a preflight linter.
- The complete ISO 4217 currency table (shape-checked; AED is the material case).

---

## Quick start (local)

```bash
cp .env.example .env          # defaults point at localhost Mongo + Redis
npm install
# with a local Mongo + Redis running:
npm run seed:key "Local Dev"  # prints a raw API key ONCE
npm start                     # listens on :3000
```

```bash
curl -s localhost:3000/v1/validate \
  -H "x-api-key: pdk_live_..." -H "content-type: application/json" \
  --data-binary @invoice.json | jq
```

No infrastructure? The **test suite** runs fully in-memory
(`mongodb-memory-server` + `ioredis-mock`):

```bash
npm test              # 18 integration + unit tests, zero external services
npm test -- --coverage
npm run openapi       # regenerate ../../handoffs/E1/openapi.yaml
```

## Deploy
See [`../../handoffs/E1/DEPLOY.md`](../../handoffs/E1/DEPLOY.md) for the Railway
runbook (Dockerfile + `railway.json` + env vars + demo-key seed).
