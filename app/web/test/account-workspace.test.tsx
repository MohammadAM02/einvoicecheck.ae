// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardClient } from '@/components/DashboardClient';
import type { KeyView } from '@/lib/keys';
import type { UsageSummary } from '@/lib/usage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(() => cleanup());

const keys: KeyView[] = [{
  id: 'key-1',
  name: 'Default key',
  prefix: 'pdk_live_abc',
  active: true,
  createdAt: '2026-08-09T00:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
}];

const usage: UsageSummary = {
  days: Array.from({ length: 30 }, (_, index) => ({ date: `2026-07-${String(index + 1).padStart(2, '0')}`, valid: index === 29 ? 2 : 0, invalid: 0, error: 0, total: index === 29 ? 2 : 0 })),
  totals: { today: 2, last30Days: 2, allTime: 2 },
  outcomes: { valid: 2, invalid: 0, error: 0 },
  recent: [{ endpoint: '/v2/validate', method: 'POST', outcome: 'valid', statusCode: 200, timestamp: '2026-08-09T00:00:00.000Z' }],
  quota: { plan: 'trial', monthlyQuota: 100, used: 2, remaining: 98, overage: 0 },
};

function renderDashboard() {
  return render(<DashboardClient
    email="operator@example.com"
    plan="trial"
    planName="Free trial"
    subscriptionStatus="none"
    currentPeriodEnd={null}
    hasSubscription={false}
    billingConfigured={false}
    keys={keys}
    usage={usage}
  />);
}

describe('signed-in application workspace', () => {
  it('renders the account shell and real navigation sections', () => {
    renderDashboard();

    expect(screen.getByRole('complementary', { name: 'Account navigation' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Overview', level: 1 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'API Quickstart' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBe('location');
    expect(screen.getAllByText('/v2/validate').length).toBeGreaterThan(0);
  });

  it('switches format and language tabs without exposing the legacy beginner endpoint', () => {
    renderDashboard();

    expect(screen.getByRole('tab', { name: 'XML' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('application/xml')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Node.js' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Python' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Canonical JSON' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Python' }));

    expect(screen.getByText('/v1/preflight')).toBeTruthy();
    expect(screen.getByText('application/json')).toBeTruthy();
    expect(screen.getByText(/requests.post/)).toBeTruthy();
    expect(screen.queryByText(/\/v1\/validate/)).toBeNull();
  });

  it('opens truthful response inspection for both current contracts', () => {
    renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /Inspect response/ }));
    expect(screen.getByText('Layered XML result')).toBeTruthy();
    expect(screen.getByText(/"validationScope": "pint-ae-ubl-xml"/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Canonical JSON' }));
    expect(screen.getByText('Canonical JSON preflight result')).toBeTruthy();
    expect(screen.getByText(/"validationScope": "canonical-json-data-preflight"/)).toBeTruthy();
    expect(screen.queryByText(/27 of 100|73 remaining|Manage account/)).toBeNull();
    expect(screen.queryByText('pdk_live_abc123456789')).toBeNull();
  });

  it('tracks the selected anchor and closes overlays with Escape while restoring focus', async () => {
    renderDashboard();

    const quickstart = screen.getByRole('link', { name: 'API Quickstart' });
    fireEvent.click(quickstart);
    await waitFor(() => expect(quickstart.getAttribute('aria-current')).toBe('location'));
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('aria-current')).toBeNull();

    const drawerButton = screen.getByRole('button', { name: 'Open account navigation' });
    fireEvent.click(drawerButton);
    expect(drawerButton.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(drawerButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(drawerButton);

    const identity = screen.getByRole('button', { name: /operator@example\.com.*Free trial/ });
    fireEvent.click(identity);
    expect(screen.getByRole('menu', { name: 'Account menu' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Account menu' })).toBeNull();
    expect(document.activeElement).toBe(identity);
  });
});
