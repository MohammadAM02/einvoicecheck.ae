import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'UAE e-invoicing API docs - POST /v2/validate',
  description:
    'Developer docs for strict UBL XML validation: POST /v2/validate (layered), POST /v1/validate (legacy flat), POST /v1/preflight (canonical JSON data preflight), GET /usage and GET /health. Auth via x-api-key.',
  path: '/docs',
});

const faqs = [
  {
    q: 'What does the UAE e-invoicing API return?',
    a: 'POST /v2/validate returns a layered JSON result: a valid flag, invoiceType, schemaVersion and per-layer results for format, structure and semantic checks. Each layer carries a status (passed, failed or skipped) and an issues array. POST /v1/validate returns the legacy flat shape with a single errors array. Each issue includes a path, rule id, severity, message and, where possible, a suggested fix.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Send your key in the x-api-key header or as a bearer token in the Authorization header. A key is issued when you create an account.',
  },
  {
    q: 'Is this complete PINT AE conformity validation?',
    a: 'POST /v2/validate runs the strict UBL validation pipeline: format (XML well-formedness), structure (UBL 2.1 XSD schema validation for Invoice and CreditNote) and semantic (rules + Schematron) layers. Use POST /v1/preflight for canonical JSON data preflight; it checks invoice data but does not validate final UBL XML structure.',
  },
  {
    q: 'Does the API submit my invoice to the FTA?',
    a: 'No. The API validates a document and returns errors. It is not FTA-accredited, does not transmit legal e-invoices, does not replace an accredited service provider and does not provide statutory archival.',
  },
];

