'use client';

import { GUARDRAIL } from '@/lib/site';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';
import { ValidationIssue } from './validation/ValidationIssue';
import { FreeVsApi } from './FreeVsApi';
import { ScopePanel } from './ScopePanel';
import { TrustStrip } from './TrustStrip';

const EXAMPLE_ISSUE = {
  path: '/customer/trn',
  rule: 'ENG-TRN-04/BT-48',
  severity: 'error' as const,
  message: 'Buyer TRN is not a valid 15-digit UAE TRN.',
  fix: 'Use exactly 15 numeric digits.',
  line: null,
  column: null,
  xmlPath: null,
};

const FAQS = [
  ['Are you an accredited ASP?', 'No. einvoicecheck.ae is an independent preflight tool and does not transmit legal e-invoices.'],
  ['What does “preflight passed” mean?', 'The checks currently included found no blocking issue. It does not guarantee ASP or authority acceptance.'],
  ['Is my invoice stored?', 'Submitted content is validated in memory and is not persisted by the application, database or rate-limit store.'],
  ['Which formats can I upload?', 'UBL / PINT-AE XML.'],
  ['What is the free limit?', 'The free validator allows 20 validations per hour per IP address.'],
] as const;

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /><path d="M10 12h5M10 16h4" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>;
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 17-8-7 18-2-7z" /><path d="m11 14 9-11" /></svg>;
}

function PreflightRoute() {
  return (
    <div className="preflight-story" role="group" aria-label="ERP to ASP preflight route">
      <div className="preflight-route">
        <article className="route-node route-node--source">
          <span className="route-node__icon"><DocumentIcon /></span>
          <span className="route-node__label">ERP output</span>
          <strong>Invoice created</strong>
        </article>

        <span className="route-line route-line--first" aria-hidden="true"><span className="route-document"><DocumentIcon /></span></span>

        <article className="route-node route-node--preflight">
          <span className="route-node__pulse" aria-hidden="true" />
          <span className="route-node__icon"><CheckIcon /></span>
          <span className="route-node__label">EInvoiceCheck</span>
          <strong>Preflight</strong>
        </article>

        <span className="route-line route-line--second" aria-hidden="true" />

        <article className="route-node route-node--destination">
          <span className="route-node__icon"><SendIcon /></span>
          <span className="route-node__label">Your ASP</span>
          <strong>Official exchange</strong>
        </article>
      </div>

      <div className="route-diagnostic" role="note" aria-label="Example preflight finding">
        <div className="route-diagnostic__status">
          <span className="route-diagnostic__dot" aria-hidden="true" />
          <strong>Buyer TRN failed</strong>
        </div>
        <code>BT-48 · 14 digits found</code>
        <p><span>Fix</span> Use the 15-digit UAE TRN.</p>
      </div>

      <div className="fault-axes" role="group" aria-label="Common failure boundaries">
        <span>Source data</span>
        <span>Mapping</span>
        <span>Final XML</span>
      </div>
    </div>
  );
}

export default function HomeClient() {
  return (
    <main className="main-content homepage-smoothing">
      <section className="compliance-hero" id="validate">
        <div className="container">
          <div className="hero-intro hero-intro--story">
            <h1>Your ERP can create the invoice. That doesn&apos;t mean the file is ready.</h1>
            <p className="hero-promise">Catch the broken field, mapping or total before it becomes an ASP rejection loop.</p>
            <p className="hero-copy">Drop in PINT-AE XML. EInvoiceCheck shows what failed, where it failed, and the smallest practical fix.</p>
            <div className="hero-signal" role="group" aria-label="Preflight value">
              <span>Field</span><span>Rule</span><span>Location</span><span>Fix</span>
            </div>
          </div>
          <ValidatorWorkspace context="homepage" />
        </div>
      </section>

      <TrustStrip />

      <section id="audience" className="problem-section">
        <div className="container visual-story visual-story--route">
          <header className="section-intro section-intro--inverse">
            <h2 className="section-title">Find the fault while it is still yours to fix.</h2>
            <p>Source data, ERP mapping and final XML are different failure points. Preflight gives you one place to isolate them before provider testing.</p>
          </header>
          <PreflightRoute />
        </div>
      </section>

      <section id="example" className="container example-section example-section--diagnostic">
        <div className="section-header">
          <h2 className="section-title">Don’t get an “invalid invoice.” Get the reason.</h2>
          <p className="muted">Rule. Location. Meaning. Fix. Enough information to move the invoice forward.</p>
          <ol className="result-anatomy" aria-label="What a useful finding contains">
            <li><span>01</span><strong>Rule</strong><small>Which condition failed</small></li>
            <li><span>02</span><strong>Location</strong><small>Where to look</small></li>
            <li><span>03</span><strong>Meaning</strong><small>What is wrong</small></li>
            <li><span>04</span><strong>Fix</strong><small>Smallest practical correction</small></li>
          </ol>
        </div>
        <div className="validation-issue-list example-result example-result--featured">
          <div className="example-result__rail" aria-hidden="true">LIVE FINDING</div>
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
          <a href="#validate" className="footer-return-link">Back to validator</a>
        </nav>
      </footer>
    </main>
  );
}
