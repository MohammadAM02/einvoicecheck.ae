# EInvoiceCheck Validation Coverage — Repository Truth

**Status:** repository evidence baseline; not a certification or live-production attestation  
**Baseline:** `7abf2b4b17e59ce5804dfa4e36f640175da59b72` (`main`, 2026-08-08)  
**Prepared:** 2026-08-09  

## Purpose

This document is the technical source of truth for what EInvoiceCheck's current repository actually validates, which artifacts it uses, what the tests prove, and what remains unverified.

It deliberately separates four things that must not be conflated:

1. **Implemented** — code is present in the repository and is wired into a runtime path.
2. **Repository-tested** — automated tests in the repository exercise the behavior.
3. **Artifact-proven** — the exact artifact/version relationship is evidenced by vendored files, sync/drift guards or upstream provenance.
4. **Live-verified** — production behavior has been independently reproduced against a deployed commit.

A repository implementation or passing test does **not** by itself prove production deployment, official conformity, ASP acceptance or authority acceptance.

---

## Executive conclusion

The current XML validation path is materially stronger than a semantic-only linter. For XML, both `POST /v2/validate` and the legacy flat `POST /v1/validate` delegate to one shared `validateXmlDocument()` implementation that runs:

1. an XML well-formedness / parse gate;
2. native OASIS UBL 2.1 XSD validation for `Invoice` or `CreditNote`;
3. the deterministic EInvoiceCheck rule engine; and
4. a node-only interpreter over two vendored PINT AE Billing Schematron `.sch` files.

The canonical JSON endpoint, `POST /v1/preflight`, runs only the deterministic canonical-model rule engine. It does not run the native UBL XSD or the full node-only Schematron interpreter because there is no final UBL XML document to validate.

The repository also contains a real PINT AE Billing v1.0.4 Schematron sync guard and a test that compiles **302 `<assert>` elements** from the two Billing `.sch` files. That number is an implementation/test fact, **not a safe public claim of “302 rules” or complete official conformity**.

The most important finding from this audit is a concrete internal inconsistency around document type codes: the vendored/current PINT AE Billing Schematron permits Invoice codes `380` and `480`, and CreditNote codes `81` and `381`; the hand-coded engine currently recognises a broader list including `383`, `386`, `388` and `389`, while the XML Generator uses `388` and `386` for two of its three templates. Those generated documents can therefore be XSD-valid while still failing the current PINT AE Billing Schematron rule `ibr-cl-01`. This must be corrected before any claim that the generator produces PINT-AE-conformant Billing documents.

---

## Current official upstream baseline

As checked against the OpenPeppol UAE specification site on 2026-08-09:

- PINT AE Billing: **v1.0.4**.
- PINT AE Self-Billing: **v1.0.4**, published as a separate specialization.
- The current OpenPeppol UAE documentation is rendered with **PDK 1.4.4**.
- PINT AE Billing v1.0.4 release notes identify PINT General **1.1.3**, PINT AE **1.0.4**, release date **2026-06-02**, status **Final**.
- Current Billing Invoice type-code subset: `380`, `480`.
- Current Billing CreditNote type-code subset: `381`, `81`.
- Current AE VAT category set: `S`, `E`, `O`, `AE`, `Z`, and `Ν` (Greek capital Nu in the published code list; the repository normalizes this to Latin `N` for its generated browser-safe codelist because the jurisdiction Schematron uses Latin `N`).

**Important version distinction:** the repository contains a vendored tree identified and regression-tested as PINT AE Billing **v1.0.4**. This audit did **not** independently checksum the repository against the downloadable artifact currently linked by the PDK 1.4.4 site. Therefore it is safe to say “the repository vendors and tests a PINT AE Billing v1.0.4 resource tree”; it is not yet safe to claim “byte-for-byte identical to the current PDK 1.4.4 download” without a fresh artifact checksum comparison.

---

## Runtime architecture

