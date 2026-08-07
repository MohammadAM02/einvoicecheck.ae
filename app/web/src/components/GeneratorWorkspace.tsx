'use client';

import type React from 'react';
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import {
  GeneratorClientError,
  generateXml,
} from '@/lib/generator-client';
import type { GenerateInput, GenerateLine } from '@/lib/generator-client';
import { downloadXml, copyXml } from '@/lib/repairer-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'building'; xml: string; template: string; engineVersion: string }
  | { phase: 'ready'; xml: string; template: string; engineVersion: string }
  | { phase: 'error'; message: string; status: number | null; fieldErrors?: { field: string; message: string }[] };

interface TemplateDef {
  id: string;
  name: string;
  categories: string[];
}

interface CategoryDef {
  code: string;
  label: string;
  rate: number;
}

interface FormData {
  template: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  supplierTrn: string;
  supplierName: string;
  customerTrn: string;
  customerName: string;
  lines: FormLine[];
}

interface FormLine {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEMPLATES: TemplateDef[] = [
  { id: 'standard-tax-invoice', name: 'Standard tax invoice', categories: ['S'] },
  { id: 'summary-tax-invoice', name: 'Summary tax invoice', categories: ['S', 'AE'] },
  { id: 'standard-tax-credit-note', name: 'Standard tax credit note', categories: ['S'] },
];

const CATEGORIES: CategoryDef[] = [
  { code: 'S', label: 'S — Standard rate (5%)', rate: 5 },
  { code: 'AE', label: 'AE — VAT Reverse Charge (notional 5%, tax 0)', rate: 0 },
];

const SAMPLE_DATA: FormData = {
  template: 'standard-tax-invoice',
  invoiceNumber: 'INV-XML-001',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  supplierTrn: '100123456700003',
  supplierName: 'Falcon Trading LLC',
  customerTrn: '100987654300003',
  customerName: 'Oasis Retail FZE',
  lines: [{ key: 1, description: 'Widget A', quantity: '12', unitPrice: '50.00', category: 'S' }],
};

let lineKeyCounter = 2;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stripTrn(v: string): string {
  return v.replace(/\D/g, '');
}

function trnValid(v: string): boolean {
  return /^[0-9]{15}$/.test(stripTrn(v));
}

function computeTotals(lines: FormLine[], templateId: string) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  const categories = template ? template.categories : ['S'];

  let lineExtension = 0;
  const byCategory: Record<string, { taxable: number; tax: number }> = {};

  for (const c of categories) {
    byCategory[c] = { taxable: 0, tax: 0 };
  }

  for (const line of lines) {
    const qty = parseFloat(line.quantity);
    const price = parseFloat(line.unitPrice);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) continue;
    const ext = round2(qty * price);
    lineExtension = round2(lineExtension + ext);

    const cat = categories.includes(line.category) ? line.category : categories[0];
    const catDef = CATEGORIES.find((c) => c.code === cat);
    const rate = catDef ? catDef.rate : 0;

    if (rate === 0) {
      // AE: taxable included, tax 0
      byCategory[cat].taxable = round2((byCategory[cat].taxable || 0) + ext);
    } else {
      byCategory[cat].taxable = round2((byCategory[cat].taxable || 0) + ext);
      byCategory[cat].tax = round2((byCategory[cat].tax || 0) + ext * (rate / 100));
    }
  }

  let taxTotal = 0;
  for (const c of Object.keys(byCategory)) {
    taxTotal = round2(taxTotal + byCategory[c].tax);
  }

  const taxExclusive = lineExtension;
  const taxInclusive = round2(lineExtension + taxTotal);
  const payable = taxInclusive;

  return { lineExtension, byCategory, taxTotal, taxExclusive, taxInclusive, payable };
}

function computeLineExt(line: FormLine): number | null {
  const qty = parseFloat(line.quantity);
  const price = parseFloat(line.unitPrice);
  if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) return null;
  return round2(qty * price);
}

function isMinimallyValid(form: FormData): boolean {
  if (!form.template) return false;
  if (!form.invoiceNumber.trim()) return false;
  if (!form.issueDate.trim()) return false;
  if (!trnValid(form.supplierTrn)) return false;
  if (!form.supplierName.trim()) return false;
  if (!trnValid(form.customerTrn)) return false;
  if (!form.customerName.trim()) return false;
  if (form.lines.length === 0) return false;
  for (const line of form.lines) {
    if (!line.description.trim()) return false;
    const qty = parseFloat(line.quantity);
    if (isNaN(qty) || qty <= 0) return false;
    const price = parseFloat(line.unitPrice);
    if (isNaN(price) || price < 0) return false;
    if (!line.category) return false;
  }
  return true;
}

