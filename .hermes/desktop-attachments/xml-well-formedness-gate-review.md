# XML Well-Formedness Gate Review

## Finding

`invalid-01-malformed-xml.xml` has a mismatched root closing tag:

```xml
<Invoice ...>
  ...
</Invocie>
```

That document is not well-formed XML. A standard XML parser rejects it before any invoice, VAT, or PINT-AE rule can be evaluated.

The current einvoicecheck.ae validator accepted it and returned a passing preflight result. That means the current validation path can extract enough fields from malformed source without first requiring a successful XML parse.

## Why this matters

Field extraction is not document validation. A malformed invoice can appear valid if the fields your code looks for happen to exist before the broken part. An ASP or standards-compliant XML processor will reject the actual document later.

This produces the worst kind of false positive: the checker says “safe”, then the real recipient says “absolutely not”.

## Required validation order

Run validation in this order:

1. **XML well-formedness** — parse the complete document with a standards-compliant XML parser. Reject any parse error.
2. **UBL 2.1 XSD** — validate the parsed document against the relevant UBL Invoice or CreditNote schema.
3. **PINT-AE Schematron/business rules** — apply the official PINT-AE constraints, code lists, and calculation rules.
4. **Product-level diagnostics** — convert failures into the useful field-specific messages your product already does well.

Do not attempt steps 2–4 if step 1 fails.

## Minimum acceptance test

After adding the gate:

- `invalid-01-malformed-xml.xml` must fail in the **Format** layer.
- The report should state that the source is not well-formed XML and include the parser’s line/column detail when available.
- `valid-comprehensive-pint-ae.xml` must continue to pass the existing preflight checks.

## Scope

This finding proves a missing **basic XML well-formedness gate**. It does not, by itself, prove the XSD layer is missing. Full XSD and official Schematron validation remain separate layers that need their own explicit tests.
