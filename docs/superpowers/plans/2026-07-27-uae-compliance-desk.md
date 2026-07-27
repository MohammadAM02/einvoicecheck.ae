# UAE Compliance Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current developer-first homepage and duplicated validator interfaces with one upload-first, finance-readable UAE e-invoice preflight experience that converts successful free-tool use into API interest.

**Architecture:** Keep the existing Next.js 15 application, Fastify API, MongoDB, Redis, validation routes, and Railway deployment model. Introduce one shared browser validation client, one shared validator workspace, and one shared result renderer used by both the homepage and dedicated validator page; keep batch validation as a dedicated-page extension. Implement the approved Sites direction directly in the existing Next.js app and use Railway only for production hosting.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.8, Vitest 4, React Testing Library, jsdom, existing `/api/tools/validate` and `/api/tools/validate/batch` routes, Railway.

## Global Constraints

- The homepage's primary conversion is **Validate a file free** and requires no signup.
- The free validator and paid API use the same engine and normalized errors.
- Do not change validation rules, API authentication, MongoDB, Redis, or entitlement architecture.
- Do not add infrastructure or move any production workload away from Railway.
- Do not activate PayPal without real credentials and plan IDs.
- Do not add Dodo or Lemon Squeezy references.
- Do not claim FTA accreditation, legal compliance, filing, complete official XSD/Schematron conformity, or guaranteed ASP acceptance.
- Use **Preflight passed** and **Preflight failed**; remove **Would be rejected** from validator-facing UI and reports.
- Invoice payloads must not be sent to analytics or persisted.
- Preserve the production free-tool limit of 20 validations per hour per IP and the existing fail-closed Redis behavior.
- Preserve the 256 KB browser-tool document limit.
- Keep changes reversible on a dedicated branch and merge through a pull request.

## File Structure

### Create

- `app/web/src/lib/validation-ui.ts` — shared result types, field labels, sorting, and report text.
- `app/web/src/lib/validation-client.ts` — the single browser client for `/api/tools/validate`, file validation, and typed errors.
- `app/web/src/lib/validation-samples.ts` — stable valid and broken canonical JSON samples.
- `app/web/src/components/validation/ValidationSummary.tsx` — accessible pass/fail summary and report actions.
- `app/web/src/components/validation/ValidationIssue.tsx` — one finance-readable issue with expandable technical detail.
- `app/web/src/components/validation/ValidationIssueList.tsx` — blocking-first issue ordering.
- `app/web/src/components/validation/ValidatorWorkspace.tsx` — shared upload, paste, sample, request, retry, and reset flow.
- `app/web/src/components/BatchValidator.tsx` — preserved batch-only flow for the dedicated validator page.
- `app/web/src/components/TrustStrip.tsx` — four concise factual trust statements.
- `app/web/src/components/ScopePanel.tsx` — canonical included/excluded coverage.
- `app/web/src/components/FreeVsApi.tsx` — provider-independent product comparison.
- `app/web/test/validation-ui.test.ts` — pure result-presentation tests.
- `app/web/test/validation-client.test.ts` — request and error-state tests.
- `app/web/test/validator-workspace.test.tsx` — upload, paste, sample, retry, limit, and accessibility behavior.
- `app/web/test/validation-summary.test.tsx` — result language and technical-detail tests.
- `app/web/test/homepage.test.tsx` — hierarchy, claims, and conversion tests.
- `app/web/test/navigation.test.tsx` — mobile navigation tests.

### Modify

- `app/web/package.json` and `app/web/package-lock.json` — add test-only DOM dependencies.
- `app/web/src/components/HomeClient.tsx` — replace the current hero, duplicated statistics, pricing cards, and trust claims.
- `app/web/src/components/InvoiceValidator.tsx` — become a thin composition of the shared workspace plus batch extension.
- `app/web/src/components/Chrome.tsx` — accessible desktop and mobile navigation without decorative landing layers.
- `app/web/src/app/tools/[slug]/page.tsx` — use accurate preflight language and canonical scope component.
- `app/web/src/app/page.tsx` — update metadata and structured description.
- `app/web/src/app/layout.tsx` — remove forced dark mode and update global metadata.
- `app/web/src/app/globals.css` — implement the light UAE Compliance Desk tokens and responsive component classes.
- `app/web/src/lib/analytics.ts` — add only payload-free funnel events.
- `app/web/vitest.config.ts` — keep Node as the default environment; component tests opt into jsdom per file.

### Delete after migration

- `app/web/src/components/HeroValidator.tsx` — its behavior moves into `ValidatorWorkspace`.
- `app/web/src/components/ContactGuarantees.tsx` — unverifiable beta uptime and latency cards are replaced by `TrustStrip` and `ScopePanel`.

---

### Task 1: Shared validation presentation model

**Files:**
- Create: `app/web/src/lib/validation-ui.ts`
- Test: `app/web/test/validation-ui.test.ts`

