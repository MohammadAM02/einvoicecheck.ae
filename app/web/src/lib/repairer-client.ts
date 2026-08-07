export const MAX_BROWSER_DOCUMENT_BYTES = 256 * 1024;

export class RepairerClientError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'RepairerClientError';
  }
}

export type AuditEntry = {
  rule: string;
  action: 'rename' | 'replace' | 'add' | 'remove';
  target: string;
  old: string;
  new: string;
  reason: string;
};

export type BlockedIssue = {
  rule: string;
  path: string;
  message: string;
};

export type ConvertResult = {
  status: 'CONVERTED' | 'NOOP' | 'REFUSED' | 'ERROR';
  reason?: 'UNREPAIRABLE_FORMAT' | 'DATA_SEMANTIC' | 'DATA_CHANGED';
  detail?: string;
  parseHint?: string;
  inputHash: string;
  outputHash?: string;
  audit: AuditEntry[];
  blocked: BlockedIssue[];
  dataIssues: BlockedIssue[];
  wouldFix?: string[];
  output?: string;
  engineVersion: string;
  convertedAt: string;
};

type ConvertApiResponse = {
  ok: true;
  result: ConvertResult;
  rateLimit: { limit: number; remaining: number; resetSeconds: number; degraded: boolean };
};

type ConvertApiError = {
  ok?: boolean;
  error?: string;
};

export async function convertXml(
  xml: string,
  mode?: 'format' | 'full',
  signal?: AbortSignal,
): Promise<ConvertApiResponse> {
  const response = await fetch('/api/tools/convert', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mode ? { xml, mode } : { xml }),
    signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RepairerClientError(`Conversion failed with HTTP ${response.status}.`, response.status);
  }

  if (typeof body !== 'object' || body === null) {
    throw new RepairerClientError(`Conversion failed with HTTP ${response.status}.`, response.status);
  }

  const apiBody = body as ConvertApiResponse | ConvertApiError;
  if (!response.ok || apiBody.ok !== true) {
    const message = 'error' in apiBody && typeof apiBody.error === 'string'
      ? apiBody.error
      : `Conversion failed with HTTP ${response.status}.`;
    throw new RepairerClientError(message, response.status);
  }

  return apiBody as ConvertApiResponse;
}

export async function readXmlFile(file: File): Promise<string> {
  if (file.size > MAX_BROWSER_DOCUMENT_BYTES) {
    throw new RepairerClientError('File is larger than 256 KB. Choose a smaller XML invoice.', 413);
  }

  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!['.xml', '.txt'].includes(extension)) {
    throw new RepairerClientError('Choose an XML invoice file (.xml or .txt).');
  }

  return file.text();
}
