/**
 * Browser-side import adapter for the XML Generator (Part A).
 *
 * Accepts exactly two supported containers:
 *   - the published EInvoiceCheck CSV template (one row per invoice line,
 *     rows grouped by invoiceNumber);
 *   - Generator JSON — `{ template, data }` or an array of one to 50 such
 *     objects (the same shape POST /v1/generate accepts; NOT the Validator's
 *     larger canonical JSON DTO).
 *
 * Parsing happens entirely in the browser: the original file stays in memory,
 * never uploaded or persisted. The output is the Generator's existing
 * `{ template, data }` contract — the backend remains the authoritative
 * validator for every submitted object.
 *
 * Unknown POPULATED fields always fail the affected import — nothing is ever
 * silently dropped or reinterpreted. Blank-only unknown columns/keys are
 * allowed.
 */
import Papa from 'papaparse';
import type { GenerateInput } from './generator-client';

export const CSV_HEADERS = [
  'template',
  'invoiceNumber',
  'issueDate',
  'dueDate',
  'supplierTrn',
  'supplierName',
  'customerTrn',
  'customerName',
  'lineName',
  'quantity',
  'unitPrice',
  'category',
] as const;

export const MAX_IMPORT_INVOICES = 50;
export const MIN_IMPORT_INVOICES = 1;
export const IMPORT_TEMPLATE_PATH = '/templates/einvoicecheck-import-template.csv';

/** Generator templates supported by the import (mirrors the API registry). */
export const IMPORT_TEMPLATES: Record<string, { name: string; categories: string[] }> = {
  'standard-tax-invoice': { name: 'Standard tax invoice', categories: ['S'] },
  'summary-tax-invoice': { name: 'Summary tax invoice', categories: ['E', 'O', 'Z'] },
  'standard-tax-credit-note': { name: 'Standard tax credit note', categories: ['S'] },
};

export type ImportInvoice = GenerateInput;

export type ImportFieldError = {
  /** 1-based source row (CSV data row or JSON array entry). */
  row: number;
  field: string;
  message: string;
};

export type ImportFatalError = {
  message: string;
};

export type ImportPreviewInvoice = {
  template: string;
  invoiceNumber: string;
  lineCount: number;
  /** 1-based source rows that produced this invoice. */
  sourceRows: number[];
};

export type ImportParseResult = {
  kind: 'csv' | 'json';
  invoices: ImportInvoice[];
  invoiceErrors: ImportFieldError[];
  fatals: ImportFatalError[];
  preview: ImportPreviewInvoice[];
  invoiceCount: number;
};

/* ------------------------------------------------------------------ */
/*  Shared field validation (CSV and JSON use the same rules)           */
/* ------------------------------------------------------------------ */

const TRN_RE = /^\d{15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shape plus calendar-range check (month 01-12, day 01-31). */
function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [, mm, dd] = value.split('-').map(Number);
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
}

function stripTrn(value: string): string {
  return value.replace(/\s|-/g, '');
}

function blank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Invoice-level required/format checks. Returns { field, message } errors. */
function invoiceFieldErrors(entry: {
  invoiceNumber: unknown;
  issueDate: unknown;
  dueDate: unknown;
  supplierTrn: unknown;
  supplierName: unknown;
  customerTrn: unknown;
  customerName: unknown;
}): ImportFieldError[] {
  const errors: ImportFieldError[] = [];
  if (blank(entry.invoiceNumber)) {
    errors.push({ row: 0, field: 'invoiceNumber', message: 'Invoice number is required.' });
  }
  if (blank(entry.issueDate) || !validDate(entry.issueDate)) {
    errors.push({ row: 0, field: 'issueDate', message: 'Issue date must be a valid YYYY-MM-DD date.' });
  }
  if (!blank(entry.dueDate) && !validDate(entry.dueDate)) {
    errors.push({ row: 0, field: 'dueDate', message: 'Due date must be a valid YYYY-MM-DD date.' });
  }
  if (blank(entry.supplierTrn) || !TRN_RE.test(stripTrn(String(entry.supplierTrn)))) {
    errors.push({ row: 0, field: 'supplierTrn', message: 'Supplier TRN must be exactly 15 digits.' });
  }
  if (blank(entry.supplierName)) {
    errors.push({ row: 0, field: 'supplierName', message: 'Supplier name is required.' });
  }
  if (blank(entry.customerTrn) || !TRN_RE.test(stripTrn(String(entry.customerTrn)))) {
    errors.push({ row: 0, field: 'customerTrn', message: 'Customer TRN must be exactly 15 digits.' });
  }
  if (blank(entry.customerName)) {
    errors.push({ row: 0, field: 'customerName', message: 'Customer name is required.' });
  }
  return errors;
}

