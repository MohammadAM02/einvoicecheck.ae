'use client';

import { createElement as h } from 'react';
import { GUARDRAIL } from '@/lib/site';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';
import { ValidationIssue } from './validation/ValidationIssue';
import { FreeVsApi } from './FreeVsApi';
import { ScopePanel } from './ScopePanel';
import { TrustStrip } from './TrustStrip';

const FAILURE_MODES = [
  ['Rejected files', 'Turn a rejection into a specific list of invoice fields and rules to investigate.'],
  ['Broken XML mappings', 'Trace missing or malformed PINT-AE values back to the ERP export.'],
  ['Incorrect invoice data', 'Catch TRN, VAT, currency and totals problems before another submission.'],
  ['ERP configuration problems', 'Separate setup issues from one-off invoice data mistakes during implementation.'],
  ['Unclear validation errors', 'Give finance and technical teams a readable repair list they can work through together.'],
] as const;
const PREFLIGHT_STEPS = ['ERP export', 'Preflight validation', 'ASP submission'] as const;
const EXAMPLE_ISSUES = [
  { path: '/customer/trn', rule: 'ENG-TRN-04/BT-48', severity: 'error' as const, message: 'Buyer TRN is not a valid 15-digit UAE TRN.', fix: 'Use exactly 15 numeric digits.' },
  { path: '/totals/payableAmount', rule: 'ENG-TOT-16/IBR-CO-16', severity: 'error' as const, message: 'Amount due does not reconcile with the tax-inclusive total.', fix: 'Set Amount due to the reconciled total.' },
];
const FAQS = [
  ['Is einvoicecheck.ae an FTA-accredited service provider?', 'No. It is an independent preflight tool, not an FTA-accredited service provider, and it does not transmit legal e-invoices.'],
  ['What does a preflight pass mean?', 'It means the checks currently included did not find a blocking issue. It is not a guarantee of ASP or authority acceptance.'],
  ['Are invoice payloads stored?', 'The application validates submitted invoice content in memory and does not persist it in its database or rate-limit store. Railway, proxy and observability logging are governed separately.'],
  ['What formats are supported?', 'The free validator accepts UBL/PINT-AE XML and this product\'s canonical JSON input. You can upload or paste either.'],
  ['What is the free-tool limit?', 'The free validator allows 20 validations per hour per IP address.'],
  ['Does the API check more rules than the free validator?', 'No. Both use the same engine and error format; the API is for automated, machine-readable workflows.'],
] as const;

export default function HomeClient() {
  return h('main', { className: 'main-content' },
    h('section', { className: 'compliance-hero', id: 'validate' },
      h('div', { className: 'container' },
        h('div', { className: 'hero-intro' },
          h('h1', null, 'Check your UAE e-invoice before your ASP does'),
          h('p', { className: 'hero-promise' }, 'Your ERP creates the invoice. We check whether it will pass.'),
          h('p', { className: 'hero-copy' }, 'Upload a PINT-AE XML file and find validation, mapping and data errors before they cause a rejection.'),
        ),
        h(ValidatorWorkspace, { context: 'homepage' }),
      ),
    ),
    h(TrustStrip),
    h('section', { id: 'audience', className: 'problem-section' },
      h('div', { className: 'container problem-section__layout' },
        h('div', { className: 'problem-section__intro' },
          h('h2', { className: 'section-title' }, 'When an ERP-generated invoice fails'),
          h('p', null, 'Built for ERP vendors, implementation partners, finance teams, developers and consultants.'),
          h('ol', { className: 'preflight-path', 'aria-label': 'Invoice preflight path' }, PREFLIGHT_STEPS.map((step) =>
            h('li', { key: step }, step))),
        ),
        h('div', { className: 'failure-list' }, FAILURE_MODES.map(([title, description]) =>
          h('article', { key: title, className: 'failure-item' }, h('h3', null, title), h('p', null, description)))),
      ),
    ),
    h('section', { id: 'example', className: 'container' },
      h('div', { className: 'section-header' },
        h('h2', { className: 'section-title' }, 'Find the cause, then fix the invoice.'),
        h('p', { className: 'muted' }, 'Example result from an ERP-generated invoice.'),
      ),
      h('div', { className: 'validation-issue-list' }, EXAMPLE_ISSUES.map((issue) => h(ValidationIssue, { key: issue.rule, issue }))),
    ),
    h(FreeVsApi),
    h(ScopePanel),
    h('section', { id: 'faq', className: 'container' },
      h('div', { className: 'section-header' }, h('h2', { className: 'section-title' }, 'Frequently asked questions')),
      h('div', { className: 'faq-list' }, FAQS.map(([question, answer]) =>
        h('details', { key: question, className: 'faq-item' }, h('summary', null, question), h('p', null, answer)))),
    ),
    h('footer', { id: 'footer', className: 'container site-footer' },
      h('p', { className: 'muted' }, GUARDRAIL),
      h('nav', { className: 'footer-links', 'aria-label': 'Footer navigation' },
        h('a', { href: '/legal/privacy' }, 'Privacy'),
        h('a', { href: '/legal/terms' }, 'Terms'),
        h('a', { href: '/legal/refunds' }, 'Refunds'),
        h('a', { href: '/contact' }, 'Contact'),
        h('a', { href: '/docs' }, 'Documentation'),
      ),
    ),
  );
}