```text
Raw UBL XML
   |
   +--> POST /v2/validate -------------------------------+
   |                                                     |
   +--> POST /v1/validate (legacy flat response) --------+--> validateXmlDocument(xml)
                                                           |
                                                           +--> FORMAT
                                                           |    normalizeInput / XML parse
                                                           |    failure -> ENG-PARSE-01
                                                           |    structure + semantic skipped
                                                           |
                                                           +--> STRUCTURE
                                                           |    validateXsd(xml)
                                                           |    OASIS UBL 2.1
                                                           |    Invoice or CreditNote XSD
                                                           |    XSD-01 / XSD-ERR
                                                           |
                                                           +--> SEMANTIC
                                                                evaluateInvoiceRules(invoice)
                                                                +
                                                                validateSchematron(xml)
                                                                |
                                                                +--> deterministic ENG-* rules
                                                                +--> two PINT AE Billing .sch files

Canonical JSON invoice DTO
   |
   +--> POST /v1/preflight
           |
           +--> validateInvoice / evaluateInvoiceRules
                 deterministic canonical-model rules only
                 no native UBL XSD
                 no node-only full Schematron interpreter
```

`POST /v1/validate` and `POST /v2/validate` do not maintain separate XML engines: both call `validateXmlDocument()`. The v1 route merely flattens the three issue arrays into the legacy `errors[]` response shape.

---

## Coverage matrix