function lineFieldErrors(line: {
  name: unknown;
  quantity: unknown;
  unitPrice: unknown;
  category: unknown;
}, templateId: string): ImportFieldError[] {
  const errors: ImportFieldError[] = [];
  if (blank(line.name)) {
    errors.push({ row: 0, field: 'lineName', message: 'Line name is required.' });
  }
  const qty = Number(line.quantity);
  if (blank(line.quantity) || !Number.isFinite(qty) || qty <= 0) {
    errors.push({ row: 0, field: 'quantity', message: 'Quantity must be a positive number.' });
  }
  const price = Number(line.unitPrice);
  if (blank(line.unitPrice) || !Number.isFinite(price) || price < 0) {
    errors.push({ row: 0, field: 'unitPrice', message: 'Unit price must be a non-negative number.' });
  }
  const template = IMPORT_TEMPLATES[templateId];
  if (blank(line.category) || !template || !template.categories.includes(String(line.category))) {
    const allowed = template ? template.categories.join(', ') : 'S, E, O, Z';
    errors.push({ row: 0, field: 'category', message: `Category must be one of: ${allowed}.` });
  }
  return errors;
}

/** Normalize a validated invoice into the Generator `{ template, data }` shape. */
function buildInvoice(
  templateId: string,
  entry: {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    supplierTrn: string;
    supplierName: string;
    customerTrn: string;
    customerName: string;
    lines: { name: string; quantity: number; unitPrice: number; category: string }[];
  },
): ImportInvoice {
  return {
    template: templateId,
    data: {
      invoiceNumber: entry.invoiceNumber,
      issueDate: entry.issueDate,
      ...(entry.dueDate ? { dueDate: entry.dueDate } : {}),
      supplier: { trn: stripTrn(entry.supplierTrn), name: entry.supplierName },
      customer: { trn: stripTrn(entry.customerTrn), name: entry.customerName },
      lines: entry.lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        category: l.category,
      })),
    },
  };
}

/** Attach row numbers to a normalized error list for one import unit. */
function withRow(errors: ImportFieldError[], row: number): ImportFieldError[] {
  return errors.map((e) => ({ ...e, row }));
}

/* ------------------------------------------------------------------ */
/*  CSV                                                                */
/* ------------------------------------------------------------------ */

/**
 * Parse the published CSV container. Returns normalized invoices plus row-level
 * errors and whole-import fatal errors. The browser never computes totals or
 * authoritative XML — the backend Generator does that.
 */
