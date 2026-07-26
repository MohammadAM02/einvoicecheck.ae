import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'UAE e-invoicing API docs - POST /v1/validate',
  description:
    'Developer docs for UAE e-invoice semantic preflight checks: POST /v1/validate, GET /usage and GET /health. Auth via x-api-key.',
  path: '/docs',
});

const faqs = [
  {
    q: 'What does the UAE e-invoicing API return?',
    a: 'A deterministic JSON result with valid, invoiceType, schemaVersion and an errors array. Each error includes a path, rule id, severity, message and, where possible, a suggested fix.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Send your key in the x-api-key header or as a bearer token in the Authorization header. A key is issued when you create an account.',
  },
  {
    q: 'Is this complete PINT AE conformity validation?',
    a: 'Not yet. The current engine performs semantic preflight checks for core fields, TRNs, currencies, VAT categories and arithmetic. Full official XSD and Schematron conformity validation is not currently included.',
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
            Three endpoints: validate an invoice, inspect usage and check service health.
          </p>
          <GuardrailNotice />
          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>Current validation scope</strong>
            <p style={{ marginTop: 4 }}>
              The engine performs 47 deterministic semantic checks across eight rule groups.
              Full PINT AE XSD and Schematron conformity validation is not currently included.
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
          <pre className="keybox" style={{ marginBottom: 24 }}>{`x-api-key: pdk_live_...`}</pre>
          <p className="muted">
            Base URL: <code>{API_BASE_URL}</code>
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/validate</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Preflight-check one UAE invoice. Accepted inputs are canonical JSON, a JSON envelope
            containing XML, or raw UBL 2.1 / PINT AE XML with <code>Content-Type: application/xml</code>.
          </p>
          <p className="muted" style={{ marginBottom: 16 }}>
            Current checks cover invoice type, required fields, TRN shape, currency rules, VAT
            category and rate consistency, line arithmetic, tax breakdowns and document totals.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`POST ${API_BASE_URL}/v1/validate
x-api-key: $EINVOICE_KEY
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

          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>Status</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td>200</td><td>The document was processed. Read <code>valid</code> and <code>errors</code>; a 200 is not automatically a pass.</td></tr>
              <tr><td>401</td><td>Missing or invalid API key.</td></tr>
              <tr><td>413</td><td>Document exceeds the accepted payload size.</td></tr>
              <tr><td>429</td><td>Rate limit or monthly quota exceeded.</td></tr>
            </tbody>
          </table>
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
x-api-key: $EINVOICE_KEY`}</code>
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
