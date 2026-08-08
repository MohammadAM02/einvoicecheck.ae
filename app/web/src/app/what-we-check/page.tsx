import Link from 'next/link';
import { breadcrumbSchema, faqSchema, jsonLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'What EInvoiceCheck Checks | UAE e-invoice preflight scope',
  description:
    'A plain-English scope reference for EInvoiceCheck: format, UBL structure and semantic checks, what a pass means, current limitations, and the role of your ASP.',
  path: '/what-we-check',
});

const faqs = [
  {
    q: 'Does a passing EInvoiceCheck result guarantee ASP or authority acceptance?',
    a: 'No. A pass means the invoice passed the validation checks currently implemented and executed by EInvoiceCheck. It is not a guarantee of ASP, buyer-system or authority acceptance.',
  },
  {
    q: 'Is EInvoiceCheck an Accredited Service Provider?',
    a: 'No. EInvoiceCheck is an independent preflight validator. It does not transmit legal e-invoices, replace an ASP, perform statutory filing or provide statutory archival.',
  },
  {
    q: 'Does EInvoiceCheck run XML structure checks?',
    a: 'The current XML pipeline includes XML well-formedness, UBL 2.1 XSD structure checks for supported Invoice and CreditNote documents, and semantic checks including currently implemented rules and Schematron evaluation. Exact official artifact parity and version coverage should only be claimed where separately verified.',
  },
  {
    q: 'What happens when XML is malformed?',
    a: 'Malformed XML fails at the format layer. Deeper checks are skipped where the document cannot be parsed meaningfully, so syntax errors are not presented as fabricated business-rule failures.',
  },
];

const layers = [
  {
    title: '1. Format',
    body: 'Checks whether the XML is well-formed enough to parse. Mismatched tags and other parser failures are reported as blocking format issues before deeper validation is attempted.',
  },
  {
    title: '2. Structure',
    body: 'For the supported XML path, checks UBL 2.1 Invoice or CreditNote structure with the currently wired XSD validation layer, including namespace and schema-shape failures.',
  },
  {
    title: '3. Semantic',
    body: 'Checks the invoice data and business relationships currently implemented by the engine, including required terms, UAE TRN shape, currencies and code lists, VAT category/rate consistency, line arithmetic, tax breakdowns and document totals. The XML path also runs the currently wired Schematron layer.',
  },
];

const limitations = [
  'No guarantee of ASP, buyer-system or authority acceptance.',
  'No claim of complete official XSD/Schematron artifact parity or version coverage unless that exact coverage has been separately verified.',
  'No FTA registration or taxpayer-registry lookup.',
  'No legal transmission, filing or statutory archival.',
  'No legal or tax advice.',
  'Canonical JSON preflight checks invoice data; it does not prove that a final XML rendering is structurally valid UBL/PINT-AE XML.',
];

export default function WhatWeCheckPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'What We Check', path: '/what-we-check' },
          ]),
        )}
      />

      <div className="section">
        <div className="container">
          <div className="section-label">Product scope</div>
          <h1 style={{ marginBottom: 12 }}>What EInvoiceCheck checks</h1>
          <p className="lead" style={{ marginBottom: 24 }}>
            EInvoiceCheck is an independent UAE e-invoice preflight validator. It checks an invoice
            against the validation layers currently supported by its engine before the file reaches
            your Accredited Service Provider.
          </p>
          <div className="notice" style={{ marginBottom: 24 }}>
            <strong>What a pass means</strong>
            <p style={{ marginTop: 4 }}>
              A pass means the invoice passed the checks that EInvoiceCheck actually ran. It does not
              mean FTA approval, legal filing, complete official artifact parity, or guaranteed ASP,
              buyer-system or authority acceptance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="button button-primary" href="/#validate">Validate an invoice</Link>
            <Link className="button button-secondary" href="/docs">Read the API docs</Link>
          </div>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Validation pipeline</div>
            <h2 className="section-title">Three layers, in the order they matter</h2>
          </div>
          <div className="failure-cards">
            {layers.map((layer) => (
              <article className="failure-card" key={layer.title}>
                <h3>{layer.title}</h3>
                <p className="muted">{layer.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Inputs and behavior</div>
            <h2 className="section-title">What the current product does</h2>
          </div>
          <table style={{ marginBottom: 24 }}>
            <thead>
              <tr><th>Surface</th><th>Current behavior</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>XML validator / API</td>
                <td>Runs the supported format, UBL structure and semantic validation layers and returns machine-readable issues.</td>
              </tr>
              <tr>
                <td>Canonical JSON preflight</td>
                <td>Checks supported invoice data and arithmetic rules, but does not prove final XML structure.</td>
              </tr>
              <tr>
                <td>XML Generator</td>
                <td>Builds XML from the current template set, computes supported totals and lets you validate the generated result.</td>
              </tr>
              <tr>
                <td>XML Repairer</td>
                <td>Attempts supported, reviewable repairs and hands the resulting XML back to validation. It is not an automatic compliance guarantee.</td>
              </tr>
              <tr>
                <td>API</td>
                <td>Exposes the same preflight capability programmatically for ERP, integration and CI workflows.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Boundaries</div>
            <h2 className="section-title">What EInvoiceCheck does not claim</h2>
          </div>
          <ul>
            {limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="muted" style={{ marginTop: 20 }}>
            Your ERP or accounting system creates the invoice. EInvoiceCheck preflights the supported
            checks. Your ASP remains responsible for the official exchange/transmission workflow.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Transparency</div>
            <h2 className="section-title">Version and rule claims</h2>
          </div>
          <p className="muted" style={{ marginBottom: 16 }}>
            The repository currently contains UBL/XSD and PINT-AE/Schematron resources used by the
            validation pipeline. Public claims about exact official package parity, total rule counts,
            specific invoice-type-code provenance or complete conformity are intentionally withheld
            unless the exact deployed artifact and coverage have been verified.
          </p>
          <p className="muted">
            For endpoint-level behavior, payload contracts and response shapes, see the{' '}
            <Link href="/docs">API documentation</Link>.
          </p>
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <div className="section-header">
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Scope questions</h2>
          </div>
          <div className="disclosure-list">
            {faqs.map((item) => (
              <details className="disclosure-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
