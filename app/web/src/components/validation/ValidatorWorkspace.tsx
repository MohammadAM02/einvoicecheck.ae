'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { ValidationClientError, readInvoiceFile, validateInvoiceDocument } from '@/lib/validation-client';
import { BROKEN_XML_SAMPLE, VALID_XML_SAMPLE } from '@/lib/validation-samples';
import type { ValidateApiSuccess } from '@/lib/validation-ui';
import { ValidationSummary } from './ValidationSummary';

type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'ready'; fileName?: string }
  | { phase: 'validating'; fileName?: string; origin?: HandoffSource }
  | { phase: 'result'; data: ValidateApiSuccess; fileName?: string; origin?: HandoffSource }
  | { phase: 'error'; message: string; status: number | null; fileName?: string; origin?: HandoffSource };

type HandoffSource = 'xml-generator' | 'xml-repairer';

const HANDOFF_CONTEXT: Record<HandoffSource, { label: string; fileName: string }> = {
  'xml-generator': { label: 'XML Generator', fileName: 'generated-invoice.xml' },
  'xml-repairer': { label: 'XML Repairer', fileName: 'repaired-invoice.xml' },
};

type InputMethod = 'upload' | 'drop' | 'paste' | 'valid_sample' | 'broken_sample';

const TIMEOUT_MESSAGE = 'Validation timed out. Your invoice is still here — try again.';
const NETWORK_MESSAGE = 'Could not reach the validator. Your invoice is still here — try again.';

