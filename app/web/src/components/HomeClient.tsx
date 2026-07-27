'use client';

import { createElement as h, useState } from 'react';
import { GUARDRAIL } from '@/lib/site';
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';
import { ValidationIssue } from './validation/ValidationIssue';
import { FreeVsApi } from './FreeVsApi';
import { ScopePanel } from './ScopePanel';
import { TrustStrip } from './TrustStrip';

const AUDIENCES = [
  ['Finance teams', 'Find invoice data and totals problems before handoff.'],
  ['ERP and software vendors', 'Test UAE invoice exports during development and CI.'],
  ['Integrators and consultants', 'Give clients a consistent, machine-readable repair list.'],
] as const;
const EXAMPLE_ISSUES = [
  { path: '/customer/trn', rule: 'ENG-TRN-04/BT-48', severity: 'error' as const, message: 'Buyer TRN is not a valid 15-digit UAE TRN.', fix: 'Use exactly 15 numeric digits.' },
  { path: '/totals/payableAmount', rule: 'ENG-TOT-16/IBR-CO-16', severity: 'error' as const, message: 'Amount due does not reconcile with the tax-inclusive total.', fix: 'Set Amount due to the reconciled total.' },
];
const FAQS = [
  ['Is einvoicecheck.ae an FTA-accredited service provider?', 'No. It is an independent preflight tool, not an FTA-accredited service provider, and it does not transmit legal e-invoices.'],
  ['What does a preflight pass mean?', 'It means the checks currently included did not find a blocking issue. It is not a guarantee of ASP or authority acceptance.'],
  ['Are invoice payloads stored?', 'No. Invoice payloads are processed in memory and are not stored.'],
  ['What formats are supported?', 'The free validator accepts XML and JSON invoice files, and you can paste XML or JSON directly.'],
  ['What is the free-tool limit?', 'The free validator allows 20 validations per hour per IP address.'],
  ['Does the API check more rules than the free validator?', 'No. Both use the same engine and error format; the API is for automated, machine-readable workflows.'],
] as const;

export default function HomeClient() {
  var _useState = useState(null),
    openIdx = _useState[0],
    setOpenIdx = _useState[1];
  var toggle = function (i) { return function () { return setOpenIdx(openIdx === i ? null : i); }; };
  return h('main', { className: 'main-content' },
    h('section', { className: 'compliance-hero', id: 'validate' },
      h('div', { className: 'container' },
        h('p', { className: 'section-label' }, 'Independent UAE e-invoice preflight'),
        h('h1', null, 'Check your UAE e-invoice before it reaches your ASP.'),
        h('p', { className: 'hero-copy' }, 'Upload XML or JSON and get a clear list of semantic, VAT, and arithmetic issues. Free, no signup, and invoice payloads are not stored.'),
        h(ValidatorWorkspace, { context: 'homepage' }),
      ),
    ),
    h(TrustStrip),
    h('section', { id: 'audience', className: 'container' },
      h('div', { className: 'section-header' }, h('h2', { className: 'section-title' }, 'Built for UAE invoice handoff')),
      h('div', { className: 'grid grid-3' }, AUDIENCES.map(function (_a) { var title = _a[0], description = _a[1]; return h('article', { key: title, className: 'card' }, h('h3', null, title), h('p', { className: 'muted' }, description)); })),
    ),
    h('section', { id: 'example', className: 'container' },
      h('div', { className: 'section-header' },
        h('h2', { className: 'section-title' }, 'See what needs fixing before handoff.'),
        h('p', { className: 'muted' }, 'Example only \u2014 not a live result.'),
      ),
      h('div', { className: 'validation-issue-list' }, EXAMPLE_ISSUES.map(function (issue) { return h(ValidationIssue, { key: issue.rule, issue: issue }); })),
    ),
    h(FreeVsApi),
    h(ScopePanel),
    h('section', { id: 'faq', className: 'container' },
      h('div', { className: 'section-header' }, h('h2', { className: 'section-title' }, 'Frequently asked questions')),
      h('div', { className: 'faq-list' }, FAQS.map(function (faq, i) {
        var isOpen = openIdx === i;
        return h('div', { key: faq[0], className: 'faq-item' + (isOpen ? ' open' : '') },
          h('button', {
            className: 'faq-question',
            onClick: toggle(i),
            'aria-expanded': isOpen,
            style: { animationDelay: (i * 0.06) + 's' },
          },
            h('span', null, faq[0]),
            h('span', { className: 'faq-icon', 'aria-hidden': 'true' },
              h('span', { className: 'icon-bar' }),
              h('span', { className: 'icon-bar icon-bar--v' }),
            ),
          ),
          h('div', { className: 'faq-answer' },
            h('div', { className: 'faq-answer-inner' }, faq[1]),
          ),
        );
      })),
    ),
    h('footer', { id: 'footer', className: 'container' }, h('p', { className: 'muted' }, GUARDRAIL)),
  );
}
