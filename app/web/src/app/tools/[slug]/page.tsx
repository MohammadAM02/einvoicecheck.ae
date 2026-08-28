import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { GuardrailNotice } from '@/components/Chrome';
import { InvoiceValidator } from '@/components/InvoiceValidator';
import { GeneratorWorkspace } from '@/components/GeneratorWorkspace';
import { ScopePanel } from '@/components/ScopePanel';
import { ToolPageHeader } from '@/components/ProductExperience';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { API_BASE_URL, PRICING, TOOL_SLUGS, type ToolSlug } from '@/lib/site';

const CURL_SNIPPET = `curl -X POST ${API_BASE_URL}/v1/preflight \\
  -H "x-api-key: $EINVOICE_KEY" \\
  -H "content-type: application/json" \\
  --data-binary @invoice.json`;

const NODE_SNIPPET = `const res = await fetch("${API_BASE_URL}/v1/preflight", {
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
    description: 'Paste a PINT AE / UBL 2.1 XML invoice and get layered format, structure, Schematron and semantic findings. Free, no signup. Canonical JSON data preflight is available through POST /v1/preflight.',
    targetKeyword: 'e invoicing UAE',
    blurb: 'Paste a PINT AE / UBL 2.1 XML invoice in the browser and inspect layered format, structure, Schematron and semantic findings. New canonical JSON integrations use POST /v1/preflight.',
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
  'xml-generator': {
    title: 'Free UAE e-invoice XML generator — build PINT-AE XML from a form',
    h1: 'XML Generator',
    description: 'Build a PINT-AE 1.0.4 / UBL 2.1 XML invoice from a form: implemented templates, totals computed, live data-entry checks. Free, no signup, nothing is transmitted.',
    targetKeyword: 'UAE e-invoice XML generator',
    blurb: 'Build a PINT-AE XML invoice from a form instead of hand-writing XML. The generator uses the current template set, computes totals, and runs data-entry checks as you type — then validate the result before it reaches your provider.',
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
  // The standalone XML Repairer retired (Part B): old links permanently
  // redirect to the main Validator instead of dead-ending on a 404.
  if (slug === 'xml-repairer') permanentRedirect('/tools/uae-e-invoice-validator');
  const tool = TOOLS[slug as ToolSlug];
  if (!tool) notFound();
  const isValidator = slug === 'uae-e-invoice-validator';
  const isGenerator = slug === 'xml-generator';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: tool.h1, path: `/tools/${slug}` }]))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: tool.h1, applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser', description: tool.description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } })} />

      <div className={isValidator ? 'section validator-station-section' : isGenerator ? 'section generator-route-section' : 'section'}>
        <div className={isValidator ? 'container validator-station-page' : isGenerator ? 'container generator-route-page' : 'container'} style={isValidator || isGenerator ? undefined : { maxWidth: 800 }}>
          {isValidator ? (
            <>
              <header className="validator-station-page__header">
                <div className="validator-station-page__title">
                  <span className="validator-station-page__signal" aria-hidden="true" />
                  <div>
                    <h1>Validator Station</h1>
                    <p className="validator-station-page__lead">One invoice in. The exact failure path out.</p>
                  </div>
                </div>
                <p className="validator-station-page__copy">Run the file here. Keep the finding, rule and fix in one place while you work.</p>
                <div className="validator-station-page__facts" aria-label="Validator facts">
                  <span>PINT-AE XML</span>
                  <span>No signup</span>
                  <span>Validated in memory</span>
                  <span>Independent preflight</span>
                </div>
              </header>
              <InvoiceValidator />
            </>
          ) : (
            <>
              <ToolPageHeader
                eyebrow="Free tool · no signup"
                title={tool.h1}
                description={tool.blurb}
              />

              {slug === 'xml-generator' ? (
                <div className="validator-tool-primary generator-route-primary">
                  <GeneratorWorkspace />
                  <p className="muted validator-tool-context">
                    The generator builds <strong>format-correct</strong> PINT-AE XML from the current
                    template set — with computed totals, supported data-entry checks, and a form-first
                    flow. It <strong>never transmits anything</strong> until you choose to validate the
                    result.
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
            </>
          )}
        </div>
      </div>

      {isValidator ? (
        <>
          <div className="section-alt validator-api-continuation">
            <div className="container" style={{ maxWidth: 980 }}>
              <div className="validator-api-continuation__intro">
                <h2>Make the browser check disappear into your workflow.</h2>
                <p className="muted">
                  The browser station is a free single-shot XML preflight surface backed by{' '}
                  <code>POST /v2/validate</code>. It accepts XML only. New canonical JSON integrations
                  use <code>POST /v1/preflight</code>; existing <code>POST /v1/validate</code> clients remain
                  supported as a legacy JSON/XML compatibility path. Authenticated API calls use an{' '}
                  <code>x-api-key</code> header; usage is metered per key and per-minute rate limits apply.
                </p>
              </div>
              <div className="validator-api-continuation__code">
                <pre className="keybox"><code>{CURL_SNIPPET}</code></pre>
                <pre className="keybox"><code>{NODE_SNIPPET}</code></pre>
              </div>
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
        <div className="container" style={{ maxWidth: isValidator ? 980 : 800 }}>
          {!isValidator && slug !== 'xml-generator' ? (
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
