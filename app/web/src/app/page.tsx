import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL, SITE_URL } from '@/lib/site';

// PRIMARY KEYWORD: "e invoicing UAE" (1,000/mo, broadest query in the cluster)
export const metadata = pageMetadata({
  title: 'E-invoicing UAE: validate invoices before you submit them',
  description:
    'E-invoicing in the UAE goes wrong at the file, not the filing. Preflight-validate PINT AE / UBL invoices, TRNs, tax fields and totals in one API call. Join the waitlist.',
  path: '/',
});

const faqs = [
  {
    q: 'What is e-invoicing in the UAE?',
    a: 'UAE e-invoicing requires businesses to issue structured electronic invoices in the PINT AE format and exchange them through an accredited service provider rather than sending PDFs. The structured file has to be arithmetically and semantically correct before it is accepted.',
  },
  {
    q: 'Is einvoicecheck.ae an accredited service provider?',
    a: 'No. einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival. You still need an accredited provider to send the invoice.',
  },
  {
    q: 'Why do I need preflight validation if my provider already validates?',
    a: 'Because your provider validates at submission time, when a rejection is already an incident. Preflight validation runs in your own pipeline, before the file leaves your system, so a bad TRN or a rounding mismatch is a failing test instead of a rejected invoice.',
  },
  {
    q: 'What does the validator actually check?',
    a: 'TRN format, required tax fields, line-item and document total arithmetic, VAT category and rate consistency, currency and code-list membership, and invoice type detection against PINT AE / UBL 2.1.',
  },
  {
    q: 'Can I use it before the API is generally available?',
    a: 'Billing is not live yet. Join the waitlist and you will get an API key for the free trial as soon as keys are issued.',
  },
];

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'einvoicecheck.ae',
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'E-invoicing validation API',
  operatingSystem: 'Any (HTTP API)',
  url: SITE_URL,
  description:
    'Preflight validation API for UAE e-invoices: PINT AE / UBL 2.1 schema, TRN, tax fields, totals and code lists. Not FTA-accredited and not a transmission channel.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '29',
      priceCurrency: 'USD',
      availability: 'https://schema.org/PreOrder',
      url: `${SITE_URL}/pricing`,
    },
    {
      '@type': 'Offer',
      name: 'Growth',
      price: '99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/PreOrder',
      url: `${SITE_URL}/pricing`,
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(softwareSchema)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))} />

      <section>
        <div className="container">
          <span className="badge">Preflight validation only - not an accredited provider</span>
          <h1>
            E-invoicing in the UAE breaks at the file,
            <br />
            not at the filing.
          </h1>
          <p className="lead">
            A wrong TRN, a 0.01 rounding gap, a VAT category that does not match its rate - and your
            accredited provider bounces the invoice back days later. einvoicecheck.ae validates the
            PINT AE / UBL file <strong>before</strong> it leaves your system, in one API call.
          </p>
          <div className="cta-row">
            <Link href="/tools/uae-e-invoice-validator" className="btn btn-primary">
              Try the free validator - no signup
            </Link>
            <Link href="/waitlist" className="btn btn-ghost">
              Get an API key at launch
            </Link>
            <Link href="/docs" className="btn btn-ghost">
              Read the API docs
            </Link>
          </div>
          <GuardrailNotice />
        </div>
      </section>

      <section>
        <div className="container">
          <h2>One POST. Every error, with the fix.</h2>
          <p>
            Send a canonical JSON invoice, an envelope, or raw UBL 2.1 / PINT AE XML. Get back a
            deterministic list of failures - each with a path, a rule id, a severity, and a
            suggested fix your developer can act on without reading a 200-page guideline.
          </p>
          <pre>
            <code>{`curl -X POST ${API_BASE_URL}/v1/validate \\
  -H "x-api-key: $EINVOICECHECK_KEY" \\
  -H "content-type: application/json" \\
  --data-binary @invoice.json

{
  "valid": false,
  "invoiceType": "380",
  "schemaVersion": "PINT-AE-1.0",
  "errors": [
    {
      "path": "/AccountingSupplierParty/PartyTaxScheme/CompanyID",
      "rule": "AE-TRN-FORMAT",
      "severity": "error",
      "message": "Supplier TRN must be 15 digits.",
      "fix": "Remove spaces and check the TRN length: 1000xxxxxxxxxxx"
    }
  ]
}`}</code>
          </pre>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>How it works</h2>
          <p>
            Three steps, no onboarding project. You keep your accredited service provider; this sits
            in front of it.
          </p>
          <div className="grid grid-3 steps" style={{ marginTop: 20 }}>
            <div className="card">
              <h3>POST the invoice</h3>
              <p>
                Send one document to <code>/v1/validate</code> with your API key - canonical JSON, an
                envelope, or raw UBL 2.1 / PINT AE XML straight out of your ERP export. No file
                upload portal, no SFTP, no mapping project.
              </p>
            </div>
            <div className="card">
              <h3>Get normalized, field-level errors</h3>
              <p>
                Back comes a deterministic list: JSON path, rule id, severity, a human message, and a
                concrete <code>fix</code>. TRN format, required tax fields, VAT category vs rate,
                line and document total arithmetic, currency and code lists, invoice type.
              </p>
            </div>
            <div className="card">
              <h3>Fix it before your ASP rejects it</h3>
              <p>
                Correct the file in your own pipeline, then hand the clean invoice to your accredited
                provider for transmission. The rejection never happens, so nobody has to reconcile it
                three days later.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>Who it is for</h2>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            <div className="card">
              <h3>UAE ERP integrators</h3>
              <p>
                You are wiring several clients&apos; ERPs into accredited providers before the
                mandate date. You need to know which exports are broken now, per client, without
                buying a seat on every vendor&apos;s platform.
              </p>
            </div>
            <div className="card">
              <h3>Finance &amp; accounting software vendors</h3>
              <p>
                Your product has to emit PINT AE-conformant invoices for every customer. You need a
                validation dependency you can gate a release on - not a support ticket after a
                customer&apos;s invoice bounces.
              </p>
            </div>
            <div className="card">
              <h3>In-house finance engineering teams</h3>
              <p>
                You own the invoice pipeline at a UAE business. You want a failing test in CI, not a
                rejection notice landing in the finance team&apos;s inbox with a deadline attached.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>Built for the pipeline, not the procurement cycle</h2>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            <div className="card">
              <h3>Deterministic, not advisory</h3>
              <p>
                Same invoice in, same error list out. No model calls, no &quot;confidence&quot; - so
                you can gate a CI build on it.
              </p>
            </div>
            <div className="card">
              <h3>Self-serve, priced in public</h3>
              <p>
                $29 or $99 a month, on the <Link href="/pricing">pricing page</Link>. No discovery
                call, no onboarding fee, no four-month implementation.
              </p>
            </div>
            <div className="card">
              <h3>Honest about its scope</h3>
              <p>
                It lints the file. Your accredited provider sends it. We say so on every page
                because the mistake is expensive.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>How teams use it</h2>
          <ul className="clean">
            <li>
              <strong>In CI:</strong> fail the build when an ERP export produces an invoice that
              would be rejected downstream.
            </li>
            <li>
              <strong>At the boundary:</strong> validate before handing the document to your
              accredited service provider, so rejections never reach your finance team.
            </li>
            <li>
              <strong>During migration:</strong> run a batch of historical invoices through{' '}
              <code>/v1/validate</code> to size the mapping work before the mandate date.
            </li>
            <li>
              <strong>In support:</strong> paste a failing invoice into the{' '}
              <Link href="/tools/uae-e-invoice-validator">free browser validator</Link> and get the
              same error list without writing code.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>Frequently asked questions about UAE e-invoicing</h2>
          {faqs.map((f) => (
            <div key={f.q} style={{ marginTop: 18 }}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <div className="cta-row">
            <Link href="/waitlist" className="btn btn-primary">
              Join the waitlist
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
