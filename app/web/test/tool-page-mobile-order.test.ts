import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (...parts: string[]) => readFileSync(path.join(process.cwd(), 'src', ...parts), 'utf8');

describe('Dedicated validator mobile reading order', () => {
  it('places the upload workspace before the supporting context', () => {
    const route = source('app', 'tools', '[slug]', 'page.tsx');
    const workspacePosition = route.indexOf('<InvoiceValidator />');
    const supportingContextPosition = route.indexOf('validator-api-continuation');

    expect(workspacePosition).toBeGreaterThan(-1);
    expect(supportingContextPosition).toBeGreaterThan(-1);
    expect(workspacePosition).toBeLessThan(supportingContextPosition);
  });
});
