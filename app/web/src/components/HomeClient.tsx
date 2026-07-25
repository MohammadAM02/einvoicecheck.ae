'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  ChevronDown, 
  Building2, 
  Code2, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
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
    description: 'Embed preflight UBL 2.1 and PINT AE validation directly into your billing pipeline before transmitting to ASPs.',
  },
  {
    icon: Building2,
    title: 'Enterprise Accounting Teams',
    description: 'Catch TRN formatting errors, tax breakdown discrepancies, and arithmetic mismatches in high-volume batch runs.',
  },
  {
    icon: ShieldCheck,
    title: 'Tax Consultants & Auditors',
    description: 'Provide clients with deterministic preflight verification reports before official FTA submission windows close.',
  },
];

const FAQS = [
  {
    q: 'Is einvoicecheck.ae an FTA-accredited Service Provider (ASP)?',
    a: 'No. einvoicecheck.ae provides standalone, deterministic preflight validation. It checks your XML/JSON against UBL 2.1 and PINT AE specifications before you submit to an accredited provider.',
  },
  {
    q: 'Does my invoice payload leave my server or get stored?',
    a: 'Validation checks occur via stateless API calls or client-side web tools. Invoice payloads are processed in-memory and are never written to database records or persistent storage.',
  },
  {
    q: 'How does rate limiting work on the free trial?',
    a: 'The free trial includes 100 validations per month capped at 10 requests per minute. Upgrading to Starter or Pro increases throughput instantly.',
  },
  {
    q: 'What invoice formats are supported?',
    a: 'We support official UBL 2.1 XML, PINT AE XML structures, and our canonical JSON schema representation.',
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
        {/* Left side tagline (desktop) */}
        <div className="side-tagline anim-stagger" style={{ animationDelay: '0.4s' }}>
          <p>
            Programmatic<br />
            preflight validation<br />
            for every invoice
          </p>
          <div>
            <div className="side-dots-row">
              <div className="side-dot"></div>
              <div className="side-dot filled"></div>
            </div>
            <div className="side-dots-row" style={{ marginTop: 4 }}>
              <div className="side-dot filled"></div>
              <div className="side-dot"></div>
            </div>
            <div className="side-stat">
              <span>
                Deterministic<br />
                Validation
              </span>
              <span className="num">47 rules</span>
            </div>
          </div>
        </div>

        {/* Center heading */}
        <div className="hero-heading anim-stagger" style={{ animationDelay: '0.5s' }}>
          <h1>
            Validate UAE<br />
            E‑Invoices Before<br />
            <span className="hero-accent">Your ASP Does</span>
          </h1>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        {/* Col 1: description */}
        <div className="bottom-col-1 anim-stagger" style={{ animationDelay: '0.7s' }}>
          <p>
            47+ deterministic rules covering TRN format,
            VAT categories, line totals, currency codes, and
            invoice type — before your ASP rejects it.
          </p>
        </div>

        {/* Col 2: CTA */}
        <div className="bottom-col-2 anim-stagger" style={{ animationDelay: '0.85s' }}>
          <span className="bottom-label">REST API</span>
          <button className="cta-button btn-cut" onClick={() => triggerAuth('signup')}>
            <span>Try the Validator</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Col 3: stats / social proof */}
        <div className="bottom-col-3 anim-stagger" style={{ animationDelay: '1s' }}>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">1.2k</span>
            <span className="stat-label">ACCOUNTS</span>
          </div>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">99.7</span>
            <span className="stat-label">UPTIME</span>
          </div>
          <div className="stat-pill btn-cut-sm">
            <span className="stat-number">3.2k</span>
            <span className="stat-label">VALIDATED</span>
          </div>
        </div>
      </div>

      {/* Scroll content below hero */}
      <div className="section">
        {/* 1. Interactive Hero Validator Box */}
        <section className="container" style={{ marginBottom: 48 }}>
          <div className="hero-card">
            <HeroValidator onOpenAuth={() => triggerAuth('signup')} />
          </div>
        </section>

        {/* 2. Interactive Workflow Terminal */}
        <section className="container" style={{ marginBottom: 48 }}>
          <WorkflowTerminal />
        </section>

        {/* 3. Who It's For (Strict 3-Column Grid) */}
        <section className="container" style={{ marginBottom: 48 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Audience</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: '0 auto' }}>
              Built for UAE Systems &amp; Tech Teams
            </h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
              Deterministic validation tailored for software engineers and finance operators.
            </p>
          </div>

          <div className="grid grid-3">
            {WHO_ITS_FOR.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="card">
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(14,165,196,0.1)',
                    border: '1px solid rgba(14,165,196,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <Icon style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{item.title}</h3>
                  <p className="muted">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Social Proof Metrics (Strict 4-Column Grid) */}
        <section style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '40px 0',
          marginBottom: 48,
        }}>
          <div className="container">
            <div className="grid grid-4" style={{ textAlign: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>47</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Deterministic Rules</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>PINT AE</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Specification Checked</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>&lt;50ms</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Engine Latency</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' }}>0</div>
                <div className="section-label" style={{ marginTop: 4, color: 'var(--ink-muted)' }}>Persistent Storage</div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Pricing Grid (Strict 3-Column Grid) */}
        <section className="container" style={{ marginBottom: 48 }} id="pricing">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Pricing</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: '0 auto' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="muted" style={{ marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
              No mandatory enterprise sales calls. Start in 60 seconds.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Trial */}
            <div className="pricing-card">
              <h3 style={{ fontSize: '1.1rem' }}>{PLANS.trial.name}</h3>
              <div className="pricing-price">{PLANS.trial.priceLabel}</div>
              <p className="muted">No credit card required</p>

              <ul className="pricing-features">
                <li>{PLANS.trial.monthlyQuota} validations / mo</li>
                <li>{PLANS.trial.rateLimitPerMinute} req / min rate limit</li>
                <li>Full 47-rule validation engine</li>
              </ul>

              <button
                onClick={() => triggerAuth('signup')}
                className="btn btn-secondary"
                style={{ marginTop: 'auto', width: '100%' }}
              >
                Get Started Free
              </button>
            </div>

            {/* Starter */}
            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <h3 style={{ fontSize: '1.1rem' }}>{PLANS.starter.name}</h3>
              <div className="pricing-price">{PLANS.starter.priceLabel}<span className="pricing-period">/mo</span></div>
              <p className="muted">Production access</p>

              <ul className="pricing-features">
                <li>{PLANS.starter.monthlyQuota.toLocaleString()} validations / mo</li>
                <li>{PLANS.starter.rateLimitPerMinute} req / min rate limit</li>
                <li>API Key management dashboard</li>
              </ul>

              <button
                onClick={() => triggerAuth('signup')}
                className="btn btn-primary"
                style={{ marginTop: 'auto', width: '100%' }}
              >
                Start Starter Plan
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card">
              <h3 style={{ fontSize: '1.1rem' }}>{PLANS.pro.name}</h3>
              <div className="pricing-price">{PLANS.pro.priceLabel}<span className="pricing-period">/mo</span></div>
              <p className="muted">High volume ERPs</p>

              <ul className="pricing-features">
                <li>{PLANS.pro.monthlyQuota.toLocaleString()} validations / mo</li>
                <li>{PLANS.pro.rateLimitPerMinute} req / min rate limit</li>
                <li>Priority API routing</li>
              </ul>

              <button
                onClick={() => triggerAuth('signup')}
                className="btn btn-secondary"
                style={{ marginTop: 'auto', width: '100%' }}
              >
                Start Pro Plan
              </button>
            </div>
          </div>
        </section>

        {/* 6. Guarantees */}
        <section className="container" style={{ marginBottom: 48 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">Trust</div>
            <h2 className="section-title" style={{ maxWidth: 500, margin: '0 auto' }}>
              Built for Enterprise Confidence
            </h2>
          </div>
          <ContactGuarantees />
        </section>

        {/* 7. FAQ Accordion */}
        <section className="container" style={{ marginBottom: 48, maxWidth: 640 }}>
          <div className="section-header" style={{ textAlign: 'center' }}>
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item${isOpen ? ' open' : ''}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="faq-question"
                  >
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

        {/* 8. Footer Disclaimer */}
        <footer className="container" style={{
          textAlign: 'center',
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          maxWidth: 640,
        }}>
          <p className="muted" style={{ fontSize: 11 }}>
            {GUARDRAIL}
          </p>
        </footer>
      </div>

      {/* 9. Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
