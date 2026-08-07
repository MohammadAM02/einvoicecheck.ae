'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { RepairerClientError, convertXml, readXmlFile } from '@/lib/repairer-client';
import type { AuditEntry, BlockedIssue, ConvertResult } from '@/lib/repairer-client';

type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'ready'; fileName?: string }
  | { phase: 'converting'; fileName?: string }
  | { phase: 'result'; data: ConvertResult; fileName?: string }
  | { phase: 'error'; message: string; status: number | null; fileName?: string };

type InputMethod = 'upload' | 'drop' | 'paste' | 'sample';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>
  <cbc:ID>INV-XML-001</cbc:ID>
  <cbc:IssueDate>2026-07-14</cbc:IssueDate>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>AED</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <Cbc:PartyTaxScheme><cbc:CompanyID>100123456700003</cbc:CompanyID></Cbc:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>Falcon Trading LLC</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme><cbc:CompanyID>100987654300003</cbc:CompanyID></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>Oasis Retail FZE</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="AED">30.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="AED">600.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="AED">30.00</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5</cbc:Percent></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="AED">600.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="AED">600.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="AED">630.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="AED">630.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">12</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="AED">600.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>Widget A</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5</cbc:Percent></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="AED">50.00</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

function statusLabel(status: string): string {
  switch (status) {
    case 'CONVERTED': return 'Repaired';
    case 'NOOP': return 'No changes needed';
    case 'REFUSED': return 'Refused';
    case 'ERROR': return 'Internal error';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'CONVERTED': return 'var(--success, #22c55e)';
    case 'NOOP': return 'var(--muted, #6b7280)';
    case 'REFUSED': return 'var(--warning, #f59e0b)';
    case 'ERROR': return 'var(--error, #ef4444)';
    default: return 'var(--muted, #6b7280)';
  }
}

function reasonText(reason?: string): string {
  switch (reason) {
    case 'UNREPAIRABLE_FORMAT': return 'The XML is not well-formed (for example, a broken declaration, an unclosed tag, or missing quotes). The converter refuses to guess at the structure. Check the exact error below.';
    case 'DATA_SEMANTIC': return 'The invoice has data errors (TRN, amounts, VAT) that a converter must not fix.';
    case 'DATA_CHANGED': return 'An internal guard caught a repairer altering data — this is a converter defect.';
    default: return '';
  }
}

