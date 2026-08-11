import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (...parts: string[]) => readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

describe('dedicated validator page boundaries', () => {
  it('uses the shared single-document workspace and keeps batch isolated', () => {
    const invoiceValidator = source('components', 'InvoiceValidator.tsx');
    const batchValidator = source('components', 'BatchValidator.tsx');

    expect(invoiceValidator).toContain('ValidatorWorkspace context="tool"');
    expect(invoiceValidator).toContain('validator-station__canvas');
    expect(invoiceValidator).not.toContain('fetch(');
    expect(batchValidator).toContain('/api/tools/validate/batch');
    expect(batchValidator).not.toMatch(/['\"]\/api\/tools\/validate['\"]/);
    expect(batchValidator).toContain('Paste 2–50 invoices separated by a line containing ---.');
    expect(batchValidator).toContain('Batch results — ${results.length} invoices');
    expect(batchValidator).toContain('${passCount} pass preflight · ${failCount} fail preflight');
    expect(batchValidator).not.toMatch(/[\u00e2\u00c2\u00c3\ufffd]/);
  });

  it('presents the validator as a working station rather than an article wrapper', () => {
    const route = source('app', 'tools', '[slug]', 'page.tsx');

    expect(route).toContain('Validator Station');
    expect(route).toContain('One invoice in. The exact failure path out.');
    expect(route).toContain('Run the file here. Keep the finding, rule and fix in one place while you work.');
    expect(route).toContain('validator-station-page');
    expect(route).not.toContain('E-invoicing in the UAE breaks at the file, not at the filing.');
  });

  it('uses approved scope, usage-metering, and rate-limit language without rejection or launch copy', () => {
    const route = source('app', 'tools', '[slug]', 'page.tsx');

    expect(route).toContain('usage is metered per key and per-minute rate limits apply');
    expect(route).toContain('<ScopePanel />');
    expect(route).not.toContain('would get it rejected');
    expect(route).not.toContain('Would be rejected');
    expect(route).not.toContain('no 20-per-hour browser cap');
    expect(route).not.toContain('Want the error list emailed, plus launch access?');
  });

  it('removes the retired homepage hero validator', () => {
    expect(existsSync(path.join(process.cwd(), 'src', 'components', 'HeroValidator.tsx'))).toBe(false);
  });
});
