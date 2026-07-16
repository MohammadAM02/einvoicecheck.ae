'use client';

import { useState } from 'react';

type State = 'idle' | 'submitting' | 'ok' | 'error';

export function WaitlistForm({ source = 'waitlist' }: { source?: string }) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('submitting');
    setMessage('');

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get('email') ?? '').trim(),
      company: String(form.get('company') ?? '').trim(),
      volume: String(form.get('volume') ?? '').trim(),
      stack: String(form.get('stack') ?? '').trim(),
      source,
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setState('error');
        setMessage(body.error ?? 'Something went wrong. Try again in a moment.');
        return;
      }
      setState('ok');
      setMessage('You are on the list. We will email you a key when the API opens.');
    } catch {
      setState('error');
      setMessage('Network error. Try again in a moment.');
    }
  }

  if (state === 'ok') {
    return (
      <p className="form-msg ok" role="status">
        {message}
      </p>
    );
  }

  return (
    <form className="waitlist" onSubmit={onSubmit}>
      <div>
        <label htmlFor="email">Work email *</label>
        <input id="email" name="email" type="email" required placeholder="you@company.ae" />
      </div>
      <div>
        <label htmlFor="company">Company (optional)</label>
        <input id="company" name="company" type="text" placeholder="Acme FZ-LLC" />
      </div>
      <div>
        <label htmlFor="volume">Invoices per month (optional)</label>
        <select id="volume" name="volume" defaultValue="">
          <option value="">Prefer not to say</option>
          <option value="<100">Under 100</option>
          <option value="100-2000">100 - 2,000</option>
          <option value="2000-15000">2,000 - 15,000</option>
          <option value=">15000">Over 15,000</option>
        </select>
      </div>
      <div>
        <label htmlFor="stack">What produces your invoices? (optional)</label>
        <input id="stack" name="stack" type="text" placeholder="Odoo, SAP, in-house Node service..." />
      </div>
      <button className="btn btn-primary" type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Adding you...' : 'Join the waitlist'}
      </button>
      {state === 'error' && (
        <p className="form-msg err" role="alert">
          {message}
        </p>
      )}
      <p className="form-msg" style={{ color: 'var(--muted)' }}>
        No card details, no payment, no spam. One email when keys are issued.
      </p>
    </form>
  );
}
