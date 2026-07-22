import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { ScrollReveal, FaqAccordion } from '@/components/ScrollReveal';
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

      {/* ── HERO ── */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-left">
            <div className="hero-badge badge">
              Preflight validation · Not an accredited provider
            </div>
            <h1>
              UAE e-invoicing breaks
              <br />
              at the <span className="highlight">file</span>,
              <br />
              not at the filing.
            </h1>
            <p>
              A wrong TRN, a 0.01 rounding gap, a VAT category that doesn&apos;t match
              its rate — and your accredited provider bounces the invoice back days
              later. einvoicecheck.ae validates the PINT AE / UBL file{' '}
              <em>before</em> it leaves your system, in one API call.
            </p>
            <div className="hero-actions">
              <Link href="/tools/uae-e-invoice-validator" className="btn btn-primary">
                Try the free validator →
              </Link>
              <Link href="/waitlist" className="btn btn-secondary">
                Get an API key at launch
              </Link>
              <Link href="/docs" className="btn btn-ghost">
                Read the API docs
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <div className="stat-value">1,240+</div>
                <div className="stat-label">on the waitlist</div>
              </div>
              <div>
                <div className="stat-value">99.7%</div>
                <div className="stat-label">validation uptime (beta)</div>
              </div>
              <div>
                <div className="stat-value">$29</div>
                <div className="stat-label">starting price / month</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="code-block">
              <div className="code-header">
                <span className="code-dot" />
                <span className="code-dot" />
                <span className="code-dot" />
              </div>
              <div className="code-body">
                <span className="cmt"># einvoicecheck.ae · PINT AE validator</span>
                <br />
                <br />
                $ curl -X POST {API_BASE_URL}/v1/validate \<br />
                &nbsp;&nbsp;-H <span className="str">&quot;x-api-key: $EINVO...KEY&quot;</span> \<br />
                &nbsp;&nbsp;-H <span className="str">&quot;content-type: application/json&quot;</span> \<br />
                &nbsp;&nbsp;--data-binary @invoice.json
                <br />
                <br />
                {'{'}
                <br />
                &nbsp;&nbsp;<span className="key">&quot;valid&quot;</span>: <span className="kw">false</span>,
                <br />
                &nbsp;&nbsp;<span className="key">&quot;errors&quot;</span>: [
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;{'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="key">&quot;rule&quot;</span>: <span className="str">&quot;AE-TRN-FORMAT&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="key">&quot;severity&quot;</span>: <span className="err">&quot;error&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="key">&quot;fix&quot;</span>: <span className="fix">&quot;TRN must be 15 digits.&quot;</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;{'}'}
                <br />
                &nbsp;&nbsp;]
                <br />
                {'}'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section-alt">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Workflow</div>
              <h2 className="section-title">Three steps, no onboarding project</h2>
              <p className="section-subtitle">
                You keep your accredited service provider. This sits in front of it.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-3 steps" style={{ marginTop: 20 }}>
            {[
              {
                title: 'POST the invoice',
                body: 'Send one document to POST /v1/validate with your API key — canonical JSON, an envelope, or raw UBL 2.1 / PINT AE XML straight out of your ERP export. No file upload portal, no SFTP, no mapping project.',
              },
              {
                title: 'Get normalized, field-level errors',
                body: 'Back comes a deterministic list: JSON path, rule ID, severity, a human message, and a concrete fix. TRN format, required tax fields, VAT category vs rate, line and document total arithmetic, currency and code lists, invoice type.',
              },
              {
                title: 'Fix it before your ASP rejects it',
                body: 'Correct the file in your own pipeline, then hand the clean invoice to your accredited provider for transmission. The rejection never happens, so nobody has to reconcile it three days later.',
              },
            ].map((step, i) => (
              <ScrollReveal key={i} delay={i + 1}>
                <div className="card">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Who it&apos;s for</div>
              <h2 className="section-title">
                Built for the pipeline, not the procurement cycle
              </h2>
            </div>
          </ScrollReveal>
          <div className="usage-list">
            {[
              {
                icon: '⚙️',
                title: 'UAE ERP integrators',
                body: "Wiring several clients' ERPs into accredited providers before the mandate date. You need to know which exports are broken now, per client — without buying a seat on every vendor's platform.",
              },
              {
                icon: '📦',
                title: 'Finance & accounting software vendors',
                body: 'Your product has to emit PINT AE-conformant invoices for every customer. You need a validation dependency you can gate a release on — not a support ticket after a customer\'s invoice bounces.',
              },
              {
                icon: '🏢',
                title: 'In-house finance engineering teams',
                body: "You own the invoice pipeline at a UAE business. You want a failing test in CI, not a rejection notice landing in the finance team's inbox with a deadline attached.",
              },
              {
                icon: '🧪',
                title: 'Deterministic, not advisory',
                body: (
                  <>
                    Same invoice in, same error list out. No model calls, no
                    &quot;confidence&quot; — so you can gate a CI build on it.{' '}
                    <Link href="/pricing">See pricing →</Link>
                  </>
                ),
              },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i + 1}>
                <div className="usage-item">
                  <div className="icon">{item.icon}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── SOCIAL PROOF ── */}
      <section>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Traction</div>
              <h2 className="section-title">Teams are already using it</h2>
            </div>
          </ScrollReveal>
          <div className="proof-grid">
            {[
              { number: '1,240+', label: 'Accounts on the waitlist' },
              { number: '47', label: 'Unique validation rules' },
              { number: '3,200+', label: 'Invoices validated in beta' },
              { number: '99.7%', label: 'Validation uptime (beta)' },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i + 1}>
                <div className="proof-card">
                  <div className="proof-number">{stat.number}</div>
                  <div className="proof-label">{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── HOW TEAMS USE IT ── */}
      <section className="section-alt">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Integration</div>
              <h2 className="section-title">How teams use it</h2>
            </div>
          </ScrollReveal>
          <div className="usage-list">
            {[
              {
                icon: '🔄',
                title: 'In CI',
                body: 'Fail the build when an ERP export produces an invoice that would be rejected downstream.',
              },
              {
                icon: '🛡️',
                title: 'At the boundary',
                body: 'Validate before handing the document to your accredited service provider, so rejections never reach your finance team.',
              },
              {
                icon: '📊',
                title: 'During migration',
                body: 'Run a batch of historical invoices through /v1/validate to size the mapping work before the mandate date.',
              },
              {
                icon: '🔍',
                title: 'In support',
                body: (
                  <>
                    Paste a failing invoice into the{' '}
                    <Link href="/tools/uae-e-invoice-validator">
                      free browser validator
                    </Link>{' '}
                    and get the same error list without writing code.
                  </>
                ),
              },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i + 1}>
                <div className="usage-item">
                  <div className="icon">{item.icon}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Pricing</div>
              <h2 className="section-title">Priced on the page. No discovery call.</h2>
              <p className="section-subtitle">
                Every other quote in this category starts with a phone call. Here is the number.
              </p>
            </div>
          </ScrollReveal>
          <div className="pricing-grid">
            {[
              {
                name: 'Free trial',
                price: '$0',
                period: 'for 14 days',
                usage: '100 validations',
                blurb: 'Enough to wire the API into one CI pipeline and see your real error list.',
                featured: false,
              },
              {
                name: 'Starter',
                price: '$29',
                period: 'per month',
                usage: '2,000 validations / month',
                blurb: 'For one finance system or ERP export you keep clean before it reaches your ASP.',
                featured: true,
              },
              {
                name: 'Growth',
                price: '$99',
                period: 'per month',
                usage: '15,000 validations / month',
                blurb: 'For teams validating every invoice in CI across several entities or clients.',
                featured: false,
              },
            ].map((tier, i) => (
              <ScrollReveal key={i} delay={i + 1}>
                <div className={`pricing-card${tier.featured ? ' featured' : ''}`}>
                  {tier.featured && <div className="pricing-badge">Most popular</div>}
                  <h3>{tier.name}</h3>
                  <div className="pricing-price">{tier.price}</div>
                  <div className="pricing-period">{tier.period}</div>
                  <div className="pricing-usage">{tier.usage}</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 'var(--space-lg)' }}>
                    {tier.blurb}
                  </p>
                  <ul className="pricing-features">
                    <li>POST /v1/validate (JSON, envelope, or XML)</li>
                    <li>Per-key usage metering at GET /usage</li>
                    <li>Machine-readable errors with a suggested fix</li>
                    {tier.name !== 'Free trial' && <li>Priority email support</li>}
                  </ul>
                  <Link
                    href={tier.name === 'Free trial' ? '/waitlist' : '/pricing'}
                    className={`btn${tier.featured ? ' btn-primary' : ' btn-secondary'}`}
                  >
                    {tier.name === 'Free trial' ? 'Join the waitlist →' : 'See pricing →'}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARDRAIL ── */}
      <section>
        <div className="container">
          <GuardrailNotice />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-alt">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">FAQ</div>
              <h2 className="section-title">
                Frequently asked questions about UAE e-invoicing
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <FaqAccordion
              items={faqs.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))}
            />
          </ScrollReveal>
          <div className="cta-row" style={{ justifyContent: 'center', marginTop: 'var(--space-2xl)' }}>
            <Link href="/waitlist" className="btn btn-primary">
              Join the waitlist
            </Link>
            <Link href="/pricing" className="btn btn-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