export function parseCsvImport(text: string): ImportParseResult {
  const result = parseCsvRows(text);
  const { rows, headerErrors, unknownColumns } = result;
  const invoiceErrors: ImportFieldError[] = [];
  const fatals: ImportFatalError[] = [];

  if (headerErrors.length > 0) {
    return {
      kind: 'csv',
      invoices: [],
      invoiceErrors: [],
      fatals: headerErrors,
      preview: [],
      invoiceCount: 0,
    };
  }

  if (unknownColumns.length > 0) {
    for (const column of unknownColumns) {
      fatals.push({
        message:
          `Unknown column "${column}" contains values. EInvoiceCheck never drops or reinterprets ` +
          'unrecognized fields — remove the column or leave every value blank.',
      });
    }
    return {
      kind: 'csv',
      invoices: [],
      invoiceErrors: [],
      fatals,
      preview: [],
      invoiceCount: 0,
    };
  }

  // Group rows by invoiceNumber. Each row is one invoice line.
  interface Group {
    invoiceNumber: string;
    template: string;
    issueDate: string;
    dueDate: string;
    supplierTrn: string;
    supplierName: string;
    customerTrn: string;
    customerName: string;
    rows: number[];
    lines: {
      name: string;
      quantity: number;
      unitPrice: number;
      category: string;
    }[];
    errors: ImportFieldError[];
  }
  const groups = new Map<string, Group>();

  const rowEntry = (raw: Record<string, unknown>, row: number): Group | null => {
    const get = (key: string): string => {
      const v = raw[key];
      return v === undefined || v === null ? '' : String(v).trim();
    };
    const invoiceNumber = get('invoiceNumber');
    if (!invoiceNumber) {
      invoiceErrors.push({ row, field: 'invoiceNumber', message: 'Invoice number is required.' });
      return null;
    }
    const existing = groups.get(invoiceNumber);
    if (existing) return existing;

    const group: Group = {
      invoiceNumber,
      template: get('template'),
      issueDate: get('issueDate'),
      dueDate: get('dueDate'),
      supplierTrn: get('supplierTrn'),
      supplierName: get('supplierName'),
      customerTrn: get('customerTrn'),
      customerName: get('customerName'),
      rows: [],
      lines: [],
      errors: [],
    };
    groups.set(invoiceNumber, group);
    return group;
  };

  rows.forEach((raw, index) => {
    const row = index + 1;
    const get = (key: string): string => {
      const v = raw[key];
      return v === undefined || v === null ? '' : String(v).trim();
    };

    // A completely blank row is skipped (greedy skipEmptyLines also handles it).
    if (CSV_HEADERS.every((h) => get(h) === '')) return;

    const group = rowEntry(raw, row);
    if (!group) return;
    group.rows.push(row);

    // Invoice-level conflicts: repeated fields must match exactly across rows.
    const conflicts: Array<[string, string]> = [
      ['template', get('template')],
      ['issueDate', get('issueDate')],
      ['dueDate', get('dueDate')],
      ['supplierTrn', get('supplierTrn')],
      ['supplierName', get('supplierName')],
      ['customerTrn', get('customerTrn')],
      ['customerName', get('customerName')],
    ];
    for (const [field, value] of conflicts) {
      const current = group[field as keyof Pick<Group, 'template' | 'issueDate' | 'dueDate' | 'supplierTrn' | 'supplierName' | 'customerTrn' | 'customerName'>] as string;
      if (value !== '' && current !== '' && current !== value) {
        // Conflicts invalidate the whole invoice (spec: conflicting repeated
        // fields fail the import) — record on the group so it is never built.
        group.errors.push({
          row,
          field,
          message:
            `Conflicting value for ${field} ("${current}" vs "${value}"). Rows for one invoice ` +
            'must match exactly.',
        });
      }
    }
    if (group.template === '') group.template = get('template');
    if (group.issueDate === '') group.issueDate = get('issueDate');
    if (group.dueDate === '') group.dueDate = get('dueDate');
    if (group.supplierTrn === '') group.supplierTrn = get('supplierTrn');
    if (group.supplierName === '') group.supplierName = get('supplierName');
    if (group.customerTrn === '') group.customerTrn = get('customerTrn');
    if (group.customerName === '') group.customerName = get('customerName');

    // Line fields.
    const qty = Number(get('quantity'));
    const price = Number(get('unitPrice'));
    group.lines.push({
      name: get('lineName'),
      quantity: qty,
      unitPrice: price,
      category: get('category'),
    });
    group.errors.push(...withRow(lineFieldErrors({
      name: get('lineName'),
      quantity: get('quantity'),
      unitPrice: get('unitPrice'),
      category: get('category'),
    }, get('template')), row));
  });

  const invoiceErrorsFromGroups: ImportFieldError[] = [];
  const invoices: ImportInvoice[] = [];
  const preview: ImportPreviewInvoice[] = [];

  for (const group of groups.values()) {
    const template = IMPORT_TEMPLATES[group.template];
    const errors: ImportFieldError[] = [...group.errors];
    if (!template) {
      errors.push({
        row: group.rows[0],
        field: 'template',
        message:
          `Unknown template "${group.template}". Must be one of: ${Object.keys(IMPORT_TEMPLATES).join(', ')}.`,
      });
    }
    errors.push(...withRow(invoiceFieldErrors(group), group.rows[0]));
    invoiceErrorsFromGroups.push(...errors);

    if (errors.length === 0 && template) {
      invoices.push(buildInvoice(group.template, {
        invoiceNumber: group.invoiceNumber,
        issueDate: group.issueDate,
        dueDate: group.dueDate,
        supplierTrn: group.supplierTrn,
        supplierName: group.supplierName,
        customerTrn: group.customerTrn,
        customerName: group.customerName,
        lines: group.lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          category: l.category,
        })),
      }));
    }
    preview.push({
      template: group.template,
      invoiceNumber: group.invoiceNumber,
      lineCount: group.lines.length,
      sourceRows: [...group.rows],
    });
  }

  const invoiceCount = preview.length;
  if (invoiceCount === 0) {
    fatals.push({ message: 'No invoices found. Import a file with one to 50 invoices.' });
  } else if (invoiceCount > MAX_IMPORT_INVOICES) {
    fatals.push({
      message:
        `${invoiceCount} invoices found. Imports support ${MIN_IMPORT_INVOICES} to ` +
        `${MAX_IMPORT_INVOICES} invoices per file — split the file and try again.`,
    });
    return {
      kind: 'csv',
      invoices: [],
      invoiceErrors: [...invoiceErrors, ...invoiceErrorsFromGroups],
      fatals,
      preview: [],
      invoiceCount,
    };
  }

  return {
    kind: 'csv',
    invoices,
    invoiceErrors: [...invoiceErrors, ...invoiceErrorsFromGroups],
    fatals,
    preview,
    invoiceCount,
  };
}

