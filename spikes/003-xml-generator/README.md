# SPIKE 003: Token-Skeleton XML Generator

## Approach

Two skeleton files were created as byte-copies of the official PINT-AE 1.0.4
samples (`Standard tax invoice.xml` and `Summary tax invoice.xml`) with every
data value replaced by a `{{TOKEN}}` placeholder. The generator reads a
skeleton, substitutes tokens from a JSON data object, XML-escapes all values
(`& < > " '`), and returns the complete XML string. The generated XML is then
validated through the real engine (`convert` + `validateInvoice`), proving that
a token-based generator can produce structurally valid PINT-AE invoices that
pass both the XSD gate and the full semantic rule engine.

## Results

```
fixture          well-formed  convert.status  XSD issues  validate.valid  blocking errors
---------------  -----------  --------------  ----------  --------------  ----------------
standard-good    yes          NOOP            0           yes             (none)
ae-summary-good  yes          NOOP            0           yes             (none)
adversarial      yes          NOOP            0           yes             (none)
bad-trn          yes          REFUSED         0           NO              ENG-TRN-02/BT-31
```

## Verdict

**Generated-XML-passes-engine: CONFIRMED.** The token-skeleton approach
produces structurally valid PINT-AE invoices that the real validation engine
accepts:

- **Round-trip fidelity:** Standard-tax and summary-tax (incl. AE
  reverse-charge) both achieve `NOOP` convert status with zero XSD issues —
  the generated XML is bit-for-bit identical to the official samples in
  structure, with all data values correctly placed.
- **AE reverse-charge regression:** The summary invoice's dual TaxSubtotals
  (S standard-rate + AE reverse-charge with rate=5, tax=0) passes cleanly
  without REFUSED or DATA_SEMANTIC refusals — the notional-rate handling
  confirmed working.
- **XML escaping:** The adversarial fixture injects `& < > " '` into supplier
  and customer trade names. The generator correctly escapes them as `&amp;`
  `&lt;` `&gt;` `&quot;` `&#39;` — the engine parses the document without
  well-formedness failures and the validation engine sees the names as data
  (valid=true).
- **XSD gate interaction:** All fixtures produce zero XSD issues in the
  convert pipeline's dataIssues. The skeletons preserve exact element order,
  cardinality, and namespace structur from the official samples, so the
  libxmljs2-based XSD gate sees structurally valid UBL 2.1.
- **Engine semantic coverage:** The bad-trn fixture (supplier TRN `"12345"`)
  triggers `ENG-TRN-02/BT-31` — the engine catches the invalid TRN format
  while the XSD gate stays clean (0 XSD issues). This confirms the generator
  doesn't mask structural issues and the engine maintains separation of
  concerns between structure and semantics.

### What a production build (`app/api/src/rules/generate/`) must handle beyond this spike

- **Dynamic line counts:** The spike hard-codes 1 line (standard) and 4 lines
  (summary). Production needs template-loop logic for arbitrary `InvoiceLine`
  counts — each with its own `{{LINE_N_*}}` tokens, unit codes, and optional
  child elements (StandardItemIdentification, CommodityClassification depth,
  AdditionalItemProperty).
- **Optional element toggling:** The standard sample has `OrderReference`,
  `BillingReference`, `DespatchDocumentReference`, `PayeeParty`, `CardAccount`,
  and two `AllowanceCharge` blocks at header level. The summary sample omits
  several of these but adds `PayeeFinancialAccount`. Production skeletons need
  conditional blocks (`{{#if ...}}...{{/if}}`) or composable section
  templates.
- **Multi-line-item tokenization:** The current naming convention
  (`LINE_1_NAME`, `LINE_2_NAME`, …) works for fixed counts but doesn't scale.
  A production generator needs array-driven token resolution where template
  sections iterate over a `lines[]` array and resolve `{{NAME}}` within each
  iteration scope.
- **Date validation:** The engine rules check actual date semantics (e.g.,
  `ENG-REQ-19` for future IssueDate, `ENG-REQ-26` for DueDate ≥ IssueDate).
  The spike reuses the samples' own dates, which were chosen to pass. A
  production generator must validate or coerce dates.
- **Full codelist coverage:** The spike leaves `schemeID`, `unitCode`,
  `listID`, `schemeAgencyID`, `mimeCode` etc. as literal attributes matching
  the official samples. Production needs codelist tables (UN/ECE 5153, 5305,
  7143, 4451, etc.) and validation at generation time to prevent XSD
  datatype/pattern failures.
- **Currency handling:** The spike hardcodes `currencyID="AED"` on all amount
  attributes and `AED` as `DocumentCurrencyCode`. Multi-currency support
  requires token-per-amount-attribute or a global currency token with
  per-attribute injection.
- **UUID / ProfileExecutionID generation:** These are currently tokens filled
  from fixture data. Production should auto-generate UUIDs and deterministic
  ProfileExecutionIDs.
