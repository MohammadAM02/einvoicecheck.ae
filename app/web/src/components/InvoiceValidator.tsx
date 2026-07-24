'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The free browser tool (GR1). Zero login: it POSTs the pasted document to
 * /api/tools/validate, which runs the SAME rule engine as POST /v1/validate.
 * No email is required to see a result; email capture happens after the result.
 *
 * Results shown here are preflight only - nothing is transmitted anywhere.
 */

type TemplateMeta = {
  filename: string;
  name: string;
  description: string;
};

type ValidationError = {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
};

type ValidationResult = {
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: ValidationError[];
};

type ApiOk = {
  ok: true;
  result: ValidationResult;
  rateLimit: { limit: number; remaining: number; resetSeconds: number; degraded: boolean };
};
type ApiErr = { ok: false; error: string };

// Batch types
type BatchItemResult = {
  index: number;
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: ValidationError[];
};
type BatchItemError = {
  index: number;
  valid: false;
  invoiceType: null;
  schemaVersion: string;
  error: string;
};
type BatchApiOk = {
  ok: true;
  results: (BatchItemResult | BatchItemError)[];
  rateLimit: { limit: number; remaining: number; resetSeconds: number; degraded: boolean };
};

const SAMPLE_JSON = `{
  "invoiceType": "388",
  "invoiceNumber": "INV-2026-0001",
  "issueDate": "2026-07-14",
  "currency": "AED",
  "supplier": { "trn": "100123456700003", "name": "Falcon Trading LLC" },
  "customer": { "trn": "10098765430000", "name": "Oasis Retail FZE" },
  "lines": [
    {
      "id": "1",
      "quantity": 10,
      "unitPrice": 50,
      "lineExtensionAmount": 500,
      "taxCategory": { "code": "S", "rate": 5 },
      "itemName": "Widget A"
    }
  ],
  "taxSubtotals": [
    { "taxableAmount": 500, "taxAmount": 25, "category": { "code": "S", "rate": 5 } }
  ],
  "totals": {
    "lineExtensionAmount": 500,
    "taxExclusiveAmount": 500,
    "taxAmount": 25,
    "taxInclusiveAmount": 525,
    "payableAmount": 530
  }
}`;

