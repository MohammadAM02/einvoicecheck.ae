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
    <svg className="usage-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Validation calls per day">
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
            <title>{`${day.date}: ${day.total} calls`}</title>
            {segments.map((segment) => {
              y -= segment.height;
              return <rect key={segment.key} x={x} y={y} width={barWidth} height={segment.height} fill={segment.fill} />;
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
      body: body === undefined ? undefined : JSON.stringify(body),
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
      setKeys(keys.map((key) => key.id === id ? { ...key, active: false, revokedAt: new Date().toISOString() } : key));
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
      if (props.hasSubscription) {
        const data = await post('/api/billing/change-plan', { plan });
        if (data.approvalUrl) window.location.href = String(data.approvalUrl);
        else router.refresh();
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

  async function cancel() {
    if (!window.confirm('Cancel now? Your account will return to the free limits immediately.')) return;
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

  const { usage } = props;
  const quotaPct = Math.min(100, Math.round((usage.quota.used / usage.quota.monthlyQuota) * 100));

  return (
    <div className="section">
      <div className="container">
        <div className="dash-head">
          <div><h1>Dashboard</h1><p className="muted">{props.email}</p></div>
          <button className="btn btn-secondary" onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
          }}>Sign out</button>
        </div>

        {error ? <p className="form-msg err" style={{ marginBottom: 16 }}>{error}</p> : null}

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Plan</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--ink)' }}>{props.planName}</strong> — status:{' '}
            <span className={`pill pill-${props.subscriptionStatus}`}>{props.subscriptionStatus}</span>
            {props.currentPeriodEnd ? ` · next billing ${props.currentPeriodEnd.slice(0, 10)}` : null}
          </p>

          {props.subscriptionStatus === 'on_hold' ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>PayPal suspended the subscription after a payment problem.</strong>
              <p style={{ marginTop: 4 }}>Your API limits are back on the free tier. Update the automatic payment in PayPal, then contact support if it does not reactivate.</p>
              <a className="btn btn-primary" href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>Open PayPal payments</a>
            </div>
          ) : null}

          {!props.billingConfigured ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Paid checkout is not configured on this deployment.</strong>
              <p style={{ marginTop: 4 }}>Set the PayPal client credentials, webhook ID and both PayPal plan IDs in Railway.</p>
            </div>
          ) : null}

          <div className="grid grid-3">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              const current = props.plan === id;
              const unavailable = id !== 'trial' && !props.billingConfigured;
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
                    disabled={current || busy === id || id === 'trial' || unavailable}
                    onClick={() => subscribe(id)}
                  >
                    {current ? 'Current plan' : unavailable ? 'Paid checkout coming soon' : props.hasSubscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {props.hasSubscription ? (
            <div className="cta-row">
              <a className="btn" href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer">Manage payment in PayPal</a>
              <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy === 'cancel'}>Cancel subscription now</button>
            </div>
          ) : null}
          <p className="muted" style={{ marginTop: 12 }}>PayPal processes paid subscriptions. einvoicecheck.ae remains the service provider and seller.</p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Usage</h2>
          <p className="muted" style={{ marginBottom: 8 }}>
            Last 30 days: <strong>{usage.totals.last30Days.toLocaleString()}</strong> calls · today: <strong>{usage.totals.today.toLocaleString()}</strong> · all time: <strong>{usage.totals.allTime.toLocaleString()}</strong>
          </p>
          <UsageGraph usage={usage} />
          <p className="muted" style={{ marginBottom: 8 }}><span className="swatch swatch-valid" /> valid <span className="swatch swatch-invalid" /> invalid <span className="swatch swatch-error" /> error</p>
          <div className="quota-bar"><span style={{ width: `${quotaPct}%` }} /></div>
          <p className="muted" style={{ marginTop: 4 }}>
            {usage.quota.used.toLocaleString()} of {usage.quota.monthlyQuota.toLocaleString()} included validations used ({quotaPct}%).
            {usage.quota.overage > 0 ? ` ${usage.quota.overage.toLocaleString()} over plan — upgrade to stop hitting 429s.` : ` ${usage.quota.remaining.toLocaleString()} remaining.`}
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 12 }}>API keys</h2>
          {freshKey ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Copy this key now — it is shown exactly once.</strong>
              <pre className="keybox">{freshKey}</pre>
              <button type="button" className="btn" onClick={() => setFreshKey(null)}>I have copied it</button>
            </div>
          ) : null}

          <div className="cta-row" style={{ marginBottom: 16 }}>
            <input
              aria-label="Key name"
              placeholder="Key name (e.g. CI pipeline)"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              style={{ padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none', flex: 1, minWidth: 180 }}
            />
            <button type="button" className="btn btn-primary" onClick={createKey} disabled={busy === 'create'}>Create key</button>
          </div>

          <table className="keys">
            <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th>Status</th><th /></tr></thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td><code>{key.prefix}…</code></td>
                  <td>{key.createdAt.slice(0, 10)}</td>
                  <td>{key.lastUsedAt ? key.lastUsedAt.slice(0, 10) : '—'}</td>
                  <td><span className={`pill pill-${key.active ? 'active' : 'cancelled'}`}>{key.active ? 'active' : 'revoked'}</span></td>
                  <td>{key.active ? <button type="button" className="btn btn-danger" onClick={() => revokeKey(key.id)} disabled={busy === key.id}>Revoke</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
