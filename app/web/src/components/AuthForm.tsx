'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

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
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

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

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Clipboard API unavailable or rejected — fall back to execCommand below.
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  function flashCopied() {
    setCopied(true);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyKey(key: string) {
    if (await copyToClipboard(key)) flashCopied();
  }

  if (apiKey) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Your API key</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          <strong style={{ color: 'var(--ink)' }}>Copy it now.</strong> This is the only time it is ever displayed — we store only a
          SHA-256 hash of it, so we cannot show it to you again. Lost it? Create a new key and
          revoke this one.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <pre className="keybox" style={{ flex: 1, margin: 0, minWidth: 0 }}>{apiKey}</pre>
          <button type="button" className="btn" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }} onClick={() => copyKey(apiKey)}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={async () => {
            await copyToClipboard(apiKey);
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
    <form className="form" onSubmit={submit}>
      <h3 style={{ marginBottom: 4 }}>{mode === 'signup' ? 'Create your account' : 'Sign in'}</h3>
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
      {error ? <p className="form-msg err">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Working…' : mode === 'signup' ? 'Create account + get API key' : 'Sign in'}
      </button>
    </form>
  );
}