function parseCsvRows(text: string): {
  rows: Record<string, string>[];
  headerErrors: ImportFatalError[];
  unknownColumns: string[];
} {
  // Strip the UTF-8 BOM before parsing (PapaParse leaves it on the first header).
  const BOM_CHAR = String.fromCharCode(0xfeff);
  const withoutBom = text.startsWith(BOM_CHAR) ? text.slice(1) : text;
  // PapaParse renames duplicate headers to `name_1` before exposing
  // meta.fields, so detect duplicates on the raw header row instead. The
  // published template has simple fixed headers; parse the first non-empty
  // line as the header row.
  const firstNonEmptyLine = withoutBom.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const rawHeaders = (Papa.parse<unknown[]>(firstNonEmptyLine).data[0] ?? []).map((h) => String(h ?? '').trim());
  const duplicateHeaders = rawHeaders.filter((f, i) => rawHeaders.indexOf(f) !== i);
  const parsed = Papa.parse<Record<string, string>>(withoutBom, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => (h ?? '').trim(),
  });

  const headerErrors: ImportFatalError[] = [];
  const fields = parsed.meta.fields ?? [];
  if (duplicateHeaders.length > 0) {
    headerErrors.push({
      message:
        `Duplicate column header(s): ${[...new Set(duplicateHeaders)].join(', ')}. ` +
        'Each column must appear exactly once.',
    });
    return { rows: [], headerErrors, unknownColumns: [] };
  }

  for (const err of parsed.errors) {
    if (err.type === 'FieldMismatch') {
      headerErrors.push({ message: `CSV parse error at row ${(err.row ?? 0) + 1}: ${err.message}` });
    }
  }
  if (headerErrors.length > 0) {
    return { rows: [], headerErrors, unknownColumns: [] };
  }

  // Unknown columns are allowed only when every value is blank.
  const unknownColumns = fields.filter((f) => !(CSV_HEADERS as readonly string[]).includes(f));
  const populatedUnknown = unknownColumns.filter((column) =>
    parsed.data.some((row) => {
      const v = row[column];
      return v !== undefined && v !== null && String(v).trim() !== '';
    }),
  );

  return {
    rows: parsed.data,
    headerErrors: [],
    unknownColumns: populatedUnknown,
  };
}

