'use client';

import type React from 'react';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { ValidationClientError, readInvoiceFile, validateInvoiceDocument } from '@/lib/validation-client';
import { BROKEN_JSON_SAMPLE, VALID_JSON_SAMPLE } from '@/lib/validation-samples';
import type { ValidateApiSuccess } from '@/lib/validation-ui';
import { ValidationSummary } from './ValidationSummary';

type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'ready'; fileName?: string }
  | { phase: 'validating'; fileName?: string }
  | { phase: 'result'; data: ValidateApiSuccess; fileName?: string }
  | { phase: 'error'; message: string; status: number | null; fileName?: string };

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

  function trackInput(method: InputMethod) {
    trackEvent('validator_input_selected', { context, method });
  }

  function showError(message: string, status: number | null, fileName?: string, category: number | 'network' | 'timeout' | 'file' = 'file') {
    setState({ phase: 'error', message, status, fileName });
    trackEvent('validator_error', { context, status: category });
  }

  async function validate(document: string, fileName?: string) {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const controller = new AbortController();
    let timedOut = false;
    abortRef.current = controller;
    setState({ phase: 'validating', fileName });
    timeoutRef.current = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10_000);

    try {
      const data = await validateInvoiceDocument(document, controller.signal);
      if (abortRef.current !== controller) return;
      setState({ phase: 'result', data, fileName });
      trackEvent('validator_success', { context, valid: data.result.valid });
    } catch (error) {
      if (abortRef.current !== controller) return;
      if (error instanceof ValidationClientError) {
        showError(error.message, error.status, fileName, error.status ?? 'file');
      } else if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError' && timedOut) {
        showError(TIMEOUT_MESSAGE, null, fileName, 'timeout');
      } else {
        showError(NETWORK_MESSAGE, null, fileName, 'network');
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
      state.fileName ? h('p', { className: 'selected-file-name' }, state.fileName) : null,
      h(ValidationSummary, { result: state.data.result, rateLimit: state.data.rateLimit, onReset: reset }),
    );
  }

  return h('section', { className: 'validator-workspace', 'aria-label': 'Invoice validation workspace' },
    h('h2', null, 'Validate an invoice'),
    h('p', { className: 'validator-formats' }, 'PINT-AE XML or canonical JSON, maximum 256 KB'),
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
    h('label', { htmlFor: 'invoice-file-input' }, 'Choose an XML or JSON invoice'),
    h('input', {
      id: 'invoice-file-input',
      ref: inputRef,
      type: 'file',
      accept: '.xml,.json,.txt,application/json,application/xml,text/xml',
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
      h('button', { type: 'button', disabled: validating, onClick: () => setPasteMode(true) }, 'Paste XML or JSON'),
      h('button', { type: 'button', disabled: validating, onClick: () => validateSample(VALID_JSON_SAMPLE, 'valid_sample') }, 'Try valid sample'),
      h('button', { type: 'button', disabled: validating, onClick: () => validateSample(BROKEN_JSON_SAMPLE, 'broken_sample') }, 'Try broken sample'),
    ),
    pasteMode ? h('div', { className: 'validator-paste' },
      h('label', { htmlFor: 'invoice-paste-input' }, 'Invoice XML or JSON'),
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
