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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col min-w-0">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2">
          <span className="text-xs font-mono text-slate-400 font-bold">1. Send Payload</span>
          <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-800">POST /api/tools/validate</span>
        </div>
        <pre className="bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed border border-slate-800/60 flex-1 m-0 whitespace-pre-wrap break-words">
          {MINIMAL_VALID_INVOICE.slice(0, 120)}&hellip;
        </pre>
      </div>

      {/* Card 2 */}
      <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4 flex flex-col min-w-0 shadow-lg shadow-cyan-500/5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2">
          <span className="text-xs font-mono text-cyan-400 font-bold">2. Engine Check</span>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">&lt;50ms</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800/60 flex-1 flex flex-col gap-1.5 font-mono text-xs">
          {['TRN Format (15 Digits)', 'VAT Category & Rate', 'Line Extension Sums'].map((label, i) => (
            <div key={i} className="flex justify-between items-center text-emerald-400 text-[11px]">
              <span>{label}</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col min-w-0">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-2">
          <span className="text-xs font-mono text-slate-400 font-bold">3. Clean Output</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">200 OK</span>
        </div>
        <pre className="bg-slate-950 p-2 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800/60 flex-1 m-0 whitespace-pre-wrap break-words">
          {`{ "valid": true, "errors": [] }`}
        </pre>
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={() => { navigator.clipboard.writeText(curlCommand); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="bg-transparent border-none text-slate-400 hover:text-white cursor-pointer text-xs font-mono flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy cURL'}
          </button>
          <span className="text-[10px] text-slate-600 font-mono">Try it</span>
        </div>
      </div>
    </div>
  );
};
