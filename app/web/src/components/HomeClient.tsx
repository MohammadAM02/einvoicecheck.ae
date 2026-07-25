'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Building2, Code2, ShieldCheck } from 'lucide-react';
import { PLANS } from '@/lib/plans';
import { GUARDRAIL } from '@/lib/site';
import HeroValidator from './HeroValidator';
import WorkflowTerminal from './WorkflowTerminal';
import ContactGuarantees from './ContactGuarantees';
import AuthModal from './AuthModal';

const WHO_ITS_FOR = [
  {
    icon: Code2,
    title: 'SaaS & ERP Vendors',
    description:
      'Embed preflight UBL 2.1 and PINT AE validation directly into your billing pipeline before transmitting to ASPs.',
  },
  {
    icon: Building2,
    title: 'Enterprise Accounting Teams',
    description:
      'Catch TRN formatting errors, tax breakdown discrepancies, and arithmetic mismatches in high-volume batch runs.',
  },
  {
    icon: ShieldCheck,
    title: 'Tax Consultants & Auditors',
    description:
      'Provide clients with deterministic preflight verification reports before official FTA submission windows close.',
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

export function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  const triggerAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <div className="space-y-24 py-6">
      {/* 1. Hero Validator */}
      <section className="container mx-auto px-4">
        <HeroValidator onOpenAuth={() => triggerAuth('signup')} />
      </section>

      {/* 2. Workflow Terminal */}
      <section className="container mx-auto px-4">
        <WorkflowTerminal />
      </section>

      {/* 3. Who It's For */}
      <section className="container mx-auto px-4">
        <div className="section-header">
          <div className="section-label">Who it's for</div>
          <h2 className="section-title">Built for the people who own invoice quality</h2>
          <p className="section-subtitle">
            Preflight validation belongs where invoices are created and exported, not at the last mile.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 mt-10">
          {WHO_ITS_FOR.map((item) => (
            <div key={item.title} className="card p-6">
              <div className="icon-box">
                <item.icon size={24} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Social Proof / Metrics */}
      <section className="border-y border-slate-800 bg-slate-900/40 py-12">
        <div className="container mx-auto px-4 grid gap-6 lg:grid-cols-3">
          <div className="card p-6">
            <div className="label">Live uptime</div>
            <p className="text-3xl font-semibold">99.95%</p>
            <p className="text-sm text-slate-400">Production API uptime target for validation traffic.</p>
          </div>
          <div className="card p-6">
            <div className="label">Monthly validations</div>
            <p className="text-3xl font-semibold">15,000+</p>
            <p className="text-sm text-slate-400">Validation volume supported by the Starter and Pro plans.</p>
          </div>
          <div className="card p-6">
            <div className="label">Error reduction</div>
            <p className="text-3xl font-semibold">40%</p>
            <p className="text-sm text-slate-400">Typical reduction in returned invoice rework for early adopters.</p>
          </div>
        </div>
      </section>

      {/* 5. Pricing Grid */}
      <section className="container mx-auto px-4" id="pricing">
        <div className="section-header">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">Transparent plans without a quote request</h2>
          <p className="section-subtitle">
            Free trial, Starter and Pro. All plans include the same deterministic validation engine.
          </p>
        </div>
        <div className="pricing-grid mt-10">
          {[PLANS.trial, PLANS.starter, PLANS.pro].map((plan) => (
            <div key={plan.id} className={`pricing-card${plan.id === 'starter' ? ' featured' : ''}`}>
              {plan.id === 'starter' && <div className="pricing-badge">Most popular</div>}
              <h3>{plan.name}</h3>
              <div className="pricing-price">{plan.priceLabel}</div>
              <div className="pricing-period">{plan.cadence}</div>
              <div className="pricing-usage">{plan.monthlyQuota} validations</div>
              <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 'var(--space-lg)' }}>
                {plan.blurb}
              </p>
              <ul className="pricing-features">
                <li>POST /v1/validate</li>
                <li>GET /usage for metering</li>
                <li>{plan.rateLimitPerMinute} requests per minute</li>
                {plan.id !== 'trial' && <li>Priority email support</li>}
              </ul>
              {plan.id === 'trial' ? (
                <button onClick={() => triggerAuth('signup')} className="btn btn-primary">
                  Start free trial →
                </button>
              ) : (
                <Link href="/pricing" className="btn btn-secondary">
                  See pricing →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Contact Guarantees */}
      <section className="container mx-auto px-4">
        <ContactGuarantees />
      </section>

      {/* 7. FAQ */}
      <section className="container mx-auto px-4 max-w-3xl">
        <div className="section-header">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Answers for the practical questions</h2>
          <p className="section-subtitle">
            Everything here is about validation, deployment, billing, and what the service does.
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {FAQS.map((faq, index) => (
            <div key={faq.q} className="card overflow-hidden">
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span>{faq.q}</span>
                <ChevronDown className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {openFaq === index ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="faq-answer"
                  >
                    <p>{faq.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Guardrail Disclaimer */}
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <p className="text-xs text-slate-500 border-t border-slate-800/80 pt-8">{GUARDRAIL}</p>
      </div>

      {/* 9. Auth Modal */}
      <AuthModal isOpen={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
