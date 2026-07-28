'use client';

import { GUARDRAIL } from '@/lib/site';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';
import { ValidationIssue } from './validation/ValidationIssue';
import { FreeVsApi } from './FreeVsApi';
import { ScopePanel } from './ScopePanel';
import { TrustStrip } from './TrustStrip';

const FLOW_STEPS = [
  { title: 'ERP export', detail: 'Invoice created', icon: 'document' },
  { title: 'Preflight check', detail: 'Errors explained', icon: 'check' },
  { title: 'ASP submission', detail: 'Ready to send', icon: 'send' },
] as const;

const FAILURE_MODES = [
  { title: 'Rejected invoice', description: 'See exactly what failed.', icon: 'alert' },
  { title: 'Broken ERP mapping', description: 'Trace the error back to the export.', icon: 'mapping' },
  { title: 'Wrong invoice data', description: 'Fix TRN, VAT and totals issues.', icon: 'data' },
] as const;

const EXAMPLE_ISSUE = {
  path: '/customer/trn',
  rule: 'ENG-TRN-04/BT-48',
  severity: 'error' as const,
  message: 'Buyer TRN is not a valid 15-digit UAE TRN.',
  fix: 'Use exactly 15 numeric digits.',
};

const FAQS = [
  ['Are you an accredited ASP?', 'No. einvoicecheck.ae is an independent preflight tool and does not transmit legal e-invoices.'],
  ['What does “preflight passed” mean?', 'The checks currently included found no blocking issue. It does not guarantee ASP or authority acceptance.'],
  ['Is my invoice stored?', 'Submitted content is validated in memory and is not persisted by the application, database or rate-limit store.'],
  ['Which formats can I upload?', 'UBL/PINT-AE XML and this product’s canonical JSON input.'],
  ['What is the free limit?', 'The free validator allows 20 validations per hour per IP address.'],
] as const;

type IconName = typeof FLOW_STEPS[number]['icon'] | typeof FAILURE_MODES[number]['icon'];

function ProductIcon({ name }: { name: IconName }) {
  if (name === 'document') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /></svg>;
  }
  if (name === 'check') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>;
  }
  if (name === 'send') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 17-8-7 18-2-7z" /><path d="m11 14 9-11" /></svg>;
  }
  if (name === 'alert') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5M12 17.5v.5" /></svg>;
  }
  if (name === 'mapping') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="6" height="6" rx="1" /><rect x="15" y="14" width="6" height="6" rx="1" /><path d="M9 7h3a4 4 0 0 1 4 4v3" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /><path d="m15 16 2 2 3-4" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

export default function HomeClient() {
  return (
    <main className="main-content">
      <section className="compliance-hero" id="validate">
        <div className="container">
          <div className="hero-intro">
            <h1>Check your UAE e-invoice before your ASP does</h1>
            <p className="hero-promise">Your ERP creates the invoice. We check whether it will pass.</p>
            <p className="hero-copy">Upload PINT-AE XML or canonical JSON. Get the exact field and fix.</p>
          </div>
          <ValidatorWorkspace context="homepage" />
        </div>
      </section>

      <TrustStrip />

      <section id="audience" className="problem-section">
        <div className="container visual-story">
          <header className="section-intro section-intro--inverse">
            <h2 className="section-title">See where the invoice breaks.</h2>
            <p>One quick check between your ERP and ASP.</p>
          </header>

          <ol className="process-flow" aria-label="Invoice validation process">
            {FLOW_STEPS.map((step, index) => (
              <li className="process-step" key={step.title}>
                <span className="process-step__icon"><ProductIcon name={step.icon} /></span>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
                {index < FLOW_STEPS.length - 1 ? <span className="process-connector"><ArrowIcon /></span> : null}
              </li>
            ))}
          </ol>

          <div className="failure-cards">
            {FAILURE_MODES.map((item) => (
              <article className="failure-card" key={item.title}>
                <span className="failure-card__icon"><ProductIcon name={item.icon} /></span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="example" className="container example-section">
        <div className="section-header">
          <h2 className="section-title">One error. One clear fix.</h2>
          <p className="muted">No XML archaeology required.</p>
        </div>
        <div className="validation-issue-list example-result">
          <ValidationIssue issue={EXAMPLE_ISSUE} />
        </div>
      </section>

      <FreeVsApi />
      <ScopePanel />

      <section id="faq" className="container faq-section">
        <div className="section-header">
          <h2 className="section-title">Quick answers</h2>
        </div>
        <div className="faq-list">
          {FAQS.map(([question, answer]) => (
            <details key={question} className="faq-item">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer id="footer" className="container site-footer">
        <p className="muted">{GUARDRAIL}</p>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/terms">Terms</a>
          <a href="/legal/refunds">Refunds</a>
          <a href="/contact">Contact</a>
          <a href="/docs">Documentation</a>
        </nav>
      </footer>
    </main>
  );
}