export default function DocsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Docs', path: '/docs' },
          ]),
        )}
      />

      <div className="section">
        <div className="container">
          <h1 style={{ marginBottom: 12 }}>UAE e-invoice preflight API</h1>
          <p className="lead" style={{ marginBottom: 24 }}>
            Three validation endpoints: strict UBL XML validation (v2), the legacy flat XML
            contract (v1) and canonical JSON data preflight — plus usage and health endpoints.
          </p>
          <GuardrailNotice />
          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>Current validation scope</strong>
            <p style={{ marginTop: 4 }}>
              <code>POST /v2/validate</code> and <code>POST /v1/validate</code> accept UBL 2.1 /
              PINT AE XML only and run the strict pipeline: format (well-formedness), structure
              (UBL 2.1 XSD for Invoice and CreditNote) and semantic (rules + Schematron) layers.
              Canonical JSON invoice data is accepted only by <code>POST /v1/preflight</code>,
              which performs data preflight and does not validate final UBL XML structure.
            </p>
          </div>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>Authentication</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Every call except <code>GET /health</code> requires a key. Send it as{' '}
            <code>x-api-key</code> or <code>Authorization: Bearer &lt;key&gt;</code>. Rate limits
            are per key; exceeding them returns <code>429</code>.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`x-api-key: <your-api-key>`}</code>
          </pre>
          <p className="muted">
            Base URL: <code>{API_BASE_URL}</code>
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v2/validate</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Strict UBL 2.1 / PINT AE XML validation for Invoice and CreditNote documents. XML-only:
            send raw UBL 2.1 / PINT AE XML with <code>Content-Type: application/xml</code>, or an
            envelope <code>{'{ "document": "<Invoice>..." }'}</code>. Returns a layered result so
            you can distinguish passed, failed and skipped layers.
          </p>
          <p className="muted" style={{ marginBottom: 16 }}>
            The pipeline runs three layers: format (XML well-formedness), structure (UBL 2.1 XSD
            schema validation — the document must conform to the Invoice or CreditNote schema, and
            wrong namespaces cannot pass), and semantic (rules + Schematron). If a layer fails, the
            later layers still run where meaningful and each layer reports its own status.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`POST ${API_BASE_URL}/v2/validate
x-api-key: <your-api-key>
content-type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <!-- UBL 2.1 / PINT AE Invoice or CreditNote -->
</Invoice>`}</code>
          </pre>

          <h3 style={{ marginBottom: 8 }}>200 response</h3>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`{
  "valid": true,
  "inputFormat": "xml",
  "validationScope": "pint-ae-ubl-xml",
  "invoiceType": "380",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "format": { "status": "passed", "issues": [] },
  "structure": { "status": "passed", "issues": [] },
  "semantic": { "status": "passed", "issues": [] }
}`}</code>
          </pre>
          <p className="muted" style={{ marginBottom: 24 }}>
            Each layer reports <code>passed</code>, <code>failed</code> or <code>skipped</code>{' '}
            with its issues. A malformed document fails the format layer with a parse issue (for
            example <code>ENG-PARSE-01</code>) and skips the deeper layers; an XSD failure produces
            structure issues while semantic findings are still exposed.
          </p>

          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>Status</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td>200</td><td>The document was processed. Read <code>valid</code> and each layer's <code>status</code>; a 200 is not automatically a pass.</td></tr>
              <tr><td>400</td><td>The request body is not XML. This endpoint accepts UBL XML only; canonical JSON goes to <code>/v1/preflight</code>.</td></tr>
              <tr><td>401</td><td>Missing or invalid API key.</td></tr>
              <tr><td>413</td><td>Document exceeds the accepted payload size.</td></tr>
              <tr><td>429</td><td>Rate limit or monthly quota exceeded.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/validate</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Legacy flat XML contract. Accepts UBL 2.1 / PINT AE XML only — the same strict pipeline
            as <code>/v2/validate</code> — and flattens the format, structure and semantic layers
            into the legacy <code>errors[]</code> shape for existing clients.
          </p>
          <p className="muted" style={{ marginBottom: 16 }}>
            Canonical JSON is not accepted here. JSON invoice data is validated by{' '}
            <code>POST /v1/preflight</code> instead.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`POST ${API_BASE_URL}/v1/validate
x-api-key: <your-api-key>
content-type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <!-- UBL 2.1 / PINT AE Invoice or CreditNote -->
</Invoice>`}</code>
          </pre>

          <h3 style={{ marginBottom: 8 }}>200 response</h3>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`{
  "valid": false,
  "invoiceType": "388",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "errors": [
    {
      "path": "/Invoice/cac:AccountingSupplierParty",
      "rule": "ENG-TRN-02/BT-31",
      "severity": "error",
      "message": "Seller TRN must contain exactly 15 digits.",
      "fix": "Replace the value with the seller's 15-digit UAE TRN."
    }
  ]
}`}</code>
          </pre>

          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>Status</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td>200</td><td>The document was processed. Read <code>valid</code> and <code>errors</code>; a 200 is not automatically a pass.</td></tr>
              <tr><td>400</td><td>The request body is not XML. Canonical JSON goes to <code>/v1/preflight</code>.</td></tr>
              <tr><td>401</td><td>Missing or invalid API key.</td></tr>
              <tr><td>413</td><td>Document exceeds the accepted payload size.</td></tr>
              <tr><td>429</td><td>Rate limit or monthly quota exceeded.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/preflight</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Canonical JSON data preflight. Accepts the canonical JSON invoice shape and runs the
            semantic data checks (invoice type, required fields, TRN shape, currency rules, VAT
            category and rate consistency, line arithmetic, tax breakdowns and document totals).
          </p>
          <p className="muted" style={{ marginBottom: 16 }}>
            This endpoint validates invoice <em>data</em>, not final UBL XML structure: it does not
            run XSD structure validation and cannot confirm that the data renders as conformant
            UBL 2.1 / PINT AE XML. For that, validate the generated XML with{' '}
            <code>POST /v2/validate</code>.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`POST ${API_BASE_URL}/v1/preflight
x-api-key: <your-api-key>
content-type: application/json

{
  "invoiceType": "388",
  "invoiceNumber": "INV-2026-0001",
  "issueDate": "2026-07-26",
  "currency": "AED",
  "supplier": { "name": "Acme FZ-LLC", "trn": "100123456700003" },
  "customer": { "name": "Buyer LLC", "trn": "100987654300003" },
  "lines": [
    {
      "id": "1",
      "quantity": 2,
      "unitPrice": 500,
      "lineExtensionAmount": 1000,
      "taxCategory": { "code": "S", "rate": 5 },
      "itemName": "Consulting"
    }
  ],
  "taxSubtotals": [
    {
      "taxableAmount": 1000,
      "taxAmount": 50,
      "category": { "code": "S", "rate": 5 }
    }
  ],
  "totals": {
    "lineExtensionAmount": 1000,
    "taxExclusiveAmount": 1000,
    "taxAmount": 50,
    "taxInclusiveAmount": 1050,
    "payableAmount": 1050
  }
}`}</code>
          </pre>

          <h3 style={{ marginBottom: 8 }}>200 response</h3>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`{
  "valid": false,
  "invoiceType": "388",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "validationScope": "json-data-preflight",
  "errors": [
    {
      "path": "/supplier/trn",
      "rule": "ENG-TRN-02/BT-31",
      "severity": "error",
      "message": "Seller TRN must contain exactly 15 digits.",
      "fix": "Replace the value with the seller's 15-digit UAE TRN."
    }
  ]
}`}</code>
          </pre>
          <p className="muted" style={{ marginBottom: 24 }}>
            The response is the legacy flat shape plus <code>validationScope</code>. XML sent to
            this endpoint is rejected: UBL XML goes to <code>POST /v1/validate</code> or{' '}
            <code>POST /v2/validate</code>.
          </p>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>GET /usage</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Returns per-key usage totals, outcome counts and recent calls. Submitted invoice
            payloads are not included in usage records.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`GET ${API_BASE_URL}/usage
x-api-key: <your-api-key>`}</code>
          </pre>

          <h2 style={{ marginBottom: 12 }}>GET /health</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Unauthenticated liveness and readiness probe. Returns 503 when a required dependency is unavailable.
          </p>
          <pre className="keybox">
            <code>{`GET ${API_BASE_URL}/health`}</code>
          </pre>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 16 }}>API questions</h2>
          {faqs.map((item) => (
            <div key={item.q} style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 4 }}>{item.q}</h3>
              <p className="muted">{item.a}</p>
            </div>
          ))}
          <div className="cta-row">
            <Link href="/signup" className="btn btn-primary">Get your API key</Link>
            <Link href="/pricing" className="btn btn-ghost">See pricing</Link>
          </div>
        </div>
      </div>
    </>
  );
}
