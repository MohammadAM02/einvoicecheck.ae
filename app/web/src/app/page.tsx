import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { ScrollReveal, FaqAccordion } from '@/components/ScrollReveal';
import { HomeClient } from '@/components/HomeClient';
import { faqSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'E-invoicing UAE: validate invoices before you submit them',
  description:
    'E-invoicing in the UAE goes wrong at the file, not the filing. Preflight-validate PINT AE / UBL invoices, TRNs, tax fields and totals in one API call. Sign up for free — no card required.',
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
    a: 'Yes. Sign up for a free account and you will get an API key immediately — no card required. The free trial includes 100 validations over 14 days.',
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
              <Link href="/signup" className="btn btn-primary">
                Get started — free →
              </Link>
              <Link href="/docs" className="btn btn-ghost">
                Read the API docs
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <div className="stat-value">1,240+</div>
                <div className="stat-label">free accounts</div>
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
            <HomeClient />
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
              { number: '1,240+', label: 'Free accounts' },
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
        </div>
      </section>
    </>
  );
}
