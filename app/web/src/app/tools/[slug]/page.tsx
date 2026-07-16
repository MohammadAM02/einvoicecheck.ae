import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GuardrailNotice } from '@/components/Chrome';
import { InvoiceValidator } from '@/components/InvoiceValidator';
import { WaitlistForm } from '@/components/WaitlistForm';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL, PRICING, TOOL_SLUGS, type ToolSlug } from '@/lib/site';
import { TOOL_RATE_LIMIT } from '@/lib/toolRateLimit';

/**
 * RESERVED ROUTE for GR1 (free browser tool).
 * GR1 has shipped the live tool on `uae-e-invoice-validator` (see the
 * <InvoiceValidator /> block below); the other two slugs still render the
 * waitlist shell. Keep TOOL_SLUGS in src/lib/site.ts in sync.
 */

/** cURL + Node snippets for the "do this programmatically" CTA. Real contract (handoffs/E1/openapi.yaml). */
const CURL_SNIPPET = `curl -X POST ${API_BASE_URL}/v1/validate \\
  -H "x-api-key: $EINVOICECHECK_API_KEY" \\
  -H "content-type: application/json" \\
  --data-binary @invoice.json`;

const NODE_SNIPPET = `// Same engine, same errors - just automated.
const res = await fetch("${API_BASE_URL}/v1/validate", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EINVOICECHECK_API_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify(invoice), // or { document: "<Invoice>...</Invoice>" } for UBL/PINT AE XML
});

const { valid, invoiceType, schemaVersion, errors } = await res.json();
if (!valid) {
  for (const e of errors) {
    console.error(\`[\${e.severity}] \${e.path} \${e.rule}: \${e.message}\`);
  }
  process.exit(1); // fail the build before the file reaches your ASP
}`;

type ToolDef = {
  title: string;
  h1: string;
  description: string;
  targetKeyword: string;
  blurb: string;
};

