'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KeyView } from '@/lib/keys';
import type { UsageSummary } from '@/lib/usage';
import { PLANS, PLAN_IDS, type PlanId, type SubscriptionStatus } from '@/lib/plans';

type Props = {
  email: string;
  plan: PlanId;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  billingConfigured: boolean;
  keys: KeyView[];
  usage: UsageSummary;
};

function UsageGraph({ usage }: { usage: UsageSummary }) {
  const max = Math.max(1, ...usage.days.map((day) => day.total));
  const width = 720;
  const height = 180;
  const gap = 2;
  const barWidth = Math.max(2, width / usage.days.length - gap);

  return (
    <svg
      className="usage-graph"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Validation calls per day for the last ${usage.days.length} days`}
    >
      {usage.days.map((day, index) => {
        const x = index * (barWidth + gap);
        const scale = (value: number) => (value / max) * (height - 20);
        const segments = [
          { key: 'valid', height: scale(day.valid), fill: 'var(--accent)' },
          { key: 'invalid', height: scale(day.invalid), fill: 'var(--warn)' },
          { key: 'error', height: scale(day.error), fill: '#f87171' },
        ];
        let y = height - 20;

        return (
          <g key={day.date}>
            <title>{`${day.date}: ${day.total} calls (${day.valid} valid, ${day.invalid} invalid, ${day.error} error)`}</title>
            {segments.map((segment) => {
              y -= segment.height;
              return (
                <rect
                  key={segment.key}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={segment.height}
                  fill={segment.fill}
                />
              );
            })}
          </g>
        );
      })}
      <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="var(--border)" />
    </svg>
  );
}

export function DashboardClient(props: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyView[]>(props.keys);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || !data.ok) throw new Error(String(data.error ?? 'Request failed.'));
    return data;
  }

  async function createKey() {
    setBusy('create');
    setError(null);
    try {
      const data = await post('/api/keys', { name: keyName || 'API key' });
      setFreshKey(String(data.apiKey));
      setKeys([data.key as KeyView, ...keys]);
      setKeyName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(id: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not revoke the key.');
      setKeys(keys.map((key) => (
        key.id === id ? { ...key, active: false, revokedAt: new Date().toISOString() } : key
      )));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function subscribe(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      if (props.hasSubscription && plan !== 'trial') {
        await post('/api/billing/change-plan', { plan, proration: 'prorated_immediately' });
        router.refresh();
      } else {
        const data = await post('/api/billing/checkout', { plan });
        window.location.href = String(data.checkoutUrl);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy('portal');
    setError(null);
    try {
      const data = await post('/api/billing/portal');
      window.location.href = String(data.portalUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('cancel');
    setError(null);
    try {
      await post('/api/billing/cancel');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function recover() {
    setBusy('recover');
    setError(null);
    try {
      const data = await post('/api/billing/recover');
      if (data.paymentLink) window.location.href = String(data.paymentLink);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const { usage } = props;
  const quotaPct = Math.min(100, Math.round((usage.quota.used / usage.quota.monthlyQuota) * 100));

  return (
    <div className="section">
      <div className="container">
        <div className="dash-head">
          <div>
            <h1>Dashboard</h1>
            <p className="muted">{props.email}</p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>

        {error ? <p className="form-msg err" style={{ marginBottom: 16 }}>{error}</p> : null}

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Plan</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--ink)' }}>{props.planName}</strong> — status:{' '}
            <span className={`pill pill-${props.subscriptionStatus}`}>{props.subscriptionStatus}</span>
            {props.cancelAtPeriodEnd ? ' (cancels at period end)' : null}
            {props.currentPeriodEnd
              ? ` · renews ${new Date(props.currentPeriodEnd).toISOString().slice(0, 10)}`
              : null}
          </p>

          {props.subscriptionStatus === 'on_hold' ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Payment failed — your subscription is on hold.</strong>
              <p style={{ marginTop: 4 }}>
                Your limits have dropped to the trial tier until a working payment method is on file.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={recover}
                disabled={busy === 'recover'}
                style={{ marginTop: 8 }}
              >
                Update payment method
              </button>
            </div>
          ) : null}

          {!props.billingConfigured ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Paid checkout is not configured on this deployment.</strong>
              <p style={{ marginTop: 4 }}>
                Subscriptions use Dodo Payments. Set <code>DODO_PAYMENTS_API_KEY</code> and the
                Dodo product IDs in Railway to enable hosted checkout.
              </p>
            </div>
          ) : null}

          <div className="grid grid-3">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const current = props.plan === id;
              const paidCheckoutUnavailable = id !== 'trial' && !props.billingConfigured && !props.hasSubscription;
              return (
                <div key={id} className={`card${current ? ' highlight' : ''}`}>
                  <h3 style={{ marginBottom: 8 }}>{plan.name}</h3>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>{plan.priceLabel}</strong>{' '}
                    <span className="muted">{plan.cadence}</span>
                  </div>
                  <ul className="clean" style={{ marginBottom: 12 }}>
                    <li>{plan.monthlyQuota.toLocaleString()} validations / month</li>
                    <li>{plan.rateLimitPerMinute} requests / minute</li>
                  </ul>
                  <p className="muted" style={{ marginBottom: 12 }}>{plan.blurb}</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      current ||
                      busy === id ||
                      (id === 'trial' && props.hasSubscription) ||
                      paidCheckoutUnavailable
                    }
                    onClick={() => subscribe(id)}
                  >
                    {current
                      ? 'Current plan'
                      : paidCheckoutUnavailable
                        ? 'Paid checkout coming soon'
                        : props.hasSubscription && id !== 'trial'
                          ? `Switch to ${plan.name}`
                          : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {props.hasSubscription ? (
            <div className="cta-row">
              <button type="button" className="btn" onClick={openPortal} disabled={busy === 'portal'}>
                Billing portal + invoices
              </button>
              {!props.cancelAtPeriodEnd ? (
                <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy === 'cancel'}>
                  Cancel subscription
                </button>
              ) : null}
            </div>
          ) : null}
          <p className="muted" style={{ marginTop: 12 }}>
            Paid subscriptions are processed by Dodo Payments, our merchant of record.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Usage</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            Metered from every API call. Last 30 days: <strong>{usage.totals.last30Days.toLocaleString()}</strong>{' '}
            calls · today: <strong>{usage.totals.today.toLocaleString()}</strong> · all time:{' '}
            <strong>{usage.totals.allTime.toLocaleString()}</strong>
          </p>
          <UsageGraph usage={usage} />
          <p className="muted" style={{ marginBottom: 8 }}>
            <span className="swatch swatch-valid" /> valid{' '}
            <span className="swatch swatch-invalid" /> invalid{' '}
            <span className="swatch swatch-error" /> error
          </p>
          <div>
            <div className="quota-bar">
              <span style={{ width: `${quotaPct}%` }} />
            </div>
            <p className="muted" style={{ marginTop: 4 }}>
              {usage.quota.used.toLocaleString()} of {usage.quota.monthlyQuota.toLocaleString()}{' '}
              included validations used ({quotaPct}%).
              {usage.quota.overage > 0
                ? ` ${usage.quota.overage.toLocaleString()} over plan — upgrade to stop hitting 429s.`
                : ` ${usage.quota.remaining.toLocaleString()} remaining.`}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>API keys</h2>
          {freshKey ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Copy this key now — it is shown exactly once.</strong>
              <pre className="keybox">{freshKey}</pre>
              <button type="button" className="btn" onClick={() => setFreshKey(null)}>
                I have copied it
              </button>
            </div>
          ) : null}

          <div className="cta-row" style={{ marginBottom: 16 }}>
            <input
              aria-label="Key name"
              placeholder="Key name (e.g. CI pipeline)"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              style={{
                padding: '10px 14px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                outline: 'none',
                flex: 1,
                minWidth: 180,
              }}
            />
            <button type="button" className="btn btn-primary" onClick={createKey} disabled={busy === 'create'}>
              Create key
            </button>
          </div>

          <table className="keys">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Created</th>
                <th>Last used</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td><code>{key.prefix}…</code></td>
                  <td>{key.createdAt.slice(0, 10)}</td>
                  <td>{key.lastUsedAt ? key.lastUsedAt.slice(0, 10) : '—'}</td>
                  <td>
                    <span className={`pill pill-${key.active ? 'active' : 'cancelled'}`}>
                      {key.active ? 'active' : 'revoked'}
                    </span>
                  </td>
                  <td>
                    {key.active ? (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => revokeKey(key.id)}
                        disabled={busy === key.id}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
