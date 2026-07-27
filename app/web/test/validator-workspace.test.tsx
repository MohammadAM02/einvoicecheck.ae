// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement as h } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const validationClient = vi.hoisted(() => ({
  readInvoiceFile: vi.fn(),
  validateInvoiceDocument: vi.fn(),
}));
const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/validation-client', () => ({
  ...validationClient,
  ValidationClientError: class ValidationClientError extends Error {
    status: number | null;
    constructor(message: string, status: number | null = null) {
      super(message);
      this.name = 'ValidationClientError';
      this.status = status;
    }
  },
}));
vi.mock('@/lib/validation-samples', () => ({
  VALID_JSON_SAMPLE: '{"sample":"valid"}',
  BROKEN_JSON_SAMPLE: '{"sample":"broken"}',
}));
vi.mock('@/lib/analytics', () => analytics);

import { ValidationClientError } from '@/lib/validation-client';
import { ValidatorWorkspace } from '@/components/validation/ValidatorWorkspace';

const success = {
  ok: true as const,
  result: { valid: true, invoiceType: '388', schemaVersion: 'PINT AE 1.0', errors: [] },
  rateLimit: { limit: 10, remaining: 9, resetSeconds: 60, degraded: false },
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderWorkspace() {
  return render(h(ValidatorWorkspace, { context: 'homepage' }));
}

describe('ValidatorWorkspace', () => {
  it('leads with free file validation copy without a signup requirement', () => {
    renderWorkspace();

    expect(screen.getByText('Validate a file — free')).toBeTruthy();
    expect(screen.getByText('XML or JSON · maximum 256 KB')).toBeTruthy();
    expect(screen.getByText('Processed in memory and not stored.')).toBeTruthy();
    expect(screen.queryByText(/sign up|required|signup/i)).toBeNull();
  });

  it('opens the file picker from the drop zone click and keyboard controls', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const input = screen.getByLabelText('Choose an XML or JSON invoice');
    const click = vi.spyOn(input, 'click');
    const dropZone = screen.getByTestId('invoice-drop-zone');

    await user.click(dropZone);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(click).toHaveBeenCalledTimes(3);
  });

  it('reads an uploaded file and sends its unchanged text to the validator without auth', async () => {
    const user = userEvent.setup();
    validationClient.readInvoiceFile.mockResolvedValue('  <Invoice>upload</Invoice>  ');
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();

    await user.upload(screen.getByLabelText('Choose an XML or JSON invoice'), new File(['ignored'], 'invoice.xml', { type: 'application/xml' }));

    await waitFor(() => expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith('  <Invoice>upload</Invoice>  ', expect.any(AbortSignal)));
    expect(validationClient.readInvoiceFile).toHaveBeenCalledOnce();
    expect(screen.getByText('invoice.xml')).toBeTruthy();
    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_input_selected', { context: 'homepage', method: 'upload' });
  });

  it('uses the same client flow for a dropped file and shows its name', async () => {
    validationClient.readInvoiceFile.mockResolvedValue('{"drop":true}');
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();
    const file = new File(['ignored'], 'dropped.json', { type: 'application/json' });

    fireEvent.drop(screen.getByTestId('invoice-drop-zone'), { dataTransfer: { files: [file] } });

    await waitFor(() => expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith('{"drop":true}', expect.any(AbortSignal)));
    expect(validationClient.readInvoiceFile).toHaveBeenCalledWith(file);
    expect(screen.getByText('dropped.json')).toBeTruthy();
    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_input_selected', { context: 'homepage', method: 'drop' });
  });

  it('links oversize local files to documentation without claiming a larger API limit', async () => {
    const user = userEvent.setup();
    validationClient.readInvoiceFile.mockRejectedValue(
      new ValidationClientError('File is larger than 256 KB. Choose a smaller XML or JSON invoice.', 413),
    );
    renderWorkspace();

    await user.upload(
      screen.getByLabelText('Choose an XML or JSON invoice'),
      new File(['oversize'], 'oversize.json', { type: 'application/json' }),
    );

    expect((await screen.findByRole('alert')).textContent).toContain('File is larger than 256 KB.');
    expect(screen.getByRole('link', { name: 'Read file size guidance' }).getAttribute('href')).toBe('/docs');
    expect(screen.queryByText(/API supports|larger payload|larger file/i)).toBeNull();
  });

  it('reveals paste input and submits its unchanged content', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    const input = screen.getByLabelText('Invoice XML or JSON');
    fireEvent.change(input, { target: { value: '  {"invoice":"paste"}  ' } });
    await user.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));

    await waitFor(() => expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith('  {"invoice":"paste"}  ', expect.any(AbortSignal)));
    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_input_selected', { context: 'homepage', method: 'paste' });
  });

  it.each([
    ['Try valid sample', '{"sample":"valid"}', 'valid_sample'],
    ['Try broken sample', '{"sample":"broken"}', 'broken_sample'],
  ] as const)('validates the %s without changing it', async (button, document, method) => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(validationClient.validateInvoiceDocument).toHaveBeenCalledWith(document, expect.any(AbortSignal)));
    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_input_selected', { context: 'homepage', method });
  });

  it.each([
    [429, 'Too many checks.'],
    [503, 'Validator temporarily unavailable.'],
  ])('retains pasted input and offers retry for server error %i', async (status, message) => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockRejectedValue(new ValidationClientError(message, status));
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    const input = screen.getByLabelText('Invoice XML or JSON');
    await user.type(input, 'retained server document');
    await user.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(message);
    expect((input as HTMLTextAreaElement).value).toBe('retained server document');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    expect(document.activeElement).toBe(alert);
    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_error', { context: 'homepage', status });
  });

  it('retains pasted input with a timeout message', async () => {
    vi.useFakeTimers();
    validationClient.validateInvoiceDocument.mockImplementation((_document: string, signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    fireEvent.change(screen.getByLabelText('Invoice XML or JSON'), { target: { value: 'retained timeout document' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByRole('alert').textContent).toContain('Validation timed out. Your invoice is still here — try again.');
    expect((screen.getByLabelText('Invoice XML or JSON') as HTMLTextAreaElement).value).toBe('retained timeout document');
  });

  it('retains pasted input with a generic network message', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockRejectedValue(new Error('offline'));
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    const input = screen.getByLabelText('Invoice XML or JSON');
    await user.type(input, 'retained network document');
    await user.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Could not reach the validator. Your invoice is still here — try again.');
    expect((input as HTMLTextAreaElement).value).toBe('retained network document');
  });

  it('retries the retained document', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument
      .mockRejectedValueOnce(new ValidationClientError('Retry later.', 429))
      .mockResolvedValueOnce(success);
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    await user.type(screen.getByLabelText('Invoice XML or JSON'), 'retry document');
    await user.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(validationClient.validateInvoiceDocument).toHaveBeenCalledTimes(2));
    expect(validationClient.validateInvoiceDocument.mock.calls[1][0]).toBe('retry document');
  });

  it('renders the validation summary and resets to the primary workspace', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Try valid sample' }));

    expect(await screen.findByRole('heading', { name: 'Preflight passed' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Validate another file' }));
    expect(screen.getByText('Validate a file — free')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Preflight passed' })).toBeNull();
  });

  it('uses the exact preflight loading copy while validation is running', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockImplementation(() => new Promise(() => {}));
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Try valid sample' }));

    expect(screen.getByRole('status').textContent).toBe('Running UAE preflight checks…');
  });

  it('tracks only coarse, document-free analytics properties', async () => {
    const user = userEvent.setup();
    validationClient.validateInvoiceDocument.mockResolvedValue(success);
    renderWorkspace();
    const privateDocument = 'PRIVATE-INVOICE-DOCUMENT-12345';
    await user.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    await user.type(screen.getByLabelText('Invoice XML or JSON'), privateDocument);
    await user.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));
    await screen.findByRole('heading', { name: 'Preflight passed' });

    expect(analytics.trackEvent).toHaveBeenCalledWith('validator_success', { context: 'homepage', valid: true });
    for (const call of analytics.trackEvent.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(privateDocument);
    }
  });
});
