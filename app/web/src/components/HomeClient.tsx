'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ScrollReveal';
import { HeroValidator } from '@/components/HeroValidator';
import { WorkflowTerminal } from '@/components/WorkflowTerminal';
import { ContactGuarantees } from '@/components/ContactGuarantees';
import { AuthModal } from '@/components/AuthModal';

export function HomeClient() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  const openAuth = (mode: 'signup' | 'login') => {
    setAuthMode(mode);
    setAuthOpen(true);
    if (typeof window !== 'undefined' && (window as any).trackEvent) {
      (window as any).trackEvent('auth_modal_opened', { mode });
    }
  };

  return (
    <>
      {/* Hero right column — inline validator */}
      <HeroValidator onOpenAuth={() => openAuth('signup')} />

      {/* ── WORKFLOW ── */}
      <section className="section-alt" style={{ marginTop: 60 }}>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Workflow</div>
              <h2 className="section-title">Copy, paste, deploy</h2>
              <p className="section-subtitle">
                No SDK. No wrapper. Just one POST from your CI pipeline.
              </p>
            </div>
          </ScrollReveal>
          <WorkflowTerminal />
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section style={{ marginTop: 60 }}>
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
                  {tier.name === 'Free trial' ? (
                    <button
                      onClick={() => openAuth('signup')}
                      className={`btn${tier.featured ? ' btn-primary' : ' btn-secondary'}`}
                    >
                      Start free trial →
                    </button>
                  ) : (
                    <Link
                      href="/pricing"
                      className={`btn${tier.featured ? ' btn-primary' : ' btn-secondary'}`}
                    >
                      See pricing →
                    </Link>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST & OPERATIONS ── */}
      <section className="section-alt" style={{ marginTop: 60 }}>
        <div className="container">
          <ScrollReveal>
            <div className="section-header">
              <div className="section-label">Trust & Operations</div>
              <h2 className="section-title">Enterprise guarantees, founder support</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <ContactGuarantees />
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ CTA ── */}
      <div className="container" style={{ padding: '32px 0' }}>
        <div className="cta-row" style={{ justifyContent: 'center' }}>
          <button
            onClick={() => openAuth('signup')}
            className="btn btn-primary"
          >
            Get started — free
          </button>
          <Link href="/pricing" className="btn btn-secondary">
            See pricing
          </Link>
        </div>
      </div>

      {/* ── AUTH MODAL ── */}
      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