| Area | Artifact / version | Runtime path | What is actually covered | Repository proof | Status / confidence |
|---|---|---|---|---|---|
| XML well-formedness | `fast-xml-parser` via normalization/parser gate | `validateXmlDocument()` before deeper checks | Malformed XML returns `ENG-PARSE-01`; structure and semantic layers are skipped | `app/api/src/rules/xml-validation.js`; `app/api/test/xml-validation.test.js`; `app/api/test/validate.test.js` | **Implemented + repository-tested + previously live-verified for F-01** |
| UBL structure | OASIS **UBL 2.1** XSD set vendored under `app/api/pint-ae-resources/ubl-2.1/xsd/` | `validateXsd()` called by XML validator and generator XSD wrapper | Native schema validation against `UBL-Invoice-2.1.xsd` or `UBL-CreditNote-2.1.xsd`; wrong namespaces/root/element-order/schema violations surface as `XSD-01`; execution failure as `XSD-ERR` | `app/api/src/rules/xsd.js`; vendored UBL README; layered XML tests | **Implemented + repository-tested + artifact provenance documented** |
| PINT AE Billing Schematron | Vendored **PINT AE Billing v1.0.4** working copies: `PINT-UBL-validation-preprocessed.sch`, `PINT-jurisdiction-aligned-rules.sch` | `validateSchematron(xml)` in XML semantic layer | Interpreter compiles all `<assert>` elements in the two Billing files and evaluates matching contexts using XPath 3.1; eval failures are fail-closed | `app/api/src/schematron-interpreter.js`; `schematron-sync.test.js`; `schematron.test.js` | **Implemented + repository-tested; exact parity to an independent reference validator still not fully proven** |
| Schematron assertion inventory | Same two Billing `.sch` files | node-only interpreter | Test pins `totalAsserts === 302`; a representative Standard invoice evaluates >200 context-matching asserts | `app/api/test/schematron.test.js` | **Repository fact. Do not market as “302 rules.”** |
| PINT AE Billing resource version | Vendored resource tree labeled/tested as **v1.0.4** | source for working Schematron + codelists/examples | Working `.sch` copies are CRLF-normalized byte-equal to the vendored v1.0.4 `trn-invoice/schematron` source of truth | `app/api/test/schematron-sync.test.js`; upgrade commit `24c0604` | **Artifact-proven inside repo; current PDK-download checksum not reverified here** |
| VAT category codelist | Vendored `Aligned-TaxCategoryCodes.gc` | generated browser-safe `VAT_CATEGORY_CODES` + deterministic VAT rules | `S`, `E`, `O`, `AE`, `Z`, normalized `N`; generated object must deep-equal vendored genericode in drift test | `app/api/test/codelists-drift.test.js`; `app/api/src/rules/codelists.js` | **Artifact-linked + repository-tested** |
| Document type codelist — full XML Schematron | PINT AE Billing v1.0.4 `ibr-cl-01` | full XML Schematron | Invoice: `380`, `480`; CreditNote: `81`, `381` | `app/api/schematron/PINT-UBL-validation-preprocessed.sch`; current OpenPeppol code-list pages | **High confidence — and conflicts with hand-coded engine** |
| Document type codelist — deterministic engine | Hand-maintained `INVOICE_TYPE_CODES` | JSON preflight and canonical semantic layer inside XML path | Recognises `380`, `381`, `383`, `386`, `388`, `389`; `389` produces an explicit unsupported self-billing warning | `app/api/src/rules/codelists.js`; `checks/invoiceType.js` | **Implemented but not aligned to current Billing subset** |
| Self-Billing | Separate OpenPeppol **PINT AE Self-Billing v1.0.4** exists upstream | no separate Self-Billing Schematron path is wired in current repo | Deterministic engine warns that `389` self-billing is unsupported; current interpreter works from Billing working copies | `checks/invoiceType.js`; interpreter file list; OpenPeppol upstream | **Explicitly unsupported / incomplete** |
| Core required fields | EInvoiceCheck deterministic rule | JSON preflight + XML semantic layer | Invoice number, issue date, supplier name, buyer name, at least one line, at least one tax subtotal, and five document totals | `checks/requiredFields.js` | **Implemented; this is a subset, not proof of every UAE mandatory field** |
| UAE TRN shape | EInvoiceCheck deterministic rule | JSON preflight + XML semantic layer | Seller TRN required and exactly 15 digits; buyer TRN warned if absent and must be 15 digits when present | `checks/trn.js` | **Implemented; semantic/business-policy correctness beyond shape requires product/legal source review** |
| Currency | EInvoiceCheck deterministic rule + full XML Schematron codelists | JSON preflight + XML semantic layer | Deterministic engine checks presence, 3-letter uppercase shape, and AED tax currency when invoice currency is non-AED. Full XML Schematron also carries its own ISO currency-list asserts. | `checks/currency.js`; vendored Schematron | **Implemented; JSON path is shape-based, not full ISO membership** |
| VAT category/rate | Generated codelist + deterministic rule + full XML Schematron | JSON preflight + XML semantic layer | Deterministic engine checks category membership and expected rates; AE deliberately skips strict deterministic rate equality and is handled partly in tax breakdown. Full XML Schematron adds the v1.0.4 rules | `checks/vatCategory.js`; `codelists-drift.test.js`; v1.0.4 Schematron | **Implemented; reverse-charge behavior remains a known verification item** |
| Line arithmetic | Deterministic rule | JSON preflight + XML semantic layer | `lineExtensionAmount = quantity × unitPrice - allowance + charge` using repository money/rounding helpers | `checks/lineArithmetic.js` | **Implemented; BaseQuantity pricing edge case remains known open issue F-05** |
| VAT breakdown arithmetic | Deterministic rule + full XML Schematron | JSON preflight + XML semantic layer | Tax = taxable × rate for non-AE; taxable amount reconciles to category line nets, downgraded to warning when doc-level adjustments make simple reconciliation ambiguous | `checks/taxBreakdown.js` | **Implemented with intentionally simplified deterministic model** |
| Document totals | Deterministic rule + full XML Schematron | JSON preflight + XML semantic layer | Line sum, tax-exclusive total, total tax, tax-inclusive total, payable amount reconciliation | `checks/documentTotals.js` | **Implemented** |
| Supplemental canonical structural rules | Hand-written `structureRule` | deterministic engine | CustomizationID pattern, line-ID uniqueness, invoice-number length | `app/api/src/rules/structure.js` | **Implemented supplemental checks; not the native XSD authority** |
| Deterministic Schematron adapter | `schematronRule` | JSON preflight + XML deterministic semantic engine | IBR-073-like date check and prepaid <= payable check; XML path dedupes date defect when full interpreter emits `ibr-073` | `app/api/src/rules/schematron.js`; Schematron tests | **Implemented; date validity has a known edge case** |
| Generator structural gate | Same native OASIS UBL 2.1 `validateXsd()` | `/v1/generate` after rendering | Generator refuses to return XML if native UBL XSD reports any issue/eval error | `generate/generate.js`; `generate/validate-xsd.js` | **Implemented XSD gate; does not prove PINT AE Schematron conformance** |
| Generator full PINT-AE validation | none inside generation path | `/v1/generate` | Current generation path does **not** call `validateXmlDocument()` or `validateSchematron()` before returning XML | generator source + tests | **Not implemented; current tests only call deterministic `validateInvoice()` after generation** |

