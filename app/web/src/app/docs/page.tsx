import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'UAE e-invoicing API docs - POST /v2/validate and /v1/preflight',
  description:
    'Developer docs for layered XML validation at POST /v2/validate, canonical JSON preflight at POST /v1/preflight, and legacy POST /v1/validate compatibility. Auth via x-api-key.',
  path: '/docs',
});

const faqs = [
  {
    q: 'What does the UAE e-invoicing API return?',
    a: 'POST /v2/validate returns a layered JSON result with format, structure and semantic statuses. POST /v1/preflight returns canonical JSON data findings. POST /v1/validate retains its legacy flat errors[] response for existing clients.',
  },
  {
    q: 'How do I authenticate?',
    a: 'Send your key in the x-api-key header or as a bearer token in the Authorization header. A key is issued when you create an account.',
  },
  {
    q: 'What validation layers are currently included?',
    a: 'POST /v2/validate runs format (well-formedness), structure (UBL 2.1 XSD) and semantic (rules + Schematron) layers. POST /v1/preflight checks canonical JSON invoice data. Existing POST /v1/validate clients retain the legacy JSON/XML compatibility contract. These are supported preflight checks, not guarantees of ASP acceptance or downstream filing.',
  },
  {
    q: 'Does the API submit my invoice to the FTA?',
    a: 'No. The API validates a document and returns findings. It is not FTA-accredited, does not transmit legal e-invoices, does not replace an accredited service provider and does not provide statutory archival.',
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
            New integrations have two canonical validation paths: XML at <code>POST /v2/validate</code>
            and canonical JSON at <code>POST /v1/preflight</code>. Existing clients can continue using{' '}
            <code>POST /v1/validate</code> as a legacy JSON/XML compatibility endpoint; usage and health
            are also available.
          </p>
          <GuardrailNotice />
          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>Current validation scope</strong>
            <p style={{ marginTop: 4 }}>
              <code>POST /v2/validate</code> accepts raw UBL 2.1 / PINT AE XML and runs format,
              structure (UBL 2.1 XSD) and semantic (rules + Schematron) layers.{' '}
              <code>POST /v1/preflight</code> accepts canonical JSON invoice data only. Existing{' '}
              <code>POST /v1/validate</code> clients retain the legacy JSON/XML compatibility behavior.
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
          <p className="muted">Base URL: <code>{API_BASE_URL}</code></p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v2/validate (new XML integrations)</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Send raw UBL 2.1 / PINT AE XML with <code>Content-Type: application/xml</code> or{' '}
            <code>text/xml</code>. This is the preferred canonical XML path and returns layered
            format, structure and semantic findings.
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
            A malformed document fails the format layer and skips deeper layers. Structure and
            semantic findings remain independently visible when a document is structurally invalid.
          </p>
          <table style={{ marginBottom: 24 }}>
            <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td>200</td><td>The document was processed. Read <code>valid</code> and each layer status.</td></tr>
              <tr><td>400</td><td>The request body is not raw XML. Canonical JSON goes to <code>/v1/preflight</code>.</td></tr>
              <tr><td>401</td><td>Missing or invalid API key.</td></tr>
              <tr><td>413</td><td>Document exceeds the accepted payload size.</td></tr>
              <tr><td>429</td><td>Per-key rate limit exceeded.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/preflight (new JSON integrations)</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Send a bare canonical JSON invoice object. This is the preferred canonical JSON path;
            XML bodies and the legacy <code>document</code>/<code>invoice</code> wrappers are rejected.
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
  "lines": [{
    "id": "1", "quantity": 2, "unitPrice": 500,
    "lineExtensionAmount": 1000,
    "taxCategory": { "code": "S", "rate": 5 }, "itemName": "Consulting"
  }],
  "totals": {
    "lineExtensionAmount": 1000, "taxExclusiveAmount": 1000,
    "taxAmount": 50, "taxInclusiveAmount": 1050, "payableAmount": 1050
  }
}`}</code>
          </pre>
          <p className="muted" style={{ marginBottom: 24 }}>
            The response includes the flat <code>errors</code> shape plus{' '}
            <code>validationScope: "canonical-json-data-preflight"</code>. This endpoint validates
            invoice data; validate final UBL XML through <code>POST /v2/validate</code>.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 style={{ marginBottom: 12 }}>POST /v1/validate (legacy compatibility)</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Existing clients remain supported. This route preserves canonical JSON, the{' '}
            <code>{'{ "invoice": { ... } }'}</code> wrapper, the{' '}
            <code>{'{ "document": "&lt;Invoice&gt;..." }'}</code> XML envelope, and raw XML,
            returning the legacy flat <code>errors[]</code> shape. It is not the recommended path
            for new integrations; there is no retirement date.
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
          <pre className="keybox"><code>{`GET ${API_BASE_URL}/health`}</code></pre>
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