/* ------------------------------------------------------------------ */
/*  Generator JSON                                                     */
/* ------------------------------------------------------------------ */

const JSON_ALLOWED_DATA_KEYS = new Set(['invoiceNumber', 'issueDate', 'dueDate', 'supplier', 'customer', 'lines']);
const JSON_ALLOWED_PARTY_KEYS = new Set(['trn', 'name']);
const JSON_ALLOWED_LINE_KEYS = new Set(['name', 'quantity', 'unitPrice', 'category']);

function populatedUnknownKeys(obj: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(obj).filter((key) => !allowed.has(key) && !blank(obj[key]));
}

/** Parse Generator JSON: `{ template, data }` or a 1–50 array of that shape. */
export function parseJsonImport(text: string): ImportParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return {
      kind: 'json',
      invoices: [],
      invoiceErrors: [],
      fatals: [{ message: `Invalid JSON: ${e instanceof Error ? e.message : 'could not be parsed'}.` }],
      preview: [],
      invoiceCount: 0,
    };
  }

  const entries = Array.isArray(value) ? value : [value];
  if (entries.length === 0) {
    return {
      kind: 'json',
      invoices: [],
      invoiceErrors: [],
      fatals: [{ message: 'No invoices found. Import a file with one to 50 invoices.' }],
      preview: [],
      invoiceCount: 0,
    };
  }
  if (entries.length > MAX_IMPORT_INVOICES) {
    return {
      kind: 'json',
      invoices: [],
      invoiceErrors: [],
      fatals: [{
        message:
          `${entries.length} invoices found. Imports support ${MIN_IMPORT_INVOICES} to ` +
          `${MAX_IMPORT_INVOICES} invoices per file — split the file and try again.`,
      }],
      preview: [],
      invoiceCount: 0,
    };
  }

  const invoiceErrors: ImportFieldError[] = [];
  const invoices: ImportInvoice[] = [];
  const preview: ImportPreviewInvoice[] = [];

  entries.forEach((entry, index) => {
    const row = index + 1;
    const errors: ImportFieldError[] = [];

    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      invoiceErrors.push({ row, field: 'entry', message: 'Each entry must be an object with template and data.' });
      return;
    }
    const obj = entry as Record<string, unknown>;
    const templateId = typeof obj.template === 'string' ? obj.template : '';
    const template = IMPORT_TEMPLATES[templateId];
    if (!template) {
      invoiceErrors.push({
        row,
        field: 'template',
        message: `Unknown template "${templateId}". Must be one of: ${Object.keys(IMPORT_TEMPLATES).join(', ')}.`,
      });
    }
    if (typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) {
      invoiceErrors.push({ row, field: 'data', message: 'data must be an object.' });
      return;
    }
    const data = obj.data as Record<string, unknown>;
    for (const key of populatedUnknownKeys(data, JSON_ALLOWED_DATA_KEYS)) {
      errors.push({
        row,
        field: key,
        message: `Unsupported field "${key}". Remove it or leave it blank; EInvoiceCheck never drops or reinterprets fields.`,
      });
    }

    const supplier = (typeof data.supplier === 'object' && data.supplier !== null ? data.supplier : {}) as Record<string, unknown>;
    const customer = (typeof data.customer === 'object' && data.customer !== null ? data.customer : {}) as Record<string, unknown>;
    for (const key of populatedUnknownKeys(supplier, JSON_ALLOWED_PARTY_KEYS)) {
      errors.push({
        row,
        field: `supplier.${key}`,
        message: `Unsupported field "supplier.${key}". Remove it or leave it blank; EInvoiceCheck never drops or reinterprets fields.`,
      });
    }
    for (const key of populatedUnknownKeys(customer, JSON_ALLOWED_PARTY_KEYS)) {
      errors.push({
        row,
        field: `customer.${key}`,
        message: `Unsupported field "customer.${key}". Remove it or leave it blank; EInvoiceCheck never drops or reinterprets fields.`,
      });
    }

    const linesRaw = Array.isArray(data.lines) ? data.lines : [];
    const lineErrors: ImportFieldError[] = [];
    const lines: { name: string; quantity: number; unitPrice: number; category: string }[] = [];
    if (linesRaw.length === 0) {
      errors.push({ row, field: 'lines', message: 'At least one invoice line is required.' });
    }
    linesRaw.forEach((rawLine, i) => {
      if (typeof rawLine !== 'object' || rawLine === null || Array.isArray(rawLine)) {
        lineErrors.push({ row, field: `lines[${i}]`, message: 'Each line must be an object.' });
        return;
      }
      const line = rawLine as Record<string, unknown>;
      for (const key of populatedUnknownKeys(line, JSON_ALLOWED_LINE_KEYS)) {
        lineErrors.push({
          row,
          field: `lines[${i}].${key}`,
          message: `Unsupported field "lines[${i}].${key}". Remove it or leave it blank; EInvoiceCheck never drops or reinterprets fields.`,
        });
      }
      lineErrors.push(...withRow(lineFieldErrors({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        category: line.category,
      }, templateId), row).map((e) => ({
        ...e,
        field: e.field === 'lineName' ? `lines[${i}].name` : `lines[${i}].${e.field}`,
      })));
      lines.push({
        name: String(line.name ?? ''),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        category: String(line.category ?? ''),
      });
    });
    errors.push(...lineErrors);

    errors.push(...withRow(invoiceFieldErrors({
      invoiceNumber: data.invoiceNumber,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      supplierTrn: supplier.trn,
      supplierName: supplier.name,
      customerTrn: customer.trn,
      customerName: customer.name,
    }), row));

    invoiceErrors.push(...errors);

    if (errors.length === 0 && template) {
      invoices.push(buildInvoice(templateId, {
        invoiceNumber: String(data.invoiceNumber),
        issueDate: String(data.issueDate),
        dueDate: blank(data.dueDate) ? undefined : String(data.dueDate),
        supplierTrn: String(supplier.trn),
        supplierName: String(supplier.name),
        customerTrn: String(customer.trn),
        customerName: String(customer.name),
        lines,
      }));
    }
    preview.push({
      template: templateId,
      invoiceNumber: blank(data.invoiceNumber) ? '' : String(data.invoiceNumber),
      lineCount: linesRaw.length,
      sourceRows: [row],
    });
  });

  return {
    kind: 'json',
    invoices,
    invoiceErrors,
    fatals: [],
    preview,
    invoiceCount: preview.length,
  };
}

