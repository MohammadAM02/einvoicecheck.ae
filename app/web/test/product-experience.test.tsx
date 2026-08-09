// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NextActionPanel,
  ToolPageHeader,
  WorkflowStepper,
} from '@/components/ProductExperience';

afterEach(() => cleanup());

describe('product experience primitives', () => {
  it('renders one reusable tool heading and description contract', () => {
    render(h(ToolPageHeader, {
      eyebrow: 'Free tool · no signup',
      title: 'XML Generator',
      description: 'Create a supported XML draft, then validate it.',
    }));

    expect(screen.getByRole('heading', { level: 1, name: 'XML Generator' })).toBeTruthy();
    expect(screen.getByText('Free tool · no signup')).toBeTruthy();
    expect(screen.getByText('Create a supported XML draft, then validate it.')).toBeTruthy();
  });

  it('exposes workflow progress as an ordered list with a current step', () => {
    render(h(WorkflowStepper, {
      label: 'Generator progress',
      steps: [
        { label: 'Create', status: 'complete' },
        { label: 'Validate', status: 'current' },
        { label: 'Export', status: 'upcoming' },
      ],
    }));

    const list = screen.getByRole('list', { name: 'Generator progress' });
    expect(list.tagName).toBe('OL');
    expect(screen.getByText('Validate').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Create').closest('li')?.className).toContain('is-complete');
  });

  it('labels the next action as a region with one primary destination', () => {
    render(h(NextActionPanel, {
      title: 'Revalidate the repaired invoice',
      description: 'Run the output through the Validator.',
      children: h('button', { type: 'button' }, 'Validate repaired invoice'),
    }));

    expect(screen.getByRole('region', { name: 'Revalidate the repaired invoice' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Validate repaired invoice' })).toBeTruthy();
  });

  it('preserves primary and ghost action styles inside validation summaries', () => {
    const css = readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    expect(css).toMatch(/\.validation-summary button\.btn-primary\s*\{[^}]*background:\s*var\(--accent\)/s);
    expect(css).toMatch(/\.validation-summary button\.btn-ghost\s*\{[^}]*background:\s*transparent/s);
  });
});