**Interfaces:**
- Produces: `ValidationIssue`, `ValidationResult`, `ValidationRateLimit`, `ValidateApiSuccess`, `fieldLabel(path)`, `sortValidationIssues(issues)`, and `toReportText(result)`.
- Consumes: no UI components or network code.

- [ ] **Step 1: Write the failing pure-function tests**

```ts
import { describe, expect, it } from 'vitest';
import { fieldLabel, sortValidationIssues, toReportText } from '@/lib/validation-ui';

describe('validation presentation', () => {
  it('maps known engine paths to finance-readable field names', () => {
    expect(fieldLabel('/customer/trn')).toBe('Buyer TRN');
    expect(fieldLabel('/totals/payableAmount')).toBe('Amount due');
    expect(fieldLabel('/unmapped/value')).toBe('/unmapped/value');
  });

  it('sorts blocking issues before warnings without mutating the API result', () => {
    const issues = [
      { path: '/currency', rule: 'WARN-1', severity: 'warning' as const, message: 'Check currency.' },
      { path: '/customer/trn', rule: 'ERR-1', severity: 'error' as const, message: 'Bad TRN.' },
    ];
    expect(sortValidationIssues(issues).map((issue) => issue.rule)).toEqual(['ERR-1', 'WARN-1']);
    expect(issues.map((issue) => issue.rule)).toEqual(['WARN-1', 'ERR-1']);
  });

  it('uses preflight language in copied reports', () => {
    const text = toReportText({
      valid: false,
      invoiceType: '388',
      schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
      errors: [{ path: '/customer/trn', rule: 'ENG-TRN-04/BT-48', severity: 'error', message: 'Bad TRN.', fix: 'Use 15 digits.' }],
    });
    expect(text).toContain('PREFLIGHT FAILED');
    expect(text).toContain('Buyer TRN');
    expect(text).not.toContain('WOULD BE REJECTED');
  });
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run from `app/web`:

```powershell
npm test -- test/validation-ui.test.ts
```

Expected: FAIL because `@/lib/validation-ui` does not exist.

- [ ] **Step 3: Implement the typed presentation model**

```ts
export type ValidationIssue = {
  path: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
};

export type ValidationResult = {
  valid: boolean;
  invoiceType: string | null;
  schemaVersion: string;
  errors: ValidationIssue[];
};

export type ValidationRateLimit = {
  limit: number;
  remaining: number;
  resetSeconds: number;
  degraded: boolean;
};

export type ValidateApiSuccess = {
  ok: true;
  result: ValidationResult;
  rateLimit: ValidationRateLimit;
};

const FIELD_LABELS: Record<string, string> = {
  '/customer/trn': 'Buyer TRN',
  '/supplier/trn': 'Supplier TRN',
  '/totals/payableAmount': 'Amount due',
  '/totals/taxAmount': 'VAT total',
  '/totals/taxInclusiveAmount': 'Total including VAT',
  '/currency': 'Invoice currency',
  '/invoiceNumber': 'Invoice number',
  '/issueDate': 'Issue date',
};

export function fieldLabel(path: string): string {
  return FIELD_LABELS[path] ?? path;
}

export function sortValidationIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return [...issues].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'error' ? -1 : 1;
  });
}

