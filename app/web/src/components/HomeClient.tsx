'use client';

import { useState } from 'react';
import { Building2, Code2, ShieldCheck } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { GUARDRAIL } from '@/lib/site';
import { HeroValidator } from './HeroValidator';
import { WorkflowTerminal } from './WorkflowTerminal';
import { ContactGuarantees } from './ContactGuarantees';
import { AuthModal } from './AuthModal';

const WHO_ITS_FOR = [
  {
    icon: Code2,
    title: 'SaaS & ERP Vendors',
    description:
      'Run deterministic semantic checks on UAE invoice exports before handing them to an accredited ASP.',
  },
  {
    icon: Building2,
    title: 'Finance Engineering Teams',
    description:
      'Catch TRN formatting, VAT consistency and totals errors before they become rejection tickets.',
  },
  {
    icon: ShieldCheck,
    title: 'Integrators & Consultants',
    description:
      'Test client exports and return a machine-readable list of errors with suggested fixes.',
  },
];

const FAQS = [
  {
    q: 'Is einvoicecheck.ae an FTA-accredited Service Provider (ASP)?',
    a: 'No. einvoicecheck.ae is a standalone preflight validator. It does not transmit legal e-invoices, replace an accredited provider or provide statutory archival.',
  },
  {
    q: 'Is this complete PINT AE conformity validation?',
    a: 'Not yet. The current engine performs deterministic semantic preflight checks covering core fields, TRNs, currencies, VAT categories and arithmetic. Full official XSD and Schematron conformity validation is not currently included.',
  },
  {
    q: 'Does my invoice payload get stored?',
    a: 'No. Invoice payloads are processed in memory and are not written to persistent storage. Usage metadata is recorded separately for metering.',
  },
  {
    q: 'How does rate limiting work on the free trial?',
    a: 'The free trial includes 100 validations per month capped at 10 requests per minute. Starter and Pro increase those limits.',
  },
  {
    q: 'What invoice formats are supported?',
    a: 'The validator accepts raw UBL 2.1 or PINT AE XML, a JSON envelope containing XML, and the einvoicecheck canonical JSON invoice format.',
  },
];

export default function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  const triggerAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="main-content">
      <div className="center-area">
        <div className="side-tagline anim-stagger" style={{ animationDelay: '0.4s' }}>
          <p>
            Programmatic<br />
            preflight checks<br />
            for UAE invoices
          </p>
          <div>
            <div className="side-dots-row">
              <div className="side-dot" />
              <div className="side-dot filled" />
            </div>
            <div className="side-dots-row" style={{ marginTop: 4 }}>
              <div className="side-dot filled" />
              <div className="side-dot" />
            </div>
            <div className="side-stat">
              <span>
                Deterministic<br />
                preflight engine
              </span>
              <span className="num">47 checks</span>
            </div>
          </div>
        </div>

        <div className="hero-heading anim-stagger" style={{ animationDelay: '0.5s' }}>
          <h1>
            Check UAE<br />
            E‑Invoice Files Before<br />
            <span className="hero-accent">Your ASP Receives Them</span>
          </h1>
        </div>
      </div>

      <div className="bottom-row">
        <div className="bottom-col-1 anim-stagger" style={{ animationDelay: '0.7s' }}>
          <p>
            Deterministic semantic checks for TRNs, VAT categories, line totals,
            currency codes and required fields. Full XSD and Schematron conformity
            validation is not currently included.
          </p>
        </div>

        <div className="bottom-col-2 anim-stagger" style={{ animationDelay: '0.85s' }}>
          <span className="bottom-label">REST API + FREE TOOL</span>
          <button className="cta-button btn-cut" onClick={() => triggerAuth('signup')}>
            <span>Try the Validator</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        <div className="bottom-col-3 anim-stagger" style={{ animationDelay: '1s' }}>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">47</span>
            <span className="stat-label">CHECKS</span>
          </div>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">XML</span>
            <span className="stat-label">+ JSON</span>
          </div>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">0</span>
            <span className="stat-label">PAYLOADS STORED</span>
          </div>
        </div>
      </div>

      <div className="section">
        <section className="container" style={{ marginBottom: 48 }}>
          <div className="hero-card">
            <HeroValidator onOpenAuth={() => triggerAuth('signup')} />
          </div>
        </section>

        <section className="container" style={{ marginBottom: 48 }}>
          <WorkflowTerminal />
        </section>

        <section className="container" style={{ marginBottom: 48 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Audience</div>
            <h2 className="section-title" style={{ maxWidth: 560, margin: '0 auto' }}>
              Built for the people fixing UAE invoice exports
            </h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 560, marginInline: 'auto' }}>
              A narrow preflight layer for technical teams. Your accredited provider still handles legal transmission.
            </p>
          </div>

          <div className="grid grid-3">
            {WHO_ITS_FOR.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(14,165,196,0.1)',
                      border: '1px solid rgba(14,165,196,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <Icon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{item.title}</h3>
                  <p className="muted">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: '40px 0',
            marginBottom: 48,
          }}
        >
          <div className="container">
            <div className="grid grid-4" style={{ textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>47</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Semantic Checks</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>8</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Rule Groups</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>XML + JSON</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Accepted Inputs</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>0</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Payloads Persisted</div>
              </div>
            </div>
          </div>
        </section>

        <section className="container" style={{ marginBottom: 48 }} id="pricing">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Pricing</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: '0 auto' }}>
              Simple, transparent pricing
            </h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 420, marginInline: 'auto' }}>
              Create an account, get a key and test the current preflight engine without a sales call.
            </p>
          </div>

          <div className="pricing-grid">
            {(['trial', 'starter', 'pro'] as const).map((id) => {
              const plan = PLANS[id];
              return (
                <div key={id} className={`pricing-card${id === 'starter' ? ' featured' : ''}`}>
                  {id === 'starter' ? <div className="pricing-badge">Most Popular</div> : null}
                  <h3 style={{ fontSize: '1.1rem' }}>{plan.name}</h3>
                  <div className="pricing-price">
                    {plan.priceLabel}
                    {id !== 'trial' ? <span className="pricing-period">/mo</span> : null}
                  </div>
                  <p className="muted">{plan.blurb}</p>
                  <ul className="pricing-features">
                    <li>{plan.monthlyQuota.toLocaleString()} validations / mo</li>
                    <li>{plan.rateLimitPerMinute} req / min rate limit</li>
                    <li>Machine-readable errors with suggested fixes</li>
                  </ul>
                  <button
                    onClick={() => triggerAuth('signup')}
                    className={id === 'starter' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ marginTop: 'auto', width: '100%' }}
                  >
                    {id === 'trial' ? 'Get Started Free' : `Create Account for ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container" style={{ marginBottom: 48 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Trust</div>
            <h2 className="section-title" style={{ maxWidth: 560, margin: '0 auto' }}>
              Clear about what the product does — and what it does not do
            </h2>
          </div>
          <ContactGuarantees />
        </section>

        <section className="container" style={{ marginBottom: 48, maxWidth: 640 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className={`faq-item${isOpen ? ' open' : ''}`}>
                  <button onClick={() => setOpenFaq(isOpen ? null : idx)} className="faq-question">
                    {faq.q}
                    <span className="arrow">▾</span>
                  </button>
                  <div className="faq-answer">
                    <div className="faq-answer-inner">{faq.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer
          className="container"
          style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid var(--border)', maxWidth: 640 }}
        >
          <p className="muted" style={{ fontSize: 11 }}>{GUARDRAIL}</p>
        </footer>
      </div>

      <AuthModal isOpen={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
