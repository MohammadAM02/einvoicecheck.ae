// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => vi.fn(({ context }: { context?: string }) =>
  h('div', { 'data-testid': 'validator-workspace', 'data-context': context }, 'Validate an invoice'),
));

vi.mock('@/components/validation/ValidatorWorkspace', () => ({ ValidatorWorkspace: workspace }));

import HomeClient from '@/components/HomeClient';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHomepage() {
  return render(h(HomeClient));
}

describe('Homepage', () => {
  it('leads with ERP preflight positioning and mounts the homepage workspace', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { level: 1, name: 'Check your UAE e-invoice before your ASP does' })).toBeTruthy();
    expect(screen.getByText('Your ERP creates the invoice. We check whether it will pass.')).toBeTruthy();
    expect(screen.getByText('Upload a PINT-AE XML file and find validation, mapping and data errors before they cause a rejection.')).toBeTruthy();
    expect(screen.getByText('Validate an invoice')).toBeTruthy();
    expect(screen.getByTestId('validator-workspace').getAttribute('data-context')).toBe('homepage');
  });

  it('places the product explanation in the required conversion order', () => {
    const { container } = renderHomepage();
    const sections = [
      container.querySelector('#validate'),
      container.querySelector('#trust'),
      container.querySelector('#audience'),
      container.querySelector('#example'),
      container.querySelector('#api'),
      container.querySelector('#scope'),
      container.querySelector('#faq'),
      container.querySelector('#footer'),
    ];

    expect(sections.every(Boolean)).toBe(true);
    for (let index = 1; index < sections.length; index += 1) {
      expect(sections[index - 1]!.compareDocumentPosition(sections[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('states the trust facts without unsupported operational claims', () => {
    renderHomepage();

    for (const item of [
      'PINT-AE XML + canonical JSON',
      'No signup required',
      'Invoice content not persisted by the app',
      'Independent preflight, not an ASP',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.queryByText(/99\.7%|Sub-50ms|SHA-256 Key Security/)).toBeNull();
  });

  it('shows its audiences, representative repair list, conversion paths, and scope', () => {
    renderHomepage();

    expect(screen.getByRole('heading', { name: 'When an ERP-generated invoice fails' })).toBeTruthy();
    expect(screen.getByText('Built for ERP vendors, implementation partners, finance teams, developers and consultants.')).toBeTruthy();
    for (const item of ['ERP export', 'Preflight validation', 'ASP submission']) expect(screen.getByText(item)).toBeTruthy();
    for (const problem of ['Rejected files', 'Broken XML mappings', 'Incorrect invoice data', 'ERP configuration problems', 'Unclear validation errors']) {
      expect(screen.getByRole('heading', { name: problem })).toBeTruthy();
    }

    expect(screen.getByText('Example result from an ERP-generated invoice.')).toBeTruthy();
    expect(screen.getByText('Buyer TRN is not a valid 15-digit UAE TRN.')).toBeTruthy();
    expect(screen.getByText('Fix: Use exactly 15 numeric digits.')).toBeTruthy();
    expect(screen.getByText('Amount due does not reconcile with the tax-inclusive total.')).toBeTruthy();
    expect(screen.getByText('Fix: Set Amount due to the reconciled total.')).toBeTruthy();
    expect(screen.getAllByText('Technical details')).toHaveLength(2);
    expect(screen.getByText('/customer/trn')).toBeTruthy();
    expect(screen.getByText('ENG-TRN-04/BT-48')).toBeTruthy();
    expect(screen.getByText('/totals/payableAmount')).toBeTruthy();
    expect(screen.getByText('ENG-TOT-16/IBR-CO-16')).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Free validator' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Validation API' })).toBeTruthy();
    for (const feature of [
      'Test or troubleshoot one file',
      'No account required',
      'Manual upload or paste',
      'Same validation engine and error format',
      'Check ERP exports automatically',
      'Use inside ERP, testing and implementation workflows',
      'Validate invoices at scale',
      'Machine-readable results',
    ]) expect(screen.getByText(feature)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Need validation inside your ERP or workflow?' })).toBeTruthy();
    expect(screen.getByText('Use the API to check invoices automatically before submission.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Automate validation with the API' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'View pricing' }).getAttribute('href')).toBe('/pricing');
    expect(screen.getByText('Currently included')).toBeTruthy();
    expect(screen.getByText('Current limitations')).toBeTruthy();
    expect(screen.queryByText('Not currently included')).toBeNull();
    for (const item of [
      'Invoice type/required terms',
      'Supplier/buyer UAE TRN format',
      'Currency/code-list membership',
      'VAT category/rate consistency',
      'Line arithmetic/tax breakdown/totals/payable reconciliation',
      'Complete official XSD/Schematron conformity',
      'FTA registration lookup',
      'Legal transmission/filing',
      'Statutory archival',
      'Guaranteed ASP/authority acceptance',
    ]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText('Preflight only. Your accredited provider still handles legal transmission.')).toBeTruthy();
    for (const [name, href] of [
      ['Privacy', '/legal/privacy'],
      ['Terms', '/legal/terms'],
      ['Refunds', '/legal/refunds'],
      ['Contact', '/contact'],
      ['Documentation', '/docs'],
    ]) expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  });

  it('answers the approved FAQ and removes the retired signup and pricing claims', () => {
    renderHomepage();

    for (const question of [
      'Is einvoicecheck.ae an FTA-accredited service provider?',
      'What does a preflight pass mean?',
      'Are invoice payloads stored?',
      'What formats are supported?',
      'What is the free-tool limit?',
      'Does the API check more rules than the free validator?',
    ]) expect(screen.getByText(question)).toBeTruthy();
    expect(screen.queryByText(/Most Popular|\$29|\$99|Try the Validator|Would be rejected/)).toBeNull();
  });

  it('has no serious or critical accessibility violations', async () => {
    const { container } = renderHomepage();
    // jsdom lacks canvas; browser QA covers color contrast with a real renderer.
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