---

## Exact Schematron scope

The node-only interpreter currently compiles exactly these two files from `app/api/schematron/`:

- `PINT-UBL-validation-preprocessed.sch`
- `PINT-jurisdiction-aligned-rules.sch`

The working-copy drift guard compares those files against the corresponding vendored **PINT AE Billing v1.0.4** files under:

`app/api/pint-ae-resources/trn-invoice/schematron/`

The interpreter uses `jsdom` plus `fontoxpath` and registers custom XPath functions required by the Schematron. A repository test pins the compiled assertion count at **302**, checks that the Standard example evaluates more than 200 matching assertions, and requires `evalErrors` to be empty in the covered examples/mutations.

### What this proves

It proves that the current repository:

- loads those two Billing `.sch` files;
- extracts and attempts to evaluate every `<assert>` in those files when its context matches;
- fail-closes an assertion evaluation exception instead of silently passing it;
- emits real Schematron IDs such as `ibr-073`, `ibr-132-ae`, `ibr-002` and `ibr-sr-63` in covered tests;
- guards the working copies from drifting away from the vendored v1.0.4 Billing copies.

### What this does not yet prove

It does **not** by itself prove:

- byte-for-byte identity with the latest currently downloadable PDK 1.4.4 resource ZIP;
- behavioral equivalence to every feature/edge case of an independent official/reference Schematron processor;
- coverage of the separate PINT AE Self-Billing ruleset;
- ASP or authority acceptance;
- that all 302 asserts are applicable to every document;
- that “302 asserts” equals “302 distinct business rules.”

For public wording, the safe statement remains: **EInvoiceCheck runs the PINT AE Billing Schematron artifacts currently wired into its validation engine, alongside UBL XSD and deterministic checks; it does not guarantee official artifact parity or downstream acceptance.**

---

## Official-example test evidence

The Schematron test suite currently enumerates 27 vendored PINT AE v1.0.4 Billing invoice examples.

Those examples are **not** pinned as zero-error documents in this repository. The suite currently expects the same baseline Schematron rule ID, `ibr-042`, for every enumerated example, then pins mutations to additional expected IDs. Therefore these examples are useful regression fixtures, but the repository must not describe them as a suite of 27 documents that all pass EInvoiceCheck or as proof of complete reference-validator parity.

Covered mutation examples include:

- bad TRN -> `ibr-132-ae`;
- missing invoice number -> `ibr-002`;
- wildcard specification identifier -> `ibr-sr-63`.

---

## Deterministic semantic engine

`evaluateInvoiceRules()` runs a fixed ordered registry plus a numeric guard. The current registry is:

1. `ENG-SCH-01` deterministic Schematron adapter;
2. `ENG-XSD-01` supplemental canonical structural checks;
3. invoice type;
4. required fields;
5. TRN;
6. currency;
7. VAT category/rate;
8. line arithmetic;
9. tax breakdown;
10. document totals.

