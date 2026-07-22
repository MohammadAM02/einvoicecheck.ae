'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GuardrailNotice } from '@/components/Chrome';
import { ScrollReveal } from '@/components/ScrollReveal';

const tiers = [
  {
    name: 'Free trial',
    price: '$0',
    period: 'for 14 days',
    usage: '100 validations',
    blurb: 'Enough to wire the API into one CI pipeline and see your real error list.',
    planId: 'trial' as const,
    features: [
      'POST /v1/validate (JSON, envelope, or XML)',
      'Per-key usage metering at GET /usage',
      'Machine-readable errors with a suggested fix',
    ],
  },
  {
    name: 'Starter',
    price: '$29',
    period: 'per month',
    usage: '2,000 validations / month',
    blurb: 'For one finance system or ERP export you keep clean before it reaches your ASP.',
    planId: 'starter' as const,
    features: [
      'POST /v1/validate (JSON, envelope, or XML)',
      'Per-key usage metering at GET /usage',
      'Machine-readable errors with a suggested fix',
      'Priority email support',
    ],
  },
  {
    name: 'Growth',
    price: '$99',
    period: 'per month',
    usage: '15,000 validations / month',
    blurb: 'For teams validating every invoice in CI across several entities or clients.',
    planId: 'pro' as const,
    features: [
      'POST /v1/validate (JSON, envelope, or XML)',
      'Per-key usage metering at GET /usage',
      'Machine-readable errors with a suggested fix',
      'Priority email support',
    ],
  },
];

export function PricingClient() {
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout(planId: string) {
    if (planId === 'trial') return;
    setCheckingOut(true);
    setError('');

    try {
      const res = await fetch('/api/billing/lemon-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not start checkout.');
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('No checkout URL returned.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      <section>
        <div className="container">
          <ScrollReveal>
            <div className="section-header" style={{ textAlign: 'left' }}>
              <div className="section-label">Pricing</div>
              <h1 style={{ fontSize: 42, marginBottom: 'var(--space-md)' }}>
                UAE e-invoicing software with a price on the page
              </h1>
              <p className="lead" style={{ maxWidth: '100%' }}>
                Every other quote in this category starts with a discovery call. Here
                is the number. Pick a tier, validate invoices, keep your accredited
                provider.
              </p>
            </div>
          </ScrollReveal>

          {/* Payment methods — customer-facing only */}
          <ScrollReveal delay={1}>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <p style={{ textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: 14, color: 'var(--ink-muted)' }}>
                Secure checkout powered by Lemon Squeezy
              </p>
              <div className="payment-methods">
                <span className="payment-method-badge">
                  <span className="pm-icon">🅿️</span> PayPal
                </span>
                <span className="payment-method-badge">
                  <span className="pm-icon">💳</span> Credit / Debit
                </span>
              </div>
            </div>
          </ScrollReveal>

          <div className="notice">
            <strong>Billing is not live yet</strong>
            <p>
              Checkout is not wired up yet. No card details are collected anywhere on
              this site right now.{' '}
              <Link href="/signup">Sign up</Link> for a free API key — no card required.
            </p>
          </div>

          {error && (
            <p className="error" style={{ textAlign: 'center', marginTop: 12 }}>
              {error}
            </p>
          )}

          <div className="pricing-grid" style={{ marginTop: 24 }}>
            {tiers.map((tier, i) => (
              <ScrollReveal key={tier.name} delay={i + 2}>
                <div
                  className={`pricing-card${tier.name === 'Starter' ? ' featured' : ''}`}
                >
                  {tier.name === 'Starter' && (
                    <div className="pricing-badge">Most popular</div>
                  )}
                  <h3>{tier.name}</h3>
                  <div className="pricing-price">{tier.price}</div>
                  <div className="pricing-period">{tier.period}</div>
                  <div className="pricing-usage">{tier.usage}</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 'var(--space-lg)' }}>
                    {tier.blurb}
                  </p>
                  <ul className="pricing-features">
                    {tier.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  {tier.name === 'Free trial' ? (
                    <Link href="/signup" className="btn btn-secondary">
                      Start free trial →
                    </Link>
                  ) : (
                    <button
                      className={`btn${tier.name === 'Starter' ? ' btn-primary' : ' btn-secondary'}`}
                      onClick={() => handleCheckout(tier.planId)}
                      disabled={checkingOut}
                    >
                      {checkingOut ? 'Redirecting...' : `Subscribe →`}
                    </button>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>

          <GuardrailNotice />
        </div>
      </section>

      {/* Comparison table */}
      <section className="section-alt">
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Compare</div>
              <h2 className="section-title">What you are comparing it against</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Published price</th>
                  <th>Shape</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    einvoicecheck.ae
                  </td>
                  <td style={{ color: 'var(--ink)' }}>
                    $0 trial / $29 / $99 per month
                  </td>
                  <td>Self-serve preflight validation API</td>
                </tr>
                <tr>
                  <td>
                    <Link href="/alternatives/cleartax">ClearTax UAE</Link>
                  </td>
                  <td>Contact sales</td>
                  <td>Full accredited-provider suite</td>
                </tr>
                <tr>
                  <td>
                    <Link href="/alternatives/comarch">
                      Comarch EDI &amp; e-Invoicing
                    </Link>
                  </td>
                  <td>Contact sales</td>
                  <td>Enterprise EDI platform</td>
                </tr>
                <tr>
                  <td>
                    <Link href="/alternatives/sovos">Sovos</Link>
                  </td>
                  <td>Quote only</td>
                  <td>Multi-jurisdiction compliance platform</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: 14 }}>
              Those platforms do things this API deliberately does not do — above
              all, they can actually transmit your invoice. This is the cheap
              linting layer that sits in front of them.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">FAQ</div>
              <h2 className="section-title">Pricing questions</h2>
            </div>
          </ScrollReveal>
          {[
            {
              q: 'How much does UAE e-invoicing software cost?',
              a: 'Most UAE e-invoicing vendors are quote-led, and buyers report base fees in the thousands of dirhams plus per-document usage. One visible entrant publishes AED 1,470 per year for a 500-document API tier, roughly $33 a month. einvoicecheck.ae publishes its price: free trial, $29/month, or $99/month.',
            },
            {
              q: 'Can I pay today?',
              a: 'Not yet. Billing runs through Lemon Squeezy and will be live soon. In the meantime, sign up for a free account — you will get an API key immediately with no card required.',
            },
            {
              q: 'Does the price include transmitting invoices to the FTA?',
              a: 'No. einvoicecheck.ae is a preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices, it does not replace an accredited service provider, and it does not provide statutory archival.',
            },
            {
              q: 'What counts as one validation?',
              a: 'One POST to /v1/validate with one invoice document. Failed validations count the same as passing ones — the work is identical.',
            },
          ].map((f, i) => (
            <ScrollReveal key={i} delay={i}>
              <div style={{ marginTop: 18 }}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  );
}
