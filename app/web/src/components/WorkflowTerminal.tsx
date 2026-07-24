'use client';

import React, { useState } from 'react';
import { Terminal, CheckCircle2, Copy, Check } from 'lucide-react';
import { API_BASE_URL } from '@/lib/site';

const MINIMAL_VALID_INVOICE = JSON.stringify({
  invoiceType: "388",
  invoiceNumber: "INV-MIN-001",
  issueDate: new Date().toISOString().slice(0, 10),
  currency: "AED",
  supplier: { trn: "100123456700003", name: "Supplier LLC" },
  customer: { trn: "100987654300003", name: "Customer LLC" },
  lines: [
    { id: "1", quantity: 1, unitPrice: 100, lineExtensionAmount: 100, taxCategory: { code: "S", rate: 5 } }
  ],
  taxSubtotals: [
    { taxableAmount: 100, taxAmount: 5, category: { code: "S", rate: 5 } }
  ],
  totals: {
    lineExtensionAmount: 100,
    taxExclusiveAmount: 100,
    taxAmount: 5,
    taxInclusiveAmount: 105,
    payableAmount: 105
  }
});

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: 16,
  display: 'flex', flexDirection: 'column', minWidth: 0,
};
const cardHeader: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8,
};
const pre: React.CSSProperties = {
  background: 'var(--bg)', padding: 8, borderRadius: 'var(--radius-sm)',
  fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--ink-secondary)',
  overflowX: 'auto', lineHeight: 1.6, border: '1px solid rgba(34,48,63,0.6)',
  flex: 1, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

export const WorkflowTerminal: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const curlCommand = `curl -X POST ${API_BASE_URL}/api/tools/validate -H "content-type: application/json" -d '${MINIMAL_VALID_INVOICE}'`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
      {/* Card 1 */}
      <div style={{ ...card, minWidth: 0 }}>
        <div style={cardHeader}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--ink-muted)', fontWeight: 700 }}>1. Send Payload</span>
          <span style={{ fontSize: 10, background: 'var(--bg)', color: 'var(--ink-muted)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-code)' }}>POST /api/tools/validate</span>
        </div>
        <pre style={pre}>{MINIMAL_VALID_INVOICE.slice(0, 120)}&hellip;</pre>
      </div>

      {/* Card 2 */}
      <div style={{ ...card, minWidth: 0, borderColor: 'rgba(14,165,196,0.3)', boxShadow: '0 4px 24px rgba(14,165,196,0.05)' }}>
        <div style={cardHeader}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--accent)', fontWeight: 700 }}>2. Engine Check</span>
          <span style={{ fontSize: 10, background: 'rgba(14,165,196,0.08)', color: 'var(--accent)', border: '1px solid rgba(14,165,196,0.2)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-code)' }}>&lt;50ms</span>
        </div>
        <div style={{ ...pre, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['TRN Format (15 Digits)', 'VAT Category & Rate', 'Line Extension Sums'].map((label, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--success)', fontSize: 11 }}>
              <span>{label}</span>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 */}
      <div style={{ ...card, minWidth: 0 }}>
        <div style={cardHeader}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--ink-muted)', fontWeight: 700 }}>3. Clean Output</span>
          <span style={{ fontSize: 10, background: 'rgba(52,211,153,0.08)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-code)' }}>200 OK</span>
        </div>
        <pre style={{ ...pre, color: 'var(--success)' }}>{`{ "valid": true, "errors": [] }`}</pre>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { navigator.clipboard.writeText(curlCommand); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-code)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {copied ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14 }} />}
            {copied ? 'Copied' : 'Copy cURL'}
          </button>
          <span style={{ fontSize: 10, color: 'var(--ink-disabled)', fontFamily: 'var(--font-code)' }}>Try it</span>
        </div>
      </div>
    </div>
  );
};
