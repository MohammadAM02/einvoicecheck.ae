'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Signup / login. On signup the server returns the raw API key exactly once —
 * we show it here and tell the user plainly that it will never be shown again.
 */
interface AuthFormProps {
  mode: 'signup' | 'login';
  onSuccess?: () => void;
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; apiKey?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      if (mode === 'signup' && data.apiKey) {
        setApiKey(data.apiKey);
        if (onSuccess) onSuccess();
        return;
      }
      router.push('/dashboard');
      router.refresh();
      if (onSuccess) onSuccess();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (apiKey) {
    return (
      <div className="card">
        <h3>Your API key</h3>
        <p>
          <strong>Copy it now.</strong> This is the only time it is ever displayed — we store only a
          SHA-256 hash of it, so we cannot show it to you again. Lost it? Create a new key and
          revoke this one.
        </p>
        <pre className="keybox">{apiKey}</pre>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={() => {
            router.push('/dashboard');
            if (onSuccess) onSuccess();
          }}>
            I have copied it — go to the dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={submit}>
      <label htmlFor="email">Work email</label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        minLength={10}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === 'signup' ? <p className="muted">At least 10 characters.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Working…' : mode === 'signup' ? 'Create account + get API key' : 'Sign in'}
      </button>
    </form>
  );
}