/* ------------------------------------------------------------------ */
/*  File dispatch                                                      */
/* ------------------------------------------------------------------ */

export function parseImportFile(file: File): Promise<ImportParseResult> {
  return file.text().then((text) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.json')) return parseJsonImport(text);
    if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsvImport(text);
    throw new Error('Choose a CSV or Generator JSON file.');
  });
}

/** True when every invoice-level error carries its own row (preview grouping helper). */
export function readyCount(result: ImportParseResult): number {
  return result.invoices.length;
}

/* ------------------------------------------------------------------ */
/*  ZIP download of successful invoices                                */
/* ------------------------------------------------------------------ */

/**
 * Filesystem-safe base name derived from an invoice number. Falls back to a
 * generic label; collisions get a numeric suffix so no file is ever overwritten.
 */
export function safeInvoiceFileName(invoiceNumber: string, used: Set<string>): string {
  const base = (invoiceNumber || 'invoice')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'invoice';
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

/**
 * Bundle every successful invoice into one ZIP of separate XML files. Never
 * combines invoices into a single XML document. jszip generates in memory —
 * nothing is persisted.
 */
export async function buildImportZip(
  successes: Array<{ invoiceNumber: string; xml: string }>,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const used = new Set<string>();
  for (const success of successes) {
    zip.file(`${safeInvoiceFileName(success.invoiceNumber, used)}.xml`, success.xml);
  }
  return zip.generateAsync({ type: 'blob' });
}

/** Trigger a browser download for an in-memory Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