export function RepairerWorkspace(): React.ReactElement {
  const [state, setState] = useState<WorkspaceState>({ phase: 'idle' });
  const [pasteMode, setPasteMode] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [mode, setMode] = useState<'full' | 'format'>('full');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const converting = state.phase === 'converting';
  const currentFileName = 'fileName' in state ? state.fileName : undefined;

  useEffect(() => {
    if (state.phase === 'error') errorRef.current?.focus();
  }, [state]);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  function trackInput(method: InputMethod) {
    trackEvent('repairer_input_selected', { method });
  }

  function showError(message: string, status: number | null, fileName?: string) {
    setState({ phase: 'error', message, status, fileName });
    trackEvent('repairer_error', { status: String(status) });
  }

  async function runConvert(xml: string, fileName?: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ phase: 'converting', fileName });
    trackEvent('repairer_submitted', { mode });

    try {
      const result = await convertXml(xml, mode, controller.signal);
      setState({ phase: 'result', data: result.result, fileName });
      trackEvent('repairer_result', {
        status: result.result.status,
        auditCount: result.result.audit.length,
        blockedCount: result.result.blocked.length,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (e instanceof RepairerClientError) {
        showError(e.message, e.status, fileName);
      } else {
        showError('Could not reach the converter. Your XML is still here — try again.', null, fileName);
      }
    }
  }

  function handlePaste(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setDocumentText(text);
    if (text.trim()) {
      setState({ phase: 'ready' });
    } else {
      setState({ phase: 'idle' });
    }
  }

  function handleSubmit() {
    if (!documentText.trim()) return;
    trackInput('paste');
    runConvert(documentText);
  }

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    trackInput('upload');
    readXmlFile(file)
      .then((xml) => {
        setDocumentText(xml);
        setState({ phase: 'ready', fileName: file.name });
      })
      .catch((e) => showError(e instanceof RepairerClientError ? e.message : 'Could not read file.', null));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      trackInput('drop');
      readXmlFile(e.dataTransfer.files[0])
        .then((xml) => {
          setDocumentText(xml);
          setState({ phase: 'ready', fileName: e.dataTransfer.files[0].name });
        })
        .catch((err) => showError(err instanceof RepairerClientError ? err.message : 'Could not read file.', null));
    }
  }

  function handleSample() {
    trackInput('sample');
    setDocumentText(SAMPLE_XML);
    setState({ phase: 'ready' });
  }

  function reset() {
    abortRef.current?.abort();
    setState({ phase: 'idle' });
    setDocumentText('');
  }

  return h('div', { className: 'converter-workspace' },
    // --- Mode toggle ---
    h('div', { style: { marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' } },
      h('span', { className: 'muted', style: { fontSize: '0.875rem' } }, 'Mode:'),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' } },
        h('input', {
          type: 'radio', name: 'converter-mode', value: 'full',
          checked: mode === 'full',
          onChange: () => setMode('full'),
        }),
        'Full (refuse on data errors)',
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' } },
        h('input', {
          type: 'radio', name: 'converter-mode', value: 'format',
          checked: mode === 'format',
          onChange: () => setMode('format'),
        }),
        'Format (repair + warn)',
      ),
    ),

    // --- Paste area ---
    state.phase !== 'result'
      ? h('div', { className: 'paste-area', style: dragActive ? { borderColor: 'var(--accent)' } : undefined,
          onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); },
          onDragLeave: () => setDragActive(false),
          onDrop: handleDrop,
        },
        h('textarea', {
          className: 'paste-textarea',
          placeholder: 'Paste a UBL 2.1 / PINT AE XML invoice here, or drop an .xml file...',
          value: documentText,
          onChange: handlePaste,
          disabled: converting,
          rows: 14,
          style: { width: '100%', fontFamily: 'monospace', fontSize: '0.8125rem' },
        }),
        h('div', { className: 'paste-actions', style: { display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' } },
          h('button', {
            className: 'btn btn-primary',
            disabled: !documentText.trim() || converting,
            onClick: handleSubmit,
          }, converting ? 'Converting…' : 'Convert XML'),
          h('button', { className: 'btn btn-ghost', onClick: handleSample, disabled: converting }, 'Try a sample'),
          h('label', { className: 'btn btn-ghost', style: { cursor: 'pointer' } },
            'Upload .xml',
            h('input', {
              ref: inputRef, type: 'file', accept: '.xml,.txt',
              style: { display: 'none' },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleFile(e.target.files),
              disabled: converting,
            }),
          ),
          currentFileName ? h('span', { className: 'muted', style: { fontSize: '0.8125rem' } }, currentFileName) : null,
        ),
      )
      : null,

    // --- Error ---
    state.phase === 'error'
      ? h('div', { ref: errorRef, className: 'notice notice-error', tabIndex: -1, style: { marginTop: 16 } },
          h('p', null, state.message),
          h('button', { className: 'btn btn-ghost', onClick: () => setState(documentText.trim() ? { phase: 'ready', fileName: state.fileName } : { phase: 'idle' }) }, 'Try again'),
        )
      : null,

    // --- Result ---
    state.phase === 'result'
      ? h('div', { style: { marginTop: 16 } },
        h('div', { className: 'card', style: { marginBottom: 16 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
            h('span', {
              style: { fontWeight: 700, fontSize: '1.125rem', color: statusColor(state.data.status) },
            }, statusLabel(state.data.status)),
            h('button', { className: 'btn btn-ghost', onClick: reset }, 'Convert another'),
          ),
          h('p', { className: 'muted', style: { fontSize: '0.875rem' } }, reasonText(state.data.reason) || (state.data.status === 'CONVERTED'
            ? `${state.data.audit.length} format ${state.data.audit.length === 1 ? 'repair' : 'repairs'} applied. Data values unchanged.`
            : state.data.status === 'NOOP'
            ? 'No format defects found — the XML is already well-formed.'
            : state.data.detail)),
          state.data.status === 'REFUSED' && state.data.reason === 'DATA_SEMANTIC' && state.data.blocked.length > 0
            ? h('div', { style: { marginTop: 12 } },
                h('p', { style: { fontWeight: 600, marginBottom: 8 } }, 'Blocked by these data errors:'),
                h('table', { style: { width: '100%', fontSize: '0.8125rem' } },
                  h('thead', null, h('tr', null,
                    h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Rule'),
                    h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Field'),
                    h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Message'),
                  )),
                  h('tbody', null, state.data.blocked.map((b: BlockedIssue, i: number) =>
                    h('tr', { key: i },
                      h('td', { style: { padding: '4px 8px', fontFamily: 'monospace' } }, b.rule),
                      h('td', { style: { padding: '4px 8px', fontFamily: 'monospace' } }, b.path),
                      h('td', { style: { padding: '4px 8px' } }, b.message),
                    ),
                  )),
                ),
              )
            : null,
          state.data.status === 'REFUSED' && state.data.wouldFix && state.data.wouldFix.length > 0
            ? h('p', { className: 'muted', style: { marginTop: 8, fontSize: '0.8125rem' } },
                `Format issues that would have been fixed: ${state.data.wouldFix.join(', ')}`,
              )
            : null,
          state.data.status === 'REFUSED' && state.data.reason === 'UNREPAIRABLE_FORMAT' && state.data.parseHint
            ? h('p', { className: 'muted', style: { marginTop: 8, fontSize: '0.8125rem', fontFamily: 'monospace' } },
                `Parse error: ${state.data.parseHint}`,
              )
            : null,
        ),

        // Audit trail
        state.data.audit.length > 0
          ? h('details', { style: { marginBottom: 16 } },
              h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, `Audit trail (${state.data.audit.length} ${state.data.audit.length === 1 ? 'change' : 'changes'})`),
              h('table', { className: 'audit-table', style: { width: '100%', marginTop: 8, fontSize: '0.8125rem' } },
                h('thead', null, h('tr', null,
                  h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Rule'),
                  h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Action'),
                  h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Target'),
                  h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'Old'),
                  h('th', { style: { textAlign: 'left', padding: '4px 8px' } }, 'New'),
                )),
                h('tbody', null, state.data.audit.map((a: AuditEntry, i: number) =>
                  h('tr', { key: i },
                    h('td', { style: { padding: '4px 8px', fontFamily: 'monospace' } }, a.rule),
                    h('td', { style: { padding: '4px 8px' } }, a.action),
                    h('td', { style: { padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.target),
                    h('td', { style: { padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.old),
                    h('td', { style: { padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.new),
                  ),
                )),
              ),
            )
          : null,

        // Data issues (format mode warnings)
        state.data.dataIssues && state.data.dataIssues.length > 0
          ? h('details', { style: { marginBottom: 16 } },
              h('summary', { style: { cursor: 'pointer', fontWeight: 600, color: 'var(--warning, #f59e0b)' } },
                `${state.data.dataIssues.length} data ${state.data.dataIssues.length === 1 ? 'issue' : 'issues'} (warnings — not fixed)`),
              h('ul', { style: { marginTop: 8, fontSize: '0.8125rem' } },
                state.data.dataIssues.map((d: BlockedIssue, i: number) =>
                  h('li', { key: i, style: { marginBottom: 4 } },
                    h('strong', null, `${d.rule} `), `${d.path}: ${d.message}`,
                  ),
                ),
              ),
            )
          : null,

        // Hashes
        h('details', null,
          h('summary', { style: { cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' } }, 'Hashes'),
          h('div', { style: { marginTop: 8, fontSize: '0.75rem', fontFamily: 'monospace' } },
            h('p', null, `Input SHA-256:  ${state.data.inputHash}`),
            state.data.outputHash ? h('p', null, `Output SHA-256: ${state.data.outputHash}`) : null,
            h('p', { className: 'muted' }, `Engine: ${state.data.engineVersion}`),
          ),
        ),

        // Repaired output
        (state.data.status === 'CONVERTED' || state.data.status === 'NOOP') && state.data.output
          ? h('details', null,
              h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, 'Repaired XML'),
              h('pre', {
                style: { marginTop: 8, padding: 12, background: 'var(--surface-alt, #f3f4f6)', borderRadius: 8, fontSize: '0.75rem', overflowX: 'auto', maxHeight: 400 },
              }, h('code', null, state.data.output)),
            )
          : null,
      )
      : null,
  );
}
