'use client';

import React, { useState, useRef, useCallback } from 'react';

const VALID_SAMPLE = JSON.stringify({
  invoiceType: "388",
  invoiceNumber: "INV-2026-0001",
  issueDate: new Date().toISOString().slice(0, 10),
  currency: "AED",
  supplier: { trn: "100123456700003", name: "Falcon Trading LLC" },
  customer: { trn: "100987654300003", name: "Oasis Retail FZE" },
  lines: [
    { id: "1", quantity: 10, unitPrice: 50, lineExtensionAmount: 500, taxCategory: { code: "S", rate: 5 }, itemName: "Widget A" }
  ],
  taxSubtotals: [
    { taxableAmount: 500, taxAmount: 25, category: { code: "S", rate: 5 } }
  ],
  totals: {
    lineExtensionAmount: 500,
    taxExclusiveAmount: 500,
    taxAmount: 25,
    taxInclusiveAmount: 525,
    payableAmount: 525
  }
}, null, 2);

const BROKEN_SAMPLE = JSON.stringify({
  invoiceType: "388",
  invoiceNumber: "INV-2026-0002",
  issueDate: new Date().toISOString().slice(0, 10),
  currency: "AED",
  supplier: { trn: "12345", name: "Falcon Trading LLC" },
  customer: { trn: "100987654300003", name: "Oasis Retail FZE" },
  lines: [
    { id: "1", quantity: 10, unitPrice: 50, lineExtensionAmount: 999, taxCategory: { code: "S", rate: 8 }, itemName: "Widget A" }
  ],
  taxSubtotals: [
    { taxableAmount: 500, taxAmount: 25, category: { code: "S", rate: 5 } }
  ],
  totals: {
    lineExtensionAmount: 500,
    taxExclusiveAmount: 500,
    taxAmount: 25,
    taxInclusiveAmount: 700,
    payableAmount: 700
  }
}, null, 2);

interface HeroValidatorProps {
  onOpenAuth: () => void;
}

export const HeroValidator: React.FC<HeroValidatorProps> = ({ onOpenAuth }) => {
  const [input, setInput] = useState(VALID_SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback(async () => {
    if (!input.trim()) { setError('Paste an invoice first.'); return; }
    if (abortRef.current) abortRef.current.abort();
    const c = new AbortController(); abortRef.current = c;
    setLoading(true); setError(null); setResult(null);
    const tid = setTimeout(() => c.abort(), 10000);
    try {
      const start = performance.now();
      const res = await fetch('/api/tools/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: input }), signal: c.signal,
      });
      clearTimeout(tid);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || `Error ${res.status}`); return; }
      const d = await res.json();
      if (!d.ok) { setError(d.error || 'Validation failed.'); return; }
      setResult({ ...d.result, ms: Math.round(performance.now() - start) });
      if (d.rateLimit) setRateLimit({ limit: d.rateLimit.limit, remaining: d.rateLimit.remaining });
      if ((window as any).trackEvent) (window as any).trackEvent('validator_run', { valid: d.result.valid });
    } catch (e: any) {
      clearTimeout(tid);
      setError(e?.name === 'AbortError' ? 'Timed out. Try a smaller document.' : 'Could not reach validator.');
    } finally { setLoading(false); abortRef.current = null; }
  }, [input]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <textarea
          value={input} onChange={e => { setInput(e.target.value); setError(null); setResult(null); setRateLimit(null); }}
          placeholder='{"invoiceType": "388", ...}' rows={8}
          className="tool-input"
          style={{ minHeight: 140 }}
          spellCheck={false}
        />
        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px', fontFamily: 'var(--font-code)' }}
            onClick={() => setInput(VALID_SAMPLE)}
          >
            Valid
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: '4px 10px', fontFamily: 'var(--font-code)' }}
            onClick={() => setInput(BROKEN_SAMPLE)}
          >
            Broken
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button
          onClick={validate} disabled={loading || !input.trim()}
          className="btn btn-primary btn-cut"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Checking...' : 'Validate'}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn btn-secondary"
        >
          Upload
        </button>
        <input ref={fileRef} type="file" accept=".json,.xml,.txt" onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          if (f.size > 262144) { setError('File too large (max 256 KB).'); return; }
          const r = new FileReader();
          r.onload = ev => { setInput(ev.target?.result as string); setError(null); setResult(null); };
          r.readAsText(f); e.target.value = '';
        }} hidden />
      </div>

      {error && (
        <div className="form-msg err">{error}</div>
      )}

      {loading && !error && (
        <div className="notice" style={{ borderColor: 'rgba(14,165,196,0.2)', color: 'var(--ink-muted)' }}>
          Running all 47 rules...
        </div>
      )}

      {result && !loading && (
        <div style={{ border: `1px solid ${result.valid ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{
            padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: result.valid ? 'var(--success-subtle)' : 'var(--error-subtle)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <span style={{ fontWeight: 600, color: result.valid ? 'var(--success)' : 'var(--error)' }}>
                {result.valid ? 'All rules passed' : `${result.errors?.filter((e: any) => e.severity === 'error').length || 0} error(s)`}
              </span>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                {result.invoiceType || 'Unknown'} · {result.schemaVersion} · {result.ms}ms
              </div>
            </div>
            <button onClick={onOpenAuth} className="btn btn-primary btn-cut-sm" style={{ padding: '4px 12px', fontSize: 12 }}>
              API key
            </button>
          </div>
          {result.errors?.slice(0, 5).map((err: any, i: number) => (
            <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  cursor: 'pointer', width: '100%', background: 'none', border: 'none',
                  color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit',
                }}
                onClick={() => {
                  const n = new Set(expanded);
                  n.has(i) ? n.delete(i) : n.add(i);
                  setExpanded(n);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-code)',
                    padding: '1px 6px', borderRadius: 4,
                    background: err.severity === 'error' ? 'var(--error-subtle)' : 'var(--warn-subtle)',
                    color: err.severity === 'error' ? 'var(--error)' : 'var(--warn)',
                  }}>{err.severity === 'error' ? 'ERR' : 'WARN'}</span>
                  <code style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{err.rule}</code>
                </span>
                <span style={{ color: 'var(--ink-muted)', fontSize: 11 }}>{expanded.has(i) ? '▲' : '▼'}</span>
              </button>
              {expanded.has(i) && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-secondary)' }}>
                  <p style={{ marginBottom: 4 }}>{err.message}</p>
                  {err.fix && <div className="fix-callout" style={{ marginTop: 0 }}>✓ {err.fix}</div>}
                </div>
              )}
            </div>
          ))}
          {result.errors?.length > 5 && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
              +{result.errors.length - 5} more
            </div>
          )}
          {rateLimit && (
            <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--ink-muted)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{rateLimit.remaining}/{rateLimit.limit} free checks left</span>
              <button onClick={onOpenAuth} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Upgrade →</button>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <div className="notice" style={{ textAlign: 'center' }}>
          All 47 UAE FTA rules. Same engine as <code style={{ fontFamily: 'var(--font-code)', color: 'var(--accent)' }}>POST /v1/validate</code>.
        </div>
      )}
    </div>
  );
};
