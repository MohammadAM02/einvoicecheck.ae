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

export const WorkflowTerminal: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const curlCommand = `curl -X POST ${API_BASE_URL}/api/tools/validate -H "content-type: application/json" -d '${MINIMAL_VALID_INVOICE}'`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
      {/* Card 1 */}
      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--ink-muted)', fontWeight: 700 }}>1. Send Payload</span>
          <span className="badge" style={{ fontSize: 10, padding: '2px 8px' }}>POST /api/tools/validate</span>
        </div>
        <pre style={{ background: 'var(--bg)', padding: 8, borderRadius: 'var(--radius-sm)', fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--ink-secondary)', overflowX: 'auto', lineHeight: 1.6, border: '1px solid rgba(34,48,63,0.6)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{MINIMAL_VALID_INVOICE.slice(0, 120)}&hellip;</pre>
      </div>

      {/* Card 2 */}
      <div className="card" style={{ minWidth: 0, borderColor: 'rgba(14,165,196,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--accent)', fontWeight: 700 }}>2. Engine Check</span>
          <span className="badge" style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(14,165,196,0.08)', borderColor: 'rgba(14,165,196,0.2)' }}>&lt;50ms</span>
        </div>
        <div style={{ background: 'var(--bg)', padding: 8, borderRadius: 'var(--radius-sm)', fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--ink-secondary)', border: '1px solid rgba(34,48,63,0.6)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['TRN Format (15 Digits)', 'VAT Category & Rate', 'Line Extension Sums'].map((label, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--success)', fontSize: 11 }}>
              <span>{label}</span>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 */}
      <div className="card" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--ink-muted)', fontWeight: 700 }}>3. Clean Output</span>
          <span className="badge ok" style={{ fontSize: 10, padding: '2px 8px' }}>200 OK</span>
        </div>
        <pre style={{ background: 'var(--bg)', padding: 8, borderRadius: 'var(--radius-sm)', fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--success)', overflowX: 'auto', lineHeight: 1.6, border: '1px solid rgba(34,48,63,0.6)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{`{ "valid": true, "errors": [] }`}</pre>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { navigator.clipboard.writeText(curlCommand); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="btn btn-ghost"
            style={{ fontSize: 12, fontFamily: 'var(--font-code)', padding: '4px 10px' }}
          >
            {copied ? <Check style={{ width: 14, height: 14, color: 'var(--success)' }} /> : <Copy style={{ width: 14, height: 14 }} />}
            {copied ? 'Copied' : 'Copy cURL'}
          </button>
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-code)' }}>Try it</span>
        </div>
      </div>
    </div>
  );
};