export function toReportText(result: ValidationResult): string {
  const lines = [
    `einvoicecheck.ae - ${result.valid ? 'PREFLIGHT PASSED' : 'PREFLIGHT FAILED'}`,
    `Invoice type: ${result.invoiceType ?? 'not detected'} | profile: ${result.schemaVersion}`,
    '',
  ];
  if (!result.errors.length) {
    lines.push('No blocking issues were found by the checks currently included in this preflight engine.');
  }
  for (const issue of sortValidationIssues(result.errors)) {
    lines.push(`[${issue.severity.toUpperCase()}] ${fieldLabel(issue.path)} (${issue.rule})`);
    lines.push(`  ${issue.message}`);
    if (issue.fix) lines.push(`  Fix: ${issue.fix}`);
    lines.push('');
  }
  lines.push('Preflight only: this is not filing, accreditation, or a guarantee of acceptance.');
  return lines.join('\n').trim();
}
```

- [ ] **Step 4: Run the test and existing route tests**

```powershell
npm test -- test/validation-ui.test.ts test/tools-validate.test.ts
```

Expected: both files PASS.

- [ ] **Step 5: Commit the presentation model**

```powershell
git add app/web/src/lib/validation-ui.ts app/web/test/validation-ui.test.ts
git commit -m "test: define finance-readable validation results"
```

---

### Task 2: One browser validation client and stable samples

**Files:**
- Create: `app/web/src/lib/validation-client.ts`
- Create: `app/web/src/lib/validation-samples.ts`
- Test: `app/web/test/validation-client.test.ts`

**Interfaces:**
- Consumes: `ValidateApiSuccess` from `validation-ui.ts`.
- Produces: `MAX_BROWSER_DOCUMENT_BYTES`, `ValidationClientError`, `validateInvoiceDocument(document, signal?)`, `readInvoiceFile(file)`, `VALID_JSON_SAMPLE`, and `BROKEN_JSON_SAMPLE`.

- [ ] **Step 1: Write failing request and file tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readInvoiceFile, validateInvoiceDocument, ValidationClientError } from '@/lib/validation-client';

afterEach(() => vi.unstubAllGlobals());

describe('browser validation client', () => {
  it('posts the unchanged document to the existing route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      result: { valid: true, invoiceType: '388', schemaVersion: 'ae-1', errors: [] },
      rateLimit: { limit: 20, remaining: 19, resetSeconds: 3600, degraded: false },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await validateInvoiceDocument('  <Invoice />  ');
    expect(fetchMock).toHaveBeenCalledWith('/api/tools/validate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ document: '  <Invoice />  ' }),
    }));
  });

  it.each([
    [429, 'Free-tool limit reached'],
    [503, 'temporarily unavailable'],
  ])('preserves server guidance for HTTP %s', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: message }), { status })));
    await expect(validateInvoiceDocument('{}')).rejects.toMatchObject({ status, message });
  });

  it('rejects files larger than 256 KB before reading them', async () => {
    const file = new File([new Uint8Array(262145)], 'invoice.xml', { type: 'application/xml' });
    await expect(readInvoiceFile(file)).rejects.toBeInstanceOf(ValidationClientError);
  });
});
```

- [ ] **Step 2: Add jsdom test dependencies and verify the tests fail**

Run from `app/web`:

```powershell
npm install --save-dev @testing-library/react @testing-library/user-event axe-core jsdom
npm test -- test/validation-client.test.ts
```

Expected: dependency installation updates `package.json` and `package-lock.json`; test FAILS because the client module does not exist.

- [ ] **Step 3: Implement the client and typed error**

```ts
import type { ValidateApiSuccess } from './validation-ui';

export const MAX_BROWSER_DOCUMENT_BYTES = 256 * 1024;

export class ValidationClientError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = 'ValidationClientError';
  }
}

export async function validateInvoiceDocument(document: string, signal?: AbortSignal): Promise<ValidateApiSuccess> {
  const response = await fetch('/api/tools/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document }),
    signal,
  });
  const body = await response.json().catch(() => ({ ok: false, error: `Validation failed with HTTP ${response.status}.` }));
  if (!response.ok || body.ok !== true) {
    throw new ValidationClientError(body.error ?? 'Validation failed. Try again.', response.status);
  }
  return body as ValidateApiSuccess;
}

export async function readInvoiceFile(file: File): Promise<string> {
  if (file.size > MAX_BROWSER_DOCUMENT_BYTES) {
    throw new ValidationClientError('File is larger than 256 KB. Choose a smaller XML or JSON invoice.');
  }
  const extension = file.name.toLowerCase().split('.').pop();
  if (!extension || !['xml', 'json', 'txt'].includes(extension)) {
    throw new ValidationClientError('Choose an XML or JSON invoice file.');
  }
  return file.text();
}
```

Move the exact valid and broken canonical JSON fixtures currently duplicated in `HeroValidator.tsx` and `InvoiceValidator.tsx` into `validation-samples.ts`. Use fixed issue dates rather than `new Date()` so tests and previews are deterministic.

- [ ] **Step 4: Run client and lockfile verification**

```powershell
npm test -- test/validation-client.test.ts
npm ci --ignore-scripts
```

Expected: tests PASS and the lockfile supports a clean install.

- [ ] **Step 5: Commit the client boundary**

```powershell
git add app/web/package.json app/web/package-lock.json app/web/src/lib/validation-client.ts app/web/src/lib/validation-samples.ts app/web/test/validation-client.test.ts
git commit -m "feat: centralize browser validation requests"
```

---

### Task 3: Finance-readable shared result components

**Files:**
- Create: `app/web/src/components/validation/ValidationSummary.tsx`
- Create: `app/web/src/components/validation/ValidationIssue.tsx`
- Create: `app/web/src/components/validation/ValidationIssueList.tsx`
- Test: `app/web/test/validation-summary.test.tsx`

**Interfaces:**
- Consumes: `ValidationResult`, `ValidationRateLimit`, `fieldLabel`, `sortValidationIssues`, and `toReportText` from `validation-ui.ts`.
- Produces: `ValidationSummary({ result, rateLimit, onReset })` and `ValidationIssueList({ issues })`.

- [ ] **Step 1: Write failing result-language tests**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ValidationSummary } from '@/components/validation/ValidationSummary';

