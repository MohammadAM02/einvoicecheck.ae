import type { ValidateApiSuccess } from '@/lib/validation-ui';

export const MAX_BROWSER_DOCUMENT_BYTES = 256 * 1024;

export class ValidationClientError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'ValidationClientError';
  }
}

type ValidateApiError = {
  ok?: boolean;
  error?: string;
};

export async function validateInvoiceDocument(document: string, signal?: AbortSignal): Promise<ValidateApiSuccess> {
  const response = await fetch('/api/tools/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document }),
    signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ValidationClientError(`Validation failed with HTTP ${response.status}.`, response.status);
  }

  if (typeof body !== 'object' || body === null) {
    throw new ValidationClientError(`Validation failed with HTTP ${response.status}.`, response.status);
  }

  const apiBody = body as ValidateApiSuccess | ValidateApiError;
  if (!response.ok || apiBody.ok !== true) {
    const message = 'error' in apiBody && typeof apiBody.error === 'string'
      ? apiBody.error
      : `Validation failed with HTTP ${response.status}.`;
    throw new ValidationClientError(message, response.status);
  }

  return apiBody as ValidateApiSuccess;
}

export async function readInvoiceFile(file: File): Promise<string> {
  if (file.size > MAX_BROWSER_DOCUMENT_BYTES) {
    throw new ValidationClientError('File is larger than 256 KB. Choose a smaller XML invoice.', 413);
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!['.xml', '.txt'].includes(extension)) {
    throw new ValidationClientError('Choose an XML invoice file.');
  }

  return file.text();
}
