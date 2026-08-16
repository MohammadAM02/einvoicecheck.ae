'use client';

import type React from 'react';
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { GeneratorClientError, generateXml } from '@/lib/generator-client';
import type { GenerateInput } from '@/lib/generator-client';
import {
  IMPORT_TEMPLATE_PATH,
  MAX_IMPORT_INVOICES,
  buildImportZip,
  downloadBlob,
  parseImportFile,
  safeInvoiceFileName,
  type ImportFieldError,
  type ImportInvoice,
  type ImportParseResult,
} from '@/lib/invoice-import';
import { downloadXml } from '@/lib/xml-file';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type BatchOutcome = {
  key: string;
  invoiceNumber: string;
  template: string;
  sourceRows: number[];
  status: 'success' | 'failed';
  xml?: string;
  message?: string;
  fieldErrors?: { field: string; message: string }[];
};

type ImportPhase =
  | { phase: 'idle' }
  | { phase: 'parsed'; result: ImportParseResult }
  | { phase: 'generating'; result: ImportParseResult; outcomes: BatchOutcome[] }
  | { phase: 'done'; result: ImportParseResult; outcomes: BatchOutcome[] };

const CONCURRENCY = 3;
const VALIDATOR_PATH = '/tools/uae-e-invoice-validator';
const HANDOFF_KEY = 'einvoicecheck:converter-handoff';