/** Plain-text summary of a result, safe to paste into Slack/email/a ticket. Never invents values. */
function toReportText(result: ValidationResult): string {
  const lines = [
    `einvoicecheck.ae preflight result - ${result.valid ? 'PASS' : 'WOULD BE REJECTED'}`,
    `Invoice type: ${result.invoiceType ?? 'not detected'} | profile: ${result.schemaVersion}`,
    '',
  ];
  if (!result.errors.length) {
    lines.push('Every rule in the engine passed. Preflight only - not a compliance or filing check.');
  } else {
    for (const e of result.errors) {
      lines.push(`[${e.severity.toUpperCase()}] ${e.path} (${e.rule})`);
      lines.push(`  ${e.message}`);
      if (e.fix) lines.push(`  Fix: ${e.fix}`);
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard API unavailable - fail silently.
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function InvoiceValidator() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ApiOk | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sample template dropdown state
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Batch validation state
  const [batchData, setBatchData] = useState<BatchApiOk | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showDropdown]);

  // Fetch templates list when dropdown opens
  const openDropdown = useCallback(() => {
    if (templates.length > 0) {
      setShowDropdown(true);
      return;
    }
    setLoadingTemplates(true);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((body) => {
        if (body.ok && Array.isArray(body.templates)) {
          setTemplates(body.templates);
          setShowDropdown(true);
        }
      })
      .catch(() => {
        // fallback: show it anyway with just the JSON sample
        setTemplates([]);
        setShowDropdown(true);
      })
      .finally(() => setLoadingTemplates(false));
  }, [templates.length]);

  // Load a template: fetch XML, set in textarea, auto-validate
  const loadTemplate = useCallback(async (filename: string) => {
    setShowDropdown(false);
    setError('');
    setData(null);
    setBatchData(null);

    try {
      const res = await fetch(`/api/templates/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        setError('Could not load the template. Try again.');
        return;
      }
      const xml = await res.text();
      setText(xml);

      // Auto-validate
      setBusy(true);
      try {
        const vres = await fetch('/api/tools/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ document: xml }),
        });
        const body: ApiOk | ApiErr = await vres.json();
        if (!vres.ok || body.ok !== true) {
          setError((body as ApiErr).error ?? 'Validation failed.');
        } else {
          setData(body);
        }
      } catch {
        setError('Could not reach the validator.');
      } finally {
        setBusy(false);
      }
    } catch {
      setError('Could not load the template.');
    }
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setData(null);
    setError('');
  }

  async function validate() {
    setBusy(true);
    setError('');
    setData(null);
    setBatchData(null);
    try {
      const res = await fetch('/api/tools/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ document: text }),
      });
      const body: ApiOk | ApiErr = await res.json();
      if (!res.ok || body.ok !== true) {
        setError((body as ApiErr).error ?? 'Validation failed. Try again.');
      } else {
        setData(body);
      }
    } catch {
      setError('Could not reach the validator. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function batchValidate() {
    const docs = text
      .split(/\n---+\n/)
      .map((d) => d.trim())
      .filter(Boolean);
    if (docs.length < 2) {
      setError('Paste 2 or more invoices separated by --- to use batch validation.');
      return;
    }
    if (docs.length > 50) {
      setError('Batch size exceeds the 50-invoice limit.');
      return;
    }
    setBusy(true);
    setError('');
    setData(null);
    setBatchData(null);
    try {
      const res = await fetch('/api/tools/validate/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoices: docs }),
      });
      const body = await res.json();
      if (!res.ok || body.ok !== true) {
        setError(body.error ?? 'Batch validation failed.');
      } else {
        setBatchData(body as BatchApiOk);
      }
    } catch {
      setError('Could not reach the validator.');
    } finally {
      setBusy(false);
    }
  }

  const result = data?.result;
  const errorCount = result?.errors.filter((e) => e.severity === 'error').length ?? 0;
  const warningCount = result?.errors.filter((e) => e.severity === 'warning').length ?? 0;
  const sortedErrors = result?.errors
    ? [...result.errors].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
    : [];

  return (
    <div className="tool">
      <div className="card">
        <h3>Paste your invoice</h3>
        <p className="muted">
          Canonical JSON, or a UBL 2.1 / PINT AE XML document. Nothing is stored: the document is
          validated in memory and discarded with the request.
        </p>
        <textarea
          className="tool-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={14}
          placeholder='{"invoiceType":"388", ...}   or   <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"> ...'
          aria-label="Invoice document"
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          For batch validation, paste multiple invoices separated by <code>---</code> and click Batch validate.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" onClick={validate} disabled={busy || !text.trim()}>
            {busy ? 'Validating...' : 'Validate invoice'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={batchValidate}
            disabled={busy || !text.trim()}
          >
            {busy ? 'Validating...' : 'Batch validate'}
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload a file
          </button>

          {/* Load a sample — dropdown trigger */}
          <div className="sample-btn-wrapper" ref={dropdownRef}>
            <button
              className="btn btn-ghost"
              onClick={openDropdown}
              disabled={busy || loadingTemplates}
            >
              {loadingTemplates ? 'Loading...' : 'Load a sample \u25BE'}
            </button>

            {showDropdown && (
              <div className="sample-dropdown">
                <div
                  className="sample-option sample-option-json"
                  onClick={async () => {
                    setShowDropdown(false);
                    setError('');
                    setData(null);
                    setBatchData(null);
                    setText(SAMPLE_JSON);
                    // Auto-validate the JSON sample too
                    setBusy(true);
                    try {
                      const vres = await fetch('/api/tools/validate', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ document: SAMPLE_JSON }),
                      });
                      const body: ApiOk | ApiErr = await vres.json();
                      if (!vres.ok || body.ok !== true) {
                        setError((body as ApiErr).error ?? 'Validation failed.');
                      } else {
                        setData(body);
                      }
                    } catch {
                      setError('Could not reach the validator.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <span className="sample-option-label">Sample JSON invoice</span>
                  <span className="sample-option-desc">Canonical JSON with a standard 5% VAT line</span>
                </div>
                <div className="sample-divider" />
                <div className="sample-dropdown-header">Template XML invoices</div>
                {templates.map((t) => (
                  <div
                    key={t.filename}
                    className="sample-option"
                    onClick={() => loadTemplate(t.filename)}
                  >
                    <span className="sample-option-label">{t.name}</span>
                    <span className="sample-option-desc">{t.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,.xml,.txt,application/json,application/xml,text/xml"
            onChange={onFile}
            hidden
          />
        </div>
        {error ? <p className="form-msg err">{error}</p> : null}
      </div>

      {result ? (
        <div className="card" style={{ marginTop: 20 }}>
          <span className={`badge ${result.valid ? 'ok' : 'bad'}`}>
            {result.valid ? 'Passes preflight' : 'Would be rejected'}
          </span>
          <h3>
            {result.valid
              ? 'No blocking errors found'
              : `${errorCount} error${errorCount === 1 ? '' : 's'}${warningCount ? ` and ${warningCount} warning${warningCount === 1 ? '' : 's'}` : ''}`}
          </h3>
          <div className="dash-head">
            <p className="muted" style={{ margin: 0 }}>
              Invoice type: <code>{result.invoiceType ?? 'not detected'}</code> &middot; profile:{' '}
              <code>{result.schemaVersion}</code>
              {data?.rateLimit.degraded ? ' · rate limiting is degraded right now' : ''}
            </p>
            {result.errors.length ? (
              <CopyButton text={toReportText(result)} label="Copy full report" />
            ) : null}
          </div>

          {result.errors.length ? (
            <div className="fix-list">
              {sortedErrors.map((e, i) => (
                <div className={`fix-row fix-row-${e.severity}`} key={`${e.rule}-${e.path}-${i}`}>
                  <div className="fix-row-head">
                    <span className={`pill ${e.severity}`}>{e.severity}</span>
                    <code>{e.path}</code>
                    <span className="muted fix-rule">{e.rule}</span>
                  </div>
                  <p className="fix-message">{e.message}</p>
                  {e.fix ? (
                    <div className="fix-callout">
                      <span className="fix-callout-label">Fix</span>
                      <span className="fix-callout-text">{e.fix}</span>
                      <CopyButton text={e.fix} label="Copy" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p>
              Every rule in the engine passed. That means the file is structurally and
              arithmetically clean - it does <strong>not</strong> mean it has been filed, accepted,
              or made legally compliant. Preflight only.
            </p>
          )}

          <p className="muted">
            {data ? `${data.rateLimit.remaining} of ${data.rateLimit.limit} free checks left this hour from your IP.` : null}
          </p>

          <div className="cta-row">
            <Link className="btn btn-primary" href="/signup">
              Do this on every invoice - get an API key
            </Link>
            <Link className="btn btn-ghost" href="/docs">
              Read the API docs
            </Link>
          </div>
        </div>
      ) : null}

      {batchData ? (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Batch results &mdash; {batchData.results.length} invoices</h3>
          <p className="muted" style={{ marginBottom: 'var(--space-md)' }}>
            {batchData.results.filter((r) => r.valid).length} pass
            &middot; {batchData.results.filter((r) => !r.valid).length} would be rejected
            &middot; {batchData.rateLimit.remaining} of {batchData.rateLimit.limit} checks left
            {batchData.rateLimit.degraded ? ' · degraded' : ''}
          </p>
          {batchData.results.map((r) => (
            <div
              key={r.index}
              className="fix-row"
              style={{
                borderLeft: `3px solid ${r.valid ? 'var(--success)' : 'var(--error)'}`,
                marginBottom: 'var(--space-sm)',
              }}
            >
              <div className="fix-row-head">
                <span className={`pill ${r.valid ? 'ok' : 'bad'}`}>
                  #{r.index + 1}
                </span>
                <span className={`pill ${r.valid ? 'ok' : 'bad'}`}>
                  {r.valid ? 'PASS' : 'FAIL'}
                </span>
                {'invoiceType' in r && r.invoiceType ? (
                  <code style={{ fontSize: 12 }}>{r.invoiceType}</code>
                ) : null}
                <span className="muted" style={{ fontSize: 12 }}>
                  {'schemaVersion' in r ? r.schemaVersion : ''}
                </span>
              </div>
              {'error' in r ? (
                <p className="fix-message">{r.error}</p>
              ) : (
                <>
                  {r.errors.length > 0 ? (
                    <p className="fix-message" style={{ marginBottom: 0 }}>
                      {r.errors.filter((e: ValidationError) => e.severity === 'error').length} error(s)
                      {r.errors.filter((e: ValidationError) => e.severity === 'warning').length > 0
                        ? `, ${r.errors.filter((e: ValidationError) => e.severity === 'warning').length} warning(s)`
                        : ''}
                    </p>
                  ) : (
                    <p className="fix-message" style={{ marginBottom: 0, color: 'var(--success)' }}>
                      No errors found
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
          <p className="muted" style={{ marginTop: 'var(--space-md)' }}>
            {batchData.rateLimit.remaining} of {batchData.rateLimit.limit} free checks left this hour from your IP.
          </p>
        </div>
      ) : null}
    </div>
  );
}
