'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

/**
 * The free browser tool (GR1). Zero login: it POSTs the pasted document to
 * /api/tools/validate, which runs the SAME rule engine as POST /v1/validate.
 * No email is required to see a result; email capture happens after the result.
 *
 * Results shown here are preflight only - nothing is transmitted anywhere.
 */

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
          // Clipboard API unavailable (older browser/permissions) - fail silently, the text is
          // still fully visible and selectable on the page.
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

  const result = data?.result;
  const errorCount = result?.errors.filter((e) => e.severity === 'error').length ?? 0;
  const warningCount = result?.errors.filter((e) => e.severity === 'warning').length ?? 0;
  // Errors before warnings, so the blocking problems are never scrolled past. The engine's own
  // order within each severity is preserved (stable sort) - we group, we don't re-rank.
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
        <div className="cta-row">
          <button className="btn btn-primary" onClick={validate} disabled={busy || !text.trim()}>
            {busy ? 'Validating...' : 'Validate invoice'}
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload a file
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setText(SAMPLE_JSON);
              setData(null);
              setError('');
            }}
            disabled={busy}
          >
            Load a sample
          </button>
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
    </div>
  );
}
