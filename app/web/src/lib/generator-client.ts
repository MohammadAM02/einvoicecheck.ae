export class GeneratorClientError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly fieldErrors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = 'GeneratorClientError';
  }
}

export type GenerateLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  category: string;
};

export type GenerateInput = {
  template: string;
  data: {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    supplier: { trn: string; name: string };
    customer: { trn: string; name: string };
    lines: GenerateLine[];
  };
};

export type GenerateSuccess = {
  ok: true;
  xml: string;
  template: string;
  engineVersion: string;
};

export type GenerateError = {
  ok: false;
  error: string;
  fieldErrors?: { field: string; message: string }[];
};

/** Shape returned by the web proxy /api/tools/generate (convert-style envelope). */
type GenerateApiEnvelope = {
  ok: true;
  result: GenerateSuccess;
  rateLimit: { limit: number; remaining: number; resetSeconds: number; degraded: boolean };
};

export async function generateXml(
  data: GenerateInput,
  signal?: AbortSignal,
): Promise<GenerateSuccess> {
  const response = await fetch('/api/tools/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GeneratorClientError(
      `Generation failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  if (typeof body !== 'object' || body === null) {
    throw new GeneratorClientError(
      `Generation failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  const apiBody = body as GenerateApiEnvelope | GenerateError;

  if (!response.ok || apiBody.ok !== true) {
    const message =
      'error' in apiBody && typeof apiBody.error === 'string'
        ? apiBody.error
        : `Generation failed with HTTP ${response.status}.`;
    throw new GeneratorClientError(
      message,
      response.status,
      'fieldErrors' in apiBody ? apiBody.fieldErrors : undefined,
    );
  }

  return apiBody.result;
}
