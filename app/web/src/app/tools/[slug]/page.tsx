import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { InvoiceValidator } from '@/components/InvoiceValidator';
import { RepairerWorkspace } from '@/components/RepairerWorkspace';
import { ScopePanel } from '@/components/ScopePanel';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL, PRICING, TOOL_SLUGS, type ToolSlug } from '@/lib/site';

const CURL_SNIPPET = `curl -X POST ${API_BASE_URL}/v1/validate \\
  -H "x-api-key: $EINVOICE_KEY" \\
  -H "content-type: application/json" \\
  --data-binary @invoice.json`;

const NODE_SNIPPET = `const res = await fetch("${API_BASE_URL}/v1/validate", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EINVOICECHECK_API_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify(invoice),
});
const { valid, invoiceType, schemaVersion, errors } = await res.json();
if (!valid) {
  for (const e of errors) {
    console.error(\`[\${e.severity}] \${e.path} \${e.rule}: \${e.message}\`);
  }
  process.exit(1);
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
    description: 'Paste a UAE e-invoice (JSON or PINT AE / UBL XML) and get semantic, VAT, code-list and arithmetic issues found by the current preflight engine. Free, no signup.',
    targetKeyword: 'e invoicing UAE',
    blurb: 'Paste an invoice in the browser and get the same deterministic error list the API returns: TRN format, required tax fields, total arithmetic, VAT category and rate consistency, code-list membership.',
  },
  'pint-ae-validator': {
    title: 'Free PINT AE validation tool - check a UBL 2.1 invoice online',
    h1: 'PINT AE validation, in the browser',
    description: 'Check a PINT AE / UBL 2.1 invoice against the UAE profile for free: mandatory business terms, code lists, and totals that must reconcile. No signup.',
    targetKeyword: 'PINT AE validation',
    blurb: 'Check a PINT AE / UBL 2.1 document against the UAE profile: mandatory business terms, code lists, and the arithmetic that has to reconcile before handoff to an accredited provider.',
  },
  'trn-format-checker': {
    title: 'Free UAE TRN format checker',
    h1: 'UAE TRN format checker',
    description: 'Check whether a UAE Tax Registration Number is correctly formatted before it goes on an invoice. Free, instant, no signup.',
    targetKeyword: 'e invoicing UAE',
    blurb: 'Check the shape of a UAE Tax Registration Number before it reaches an invoice. Format only - this does not confirm the TRN is registered with the FTA.',
  },
  'xml-repairer': {
    title: 'Free UBL XML repairer — fix format defects before validation',
    h1: 'XML Repairer',
    description: 'Repair format defects in UBL 2.1 / PINT AE XML invoices: fix namespace URIs, prefix case, illegal characters, and encoding declarations — never touches invoice data. Free, no signup.',
    targetKeyword: 'UBL XML repairer',
    blurb: 'Fix UBL XML formatting issues before validation. The repairer fixes namespace URIs, prefix casing, illegal characters, missing declarations, and encoding mismatches — without ever touching invoice data (TRNs, amounts, dates). Every change is audited.',
  },
};

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOLS[slug as ToolSlug];
  if (!tool) return pageMetadata({ title: 'Tool', description: 'Not found', path: '/tools', noindex: true });
  return pageMetadata({ title: tool.title, description: tool.description, path: `/tools/${slug}` });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOLS[slug as ToolSlug];
  if (!tool) notFound();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: tool.h1, path: `/tools/${slug}` }]))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: tool.h1, applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser', description: tool.description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } })} />

      <div className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          <span className="badge" style={{ marginBottom: 12 }}>Free tool &middot; no signup</span>
          <h1 style={{ marginBottom: 12 }}>{tool.h1}</h1>
          <p className="lead" style={{ marginBottom: 24 }}>{tool.blurb}</p>

          {slug === 'uae-e-invoice-validator' ? (
            <div className="validator-tool-primary">
              <InvoiceValidator />
              <p className="muted validator-tool-context">
                E-invoicing in the UAE breaks at the file, not at the filing. Your accredited service
                provider may reject an invalid document whose TRN
                is the wrong length, whose VAT category does not match its rate, or whose totals are
                off by a fil. Paste the invoice below and see those errors now, before the deadline
                is on top of you.
              </p>
            </div>
          ) : slug === 'xml-repairer' ? (
            <div className="validator-tool-primary">
              <RepairerWorkspace />
              <p className="muted validator-tool-context">
                The repairer fixes <strong>format only</strong> — namespace URIs, prefix casing,
                illegal XML characters, missing declarations, and encoding mismatches. It will
                <strong>never</strong> change a TRN, amount, date, or any other invoice data value.
                Every repair is audited with a machine-readable trail and SHA-256 hashes.
              </p>
            </div>
          ) : (
            <div className="notice">
              <strong>Tool ships next</strong>
              <p style={{ marginTop: 4 }}>
                This browser tool is being built on top of the same rule engine as the API - the
                same one already powering the{' '}
                <Link href="/tools/uae-e-invoice-validator" style={{ color: 'var(--accent)' }}>free UAE e-invoice validator</Link>.
                Leave your email and we will send it the day it goes live.
              </p>
            </div>
          )}
        </div>
      </div>

      {slug === 'uae-e-invoice-validator' ? (
        <>
          <div className="section-alt">
            <div className="container" style={{ maxWidth: 800 }}>
              <h2 style={{ marginBottom: 12 }}>Need this on every invoice? One API call.</h2>
              <p className="muted" style={{ marginBottom: 16 }}>
                The browser tool is the single-shot version of{' '}
                <code>POST /v1/validate</code>. Same rule engine, same normalized errors
                (<code>path</code>, <code>rule</code>, <code>severity</code>, <code>message</code>,{' '}
                <code>fix</code>) - authenticated with an <code>x-api-key</code> header, with
                {' '}plan-based monthly quotas and per-minute rate limits.
              </p>
              <pre className="keybox" style={{ marginBottom: 16 }}><code>{CURL_SNIPPET}</code></pre>
              <pre className="keybox" style={{ marginBottom: 24 }}><code>{NODE_SNIPPET}</code></pre>
              <div className="cta-row">
                <Link className="btn btn-primary" href="/signup">
                  Get an API key - {PRICING.trial.priceLabel} {PRICING.trial.cadence},{' '}
                  {PRICING.trial.docs}
                </Link>
                <Link className="btn btn-ghost" href="/docs">Full API docs</Link>
                <Link className="btn btn-ghost" href="/pricing">Pricing</Link>
              </div>
            </div>
          </div>
          <div className="section">
            <ScopePanel />
          </div>
        </>
      ) : null}

      <div className="section">
        <div className="container" style={{ maxWidth: 800 }}>
          {slug !== 'uae-e-invoice-validator' ? (
            <div className="card" style={{ maxWidth: 560 }}>
              <h3 style={{ marginBottom: 8 }}>Get it when it lands</h3>
              <p className="muted" style={{ marginBottom: 12 }}>
                Leave your email and we will send it when the tool goes live.
              </p>
              <Link href="/signup" className="btn btn-primary">Sign up for launch access</Link>
            </div>
          ) : null}
          <GuardrailNotice />
        </div>
      </div>
    </>
  );
}

function notFound(): never {
  throw new Error('Tool not found');
}