export function ValidatorWorkspace({ context = 'tool' }: {
  context?: 'homepage' | 'tool';
}): React.ReactElement {
  const [state, setState] = useState<WorkspaceState>({ phase: 'idle' });
  const [pasteMode, setPasteMode] = useState(false);
  const [documentText, setDocumentText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validating = state.phase === 'validating';
  const currentFileName = 'fileName' in state ? state.fileName : undefined;

  useEffect(() => {
    if (state.phase === 'error') errorRef.current?.focus();
  }, [state]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    if (context !== 'tool') return;
    try {
      const raw = sessionStorage.getItem('einvoicecheck:converter-handoff');
      if (!raw) return;
      sessionStorage.removeItem('einvoicecheck:converter-handoff');
      const parsed = JSON.parse(raw) as { source?: HandoffSource; fileName?: string; xml?: string };
      if (parsed.source && parsed.source in HANDOFF_CONTEXT && typeof parsed.xml === 'string' && parsed.xml.trim()) {
        setDocumentText(parsed.xml);
        const context = HANDOFF_CONTEXT[parsed.source];
        void validate(parsed.xml, parsed.fileName || context.fileName, parsed.source);
      }
    } catch { /* malformed/stale — silently ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  function trackInput(method: InputMethod) {
    trackEvent('validator_input_selected', { context, method });
  }

  function showError(message: string, status: number | null, fileName?: string, category: number | 'network' | 'timeout' | 'file' = 'file', origin?: HandoffSource) {
    setState({ phase: 'error', message, status, fileName, origin });
    trackEvent('validator_error', { context, status: category });
  }

  async function validate(document: string, fileName?: string, origin?: HandoffSource) {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const controller = new AbortController();
    let timedOut = false;
    abortRef.current = controller;
    setState({ phase: 'validating', fileName, origin });
    timeoutRef.current = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10_000);

    try {
      const data = await validateInvoiceDocument(document, controller.signal);
      if (abortRef.current !== controller) return;
      setState({ phase: 'result', data, fileName, origin });
      trackEvent('validator_success', { context, valid: data.result.valid });
    } catch (error) {
      if (abortRef.current !== controller) return;
      if (error instanceof ValidationClientError) {
        showError(error.message, error.status, fileName, error.status ?? 'file', origin);
      } else if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError' && timedOut) {
        showError(TIMEOUT_MESSAGE, null, fileName, 'timeout', origin);
      } else {
        showError(NETWORK_MESSAGE, null, fileName, 'network', origin);
      }
    } finally {
      if (abortRef.current !== controller) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      abortRef.current = null;
    }
  }

  async function handleFile(file: File, method: 'upload' | 'drop') {
    trackInput(method);
    try {
      const text = await readInvoiceFile(file);
      setDocumentText(text);
      await validate(text, file.name);
    } catch (error) {
      if (error instanceof ValidationClientError) {
        showError(error.message, error.status, file.name, 'file');
      } else {
        showError(NETWORK_MESSAGE, null, file.name, 'network');
      }
    }
  }

  function openFilePicker() {
    if (!validating) inputRef.current?.click();
  }

  function validatePasted() {
    trackInput('paste');
    void validate(documentText, undefined);
  }

  function validateSample(document: string, method: 'valid_sample' | 'broken_sample') {
    setPasteMode(true);
    setDocumentText(document);
    trackInput(method);
    void validate(document, undefined);
  }

  function reset() {
    setState({ phase: 'idle' });
  }

  if (state.phase === 'result') {
    return h('div', { className: 'validator-result' },
      state.origin ? h('p', { className: 'validation-result-origin', role: 'status' }, `Validated from ${HANDOFF_CONTEXT[state.origin].label}`) : null,
      state.fileName ? h('p', { className: 'selected-file-name' }, state.fileName) : null,
      h(ValidationSummary, { result: state.data.result, rateLimit: state.data.rateLimit, onReset: reset }),
    );
  }

  return h('section', { className: 'validator-workspace', 'aria-label': 'Invoice validation workspace' },
    h('h2', null, 'Validate an invoice'),
    h('p', { className: 'validator-formats' }, 'PINT-AE XML, maximum 256 KB'),
    h('p', { className: 'validator-purpose' }, 'Built for testing, implementation and troubleshooting. Not another invoicing system.'),
    h('p', null, 'Validated in memory; not persisted by this application.'),
    h('div', {
      className: `invoice-drop-zone${dragActive ? ' is-dragging' : ''}`,
      'data-testid': 'invoice-drop-zone',
      role: 'button',
      tabIndex: 0,
      'aria-disabled': validating || undefined,
      onClick: openFilePicker,
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openFilePicker();
        }
      },
      onDragEnter: (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!validating) setDragActive(true);
      },
      onDragOver: (event: React.DragEvent<HTMLDivElement>) => event.preventDefault(),
      onDragLeave: () => setDragActive(false),
      onDrop: (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files[0];
        if (file && !validating) void handleFile(file, 'drop');
      },
    },
    h('span', null, 'Drop an invoice here or choose a file'),
    h('label', { htmlFor: 'invoice-file-input' }, 'Choose an XML invoice'),
    h('input', {
      id: 'invoice-file-input',
      ref: inputRef,
      type: 'file',
      accept: '.xml,.txt,application/xml,text/xml',
      hidden: true,
      onClick: (event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation(),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (file) void handleFile(file, 'upload');
      },
    })),
    currentFileName ? h('p', { className: 'selected-file-name' }, currentFileName) : null,
    h('div', { className: 'validator-actions' },
      h('button', { type: 'button', disabled: validating, onClick: () => setPasteMode(true) }, 'Paste XML'),
      h('button', { type: 'button', disabled: validating, onClick: () => validateSample(VALID_XML_SAMPLE, 'valid_sample') }, 'Try valid sample'),
      h('button', { type: 'button', disabled: validating, onClick: () => validateSample(BROKEN_XML_SAMPLE, 'broken_sample') }, 'Try broken sample'),
    ),
    pasteMode ? h('div', { className: 'validator-paste' },
      h('label', { htmlFor: 'invoice-paste-input' }, 'Invoice XML'),
      h('textarea', {
        id: 'invoice-paste-input',
        value: documentText,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setDocumentText(event.currentTarget.value),
        disabled: validating,
      }),
      h('button', { type: 'button', disabled: validating, onClick: validatePasted }, 'Validate pasted invoice'),
    ) : null,
    validating ? h('p', { role: 'status' }, 'Running UAE preflight checks…') : null,
    state.phase === 'error' ? h('div', { ref: errorRef, role: 'alert', tabIndex: -1, className: 'validator-error' },
      h('p', null, state.message),
      state.status === 413 ? h('a', { href: '/docs', className: 'btn btn-secondary' }, 'Read file size guidance') : null,
      documentText ? h('button', { type: 'button', disabled: validating, onClick: () => void validate(documentText, state.fileName) }, 'Retry') : null,
    ) : null,
  );
}
