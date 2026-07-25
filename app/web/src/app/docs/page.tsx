import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'UAE e-invoicing API docs - POST /v1/validate',
  description:
    'Developer docs for the UAE e-invoicing API: POST /v1/validate for PINT AE / UBL 2.1 preflight checks, GET /usage for metering, GET /health. Auth via x-api-key.',
  path: '/docs',
});

const faqs = [
  {
    q: 'What does the UAE e-invoicing API return?',
    a: 'A JSON body with valid (boolean), invoiceType, schemaVersion, and an errors array. Each error has a JSON pointer path, a rule id, a severity of error or warning, a human-readable message, and where possible a suggested fix.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Send your key in the x-api-key header, or as a bearer token in the Authorization header. Keys are issued upon signup.',
  },
  {
    q: 'Does the API submit my invoice to the FTA?',
    a: 'No. The API validates a document and returns errors. It is not FTA-accredited, does not transmit legal e-invoices, does not replace an accredited service provider, and does not provide statutory archival.',
  },
];

export default function DocsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Docs', path: '/docs' }]))} />

      <div className="section">
        <div className="container">
          <h1 style={{ marginBottom: 12 }}>UAE e-invoicing API</h1>
          <p className="lead" style={{ marginBottom: 24 }}>
            Three endpoints. One of them matters. Everything below mirrors the OpenAPI 3.1 spec the
            service ships with.
          </p>
          <GuardrailNotice />
          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>Docs skeleton</strong>
            <p style={{ marginTop: 4 }}>
              The endpoint contracts here are final; the public base URL is not published yet
              because the service has not been deployed to production.{' '}
              <Link href="/signup" style={{ color: 'var(--accent)' }}>Sign up</Link> to get your base URL and a key.
            </p>
          </div>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>Authentication</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Every call except <code>GET /health</code> requires a key. Send it as{' '}
            <code>x-api-key</code>, or as <code>Authorization: Bearer &lt;key&gt;</code>. Rate limits
            are per key; exceeding them returns <code>429</code>.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>{`x-api-key: pdk_live_...`}</pre>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/validate</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Preflight-validate one UAE invoice. Accepts a canonical JSON invoice, an envelope{' '}
            <code>{'{ "document": "<Invoice>..." }'}</code>, or raw UBL 2.1 / PINT AE XML with{' '}
            <code>Content-Type: application/xml</code>.
          </p>
          <p className="muted" style={{ marginBottom: 16 }}>
            Checks: TRN format, required tax fields, line-item and document total arithmetic, VAT
            category and rate consistency, currency and code-list membership, and invoice-type
            detection.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`POST ${API_BASE_URL}/v1/validate
x-api-key: $EINVOICE_KEY
content-type: application/json

{
  "invoiceNumber": "INV-2026-0001",
  "issueDate": "2026-07-14",
  "documentCurrencyCode": "AED",
  "supplier": { "name": "Acme FZ-LLC", "trn": "100123456700003" },
  "customer": { "name": "Buyer LLC", "trn": "100987654300003" },
  "lines": [
    { "id": "1", "quantity": 2, "unitPrice": 500.00,
      "lineExtensionAmount": 1000.00, "vatCategory": "S", "vatRate": 5 }
  ],
  "taxTotal": 50.00,
  "payableAmount": 1050.00
}`}</code>
          </pre>
          <h3 style={{ marginBottom: 8 }}>200 response</h3>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`{
  "valid": false,
  "invoiceType": "380",
  "schemaVersion": "PINT-AE-1.0",
  "errors": [
    {
      "path": "/taxTotal",
      "rule": "AE-TOTAL-VAT-SUM",
      "severity": "error",
      "message": "taxTotal 50.00 does not equal the sum of line VAT (52.50).",
      "fix": "Recompute VAT per line at the stated rate, then sum with half-up rounding to 2dp."
    }
  ]
}`}</code>
          </pre>
          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>Status</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              <tr><td>200</td><td>Document was processed. Read `valid` and `errors` - a 200 is not a pass.</td></tr>
              <tr><td>401</td><td>Missing or invalid API key.</td></tr>
              <tr><td>429</td><td>Rate limit exceeded for this key.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>GET /usage</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Usage metering for the calling key: all-time, today and last-30-day totals, outcome
            counts (valid / invalid / error), and the most recent calls.
          </p>
          <pre className="keybox" style={{ marginBottom: 24 }}>
            <code>{`GET ${API_BASE_URL}/usage
x-api-key: $EINVOICE_KEY

{
  "keyPrefix": "pdk_live_a1b2",
  "keyName": "CI pipeline",
  "totals": { "allTime": 1840, "today": 26, "last30Days": 612 },
  "outcomes": { "valid": 1502, "invalid": 331, "error": 7 },
  "recent": [
    { "endpoint": "/v1/validate", "method": "POST", "outcome": "invalid",
      "statusCode": 200, "timestamp": "2026-07-14T09:12:03.114Z" }
  ]
}`}</code>
          </pre>

          <h2 style={{ marginBottom: 12 }}>GET /health</h2>
          <p className="muted" style={{ marginBottom: 16 }}>Unauthenticated liveness and readiness probe. Returns 503 when a dependency is down.</p>
          <pre className="keybox">
            <code>{`GET ${API_BASE_URL}/health

{ "status": "ok", "live": true,
  "checks": { "mongo": "up", "redis": "up" },
  "timestamp": "2026-07-14T09:12:03.114Z" }`}</code>
          </pre>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 16 }}>API questions</h2>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 4 }}>{f.q}</h3>
              <p className="muted">{f.a}</p>
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
