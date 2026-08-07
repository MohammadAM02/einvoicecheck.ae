'use client';

import type React from 'react';
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import {
  RepairerClientError,
  convertXml,
  copyXml,
  downloadXml,
  readXmlFile,
} from '@/lib/repairer-client';
import type { AuditEntry, BlockedIssue, ConvertResult } from '@/lib/repairer-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'ready'; fileName?: string }
  | { phase: 'repairing'; fileName?: string }
  | { phase: 'result'; data: ConvertResult; originalXml: string; fileName?: string }
  | { phase: 'error'; message: string; status: number | null; fileName?: string };

type InputMethod = 'upload' | 'drop' | 'paste' | 'sample';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROGRESS_STEPS = [
  { id: 'parse', label: 'Reading document' },
  { id: 'chars', label: 'Scanning for illegal characters' },
  { id: 'ns', label: 'Checking namespaces and prefix casing' },
  { id: 'decl', label: 'Verifying XML declaration' },
  { id: 'fp', label: 'Data-integrity fingerprint' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function reasonText(reason?: string): string {
  switch (reason) {
    case 'UNREPAIRABLE_FORMAT':
      return 'The XML is not well-formed (for example, a broken declaration, an unclosed tag, or missing quotes). The repairer refuses to guess at the structure.';
    case 'DATA_SEMANTIC':
      return 'The invoice has data errors (TRN, amounts, VAT) that a repairer must not fix.';
    case 'DATA_CHANGED':
      return 'An internal guard caught a repairer altering data — this is a repairer defect.';
    default:
      return '';
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineDiff(before: string, after: string): { left: string; right: string } {
  const bl = before.split('\n');
  const al = after.split('\n');
  const leftEls = bl.map(
    (t) => `<span class="repairer-dl ctx">${escapeHtml(t) || '&nbsp;'}</span>`,
  );
  const rightEls = al.map(
    (t) => `<span class="repairer-dl ctx">${escapeHtml(t) || '&nbsp;'}</span>`,
  );
  for (let i = 0; i < Math.max(bl.length, al.length); i++) {
    if (bl[i] !== al[i]) {
      if (bl[i] !== undefined) {
        leftEls[i] = `<span class="repairer-dl del">${escapeHtml(bl[i])}</span>`;
      }
      if (al[i] !== undefined) {
        rightEls[i] = `<span class="repairer-dl add">${escapeHtml(al[i])}</span>`;
      }
    }
  }
  return { left: leftEls.join(''), right: rightEls.join('') };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RepairerWorkspace(): React.ReactElement {
  const router = useRouter();

  /* ---- state ---- */
  const [state, setState] = useState<WorkspaceState>({ phase: 'idle' });
  const [documentText, setDocumentText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progressIndex, setProgressIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  /* ---- refs ---- */
  const abortRef = useRef<AbortController | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);

  const converting = state.phase === 'repairing';
  const currentFileName = 'fileName' in state ? state.fileName : undefined;

  /* ---- side-effects ---- */

  // Focus verdict or error container when they appear
  useEffect(() => {
    if (state.phase === 'result' || state.phase === 'error') {
      const timer = setTimeout(() => verdictRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Abort in-flight requests and clear progress on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, []);

  // Clear copied feedback after a delay
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  /* ---- helpers ---- */

  const trackInput = useCallback((method: InputMethod) => {
    trackEvent('repairer_input_selected', { method });
  }, []);

  const showError = useCallback(
    (message: string, status: number | null, fileName?: string) => {
      setState({ phase: 'error', message, status, fileName });
      trackEvent('repairer_error', { status: String(status) });
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setState({ phase: 'idle' });
    setDocumentText('');
    setShowPaste(false);
    setProgressIndex(-1);
    setCopied(false);
    try {
      sessionStorage.removeItem('einvoicecheck:converter-handoff');
    } catch {
      /* noop */
    }
  }, []);

  /* ---- event handlers ---- */

  const handlePasteChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setDocumentText(text);
      if (text.trim()) {
        setState((prev) => (prev.phase === 'idle' ? { phase: 'ready' } : prev));
      } else {
        setState({ phase: 'idle' });
      }
    },
    [],
  );

  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      trackInput('upload');
      readXmlFile(file)
        .then((xml) => {
          setDocumentText(xml);
          setState({ phase: 'ready', fileName: file.name });
        })
        .catch((e) =>
          showError(
            e instanceof RepairerClientError ? e.message : 'Could not read file.',
            null,
          ),
        );
    },
    [trackInput, showError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        trackInput('drop');
        readXmlFile(e.dataTransfer.files[0])
          .then((xml) => {
            setDocumentText(xml);
            setState({ phase: 'ready', fileName: e.dataTransfer.files[0].name });
          })
          .catch((err) =>
            showError(
              err instanceof RepairerClientError ? err.message : 'Could not read file.',
              null,
            ),
          );
      }
    },
    [trackInput, showError],
  );

  const handleSample = useCallback(async () => {
    trackInput('sample');
    setSampleLoading(true);
    try {
      const res = await fetch('/samples/standard-tax-invoice.xml');
      if (!res.ok) throw new Error('Failed to load sample');
      const xml = await res.text();
      setDocumentText(xml);
      setState({ phase: 'ready' });
    } catch {
      showError('Could not load the sample XML. Check your connection and try again.', null);
    } finally {
      setSampleLoading(false);
    }
  }, [trackInput, showError]);

  const handleSubmit = useCallback(async () => {
    if (!documentText.trim()) return;

    abortRef.current?.abort();
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({ phase: 'repairing', fileName: currentFileName });
    trackEvent('repairer_submitted');

    // Start progress animation
    setProgressIndex(0);
    let step = 0;
    progressRef.current = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) {
        setProgressIndex(step);
      } else {
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
      }
    }, 400);

    try {
      const result = await convertXml(documentText, controller.signal);
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      setProgressIndex(PROGRESS_STEPS.length);
      setState({
        phase: 'result',
        data: result.result,
        originalXml: documentText,
        fileName: currentFileName,
      });
      trackEvent('repairer_result', {
        status: result.result.status,
        auditCount: result.result.audit.length,
        blockedCount: result.result.blocked.length,
      });
    } catch (e) {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      if ((e as Error).name === 'AbortError') return;
      if (e instanceof RepairerClientError) {
        showError(e.message, e.status, currentFileName);
      } else {
        showError(
          'Could not reach the repairer. Your XML is still here — try again.',
          null,
          currentFileName,
        );
      }
    }
  }, [documentText, currentFileName, showError]);

  const handleCopy = useCallback(async () => {
    if (state.phase !== 'result') return;
    try {
      await copyXml(state.data.output || documentText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [state, documentText]);

  const handleDownload = useCallback(() => {
    if (state.phase !== 'result') return;
    downloadXml('repaired-invoice.xml', state.data.output || documentText);
  }, [state, documentText]);

  const handleValidate = useCallback(() => {
    let xml = documentText;
    if (state.phase === 'result') {
      xml = state.data.output || state.originalXml;
    }
    try {
      sessionStorage.setItem(
        'einvoicecheck:converter-handoff',
        JSON.stringify({ source: 'xml-repairer', xml }),
      );
    } catch {
      /* noop */
    }
    router.push('/tools/uae-e-invoice-validator');
  }, [router, state, documentText]);

  const handleDropzoneClick = useCallback(() => {
    setShowPaste(true);
    inputRef.current?.click();
  }, []);

  const handleEditLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (documentText) {
        reset();
      } else {
        setShowPaste(true);
      }
    },
    [documentText, reset],
  );

  const handleRetry = useCallback(() => {
    setState(documentText.trim() ? { phase: 'ready', fileName: currentFileName } : { phase: 'idle' });
  }, [documentText, currentFileName]);

  /* ---- derived values ---- */

  const showInputTextarea = Boolean(documentText) || showPaste;
  const showDropzone = !showInputTextarea && !converting && state.phase !== 'result';

  const isResult = state.phase === 'result';
  const isError = state.phase === 'error';

  // Self-billing detection
  const hasSelfBilling =
    isResult &&
    (state.data.dataIssues?.some((i: BlockedIssue) => i.rule === 'ENG-TYPE-01/SELF-BILLING') ||
      state.data.blocked?.some((i: BlockedIssue) => i.rule === 'ENG-TYPE-01/SELF-BILLING'));

  // Stepper classes
  const step1Class =
    'repairer-step' +
    (isResult ? ' done' : state.phase !== 'idle' ? ' active' : '');
  const step2Class = 'repairer-step' + (isResult ? ' active' : '');

  /* ---- render ---- */

  return h(
    'div',
    { className: 'repairer-workspace' },

    /* ================================================================
       STEPPER
       ================================================================ */
    h(
      'div',
      { className: 'repairer-stepper', 'aria-label': 'Repair progress' },
      h(
        'div',
        { className: step1Class },
        h('div', { className: 'repairer-dot' }, '1'),
        h('div', { className: 'repairer-label' }, 'Repair format'),
      ),
      h(
        'div',
        { className: step2Class },
        h('div', { className: 'repairer-dot' }, '2'),
        h('div', { className: 'repairer-label' }, 'Validate'),
      ),
    ),

    /* ================================================================
       INPUT CARD
       ================================================================ */
    state.phase !== 'result'
      ? h(
          'div',
          { className: 'card' },

          // Dropzone
          showDropzone
            ? h(
                'div',
                {
                  className:
                    'repairer-dropzone' + (dragActive ? ' is-dragging' : ''),
                  onClick: handleDropzoneClick,
                  onDragOver: (e: React.DragEvent) => {
                    e.preventDefault();
                    setDragActive(true);
                  },
                  onDragLeave: () => setDragActive(false),
                  onDrop: handleDrop,
                },
                h('div', { className: 'repairer-dz-icon' }, '📄'),
                h(
                  'div',
                  { className: 'repairer-dz-title' },
                  'Drop your XML here',
                ),
                h(
                  'div',
                  { className: 'repairer-dz-hint' },
                  'or click to choose · paste works too · max 256 KB',
                ),
              )
            : null,

          // Textarea (when pasting or content loaded)
          showInputTextarea
            ? h('textarea', {
                className: 'repairer-paste-box',
                placeholder: 'Paste UBL 2.1 / PINT AE XML here...',
                value: documentText,
                onChange: handlePasteChange,
                disabled: converting,
                rows: 10,
                'aria-label': 'XML document content',
              })
            : null,

          // Hidden file input
          h('input', {
            ref: inputRef,
            type: 'file',
            accept: '.xml,.txt',
            style: { display: 'none' },
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              handleFileUpload(e.target.files),
            disabled: converting,
          }),

          // File name indicator
          currentFileName
            ? h(
                'p',
                {
                  className: 'muted',
                  style: { marginTop: 8, fontSize: '0.8125rem' },
                },
                currentFileName,
              )
            : null,

          // Actions row
          h(
            'div',
            { className: 'repairer-input-actions' },
            h(
              'button',
              {
                className: 'btn btn-primary',
                disabled: !documentText.trim() || converting,
                onClick: handleSubmit,
                type: 'button',
              },
              converting
                ? [h('span', { key: 's', className: 'repairer-spinner' }), ' Repairing…']
                : 'Start repair',
            ),
            h(
              'button',
              {
                className: 'btn btn-ghost',
                onClick: handleSample,
                disabled: converting || sampleLoading,
                type: 'button',
              },
              sampleLoading ? 'Loading…' : 'Try a sample',
            ),
            h(
              'button',
              {
                className: 'repairer-edit-link',
                onClick: handleEditLinkClick,
                type: 'button',
              },
              documentText ? 'Use a different document' : 'Paste instead',
            ),
          ),
        )
      : null,

    /* ================================================================
       PROGRESS CARD (repairing)
       ================================================================ */
    converting
      ? h(
          'div',
          { className: 'card', style: { marginTop: 16 } },
          h(
            'div',
            { className: 'repairer-progress-list' },
            PROGRESS_STEPS.map((step, i) => {
              let status: string;
              if (i < progressIndex) status = 'done';
              else if (i === progressIndex) status = 'running';
              else status = 'pending';

              return h(
                'div',
                {
                  key: step.id,
                  className: `repairer-progress-item ${status}`,
                },
                h(
                  'div',
                  { className: 'repairer-picon' },
                  status === 'done' ? '✓' : '',
                ),
                h(
                  'span',
                  { className: 'repairer-pstep' },
                  `${i + 1}/${PROGRESS_STEPS.length}`,
                ),
                h('span', null, step.label),
              );
            }),
          ),
        )
      : null,

    /* ================================================================
       RESULT
       ================================================================ */
    isResult
      ? h(
          'div',
          {
            ref: verdictRef,
            tabIndex: -1,
            className: 'repairer-fade-in',
            style: { marginTop: 16 },
            'aria-live': 'polite',
          },

          /* ---- 389 self-billing banner ---- */
          hasSelfBilling
            ? h(
                'div',
                {
                  className: 'validation-banner validation-banner--self-billing',
                  role: 'status',
                },
                h('strong', null, 'Self-billed invoices are not fully validated'),
                h(
                  'p',
                  null,
                  'This document is type 389 (self-billed invoice). Structural checks ran, but self-billing business rules are not vendored, so results are incomplete. Use an accredited ASP for self-billed invoices.',
                ),
              )
            : null,

          /* ---- Verdict ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;
            if (d.status === 'CONVERTED') {
              return h(
                'div',
                { className: 'repairer-verdict ok' },
                h('div', { className: 'repairer-vicon' }, '✅'),
                h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'repairer-vtitle' },
                    `Repaired — ${d.audit.length} ${d.audit.length === 1 ? 'fix' : 'fixes'} applied`,
                  ),
                  h(
                    'div',
                    { className: 'repairer-vsub' },
                    'Format defects fixed. Data values unchanged.',
                  ),
                ),
              );
            }
            if (d.status === 'NOOP') {
              return h(
                'div',
                { className: 'repairer-verdict ok' },
                h('div', { className: 'repairer-vicon' }, '✨'),
                h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'repairer-vtitle' },
                    'No changes needed',
                  ),
                  h(
                    'div',
                    { className: 'repairer-vsub' },
                    'Your XML is already well-formed.',
                  ),
                ),
              );
            }
            if (d.status === 'REFUSED') {
              return h(
                'div',
                { className: 'repairer-verdict warn' },
                h('div', { className: 'repairer-vicon' }, '⚠️'),
                h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'repairer-vtitle' },
                    'No changes made',
                  ),
                  h(
                    'div',
                    { className: 'repairer-vsub' },
                    reasonText(d.reason) || d.detail || '',
                  ),
                ),
              );
            }
            // ERROR
            return h(
              'div',
              { className: 'repairer-verdict err' },
              h('div', { className: 'repairer-vicon' }, '⛔'),
              h(
                'div',
                null,
                h('div', { className: 'repairer-vtitle' }, 'Internal error'),
                h(
                  'div',
                  { className: 'repairer-vsub' },
                  d.detail || 'An unexpected error occurred.',
                ),
              ),
            );
          })(),

          /* ---- Blocked issues table (REFUSED + DATA_SEMANTIC) ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;
            if (
              d.status === 'REFUSED' &&
              d.reason === 'DATA_SEMANTIC' &&
              d.blocked.length > 0
            ) {
              return h(
                'div',
                { style: { marginTop: 12 } },
                h(
                  'p',
                  {
                    style: {
                      fontWeight: 600,
                      marginBottom: 8,
                      fontSize: '0.875rem',
                    },
                  },
                  'Blocked by these data errors:',
                ),
                h(
                  'table',
                  { className: 'repairer-blocked-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      h('th', null, 'Rule'),
                      h('th', null, 'Field'),
                      h('th', null, 'Message'),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    d.blocked.map((b: BlockedIssue, i: number) =>
                      h(
                        'tr',
                        { key: i },
                        h('td', null, b.rule),
                        h('td', null, b.path),
                        h('td', null, b.message),
                      ),
                    ),
                  ),
                ),
              );
            }
            return null;
          })(),

          /* ---- Diff card (CONVERTED only) ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;
            const orig =
              (state as Extract<WorkspaceState, { phase: 'result' }>)
                .originalXml;

            if (d.status !== 'CONVERTED' || !d.output) return null;

            const diff = lineDiff(orig, d.output);
            const changeCount = d.audit.length;
            const ruleIds = d.audit.map((a: AuditEntry) => a.rule).join(' · ');

            return h(
              'div',
              { className: 'card', style: { marginTop: 16 } },
              h(
                'div',
                { className: 'repairer-diff-toolbar' },
                h(
                  'span',
                  { className: 'repairer-dt-status' },
                  `${changeCount} ${changeCount === 1 ? 'change' : 'changes'}`,
                ),
                h('span', { className: 'repairer-dt-meta' }, ruleIds),
              ),
              h(
                'div',
                { className: 'repairer-diff-split' },
                h(
                  'div',
                  { className: 'repairer-diff-col' },
                  h(
                    'div',
                    { className: 'repairer-dc-head' },
                    'Before',
                    h(
                      'span',
                      { className: 'repairer-dh-badge' },
                      `${orig.length} B`,
                    ),
                  ),
                  h('pre', {
                    dangerouslySetInnerHTML: { __html: diff.left },
                  }),
                ),
                h(
                  'div',
                  { className: 'repairer-diff-col' },
                  h(
                    'div',
                    { className: 'repairer-dc-head' },
                    'After',
                    h(
                      'span',
                      { className: 'repairer-dh-badge' },
                      `${d.output.length} B`,
                    ),
                  ),
                  h('pre', {
                    dangerouslySetInnerHTML: { __html: diff.right },
                  }),
                ),
              ),
            );
          })(),

          /* ---- Result actions (CONVERTED only) ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;
            if (d.status !== 'CONVERTED') return null;

            return h(
              'div',
              { className: 'repairer-result-actions' },
              h(
                'button',
                {
                  className: 'btn btn-primary',
                  onClick: handleDownload,
                  type: 'button',
                },
                '⬇ Download repaired XML',
              ),
              h(
                'button',
                {
                  className: 'btn btn-ghost',
                  onClick: handleCopy,
                  type: 'button',
                },
                copied ? 'Copied' : 'Copy',
              ),
              h(
                'button',
                {
                  className: 'btn btn-ghost',
                  onClick: reset,
                  type: 'button',
                },
                'Start over',
              ),
            );
          })(),

          /* ---- Next panel: Step 2 — Validate (CONVERTED + NOOP) ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;
            if (d.status !== 'CONVERTED' && d.status !== 'NOOP') return null;

            return h(
              'div',
              { className: 'repairer-next-panel' },
              h(
                'strong',
                { style: { fontSize: '0.95rem' } },
                'Step 2 — Validate',
              ),
              h(
                'p',
                {
                  className: 'muted',
                  style: { margin: '6px 0 12px' },
                },
                'Run the repaired invoice through the same rule engine the API uses.',
              ),
              h(
                'button',
                {
                  className: 'btn btn-primary',
                  onClick: handleValidate,
                  type: 'button',
                },
                'Validate repaired invoice →',
              ),
            );
          })(),

          /* ---- Technical details accordion ---- */
          (() => {
            const d = (state as Extract<WorkspaceState, { phase: 'result' }>)
              .data;

            const hasAudit = d.audit && d.audit.length > 0;
            const hasHashes = Boolean(d.inputHash) || Boolean(d.outputHash);

            if (!hasAudit && !hasHashes) return null;

            return h(
              'details',
              { style: { marginTop: 14 } },
              h(
                'summary',
                {
                  style: {
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    color: 'var(--ink-secondary)',
                  },
                },
                'Technical details — audit trail, hashes, engine version',
              ),
              h(
                'div',
                {
                  style: {
                    padding: '14px 16px',
                    borderTop: '1px solid var(--border)',
                  },
                },

                // Audit table
                hasAudit
                  ? h(
                      'table',
                      { className: 'repairer-audit-table' },
                      h(
                        'thead',
                        null,
                        h(
                          'tr',
                          null,
                          h('th', null, 'Rule'),
                          h('th', null, 'Action'),
                          h('th', null, 'Target'),
                          h('th', null, 'Old → New'),
                        ),
                      ),
                      h(
                        'tbody',
                        null,
                        d.audit.map((a: AuditEntry, i: number) =>
                          h(
                            'tr',
                            { key: i },
                            h('td', null, a.rule),
                            h('td', null, a.action),
                            h('td', null, a.target),
                            h('td', null, `${a.old} → ${a.new}`),
                          ),
                        ),
                      ),
                    )
                  : null,

                // Hash rows
                hasHashes
                  ? h(
                      'div',
                      { style: { marginTop: hasAudit ? 12 : 0 } },
                      d.inputHash
                        ? h(
                            'p',
                            { className: 'repairer-hash-row' },
                            `Input SHA-256:  ${d.inputHash}`,
                          )
                        : null,
                      d.outputHash
                        ? h(
                            'p',
                            { className: 'repairer-hash-row' },
                            `Output SHA-256: ${d.outputHash}`,
                          )
                        : null,
                      h(
                        'p',
                        { className: 'repairer-hash-row' },
                        `Engine: ${d.engineVersion}`,
                      ),
                    )
                  : null,
              ),
            );
          })(),
        )
      : null,

    /* ================================================================
       ERROR
       ================================================================ */
    isError
      ? h(
          'div',
          {
            ref: verdictRef,
            tabIndex: -1,
            className: 'repairer-verdict err repairer-fade-in',
            style: { marginTop: 16 },
            'aria-live': 'assertive',
          },
          h('div', { className: 'repairer-vicon' }, '⛔'),
          h(
            'div',
            null,
            h('div', { className: 'repairer-vtitle' }, 'Internal error'),
            h(
              'div',
              { className: 'repairer-vsub' },
              (state as Extract<WorkspaceState, { phase: 'error' }>).message,
            ),
          ),
          h(
            'div',
            { style: { marginLeft: 'auto' } },
            h(
              'button',
              { className: 'btn btn-ghost', onClick: handleRetry, type: 'button' },
              'Retry',
            ),
          ),
        )
      : null,

    /* ================================================================
       FOOTNOTE
       ================================================================ */
    h(
      'p',
      {
        style: {
          marginTop: 28,
          color: 'var(--ink-muted)',
          fontSize: '0.8rem',
          borderTop: '1px solid var(--border)',
          paddingTop: 16,
        },
      },
      'The repairer works on ',
      h('strong', null, 'format only'),
      ' — it never changes a TRN, amount, date, or other data value. Every change is audited. Preflight only: this does not transmit anything to the FTA or an accredited ASP.',
    ),
  );
}