const failedResult = {
  valid: false,
  invoiceType: '388',
  schemaVersion: 'urn:peppol:pint:billing-1@ae-1',
  errors: [{
    path: '/customer/trn',
    rule: 'ENG-TRN-04/BT-48',
    severity: 'error' as const,
    message: 'Buyer TRN is not a valid 15-digit UAE TRN.',
    fix: 'Use exactly 15 numeric digits.',
  }],
};

describe('ValidationSummary', () => {
  it('leads with preflight status and human-readable fixes', async () => {
    render(<ValidationSummary result={failedResult} rateLimit={{ limit: 20, remaining: 19, resetSeconds: 3600, degraded: false }} onReset={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Preflight failed' })).toBeTruthy();
    expect(screen.getByText('Buyer TRN')).toBeTruthy();
    expect(screen.getByText('Use exactly 15 numeric digits.')).toBeTruthy();
    expect(screen.queryByText('Would be rejected')).toBeNull();
    await userEvent.click(screen.getByText('Technical details'));
    expect(screen.getByText('/customer/trn')).toBeTruthy();
    expect(screen.getByText('ENG-TRN-04/BT-48')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

```powershell
npm test -- test/validation-summary.test.tsx
```

Expected: FAIL because `ValidationSummary` does not exist.

- [ ] **Step 3: Implement summary and issue components**

`ValidationIssue.tsx` must render the field label and fix before technical metadata:

```tsx
import { fieldLabel, type ValidationIssue as ValidationIssueType } from '@/lib/validation-ui';

export function ValidationIssue({ issue }: { issue: ValidationIssueType }) {
  return (
    <article className={`validation-issue validation-issue--${issue.severity}`}>
      <div className="validation-issue__heading">
        <span className="status-icon" aria-hidden="true">{issue.severity === 'error' ? '!' : '△'}</span>
        <h4>{fieldLabel(issue.path)}</h4>
        <span className="severity-label">{issue.severity === 'error' ? 'Blocking issue' : 'Warning'}</span>
      </div>
      <p>{issue.message}</p>
      {issue.fix ? <p className="validation-fix"><strong>Fix:</strong> {issue.fix}</p> : null}
      <details>
        <summary>Technical details</summary>
        <dl>
          <div><dt>Path</dt><dd><code>{issue.path}</code></dd></div>
          <div><dt>Rule</dt><dd><code>{issue.rule}</code></dd></div>
        </dl>
      </details>
    </article>
  );
}
```

`ValidationSummary.tsx` must:

- place `tabIndex={-1}` and a ref on the result heading;
- focus that heading in `useEffect` when a result appears;
- calculate blocking and warning counts;
- render `ValidationIssueList` only when issues exist;
- show **Validate another file**, **Copy report**, and **Automate with the API**;
- use the passing copy: "No blocking issues were found by the checks currently included in this preflight engine."; and
- show remaining free checks without framing the API as an unlock for broader rules.

- [ ] **Step 4: Run result tests**

```powershell
npm test -- test/validation-summary.test.tsx test/validation-ui.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared result renderer**

```powershell
git add app/web/src/components/validation app/web/test/validation-summary.test.tsx
git commit -m "feat: add finance-readable validation results"
```

---

### Task 4: Upload-first shared validator workspace

**Files:**
- Create: `app/web/src/components/validation/ValidatorWorkspace.tsx`
- Test: `app/web/test/validator-workspace.test.tsx`
- Modify: `app/web/src/lib/analytics.ts`

**Interfaces:**
- Consumes: `validateInvoiceDocument`, `readInvoiceFile`, stable samples, and `ValidationSummary`.
- Produces: `ValidatorWorkspace({ context?: 'homepage' | 'tool' })`.

- [ ] **Step 1: Write failing upload, paste, and retained-error tests**

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidatorWorkspace } from '@/components/validation/ValidatorWorkspace';

afterEach(() => vi.restoreAllMocks());

describe('ValidatorWorkspace', () => {
  it('makes free file validation the primary action', () => {
    render(<ValidatorWorkspace context="homepage" />);
    expect(screen.getByText('Validate a file — free')).toBeTruthy();
    expect(screen.getByText('XML or JSON · maximum 256 KB')).toBeTruthy();
    expect(screen.queryByText('Sign up to validate')).toBeNull();
  });

  it('validates an uploaded invoice without authentication', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      result: { valid: true, invoiceType: '388', schemaVersion: 'ae-1', errors: [] },
      rateLimit: { limit: 20, remaining: 19, resetSeconds: 3600, degraded: false },
    }), { status: 200 })));
    render(<ValidatorWorkspace />);
    const input = screen.getByLabelText('Choose an XML or JSON invoice');
    await userEvent.upload(input, new File(['{}'], 'invoice.json', { type: 'application/json' }));
    expect(await screen.findByRole('heading', { name: 'Preflight passed' })).toBeTruthy();
  });

  it('keeps pasted content when the free limit is reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'Free-tool limit reached. Resets in 12 minutes.' }), { status: 429 })));
    render(<ValidatorWorkspace />);
    await userEvent.click(screen.getByRole('button', { name: 'Paste XML or JSON' }));
    await userEvent.type(screen.getByLabelText('Invoice XML or JSON'), '{"invoiceType":"388"}');
    await userEvent.click(screen.getByRole('button', { name: 'Validate pasted invoice' }));
    expect(await screen.findByText(/Free-tool limit reached/)).toBeTruthy();
    expect((screen.getByLabelText('Invoice XML or JSON') as HTMLTextAreaElement).value).toBe('{"invoiceType":"388"}');
  });

  it('accepts drag and drop with the same file path', async () => {
    render(<ValidatorWorkspace />);
    const file = new File(['{}'], 'invoice.json', { type: 'application/json' });
    fireEvent.drop(screen.getByTestId('invoice-drop-zone'), { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByText('invoice.json')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run the workspace tests and verify they fail**

```powershell
npm test -- test/validator-workspace.test.tsx
```

Expected: FAIL because `ValidatorWorkspace` does not exist.

- [ ] **Step 3: Implement the request state machine**

Use this explicit state shape inside `ValidatorWorkspace.tsx`:

```ts
type WorkspaceState =
  | { phase: 'idle' }
  | { phase: 'ready'; fileName?: string }
  | { phase: 'validating'; fileName?: string }
  | { phase: 'result'; data: ValidateApiSuccess; fileName?: string }
  | { phase: 'error'; message: string; status: number | null; fileName?: string };
```

Implement these behaviors:

- clicking or pressing Enter/Space on the drop zone opens the hidden file input;
- dropping or selecting a file reads it with `readInvoiceFile` and immediately validates it;
- **Paste XML or JSON** reveals a labelled textarea and **Validate pasted invoice** button;
- **Try valid sample** and **Try broken sample** set stable sample text and validate it;
- starting a request aborts the previous request and starts a 10-second timeout;
- timeout, 429, 503, file-type, size, and network errors retain the document text;
- **Retry** repeats the last document;
- **Validate another file** resets result/error state without authentication;
- result completion emits only `validator_success` or `validator_error` with `{ context, valid, status }`; and
- no analytics event includes document text, invoice identifiers, field paths, rule IDs, or messages.

Extend the `EventName` union in `analytics.ts` to:

```ts
type EventName =
  | 'validator_input_selected'
  | 'validator_success'
  | 'validator_error'
  | 'api_cta_clicked'
  | 'curl_copied'
  | 'auth_modal_opened'
  | 'plan_selected';
```

- [ ] **Step 4: Run workspace and route tests**

```powershell
npm test -- test/validator-workspace.test.tsx test/tools-validate.test.ts
```

Expected: PASS, including 429 and fail-closed 503 route coverage.

- [ ] **Step 5: Commit the shared validator workspace**

```powershell
git add app/web/src/components/validation/ValidatorWorkspace.tsx app/web/src/lib/analytics.ts app/web/test/validator-workspace.test.tsx
git commit -m "feat: make file validation the primary experience"
```

---

### Task 5: Homepage hierarchy, trust, and free-versus-API conversion

**Files:**
- Create: `app/web/src/components/TrustStrip.tsx`
- Create: `app/web/src/components/ScopePanel.tsx`
- Create: `app/web/src/components/FreeVsApi.tsx`
- Modify: `app/web/src/components/HomeClient.tsx`
- Modify: `app/web/src/app/page.tsx`
- Delete: `app/web/src/components/ContactGuarantees.tsx`
- Test: `app/web/test/homepage.test.tsx`

**Interfaces:**
- Consumes: `ValidatorWorkspace`, `GUARDRAIL`, existing plan data, and existing routes.
- Produces: the approved homepage section order and accurate conversion copy.

- [ ] **Step 1: Write failing homepage hierarchy and claims tests**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeClient from '@/components/HomeClient';

describe('homepage', () => {
  it('leads with free validation instead of signup', () => {
    render(<HomeClient />);
    expect(screen.getByRole('heading', { name: 'Check your UAE e-invoice before it reaches your ASP.' })).toBeTruthy();
    expect(screen.getByText('Validate a file — free')).toBeTruthy();
    expect(screen.getByText('Free, no signup, and invoice payloads are not stored.')).toBeTruthy();
  });

  it('states scope without unsupported service claims', () => {
    render(<HomeClient />);
    expect(screen.getByRole('heading', { name: 'What this preflight checks' })).toBeTruthy();
    expect(screen.getByText('Not currently included')).toBeTruthy();
    expect(screen.queryByText(/99\.7% Uptime/)).toBeNull();
    expect(screen.queryByText(/Sub-50ms Latency/)).toBeNull();
  });

  it('presents API automation after the free experience', () => {
    render(<HomeClient />);
    expect(screen.getByRole('heading', { name: 'Validate one file free. Automate when you are ready.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Automate with the API' }).getAttribute('href')).toBe('/signup');
  });

  it('has no serious or critical automated accessibility violations', async () => {
    const { container } = render(<HomeClient />);
    const result = await axe.run(container);
    expect(result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the homepage test and verify old copy fails**

```powershell
npm test -- test/homepage.test.tsx
```

Expected: FAIL against the existing dark hero, pricing grid, and beta trust cards.

- [ ] **Step 3: Implement the approved section order**

Rewrite `HomeClient.tsx` to render, in order:

```tsx
<main>
  <section className="compliance-hero" id="validate">
    <div className="hero-copy">
      <p className="eyebrow">Independent UAE e-invoice preflight</p>
      <h1>Check your UAE e-invoice before it reaches your ASP.</h1>
      <p>Upload XML or JSON and get a clear list of semantic, VAT, and arithmetic issues. Free, no signup, and invoice payloads are not stored.</p>
    </div>
    <ValidatorWorkspace context="homepage" />
  </section>
  <TrustStrip />
  <AudienceSection />
  <ExampleResultSection />
  <FreeVsApi />
  <ScopePanel />
  <FaqSection />
  <footer>{GUARDRAIL}</footer>
</main>
```

Specific content rules:

- `TrustStrip` contains only: UAE-focused semantic preflight, XML and JSON accepted, payloads not stored, independent/not an ASP.
- `AudienceSection` contains finance teams, ERP/software vendors, and integrators/consultants.
- `ExampleResultSection` shows Buyer TRN and Amount due examples using the same issue styling as the live result.
- `FreeVsApi` states the 20-per-hour manual limit and the current plan-based API model; it must say both use the same engine.
- remove the repeated 47-check statistic strip and full three-card homepage pricing table;
- keep `/pricing` as a navigation destination;
- remove `ContactGuarantees` and its unsupported beta uptime/latency statements; and
- keep a concise FAQ for accreditation, pass meaning, retention, formats, limits, and free-versus-API.

Update `app/page.tsx` metadata to:

```ts
export const metadata: Metadata = {
  title: 'Free UAE E-Invoice Validator | einvoicecheck.ae',
  description: 'Upload UAE e-invoice XML or JSON and find semantic, VAT and arithmetic issues before handoff to your accredited service provider.',
};
```

- [ ] **Step 4: Run homepage and validator tests**

```powershell
npm test -- test/homepage.test.tsx test/validator-workspace.test.tsx test/validation-summary.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the homepage conversion change**

```powershell
git add app/web/src/components/HomeClient.tsx app/web/src/components/TrustStrip.tsx app/web/src/components/ScopePanel.tsx app/web/src/components/FreeVsApi.tsx app/web/src/app/page.tsx app/web/test/homepage.test.tsx
git rm app/web/src/components/ContactGuarantees.tsx
git commit -m "feat: lead homepage with free invoice validation"
```

---

### Task 6: Reuse the workspace on the dedicated validator page

**Files:**
- Create: `app/web/src/components/BatchValidator.tsx`
- Modify: `app/web/src/components/InvoiceValidator.tsx`
- Modify: `app/web/src/app/tools/[slug]/page.tsx`
- Delete: `app/web/src/components/HeroValidator.tsx`
- Test: `app/web/test/homepage.test.tsx`
- Test: `app/web/test/validator-workspace.test.tsx`

**Interfaces:**
- Consumes: `ValidatorWorkspace`, `ScopePanel`, the existing batch endpoint, and existing template endpoints.
- Produces: one shared single-document experience plus an unchanged opt-in batch extension.

- [ ] **Step 1: Add failing reuse and copy assertions**

Add these assertions to the existing component tests:

```tsx
expect(screen.queryByText('Would be rejected')).toBeNull();
expect(screen.queryByText(/errors that would get it rejected/i)).toBeNull();
expect(screen.getByText('Batch validation')).toBeTruthy();
```

Add a source-boundary test to `validator-workspace.test.tsx`:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';

it('does not reintroduce a second single-document request implementation', async () => {
  const source = await readFile(path.resolve(__dirname, '../src/components/InvoiceValidator.tsx'), 'utf8');
  expect(source).not.toContain("fetch('/api/tools/validate'");
  expect(source).toContain('<ValidatorWorkspace');
});
```

- [ ] **Step 2: Run tests and verify duplicate behavior is detected**

```powershell
npm test -- test/homepage.test.tsx test/validator-workspace.test.tsx
```

Expected: FAIL while `InvoiceValidator.tsx` still contains its own single-document request and rejected-language copy.

- [ ] **Step 3: Extract batch-only behavior and simplify the page wrapper**

Make `InvoiceValidator.tsx` a composition boundary:

```tsx
import { ValidatorWorkspace } from './validation/ValidatorWorkspace';
import { BatchValidator } from './BatchValidator';

export function InvoiceValidator() {
  return (
    <div className="tool">
      <ValidatorWorkspace context="tool" />
      <details className="batch-panel">
        <summary>Batch validation</summary>
        <BatchValidator />
      </details>
    </div>
  );
}
```

Move only the existing multi-document delimiter, template loading needed by batch, `/api/tools/validate/batch` request, and batch result list into `BatchValidator.tsx`. Do not copy single-document fetch or result rendering into it.

In `app/tools/[slug]/page.tsx`:

- change the SEO description from "errors that would get it rejected" to "semantic, VAT, code-list and arithmetic issues found by the current preflight engine";
- remove the long repeated warning block and render `ScopePanel` once;
- retain API examples and links after the validator;
- change "no 20-per-hour browser cap" to the accurate plan-based API quota and rate-limit description; and
- remove the bottom email/launch-access card from the already-live validator route.

Delete `HeroValidator.tsx` after `HomeClient.tsx` no longer imports it.

- [ ] **Step 4: Run the shared and route test suites**

```powershell
npm test -- test/validator-workspace.test.tsx test/homepage.test.tsx test/tools-validate.test.ts
```

Expected: PASS and no duplicate single-document browser fetch.

- [ ] **Step 5: Commit the shared page migration**

```powershell
git add app/web/src/components/InvoiceValidator.tsx app/web/src/components/BatchValidator.tsx app/web/src/app/tools app/web/test
git rm app/web/src/components/HeroValidator.tsx
git commit -m "refactor: share validator experience across pages"
```

---

### Task 7: Mobile navigation and UAE Compliance Desk visual system

**Files:**
- Modify: `app/web/src/components/Chrome.tsx`
- Modify: `app/web/src/app/globals.css`
- Modify: `app/web/src/app/layout.tsx`
- Test: `app/web/test/navigation.test.tsx`

**Interfaces:**
- Consumes: existing Next.js routes and all class names introduced by Tasks 3–6.
- Produces: accessible navigation and responsive visual behavior from 320px upward.

- [ ] **Step 1: Write failing mobile navigation tests**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chrome } from '@/components/Chrome';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

describe('site navigation', () => {
  it('exposes the complete menu through an accessible mobile button', async () => {
    render(<Chrome><div>Page</div></Chrome>);
    const button = screen.getByRole('button', { name: 'Open navigation' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('link', { name: 'Validate free' }).some((link) => link.getAttribute('href') === '/#validate')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'API' }).some((link) => link.getAttribute('href') === '/docs')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Pricing' }).some((link) => link.getAttribute('href') === '/pricing')).toBe(true);
  });
});
```

- [ ] **Step 2: Run navigation tests and verify the menu is missing**

```powershell
npm test -- test/navigation.test.tsx
```

Expected: FAIL because the current mobile CSS hides every navigation action.

- [ ] **Step 3: Implement navigation and design tokens**

`Chrome.tsx` must:

- remove `bg-layer`, `bg-gradient`, `bg-grid`, and animated orb markup;
- render desktop links for Validate free (`/#validate`), API (`/docs`), Pricing, Documentation, and Sign in;
- render a keyboard-accessible mobile menu button with `aria-expanded` and `aria-controls`;
- close the mobile menu after route selection; and
- retain the existing brand link without using government marks.

Replace the root tokens in `globals.css` with:

```css
:root {
  --accent: #087f6b;
  --accent-hover: #066b5a;
  --accent-subtle: #e7f5f1;
  --navy: #102a43;
  --ink: #18324a;
  --ink-secondary: #48647a;
  --ink-muted: #6b8192;
  --bg: #f7f8f5;
  --bg-card: #ffffff;
  --bg-elevated: #f0f3ef;
  --border: #d7dfdc;
  --border-solid: #bdc9c5;
  --success: #087f5b;
  --success-subtle: #e8f7ef;
  --error: #b42318;
  --error-subtle: #fff0ee;
  --warn: #9a6700;
  --warn-subtle: #fff7df;
  color-scheme: light;
}
```

Add focused classes for `.compliance-hero`, `.validator-workspace`, `.upload-zone`, `.validation-summary`, `.validation-issue`, `.trust-strip`, `.audience-grid`, `.comparison-grid`, `.scope-grid`, `.mobile-menu-button`, and `.mobile-menu`. At widths below 768px:

- use one column;
- keep controls full width;
- enforce a 44px minimum interactive height;
- allow result actions to wrap;
- contain code overflow inside code/detail blocks; and
- show the mobile menu button instead of hiding navigation completely.

Add `@media (prefers-reduced-motion: reduce)` to disable nonessential transitions and animations.

In `layout.tsx`, remove `className="dark"` and use accurate metadata:

```ts
export const metadata: Metadata = {
  title: 'einvoicecheck.ae — UAE E-Invoice Preflight',
  description: 'Independent semantic, VAT and arithmetic preflight checks for UAE e-invoice XML and JSON.',
};
```

- [ ] **Step 4: Run component tests and production build**

```powershell
npm test -- test/navigation.test.tsx test/homepage.test.tsx test/validator-workspace.test.tsx test/validation-summary.test.tsx
npm run build
```

Expected: tests PASS and Next.js production build succeeds.

- [ ] **Step 5: Commit the responsive visual system**

```powershell
git add app/web/src/components/Chrome.tsx app/web/src/app/globals.css app/web/src/app/layout.tsx app/web/test/navigation.test.tsx
git commit -m "feat: apply UAE compliance desk visual system"
```

---

### Task 8: Full regression, browser QA, pull request, and Railway rollout

**Files:**
- Modify only files required by failures found in this task.
- Update: `docs/superpowers/specs/2026-07-27-uae-compliance-desk-design.md` only if implementation discovered a real specification mismatch.

**Interfaces:**
- Consumes: the completed UI branch, existing API tests, Railway production services, and public health routes.
- Produces: reviewed code, an active Railway web deployment, and production smoke-test evidence.

- [ ] **Step 1: Run all local regression checks**

From `app/api`:

```powershell
npm ci --ignore-scripts
npm test
```

From `app/web`:

```powershell
npm ci --ignore-scripts
npm test
npm run build
```

Expected: API tests PASS, web tests PASS, and Next.js production build succeeds.

- [ ] **Step 2: Run the standalone build and public-route smoke checks locally**

Start the generated standalone server using the existing Railway start shape:

```powershell
$env:PORT='8080'
node .next/standalone/server.js
```

In a second terminal, verify:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -UseBasicParsing
Invoke-RestMethod -Uri 'http://127.0.0.1:8080/api/health'
```

Expected: homepage HTTP 200 and web health `{ "status": "ok" }`.

- [ ] **Step 3: Perform browser QA before merging**

Verify the homepage and `/tools/uae-e-invoice-validator` at 320px, 768px, and 1440px widths:

- mobile navigation opens, closes, and exposes every primary route;
- the upload zone is visible in the first viewport;
- JSON upload, XML upload, paste, valid sample, and broken sample work;
- failed results show human labels and fixes before technical details;
- pass copy does not imply compliance or acceptance;
- 429 and 503 messages retain pasted input and offer Retry;
- keyboard focus moves to result/error status;
- no entire-page horizontal scrolling occurs; and
- no Dodo, Lemon Squeezy, unsupported uptime, unsupported latency, or "Would be rejected" copy is visible.

Record screenshots of the homepage and failed result at phone and desktop widths in the pull request description. Do not publish a separate Sites-hosted product; Railway remains the only production host.

- [ ] **Step 4: Review the branch and open a pull request**

Run:

```powershell
git status --short
git diff --check
git log --oneline --decorate main..HEAD
```

Expected: clean worktree, no whitespace errors, and only the approved UI/spec commits.

Open a pull request titled **Lead homepage with free UAE invoice validation**. The description must include:

- the business change: free validation first, API conversion after value;
- screenshots at phone and desktop widths;
- API and web test totals;
- production build result;
- explicit confirmation that validation rules, API auth, MongoDB, Redis, and Railway roots were not changed; and
- rollback instruction: redeploy the previous active Railway web deployment.

- [ ] **Step 5: Merge and verify Railway without interrupting the live product**

After review approval, merge through GitHub and monitor the new Railway web deployment while the previous active deployment continues serving traffic. Stop and do not switch traffic if the build or `/api/health` check fails.

When Railway reports the new web deployment active, run:

```powershell
Invoke-WebRequest -Uri 'https://einvoicecheck.ae/' -UseBasicParsing
Invoke-RestMethod -Uri 'https://einvoicecheck.ae/api/health'
Invoke-RestMethod -Uri 'https://api.einvoicecheck.ae/health'
```

Then submit one valid canonical JSON invoice and one valid UBL/PINT AE XML invoice through the public free validator. Expected evidence:

- homepage HTTP 200;
- web health status `ok`;
- API health status `ok`, MongoDB `up`, Redis `up`;
- JSON validation HTTP 200 with `ok: true`;
- XML validation HTTP 200 with `ok: true`;
- free-tool rate-limit response includes `limit: 20` and `degraded: false`; and
- the production page displays the approved upload-first hierarchy.

If any production smoke check fails, immediately redeploy the previous active Railway web deployment and investigate on the branch.

---

## Completion Definition

This plan is complete only when the shared validator is live on both the homepage and dedicated tool route, all local tests and builds pass, responsive browser QA passes, the pull request is merged, Railway reports the new web deployment active, and public JSON/XML smoke tests succeed. PayPal activation and new validation-rule coverage remain separate follow-up work.