const TOOLS: Record<ToolSlug, ToolDef> = {
  'uae-e-invoice-validator': {
    title: 'Free UAE e-invoice validator (paste an invoice, get the errors)',
    h1: 'Free UAE e-invoice validator',
    description:
      'Paste a UAE e-invoice (JSON or PINT AE / UBL XML) and get the list of errors that would get it rejected - TRN, tax fields, totals and code lists. Free, no signup.',
    targetKeyword: 'e invoicing UAE',
    blurb:
      'Paste an invoice in the browser and get the same deterministic error list the API returns: TRN format, required tax fields, total arithmetic, VAT category and rate consistency, code-list membership.',
  },
  'pint-ae-validator': {
    title: 'Free PINT AE validation tool - check a UBL 2.1 invoice online',
    h1: 'PINT AE validation, in the browser',
    description:
      'Check a PINT AE / UBL 2.1 invoice against the UAE profile for free: mandatory business terms, code lists, and totals that must reconcile. No signup.',
    targetKeyword: 'PINT AE validation',
    blurb:
      'Check a PINT AE / UBL 2.1 document against the UAE profile: mandatory business terms, code lists, and the arithmetic that has to reconcile before an accredited provider will accept it.',
  },
  'trn-format-checker': {
    title: 'Free UAE TRN format checker',
    h1: 'UAE TRN format checker',
    description:
      'Check whether a UAE Tax Registration Number is correctly formatted before it goes on an invoice. Free, instant, no signup.',
    targetKeyword: 'e invoicing UAE',
    blurb:
      'Check the shape of a UAE Tax Registration Number before it reaches an invoice. Format only - this does not confirm the TRN is registered with the FTA.',
  },
};

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOLS[slug as ToolSlug];
  if (!tool) return pageMetadata({ title: 'Tool', description: 'Not found', path: '/tools', noindex: true });
  return pageMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${slug}`,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOLS[slug as ToolSlug];
  if (!tool) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: tool.h1, path: `/tools/${slug}` },
          ]),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.h1,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web browser',
          description: tool.description,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        })}
      />

      <section>
        <div className="container">
          <span className="badge">Free tool &middot; no signup</span>
          <h1>{tool.h1}</h1>
          <p className="lead">{tool.blurb}</p>

          {slug === 'uae-e-invoice-validator' ? (
            <>
              <p>
                E-invoicing in the UAE breaks at the file, not at the filing. Your accredited service
                provider will transmit whatever you hand it - but it will reject a document whose TRN
                is the wrong length, whose VAT category does not match its rate, or whose totals are
                off by a fil. Paste the invoice below and see those errors now, before the deadline
                is on top of you.
              </p>
              <InvoiceValidator />

              <div className="notice">
                <strong>Preflight only - read this before you trust the green badge</strong>
                <p>
                  A pass here means the file is structurally and arithmetically clean against the
                  rules this engine checks. It does not make an invoice &quot;compliant&quot;, it does
                  not submit anything, and it is not an FTA accreditation. This tool is not
                  FTA-accredited, does not transmit legal e-invoices, does not replace an accredited
                  service provider, and provides no statutory archival. If the engine does not check
                  a rule, this page does not claim it does.
                </p>
              </div>
            </>
          ) : (
            <div className="notice">
              <strong>Tool ships next</strong>
              <p>
                This browser tool is being built on top of the same rule engine as the API - the
                same one already powering the{' '}
                <Link href="/tools/uae-e-invoice-validator">free UAE e-invoice validator</Link>.
                Leave your email and we will send it the day it goes live.
              </p>
            </div>
          )}
        </div>
      </section>

      {slug === 'uae-e-invoice-validator' ? (
        <>
          <section>
            <div className="container">
              <h2>Need this on every invoice? One API call.</h2>
              <p>
                The browser tool is the single-shot version of{' '}
                <code>POST /v1/validate</code>. Same rule engine, same normalized errors
                (<code>path</code>, <code>rule</code>, <code>severity</code>, <code>message</code>,{' '}
                <code>fix</code>) - authenticated with an <code>x-api-key</code> header and with no{' '}
                {TOOL_RATE_LIMIT}-per-hour browser cap.
              </p>
              <pre>
                <code>{CURL_SNIPPET}</code>
              </pre>
              <pre>
                <code>{NODE_SNIPPET}</code>
              </pre>
              <div className="cta-row">
                <Link className="btn btn-primary" href="/signup">
                  Get an API key - {PRICING.trial.priceLabel} {PRICING.trial.cadence},{' '}
                  {PRICING.trial.docs}
                </Link>
                <Link className="btn btn-ghost" href="/docs">
                  Full API docs
                </Link>
                <Link className="btn btn-ghost" href="/pricing">
                  Pricing
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="container">
              <h2>What this checks</h2>
              <ul className="clean">
                <li>Invoice type detection (tax invoice / credit note) and profile version.</li>
                <li>UAE TRN format on supplier and customer.</li>
                <li>Mandatory business terms (number, issue date, currency, parties, lines).</li>
                <li>Currency and code-list membership.</li>
                <li>VAT category and rate consistency.</li>
                <li>Line-item arithmetic, tax breakdown, and document totals that must reconcile.</li>
              </ul>
              <p className="muted">
                That is the whole list. The engine does not do XSD/Schematron conformance,
                registration lookups against the FTA, or transmission - so this page does not claim
                any of them.
              </p>
            </div>
          </section>
        </>
      ) : null}

      <section>
        <div className="container">
          <div className="card" style={{ maxWidth: 560 }}>
            <h3>
              {slug === 'uae-e-invoice-validator'
                ? 'Want the error list emailed, plus launch access?'
                : 'Get it when it lands'}
            </h3>
            <p className="muted">
              Optional - the tool above works without it. Waitlist members get an API key on the free
              trial at launch.
            </p>
            <WaitlistForm source={`tool:${slug}`} />
          </div>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