The JSON preflight uses this deterministic engine alone. The XML path uses the same engine **plus** native UBL XSD and the full node-only Billing Schematron interpreter.

### Important scope limits of JSON preflight

`POST /v1/preflight` can detect data-level problems represented by the canonical model, but it cannot prove properties of a final XML serialization that does not exist yet, including:

- XML well-formedness;
- namespace correctness;
- UBL element order/cardinality/schema conformance;
- raw XML syntax binding;
- full XML Schematron behavior that depends on nodes not represented in the canonical DTO.

It should continue to be described as **canonical JSON data preflight**, not XML/PINT conformance validation.

---

## Generator truth

The generator currently has three templates:

| Template | Current emitted type code | UBL root | Current PINT AE Billing type-code status |
|---|---:|---|---|
| `standard-tax-invoice` | `388` | Invoice | **Conflicts with current Billing subset (`380`, `480`)** |
| `summary-tax-invoice` | `386` | Invoice | **Conflicts with current Billing subset (`380`, `480`)** |
| `standard-tax-credit-note` | `381` | CreditNote | Included in current Billing CreditNote subset (`381`, `81`) |

Generation does perform a real native UBL 2.1 XSD gate before returning XML. That is valuable and should remain.

However, generation does **not** run the full `validateXmlDocument()` pipeline before returning. Its golden tests then call `validateInvoice(xml, 'application/xml')`, which exercises the deterministic engine but not the node-only full Billing Schematron interpreter.

Therefore the following current/internal phrases are too strong and should not be treated as product truth until the generator is reconciled:

