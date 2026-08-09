import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { ScrollReveal } from '@/components/ScrollReveal';
import { PLANS, PLAN_IDS } from '@/lib/plans';

const tiers = PLAN_IDS.map((id) => {
  const p = PLANS[id];
  const features = [
    'POST /v2/validate (XML) or /v1/preflight (canonical JSON); legacy /v1/validate compatibility',
    'Per-key usage metering at GET /usage',
    'Machine-readable errors with a suggested fix',
  ];
  if (id !== 'trial') features.push('Priority email support');
  return { id, name: p.name, price: p.priceLabel, period: p.cadence, usage: `${p.monthlyQuota.toLocaleString()} validations / month`, blurb: p.blurb, features };
});

export function PricingClient() {
  return (
    <>
      <div className="section">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Pricing</div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: 12 }}>UAE e-invoice preflight checks with a price on the page</h1>
              <p className="lead" style={{ maxWidth: '100%' }}>Create a free account first. Paid subscriptions are approved and processed securely through PayPal from your dashboard.</p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={1}>
            <div className="notice" style={{ marginBottom: 24 }}>
              <strong>Start with the free key</strong>
              <p style={{ marginTop: 4 }}>Signup provisions an API key immediately with no card required. Your account and usage remain attached when you upgrade through PayPal.</p>
            </div>
          </ScrollReveal>

          <div className="pricing-grid" style={{ marginTop: 24 }}>
            {tiers.map((tier, i) => (
              <ScrollReveal key={tier.name} delay={i + 2}>
                <div className={`pricing-card${tier.id === 'starter' ? ' featured' : ''}`}>
                  {tier.id === 'starter' ? <div className="pricing-badge">Most popular</div> : null}
                  <h3 style={{ fontSize: '1.1rem' }}>{tier.name}</h3>
                  <div className="pricing-price">{tier.price}</div>
                  <div className="pricing-period">{tier.period}</div>
                  <div className="pricing-usage">{tier.usage}</div>
                  <p className="muted" style={{ marginBottom: 16 }}>{tier.blurb}</p>
                  <ul className="pricing-features">{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <Link href="/signup" className={tier.id === 'starter' ? 'btn btn-primary' : 'btn btn-secondary'} style={{ marginTop: 16 }}>
                    {tier.id === 'trial' ? 'Get free API key →' : `Create account for ${tier.name} →`}
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <GuardrailNotice />
        </div>
      </div>

      <div className="section-alt">
        <div className="container">
          <ScrollReveal>
            <div className="section-header"><div className="section-label">Scope</div><h2 className="section-title">A preflight layer, not a replacement for your ASP</h2></div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <p className="muted">Accredited providers handle legal transmission and archival. einvoicecheck.ae provides supported preflight checks for core fields, TRNs, VAT consistency and arithmetic before the file reaches them; the canonical XML API path also layers server-side Schematron findings on top. Exact official artifact parity and version coverage remain AMG-verification. This remains preflight, not transmission.</p>
          </ScrollReveal>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <ScrollReveal><div className="section-header"><div className="section-label">FAQ</div><h2 className="section-title">Pricing questions</h2></div></ScrollReveal>
          {[
            { q: 'Can I get an API key without paying?', a: 'Yes. Signup creates a free account and provisions the first API key immediately. No card is required.' },
            { q: 'Who processes paid subscriptions?', a: 'PayPal processes subscription payments. einvoicecheck.ae provides the service and remains responsible for its pricing, refunds and customer support.' },
            { q: 'Does the price include transmitting invoices to the FTA?', a: 'No. einvoicecheck.ae is a preflight validator. It is not FTA-accredited, does not transmit legal e-invoices, does not replace an accredited service provider, and does not provide statutory archival.' },
            { q: 'What counts as one validation?', a: 'One API validation request with one invoice document. Failed and passing validations both count because the same preflight work is performed.' },
          ].map((item, i) => (
            <ScrollReveal key={item.q} delay={i}><div style={{ marginTop: 18 }}><h3 style={{ marginBottom: 4 }}>{item.q}</h3><p className="muted">{item.a}</p></div></ScrollReveal>
          ))}
        </div>
      </div>
    </>
  );
}
