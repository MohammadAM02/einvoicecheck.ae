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

/* --------------------------------------------------------- usage graph */
/** Bar chart over the Mongo UsageEvent metering series. No chart library. */
function UsageGraph({ usage }: { usage: UsageSummary }) {
  const max = Math.max(1, ...usage.days.map((d) => d.total));
  const w = 720;
  const h = 180;
  const gap = 2;
  const barW = Math.max(2, w / usage.days.length - gap);

  return (
    <svg
      className="usage-graph"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Validation calls per day for the last ${usage.days.length} days`}
    >
      {usage.days.map((d, i) => {
        const x = i * (barW + gap);
        const scale = (n: number) => (n / max) * (h - 20);
        const invalidH = scale(d.invalid);
        const errorH = scale(d.error);
        const validH = scale(d.valid);
        let y = h - 20;
        const rects = [
          { key: 'valid', height: validH, fill: 'var(--accent)' },
          { key: 'invalid', height: invalidH, fill: 'var(--warn)' },
          { key: 'error', height: errorH, fill: '#f87171' },
        ].map((seg) => {
          y -= seg.height;
          return <rect key={seg.key} x={x} y={y} width={barW} height={seg.height} fill={seg.fill} />;
        });
        return (
          <g key={d.date}>
            <title>{`${d.date}: ${d.total} calls (${d.valid} valid, ${d.invalid} invalid, ${d.error} error)`}</title>
            {rects}
          </g>
        );
      })}
      <line x1={0} y1={h - 20} x2={w} y2={h - 20} stroke="var(--border)" />
    </svg>
  );
}

/* ------------------------------------------------------------- component */
export function DashboardClient(props: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyView[]>(props.keys);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !data.ok) throw new Error(String(data.error ?? 'Request failed.'));
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Could not revoke the key.');
      setKeys(keys.map((k) => (k.id === id ? { ...k, active: false, revokedAt: new Date().toISOString() } : k)));
    } catch (e) {
      setError((e as Error).message);
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
        const data = await post('/api/billing/lemon-checkout', { plan });
        window.location.href = String(data.checkoutUrl);
      }
    } catch (e) {
      setError((e as Error).message);
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
    } catch (e) {
      setError((e as Error).message);
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
    } catch (e) {
      setError((e as Error).message);
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
    } catch (e) {
      setError((e as Error).message);
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

        {/* Plan */}
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
              <button type="button" className="btn btn-primary" onClick={recover} disabled={busy === 'recover'} style={{ marginTop: 8 }}>
                Update payment method
              </button>
            </div>
          ) : null}

          {!props.billingConfigured ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              <strong>Billing is not configured on this deployment.</strong>
              <p style={{ marginTop: 4 }}>
                Checkout runs through Lemon Squeezy. Set{' '}
                <code>LEMON_SQUEEZY_API_KEY</code> and <code>LEMON_SQUEEZY_STORE_ID</code> in
                Railway to enable payments.
              </p>
            </div>
          ) : null}

          <div className="grid grid-3">
            {PLAN_IDS.map((id) => {
              const p = PLANS[id];
              const current = props.plan === id;
              return (
                <div key={id} className={`card${current ? ' highlight' : ''}`}>
                  <h3 style={{ marginBottom: 8 }}>{p.name}</h3>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>{p.priceLabel}</strong>{' '}
                    <span className="muted">{p.cadence}</span>
                  </div>
                  <ul className="clean" style={{ marginBottom: 12 }}>
                    <li>{p.monthlyQuota.toLocaleString()} validations / month</li>
                    <li>{p.rateLimitPerMinute} requests / minute</li>
                  </ul>
                  <p className="muted" style={{ marginBottom: 12 }}>{p.blurb}</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={current || busy === id || (id === 'trial' && props.hasSubscription)}
                    onClick={() => subscribe(id)}
                  >
                    {current
                      ? 'Current plan'
                      : props.hasSubscription && id !== 'trial'
                        ? `Switch to ${p.name}`
                        : `Choose ${p.name}`}
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
            Payments are processed by Lemon Squeezy, our merchant of record.
          </p>
        </div>

        {/* Usage */}
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

        {/* API keys */}
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
              onChange={(e) => setKeyName(e.target.value)}
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
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td><code>{k.prefix}…</code></td>
                  <td>{k.createdAt.slice(0, 10)}</td>
                  <td>{k.lastUsedAt ? k.lastUsedAt.slice(0, 10) : '—'}</td>
                  <td>
                    <span className={`pill pill-${k.active ? 'active' : 'cancelled'}`}>
                      {k.active ? 'active' : 'revoked'}
                    </span>
                  </td>
                  <td>
                    {k.active ? (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => revokeKey(k.id)}
                        disabled={busy === k.id}
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