- “official-sample skeleton” as a provenance claim without a current provenance/checksum record;
- “Structure is XSD-guaranteed” if read as broader PINT-AE structural/conformance guarantee (the narrow fact is that returned XML passed the repository's UBL 2.1 XSD gate at generation time);
- “generated documents cannot fail arithmetic preflight rules” as an absolute public guarantee;
- “generates PINT-AE 1.0.4 invoices” without a qualifier while current invoice template codes conflict with the Billing Schematron.

Safe wording today: **The generator builds UBL XML from the currently implemented templates, computes supported totals, and refuses to return XML that fails its UBL 2.1 XSD gate. Generated XML should still be run through the full EInvoiceCheck validator, and a generated result is not a guarantee of PINT-AE/ASP acceptance.**

---

## Document-type inconsistency — priority finding

This audit resolves the old `InvoiceTypeCode 388` provenance question: **`388` is not in the current PINT AE Billing Invoice subset used by the vendored/current Billing Schematron.**

Current Billing v1.0.4 `ibr-cl-01` in the repository says:

- `InvoiceTypeCode`: `380`, `480`
- `CreditNoteTypeCode`: `81`, `381`

The current OpenPeppol v1.0.4 code-list pages show the same subsets.

The hand-coded engine instead recognises:

- `380`, `381`, `383`, `386`, `388`, `389`

and currently gives `388` as the example “tax invoice.” The generator emits `388` and `386` for its two Invoice templates.

### Consequences

1. A document can pass the generator's UBL XSD gate yet fail PINT AE Billing Schematron `ibr-cl-01`.
2. The deterministic semantic engine can accept/recognise a document type that the full Billing Schematron rejects.
3. Public examples using `388` as a PINT AE Billing example are misleading.
4. `389` belongs to the separate Self-Billing specialization and is already explicitly marked unsupported by the current deterministic engine.

### Required correction

Before treating the generator or engine invoice-type list as PINT AE Billing truth:

- align Billing Invoice codes with the vendored/current Billing code list;
- align Billing CreditNote codes with the vendored/current Billing code list;
- decide whether broader UNCL1001 values should be accepted only as generic UBL/legacy input rather than labeled PINT AE Billing;
- keep Self-Billing codes behind a separate Self-Billing ruleset/capability boundary;
- run every generator template through the full XML pipeline in tests.

---

## Known verification gaps / open defects

### 1. Fresh upstream artifact checksum

The repo's working Billing Schematron copies are guarded against its vendored v1.0.4 tree. A separate task should download the current official PINT AE Billing v1.0.4 resource archive referenced by the PDK 1.4.4 site and record hashes/diffs against the vendored files. This would turn “repo-internal v1.0.4 sync” into “fresh upstream artifact parity” evidence.

### 2. Independent Schematron reference-validator parity

The custom interpreter is substantial and fail-closed, but this audit has not run the full official conformance/TDD corpus against an independent reference implementation and compared result sets. That is the remaining bar for a stronger exact-parity claim.

### 3. Self-Billing

Current OpenPeppol publishes PINT AE Self-Billing v1.0.4 separately. The repository does not wire a distinct Self-Billing Schematron artifact path. `389` is explicitly warned as unsupported. Do not claim Self-Billing validation coverage.

### 4. Impossible dates — F-04

The deterministic date adapter attempts to reject impossible dates with `Date.parse()`. JavaScript date parsing can normalize some impossible calendar dates instead of rejecting them, and the canonical critic ledger still records `2026-02-30` as unresolved. Keep F-04 open until a calendar-validity implementation and regression test prove otherwise.

### 5. BaseQuantity / price — F-05

Line arithmetic operates on the normalized `quantity × unitPrice ± adjustments` model. The critic ledger still records a valid UBL `BaseQuantity` price case as unresolved. Keep F-05 open until the XML normalization/pricing semantics are verified against representative PINT AE documents.

### 6. Reverse charge — F-03

PINT AE Billing v1.0.4 specifically corrected reverse-charge VAT-rate logic, including a rule requiring zero in the cited reverse-charge allowance context. The repository deterministic engine intentionally treats `AE` specially and the generator writes a notional 5% line/category percent for its AE summary template. This area needs an explicit scenario matrix against the v1.0.4 Schematron before F-03 is closed.

### 7. Deployment/live verification

Except where the critic ledger already records production evidence (notably the malformed-XML F-01 fix), this document describes current repository truth. It must not be used to claim that every current-main behavior is deployed or live-verified.

---

## Documentation caveats

- Generator documentation must continue to distinguish its native UBL 2.1 XSD
  gate from the full XML validation pipeline until generator conformance is
  independently verified.
- This document remains repository evidence, not a certification or live-
  production attestation.

---

## Safe claims as of this baseline

The repository evidence supports statements such as:

- “EInvoiceCheck performs a well-formedness gate on XML before deeper checks.”
- “The XML validator runs OASIS UBL 2.1 XSD validation for Invoice and CreditNote documents.”
- “The XML validator runs the currently wired PINT AE Billing Schematron artifacts plus deterministic invoice-data checks.”
- “The repository's Billing Schematron working copies are guarded against a vendored PINT AE Billing v1.0.4 tree.”
- “Canonical JSON preflight runs deterministic invoice-data checks; it does not validate final XML structure.”
- “The generator performs UBL 2.1 XSD validation before returning generated XML.”
- “EInvoiceCheck is a preflight tool, not an ASP, and does not guarantee downstream acceptance.”

---

## Claims that remain unsafe

Do **not** claim, without additional evidence:

- “complete PINT AE conformity validation”;
- “official FTA/MoF validator”;
- “FTA/MoF approved/accredited”;
- “guaranteed ASP or authority acceptance”;
- “302 rules” or any other exact public rule count derived from Schematron assertion count;
- “all mandatory UAE fields” based on the deterministic subset;
- “Self-Billing validation”;
- “generator guarantees PINT-AE compliance”;
- “all generated invoices pass PINT-AE”;
- `388` or `386` as current PINT AE Billing Invoice codes;
- “byte-for-byte current PDK 1.4.4 artifact parity” until a fresh official-download checksum comparison is recorded.

---

## Recommended next technical actions

Ordered by risk and dependency:

1. **Fix the document-type truth mismatch.** Reconcile engine codelists, public examples and generator templates with PINT AE Billing v1.0.4; keep Self-Billing separate.
2. **Upgrade generator tests to the full XML validator.** Every generator golden case should call `validateXmlDocument()` (or the v2 route) and pin expected format/structure/semantic outcomes. Do not rely only on `validateInvoice()`.
3. **Build a v1.0.4 official-artifact checksum manifest.** Download the current OpenPeppol resource archive, record SHA-256s, and diff the exact Schematron/codelist artifacts used at runtime.
4. **Reference-validator parity run.** Compare the custom interpreter against an independent/reference validator over the official positive/negative corpus and record mismatches explicitly.
5. **Close F-03 reverse charge with scenario tests against v1.0.4.** Include line, document allowance/charge, subtotal and generator cases.
6. **Close F-04 impossible dates with calendar-aware validation and regression tests.**
7. **Close F-05 BaseQuantity pricing semantics with real PINT AE fixtures.**
8. **Keep active comments and documentation synchronized with the runtime and
   the versioned ruleset manifest.**

---

## Evidence index

### Runtime code

- `app/api/src/routes/validate.js` — current v1/v2/preflight route contract.
- `app/api/src/rules/xml-validation.js` — shared layered XML orchestration.
- `app/api/src/rules/xsd.js` — central native UBL 2.1 XSD authority.
- `app/api/src/schematron-interpreter.js` — node-only Billing Schematron interpreter.
- `app/api/src/rules/engine.js` — deterministic canonical-model engine.
- `app/api/src/rules/registry.js` — deterministic rule ordering.
- `app/api/src/rules/codelists.js` — generated VAT codelist + hand-maintained document-type list.
- `app/api/src/rules/generate/*` — generator templates, totals, XSD gate.

### Repository tests

- `app/api/test/xml-validation.test.js`
- `app/api/test/validate.test.js`
- `app/api/test/schematron.test.js`
- `app/api/test/schematron-sync.test.js`
- `app/api/test/codelists-drift.test.js`
- `app/api/test/generate.test.js`

### Vendored artifacts

- `app/api/pint-ae-resources/ubl-2.1/xsd/`
- `app/api/pint-ae-resources/trn-invoice/schematron/`
- `app/api/pint-ae-resources/trn-invoice/codelist/`
- `app/api/schematron/` — interpreter working copies guarded against vendored Billing source.

### Historical provenance commit

- `24c0604806a85fbbe2cc0f23c2427b8d31400954` — `chore(pint): upgrade vendored PINT-AE resources to official v1.0.4`.

### Official upstream references checked 2026-08-09

- OpenPeppol UAE current specifications: `https://docs.peppol.eu/poac/ae/upcoming/`
- PINT AE Billing v1.0.4: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae/`
- Billing v1.0.4 release notes: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae/specialized-release-notes/`
- Billing Invoice code list: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae/trn-invoice/codelist/UNCL1001-inv/`
- Billing CreditNote code list: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae/trn-creditnote/codelist/UNCL1001-cn/`
- AE VAT category code list: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae/trn-invoice/codelist/Aligned-TaxCategoryCodes/`
- PINT AE Self-Billing v1.0.4 release notes: `https://docs.peppol.eu/poac/ae/upcoming/pint-ae-sb/specialized-release-notes/`

---

## Bottom line

EInvoiceCheck's current XML backend is legitimately a **layered preflight validator with an XML parser gate, native UBL 2.1 XSD validation, deterministic semantic checks, and a PINT AE Billing v1.0.4 Schematron interpreter**.

The remaining barrier to stronger conformity language is not the absence of validation layers. It is **proof discipline and consistency**: exact upstream artifact parity, independent interpreter parity, correct Billing-vs-Self-Billing boundaries, document-type-code alignment, and closure of known scenario bugs.

Until those are resolved, the product should describe itself as checking the **currently supported validation layers/rules**, not as guaranteeing full PINT-AE, ASP or authority acceptance.