function formToInput(form: FormData): GenerateInput {
  return {
    template: form.template,
    data: {
      invoiceNumber: form.invoiceNumber.trim(),
      issueDate: form.issueDate.trim(),
      dueDate: form.dueDate.trim() || undefined,
      supplier: { trn: stripTrn(form.supplierTrn), name: form.supplierName.trim() },
      customer: { trn: stripTrn(form.customerTrn), name: form.customerName.trim() },
      lines: form.lines.map((l) => ({
        name: l.description.trim(),
        quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice),
        category: l.category,
      })),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GeneratorWorkspace(): React.ReactElement {
  const router = useRouter();

  /* ---- state ---- */
  const [state, setState] = useState<WorkspaceState>({ phase: 'idle' });
  const [form, setForm] = useState<FormData>({
    template: 'standard-tax-invoice',
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    supplierTrn: '',
    supplierName: '',
    customerTrn: '',
    customerName: '',
    lines: [{ key: 1, description: '', quantity: '', unitPrice: '', category: 'S' }],
  });
  const [copied, setCopied] = useState(false);

  /* ---- refs ---- */
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTemplate = TEMPLATES.find((t) => t.id === form.template) || TEMPLATES[0];
  const totals = computeTotals(form.lines, form.template);

  /* ---- side-effects ---- */

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  /* ---- debounced generate ---- */

  const doGenerate = useCallback(
    (formData: FormData, controller: AbortController) => {
      const input = formToInput(formData);
      setState({ phase: 'building', xml: '', template: '', engineVersion: '' });
      trackEvent('generator_build_started' as any, { template: input.template });

      generateXml(input, controller.signal)
        .then((result) => {
          setState({
            phase: 'ready',
            xml: result.xml,
            template: result.template,
            engineVersion: result.engineVersion,
          });
          trackEvent('generator_build_done' as any, { template: result.template });
        })
        .catch((e) => {
          if ((e as Error).name === 'AbortError') return;
          if (e instanceof GeneratorClientError) {
            setState({
              phase: 'error',
              message: e.message,
              status: e.status,
              fieldErrors: e.fieldErrors,
            });
            trackEvent('generator_error' as any, { status: String(e.status) });
          } else {
            setState({
              phase: 'error',
              message: 'Could not reach the generator. Check your connection and try again.',
              status: null,
            });
            trackEvent('generator_error' as any, { status: 'network' });
          }
        });
    },
    [],
  );

  const triggerGenerate = useCallback(
    (formData: FormData) => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!isMinimallyValid(formData)) {
        // Clear XML preview if form becomes invalid
        if (state.phase === 'ready' || state.phase === 'building') {
          setState({ phase: 'idle' });
        }
        return;
      }

      debounceRef.current = setTimeout(() => {
        const controller = new AbortController();
        abortRef.current = controller;
        doGenerate(formData, controller);
      }, 300);
    },
    [doGenerate, state.phase],
  );

  /* ---- form change handler ---- */

  const updateForm = useCallback(
    (patch: Partial<FormData>) => {
      setForm((prev) => {
        const next = { ...prev, ...patch };
        // Trigger debounced generate on next tick so state is settled
        setTimeout(() => triggerGenerate(next), 0);
        return next;
      });
    },
    [triggerGenerate],
  );

  /* ---- action handlers ---- */

  const handleDownload = useCallback(() => {
    if (state.phase !== 'ready') return;
    downloadXml('invoice.xml', state.xml);
    trackEvent('generator_download' as any);
  }, [state]);

  const handleCopy = useCallback(async () => {
    if (state.phase !== 'ready') return;
    try {
      await copyXml(state.xml);
      setCopied(true);
      trackEvent('generator_copy' as any);
    } catch {
      /* noop */
    }
  }, [state]);

  const handleStartOver = useCallback(() => {
    const hasContent =
      form.invoiceNumber ||
      form.supplierTrn ||
      form.customerTrn ||
      form.lines.some((l) => l.description || l.quantity);
    if (hasContent && !window.confirm('You have unsaved data. Start over?')) return;

    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setState({ phase: 'idle' });
    setForm({
      template: 'standard-tax-invoice',
      invoiceNumber: '',
      issueDate: '',
      dueDate: '',
      supplierTrn: '',
      supplierName: '',
      customerTrn: '',
      customerName: '',
      lines: [{ key: 1, description: '', quantity: '', unitPrice: '', category: 'S' }],
    });
    setCopied(false);
    try {
      sessionStorage.removeItem('einvoicecheck:converter-handoff');
    } catch {
      /* noop */
    }
    trackEvent('generator_reset' as any);
  }, [form]);

  const handleFillSample = useCallback(() => {
    setForm({ ...SAMPLE_DATA, lines: [{ key: lineKeyCounter++, description: 'Widget A', quantity: '12', unitPrice: '50.00', category: 'S' }] });
    trackEvent('generator_sample_filled' as any);
    setTimeout(() => triggerGenerate({ ...SAMPLE_DATA }), 0);
  }, [triggerGenerate]);

  const handleValidate = useCallback(() => {
    if (state.phase !== 'ready') return;
    try {
      sessionStorage.setItem(
        'einvoicecheck:converter-handoff',
        JSON.stringify({ source: 'xml-generator', xml: state.xml }),
      );
    } catch {
      /* noop */
    }
    trackEvent('generator_validate_handoff' as any);
    router.push('/tools/uae-e-invoice-validator');
  }, [router, state]);

  /* ---- line handlers ---- */

  const updateLine = useCallback(
    (key: number, patch: Partial<FormLine>) => {
      setForm((prev) => {
        const next = {
          ...prev,
          lines: prev.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
        };
        setTimeout(() => triggerGenerate(next), 0);
        return next;
      });
    },
    [triggerGenerate],
  );

  const addLine = useCallback(() => {
    setForm((prev) => {
      const next = {
        ...prev,
        lines: [
          ...prev.lines,
          {
            key: lineKeyCounter++,
            description: '',
            quantity: '',
            unitPrice: '',
            category: currentTemplate.categories[0],
          },
        ],
      };
      setTimeout(() => triggerGenerate(next), 0);
      return next;
    });
    trackEvent('generator_line_added' as any);
  }, [currentTemplate, triggerGenerate]);

  const removeLine = useCallback(
    (key: number) => {
      setForm((prev) => {
        if (prev.lines.length <= 1) return prev;
        const next = { ...prev, lines: prev.lines.filter((l) => l.key !== key) };
        setTimeout(() => triggerGenerate(next), 0);
        return next;
      });
      trackEvent('generator_line_removed' as any);
    },
    [triggerGenerate],
  );

  /* ---- TRN helpers ---- */

  const supplierTrnDisplay = stripTrn(form.supplierTrn);
  const customerTrnDisplay = stripTrn(form.customerTrn);
  const supplierTrnOk = form.supplierTrn === '' || trnValid(form.supplierTrn);
  const customerTrnOk = form.customerTrn === '' || trnValid(form.customerTrn);

  /* ---- derived ---- */

  const isReady = state.phase === 'ready';
  const isError = state.phase === 'error';
  const isBuilding = state.phase === 'building';
  const canSubmit = isMinimallyValid(form) && supplierTrnOk && customerTrnOk;
  const step1Class = 'generator-step' + (isReady ? ' done' : state.phase !== 'idle' ? ' active' : '');
  const step2Class = 'generator-step' + (isReady ? ' active' : '');

  /* ---- field errors map ---- */

  const fieldErrors: Record<string, string> = {};
  if (isError && state.fieldErrors) {
    for (const fe of state.fieldErrors) {
      fieldErrors[fe.field] = fe.message;
    }
  }

  /* ---- render ---- */

  return h(
    'div',
    { className: 'generator-workspace', 'data-testid': 'generator-workspace' },

    /* ================================================================
       STEPPER
       ================================================================ */
    h(
      'div',
      { className: 'generator-stepper', 'aria-label': 'Generator progress' },
      h(
        'div',
        { className: step1Class },
        h('div', { className: 'generator-dot' }, '1'),
        h('div', { className: 'generator-label' }, 'Build'),
      ),
      h(
        'div',
        { className: step2Class },
        h('div', { className: 'generator-dot' }, '2'),
        h('div', { className: 'generator-label' }, 'Validate'),
      ),
    ),

    /* ================================================================
       MAIN LAYOUT: form left, preview right
       ================================================================ */
    h(
      'div',
      { className: 'generator-layout' },

      /* ---- LEFT COLUMN: Form ---- */
      h(
        'div',
        { className: 'generator-form' },

        /* ---- Document Section ---- */
        h(
          'div',
          { className: 'generator-section' },
          h('h3', { className: 'generator-section-title' }, 'Document'),

          /* Template select */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Template'),
            h(
              'select',
              {
                className: 'generator-select',
                value: form.template,
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                  const newTemplate = e.target.value;
                  setForm((prev) => {
                    const tmpl = TEMPLATES.find((t) => t.id === newTemplate);
                    const newCat = tmpl ? tmpl.categories[0] : 'S';
                    const next = {
                      ...prev,
                      template: newTemplate,
                      lines: prev.lines.map((l) => ({
                        ...l,
                        category: tmpl?.categories.includes(l.category) ? l.category : newCat,
                      })),
                    };
                    setTimeout(() => triggerGenerate(next), 0);
                    return next;
                  });
                },
                'data-testid': 'template-select',
              },
              TEMPLATES.map((t) =>
                h('option', { key: t.id, value: t.id }, t.name),
              ),
            ),
          ),

          /* Invoice number */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Invoice number'),
            h('input', {
              className: 'generator-input',
              type: 'text',
              value: form.invoiceNumber,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateForm({ invoiceNumber: e.target.value }),
              placeholder: 'e.g. INV-2026-001',
              'data-testid': 'invoice-number',
            }),
            fieldErrors['invoiceNumber']
              ? h('span', { className: 'generator-field-error' }, fieldErrors['invoiceNumber'])
              : null,
          ),

          /* Issue date */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Issue date'),
            h('input', {
              className: 'generator-input',
              type: 'date',
              value: form.issueDate,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateForm({ issueDate: e.target.value }),
              'data-testid': 'issue-date',
            }),
            fieldErrors['issueDate']
              ? h('span', { className: 'generator-field-error' }, fieldErrors['issueDate'])
              : null,
          ),

          /* Due date (optional) */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Due date (optional)'),
            h('input', {
              className: 'generator-input',
              type: 'date',
              value: form.dueDate,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateForm({ dueDate: e.target.value }),
              'data-testid': 'due-date',
            }),
          ),

          /* Currency chip */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Currency'),
            h('span', { className: 'generator-chip' }, 'AED'),
          ),

          /* Profile chip */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Profile'),
            h(
              'span',
              { className: 'generator-chip generator-chip--readonly' },
              'PINT-AE billing 1.0.4',
            ),
          ),
        ),

        /* ---- Parties Section ---- */
        h(
          'div',
          { className: 'generator-section' },
          h('h3', { className: 'generator-section-title' }, 'Parties'),

          /* Supplier TRN */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Supplier TRN'),
            h('input', {
              className: 'generator-input' + (!supplierTrnOk ? ' generator-input--error' : ''),
              type: 'text',
              value: form.supplierTrn,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value;
                updateForm({ supplierTrn: raw });
              },
              placeholder: '15-digit TRN',
              'data-testid': 'supplier-trn',
            }),
            supplierTrnDisplay && !supplierTrnOk
              ? h(
                  'span',
                  { className: 'generator-field-error' },
                  'TRN must be exactly 15 digits',
                )
              : null,
            fieldErrors['supplier.trn']
              ? h('span', { className: 'generator-field-error' }, fieldErrors['supplier.trn'])
              : null,
          ),

          /* Supplier name */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Supplier name'),
            h('input', {
              className: 'generator-input',
              type: 'text',
              value: form.supplierName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateForm({ supplierName: e.target.value }),
              placeholder: 'Legal entity name',
              'data-testid': 'supplier-name',
            }),
          ),

          /* Customer TRN */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Customer TRN'),
            h('input', {
              className: 'generator-input' + (!customerTrnOk ? ' generator-input--error' : ''),
              type: 'text',
              value: form.customerTrn,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const raw = e.target.value;
                updateForm({ customerTrn: raw });
              },
              placeholder: '15-digit TRN',
              'data-testid': 'customer-trn',
            }),
            customerTrnDisplay && !customerTrnOk
              ? h(
                  'span',
                  { className: 'generator-field-error' },
                  'TRN must be exactly 15 digits',
                )
              : null,
            fieldErrors['customer.trn']
              ? h('span', { className: 'generator-field-error' }, fieldErrors['customer.trn'])
              : null,
          ),

          /* Customer name */
          h(
            'div',
            { className: 'generator-field' },
            h('label', { className: 'generator-label-text' }, 'Customer name'),
            h('input', {
              className: 'generator-input',
              type: 'text',
              value: form.customerName,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                updateForm({ customerName: e.target.value }),
              placeholder: 'Legal entity name',
              'data-testid': 'customer-name',
            }),
          ),
        ),

        /* ---- Lines Section ---- */
        h(
          'div',
          { className: 'generator-section' },
          h('h3', { className: 'generator-section-title' }, 'Lines'),
          h(
            'div',
            { className: 'generator-lines', 'data-testid': 'lines-section' },
            form.lines.map((line, idx) => {
              const ext = computeLineExt(line);
              return h(
                'div',
                { key: line.key, className: 'generator-row', 'data-testid': `line-row-${idx}` },
                h(
                  'div',
                  { className: 'generator-row-fields' },
                  h('input', {
                    className: 'generator-input',
                    type: 'text',
                    value: line.description,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(line.key, { description: e.target.value }),
                    placeholder: 'Description',
                    'aria-label': 'Line description',
                    'data-testid': `line-description-${idx}`,
                  }),
                  h('input', {
                    className: 'generator-input generator-input--narrow',
                    type: 'number',
                    value: line.quantity,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(line.key, { quantity: e.target.value }),
                    placeholder: 'Qty',
                    min: '0',
                    step: 'any',
                    'aria-label': 'Quantity',
                    'data-testid': `line-quantity-${idx}`,
                  }),
                  h('input', {
                    className: 'generator-input generator-input--narrow',
                    type: 'number',
                    value: line.unitPrice,
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(line.key, { unitPrice: e.target.value }),
                    placeholder: 'Unit price',
                    min: '0',
                    step: 'any',
                    'aria-label': 'Unit price',
                    'data-testid': `line-unit-price-${idx}`,
                  }),
                  h(
                    'select',
                    {
                      className: 'generator-select',
                      value: line.category,
                      onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                        updateLine(line.key, { category: e.target.value }),
                      'aria-label': 'VAT category',
                      'data-testid': `line-category-${idx}`,
                    },
                    currentTemplate.categories.map((cat) => {
                      const def = CATEGORIES.find((c) => c.code === cat);
                      return h(
                        'option',
                        { key: cat, value: cat },
                        def ? def.label : cat,
                      );
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'generator-row-ext' },
                  ext !== null
                    ? h(
                        'span',
                        { className: 'generator-ext', 'data-testid': `line-ext-${idx}` },
                        `AED ${ext.toFixed(2)}`,
                      )
                    : null,
                  form.lines.length > 1
                    ? h(
                        'button',
                        {
                          className: 'btn btn-ghost generator-remove-line',
                          type: 'button',
                          onClick: () => removeLine(line.key),
                          'aria-label': 'Remove line',
                          'data-testid': `line-remove-${idx}`,
                        },
                        '✕',
                      )
                    : null,
                ),
              );
            }),
            h(
              'button',
              {
                className: 'btn btn-ghost generator-add-line',
                type: 'button',
                onClick: addLine,
                'data-testid': 'add-line',
              },
              '+ Add line',
            ),
          ),
        ),

        /* ---- Totals Strip ---- */
        h(
          'div',
          { className: 'generator-totals', 'data-testid': 'totals-strip' },
          h('h3', { className: 'generator-section-title' }, 'Totals'),
          h(
            'div',
            { className: 'generator-totals-grid' },
            h(
              'div',
              { className: 'generator-total-row' },
              h('span', { className: 'generator-total-label' }, 'Line extension'),
              h(
                'span',
                { className: 'generator-total-value', 'data-testid': 'total-line-extension' },
                `AED ${totals.lineExtension.toFixed(2)}`,
              ),
            ),
            ...Object.keys(totals.byCategory).map((cat) => {
              const def = CATEGORIES.find((c) => c.code === cat);
              const label = def ? def.label.split(' — ')[0] : cat;
              const bc = totals.byCategory[cat];
              return h(
                'div',
                { key: cat, className: 'generator-total-row' },
                h('span', { className: 'generator-total-label' }, `Tax ${label}`),
                h(
                  'span',
                  { className: 'generator-total-value', 'data-testid': `total-tax-${cat}` },
                  `AED ${bc.tax.toFixed(2)}`,
                ),
              );
            }),
            h(
              'div',
              { className: 'generator-total-row' },
              h('span', { className: 'generator-total-label' }, 'Tax exclusive'),
              h(
                'span',
                { className: 'generator-total-value', 'data-testid': 'total-tax-exclusive' },
                `AED ${totals.taxExclusive.toFixed(2)}`,
              ),
            ),
            h(
              'div',
              { className: 'generator-total-row' },
              h('span', { className: 'generator-total-label' }, 'Tax inclusive'),
              h(
                'span',
                { className: 'generator-total-value', 'data-testid': 'total-tax-inclusive' },
                `AED ${totals.taxInclusive.toFixed(2)}`,
              ),
            ),
            h(
              'div',
              { className: 'generator-total-row generator-total-row--payable' },
              h('span', { className: 'generator-total-label' }, 'Payable'),
              h(
                'span',
                { className: 'generator-total-value', 'data-testid': 'total-payable' },
                `AED ${totals.payable.toFixed(2)}`,
              ),
            ),
          ),
        ),

        /* ---- Actions row ---- */
        h(
          'div',
          { className: 'generator-actions' },
          isReady
            ? h(
                'button',
                {
                  className: 'btn btn-primary',
                  type: 'button',
                  onClick: handleDownload,
                  'data-testid': 'download-btn',
                },
                '⬇ Download XML',
              )
            : null,
          isReady
            ? h(
                'button',
                {
                  className: 'btn btn-ghost',
                  type: 'button',
                  onClick: handleCopy,
                  'data-testid': 'copy-btn',
                },
                copied ? 'Copied' : 'Copy',
              )
            : null,
          h(
            'button',
            {
              className: 'btn btn-ghost',
              type: 'button',
              onClick: handleStartOver,
              'data-testid': 'start-over-btn',
            },
            'Start over',
          ),
          h(
            'button',
            {
              className: 'btn btn-ghost',
              type: 'button',
              onClick: handleFillSample,
              'data-testid': 'fill-sample-btn',
            },
            'Fill with sample',
          ),
        ),

        /* ---- Error state ---- */
        isError
          ? h(
              'div',
              {
                className: 'generator-error',
                'aria-live': 'assertive',
                'data-testid': 'generator-error',
              },
              h('span', { className: 'generator-error-text' }, state.message),
            )
          : null,

        /* ---- Next panel: Step 2 — Validate ---- */
        isReady
          ? h(
              'div',
              { className: 'generator-next-panel', 'data-testid': 'validate-panel' },
              h('strong', { style: { fontSize: '0.95rem' } }, 'Step 2 — Validate'),
              h(
                'p',
                { className: 'muted', style: { margin: '6px 0 12px' } },
                'Run this generated invoice through the rule engine.',
              ),
              h(
                'button',
                {
                  className: 'btn btn-primary',
                  type: 'button',
                  onClick: handleValidate,
                  'data-testid': 'validate-btn',
                },
                'Validate this invoice →',
              ),
            )
          : null,

        /* ---- Legend strip ---- */
        h(
          'div',
          {
            className: 'generator-legend',
            'data-testid': 'legend-strip',
          },
          h(
            'span',
            null,
            'While you type: data-entry checks · Structure: guaranteed (official template) · Final verdict: the Checker.',
          ),
        ),
      ),

      /* ---- RIGHT COLUMN: XML Preview ---- */
      (isReady || isBuilding)
        ? h(
            'div',
            { className: 'generator-preview', 'data-testid': 'xml-preview' },
            h(
              'div',
              { className: 'generator-preview-header' },
              h('span', null, 'XML Preview'),
              isBuilding
                ? h('span', { className: 'generator-spinner' })
                : null,
            ),
            h('pre', { className: 'generator-preview-code' }, state.phase === 'ready' ? state.xml : ''),
          )
        : null,
    ),

    /* ================================================================
       DRAFT BANNER
       ================================================================ */
    h(
      'div',
      {
        className: 'generator-draft-banner',
        'data-testid': 'draft-banner',
      },
      h(
        'strong',
        null,
        'Machine-drafted preflight file. Review every field before use — not FTA-accredited, not transmitted to the FTA.',
      ),
    ),
  );
}