let outcomeKeyCounter = 0;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GeneratorImport(props: {
  onOpenInForm: (invoice: ImportInvoice) => void;
}): React.ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<ImportPhase>({ phase: 'idle' });
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const generating = phase.phase === 'generating';
  const parsed = phase.phase === 'parsed' || phase.phase === 'generating' || phase.phase === 'done' ? phase.result : null;
  const outcomes = phase.phase === 'generating' || phase.phase === 'done' ? phase.outcomes : null;
  const successes = (outcomes ?? []).filter((o) => o.status === 'success');
  const failures = (outcomes ?? []).filter((o) => o.status === 'failed');
  const ready = parsed ? parsed.invoices.length : 0;

  function track(method: 'file' | 'generate' | 'retry' | 'zip' | 'download' | 'validate' | 'open_in_form') {
    trackEvent('generator_import_action', { method });
  }

  async function handleFile(file: File) {
    if (generating) return;
    setFileName(file.name);
    track('file');
    try {
      const result = await parseImportFile(file);
      setPhase({ phase: 'parsed', result });
    } catch (e) {
      setPhase({
        phase: 'parsed',
        result: {
          kind: file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv',
          invoices: [],
          invoiceErrors: [],
          fatals: [{ message: e instanceof Error ? e.message : 'Could not parse the file.' }],
          preview: [],
          invoiceCount: 0,
        },
      });
    }
  }

  async function generateOutcome(invoice: ImportInvoice): Promise<BatchOutcome> {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await generateXml(invoice, controller.signal);
      track('generate');
      return {
        key: `outcome-${outcomeKeyCounter++}`,
        invoiceNumber: invoice.data.invoiceNumber,
        template: invoice.template,
        sourceRows: [],
        status: 'success',
        xml: result.xml,
      };
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      track('generate');
      const fieldErrors =
        e instanceof GeneratorClientError && e.fieldErrors ? e.fieldErrors : undefined;
      return {
        key: `outcome-${outcomeKeyCounter++}`,
        invoiceNumber: invoice.data.invoiceNumber,
        template: invoice.template,
        sourceRows: [],
        status: 'failed',
        message: e instanceof Error ? e.message : 'Generation failed.',
        fieldErrors,
      };
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /**
   * Bounded concurrency — never an unbounded Promise.all over the batch. Each
   * task writes its outcome at its ORIGINAL outcome-array index, so retries
   * update failed invoices in place and successful ones are never regenerated.
   */
  async function runBatch(
    tasks: Array<{ invoice: ImportInvoice; outcomeIndex: number }>,
    existing: BatchOutcome[],
  ): Promise<BatchOutcome[]> {
    const results = [...existing];
    let next = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
      while (next < tasks.length) {
        const task = tasks[next];
        next += 1;
        const outcome = await generateOutcome(task.invoice);
        results[task.outcomeIndex] = outcome;
        // Refresh progress after each invoice completes.
        setPhase((prev) =>
          prev.phase === 'generating'
            ? { ...prev, outcomes: [...results] }
            : prev,
        );
      }
    });
    await Promise.all(workers);
    return results;
  }

  async function startGeneration(result: ImportParseResult) {
    if (result.invoices.length === 0) return;
    track('generate');
    setPhase({ phase: 'generating', result, outcomes: [] });
    const tasks = result.invoices.map((invoice, index) => ({ invoice, outcomeIndex: index }));
    const results = await runBatch(tasks, []);
    setPhase({ phase: 'done', result, outcomes: results });
  }

  async function retryFailed() {
    if (!parsed || !outcomes) return;
    const failedIndexes = outcomes
      .map((o, i) => (o.status === 'failed' ? i : -1))
      .filter((i) => i >= 0);
    if (failedIndexes.length === 0) return;
    track('retry');
    setPhase({ phase: 'generating', result: parsed, outcomes: [...outcomes] });
    const tasks = failedIndexes.map((index) => ({ invoice: parsed.invoices[index], outcomeIndex: index }));
    const fresh = await runBatch(tasks, outcomes);
    setPhase({ phase: 'done', result: parsed, outcomes: fresh });
  }

  async function downloadZip() {
    if (successes.length === 0 || zipBusy) return;
    setZipBusy(true);
    setZipError('');
    track('zip');
    try {
      const blob = await buildImportZip(
        successes.map((s) => ({ invoiceNumber: s.invoiceNumber, xml: s.xml ?? '' })),
      );
      downloadBlob(blob, 'einvoicecheck-generated-invoices.zip');
    } catch {
      setZipError('Could not prepare the ZIP. Try downloading each invoice separately.');
    } finally {
      setZipBusy(false);
    }
  }

  function downloadOne(outcome: BatchOutcome) {
    if (!outcome.xml) return;
    track('download');
    const used = new Set<string>();
    downloadXml(`${safeInvoiceFileName(outcome.invoiceNumber, used)}.xml`, outcome.xml);
  }

  function viewInValidator(outcome: BatchOutcome) {
    if (!outcome.xml) return;
    track('validate');
    try {
      const used = new Set<string>();
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({
          source: 'xml-generator',
          fileName: `${safeInvoiceFileName(outcome.invoiceNumber, used)}.xml`,
          xml: outcome.xml,
        }),
      );
    } catch {
      /* noop */
    }
    router.push(VALIDATOR_PATH);
  }

  function openInForm(outcome: BatchOutcome) {
    if (!parsed) return;
    track('open_in_form');
    const index = outcomes?.findIndex((o) => o.key === outcome.key) ?? -1;
    const invoice = index >= 0 ? parsed.invoices[index] : undefined;
    if (invoice) props.onOpenInForm(invoice);
  }

  /* ---- render ---- */

  return h('div', { className: 'generator-import', 'data-testid': 'generator-import' },
    h('p', { className: 'import-intro' },
      'Import one to 50 invoices from the published CSV template or Generator JSON ' +
      '({ template, data }). The source file stays in your browser — normalized invoice data ' +
      'is sent to the Generator, and every result still passes the full validation gate.'),
    h('a', { className: 'import-template-link', href: IMPORT_TEMPLATE_PATH, download: true },
      'Download the CSV template'),

    /* ---- file picker ---- */
    phase.phase === 'idle' || phase.phase === 'parsed' || phase.phase === 'done'
      ? h('div', {
          className: `import-dropzone${dragActive ? ' is-dragging' : ''}`,
          role: 'button',
          tabIndex: 0,
          'data-testid': 'import-dropzone',
          onClick: () => {
            if (!generating) inputRef.current?.click();
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
            if ((event.key === 'Enter' || event.key === ' ') && !generating) {
              event.preventDefault();
              inputRef.current?.click();
            }
          },
          onDragEnter: (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (!generating) setDragActive(true);
          },
          onDragOver: (event: React.DragEvent<HTMLDivElement>) => event.preventDefault(),
          onDragLeave: () => setDragActive(false),
          onDrop: (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file && !generating) void handleFile(file);
          },
        },
          h('span', { className: 'import-dz-title' }, 'Drop a CSV or Generator JSON file here'),
          h('label', { htmlFor: 'import-file-input' }, 'or choose a file'),
          h('input', {
            id: 'import-file-input',
            ref: inputRef,
            type: 'file',
            accept: '.csv,.json,text/csv,application/json',
            hidden: true,
            onClick: (event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation(),
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void handleFile(file);
            },
          }),
          fileName ? h('p', { className: 'import-file-name' }, fileName) : null,
        )
      : null,

    /* ---- preview ---- */
    parsed
      ? h('div', { className: 'import-preview', 'data-testid': 'import-preview' },
          h('h3', null, 'Import preview'),
          h('p', { className: 'import-count' },
            `${parsed.preview.length} invoice${parsed.preview.length === 1 ? '' : 's'} detected · ` +
            `${ready} ready to generate`),
          parsed.fatals.length > 0
            ? h('div', { className: 'import-fatal', role: 'alert', 'data-testid': 'import-fatal' },
                parsed.fatals.map((f, i) => h('p', { key: i }, f.message)),
              )
            : null,
          parsed.preview.length > 0
            ? h('table', { className: 'import-preview-table' },
                h('thead', null,
                  h('tr', null,
                    h('th', { scope: 'col' }, 'Invoice'),
                    h('th', { scope: 'col' }, 'Template'),
                    h('th', { scope: 'col' }, 'Lines'),
                    h('th', { scope: 'col' }, 'Source rows'),
                    h('th', { scope: 'col' }, 'Status'),
                  ),
                ),
                h('tbody', null,
                  parsed.preview.map((p, i) =>
                    h('tr', { key: i },
                      h('td', null, p.invoiceNumber || `#${i + 1}`),
                      h('td', null, p.template || '—'),
                      h('td', null, String(p.lineCount)),
                      h('td', null, p.sourceRows.join(', ')),
                      h('td', null,
                        parsed.invoices.some((inv) => inv.data.invoiceNumber === p.invoiceNumber)
                          ? h('span', { className: 'import-status import-status--ok' }, 'Ready')
                          : h('span', { className: 'import-status import-status--err' }, 'Has errors'),
                      ),
                    ),
                  ),
                ),
              )
            : null,
          parsed.invoiceErrors.length > 0
            ? h('div', { className: 'import-errors', 'data-testid': 'import-errors' },
                h('h4', null, 'Invoices with errors'),
                h('ul', null,
                  parsed.invoiceErrors.map((e: ImportFieldError, i) =>
                    h('li', { key: i },
                      `Row ${e.row} · ${e.field}: ${e.message}`,
                    ),
                  ),
                ),
              )
            : null,
          ready > 0 && !generating && parsed.fatals.length === 0
            ? h('div', { className: 'import-actions' },
                h('button', {
                  className: 'btn btn-primary',
                  type: 'button',
                  onClick: () => void startGeneration(parsed),
                  'data-testid': 'generate-batch-btn',
                },
                  `Generate ${ready} invoice${ready === 1 ? '' : 's'}`),
              )
            : null,
        )
      : null,

    /* ---- batch progress ---- */
    generating
      ? h('p', { role: 'status', className: 'import-progress' },
          `Generating invoices… ${successes.length + failures.length}/${parsed?.invoices.length ?? 0}`)
      : null,

    /* ---- results ---- */
    outcomes && phase.phase === 'done'
      ? h('div', { className: 'import-results', 'data-testid': 'import-results' },
          h('h3', null, 'Batch results'),
          successes.length > 0
            ? h('table', { className: 'import-results-table' },
                h('thead', null,
                  h('tr', null,
                    h('th', { scope: 'col' }, 'Invoice'),
                    h('th', { scope: 'col' }, 'Status'),
                    h('th', { scope: 'col' }, 'Actions'),
                  ),
                ),
                h('tbody', null,
                  successes.map((o) =>
                    h('tr', { key: o.key },
                      h('td', null, o.invoiceNumber),
                      h('td', null, h('span', { className: 'import-status import-status--ok' }, 'XML generated')),
                      h('td', null,
                        h('div', { className: 'import-result-actions' },
                          h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => downloadOne(o) }, 'Download XML'),
                          h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => viewInValidator(o) }, 'View in Validator'),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            : null,
          failures.length > 0
            ? h('table', { className: 'import-results-table import-results-table--errors' },
                h('thead', null,
                  h('tr', null,
                    h('th', { scope: 'col' }, 'Invoice'),
                    h('th', { scope: 'col' }, 'Backend response'),
                    h('th', { scope: 'col' }, 'Actions'),
                  ),
                ),
                h('tbody', null,
                  failures.map((o) =>
                    h('tr', { key: o.key },
                      h('td', null, o.invoiceNumber || '—'),
                      h('td', null,
                        h('p', { className: 'import-fail-message' }, o.message ?? 'Generation failed.'),
                        o.fieldErrors && o.fieldErrors.length > 0
                          ? h('ul', { className: 'import-fail-fields' },
                              o.fieldErrors.map((fe, i) =>
                                h('li', { key: i }, `${fe.field}: ${fe.message}`),
                              ),
                            )
                          : null,
                      ),
                      h('td', null,
                        h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => openInForm(o) },
                          'Open in manual Generator'),
                      ),
                    ),
                  ),
                ),
              )
            : null,
          h('div', { className: 'import-results-actions' },
            successes.length > 0
              ? h('button', {
                  type: 'button',
                  className: 'btn btn-primary',
                  disabled: zipBusy,
                  onClick: () => void downloadZip(),
                  'data-testid': 'download-zip-btn',
                },
                  zipBusy ? 'Preparing ZIP…' : `Download all successful XML (${successes.length}) as ZIP`,
                )
              : null,
            zipError ? h('p', { className: 'import-fail-message', role: 'alert' }, zipError) : null,
            failures.length > 0
              ? h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => void retryFailed() },
                  `Retry failed (${failures.length})`,
                )
              : null,
            h('button', { type: 'button', className: 'btn btn-ghost', onClick: () => { setPhase({ phase: 'idle' }); setFileName(''); } },
              'Start a new import'),
          ),
          successes.length > 0 && failures.length > 0
            ? h('p', { className: 'import-partial-note' },
                'Successful invoices are preserved. Retrying failed invoices never regenerates successful ones.',
              )
            : null,
        )
      : null,
    h('p', { className: 'import-cap-note' },
      `Imports support ${1} to ${MAX_IMPORT_INVOICES} invoices per file. Parsing happens in your browser; ` +
      'the source file is never uploaded. Normalized invoice data is sent to the Generator.'),
  );
}
