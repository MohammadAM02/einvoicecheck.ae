'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Code2,
  Copy,
  CreditCard,
  FileCode2,
  FileJson,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { KeyView } from '@/lib/keys';
import type { UsageSummary } from '@/lib/usage';
import { API_BASE_URL } from '@/lib/site';
import { PLANS, PLAN_IDS, type PlanId, type SubscriptionStatus } from '@/lib/plans';

type Props = {
  email: string;
  plan: PlanId;
  planName: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  billingConfigured: boolean;
  keys: KeyView[];
  usage: UsageSummary;
};

type Format = 'xml' | 'json';
type Language = 'curl' | 'node' | 'python';
type Section = 'overview' | 'quickstart' | 'api-keys' | 'usage' | 'billing';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'quickstart', label: 'API Quickstart', icon: Zap },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'usage', label: 'Usage', icon: Activity },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
];

const JSON_INVOICE = {
  invoiceType: '388',
  invoiceNumber: 'INV-2026-0001',
  issueDate: '2026-07-14',
  currency: 'AED',
  supplier: { trn: '100123456700003', name: 'Falcon Trading LLC' },
  customer: { trn: '100987654300003', name: 'Oasis Retail FZE' },
  lines: [{
    id: '1',
    quantity: 12,
    unitPrice: 50,
    lineExtensionAmount: 600,
    taxCategory: { code: 'S', rate: 5 },
    itemName: 'Widget A',
  }],
  totals: {
    lineExtensionAmount: 600,
    taxExclusiveAmount: 600,
    taxAmount: 30,
    taxInclusiveAmount: 630,
    payableAmount: 630,
  },
};

const XML_SNIPPETS: Record<Language, string> = {
  curl: `curl -X POST ${API_BASE_URL}/v2/validate \\
  -H "x-api-key: $EINVOICECHECK_API_KEY" \\
  -H "content-type: application/xml" \\
  --data-binary @invoice.xml`,
  node: `import { readFile } from "node:fs/promises";

const xml = await readFile("invoice.xml", "utf8");
const response = await fetch("${API_BASE_URL}/v2/validate", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EINVOICECHECK_API_KEY,
    "content-type": "application/xml",
  },
  body: xml,
});

const result = await response.json();`,
  python: `import os
from pathlib import Path
import requests

response = requests.post(
    "${API_BASE_URL}/v2/validate",
    headers={
        "x-api-key": os.environ["EINVOICECHECK_API_KEY"],
        "content-type": "application/xml",
    },
    data=Path("invoice.xml").read_bytes(),
)
result = response.json()`,
};

const JSON_SNIPPETS: Record<Language, string> = {
  curl: `curl -X POST ${API_BASE_URL}/v1/preflight \\
  -H "x-api-key: $EINVOICECHECK_API_KEY" \\
  -H "content-type: application/json" \\
  --data @invoice.json`,
  node: `const invoice = {
  invoiceType: "388",
  invoiceNumber: "INV-2026-0001",
  issueDate: "2026-07-14",
  currency: "AED",
  supplier: { trn: "100123456700003", name: "Falcon Trading LLC" },
  customer: { trn: "100987654300003", name: "Oasis Retail FZE" },
  lines: [{ id: "1", quantity: 12, unitPrice: 50,
    lineExtensionAmount: 600,
    taxCategory: { code: "S", rate: 5 }, itemName: "Widget A" }],
  totals: { lineExtensionAmount: 600, taxExclusiveAmount: 600,
    taxAmount: 30, taxInclusiveAmount: 630, payableAmount: 630 },
};

const response = await fetch("${API_BASE_URL}/v1/preflight", {
  method: "POST",
  headers: {
    "x-api-key": process.env.EINVOICECHECK_API_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify(invoice),
});

const result = await response.json();`,
  python: `import os
import requests

invoice = ${JSON.stringify(JSON_INVOICE, null, 2)}
response = requests.post(
    "${API_BASE_URL}/v1/preflight",
    headers={
        "x-api-key": os.environ["EINVOICECHECK_API_KEY"],
        "content-type": "application/json",
    },
    json=invoice,
)
result = response.json()`,
};

const XML_RESPONSE = `{
  "valid": true,
  "inputFormat": "xml",
  "validationScope": "pint-ae-ubl-xml",
  "invoiceType": "388",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "format": { "status": "passed", "issues": [] },
  "structure": { "status": "passed", "issues": [] },
  "semantic": { "status": "passed", "issues": [] }
}`;

const JSON_RESPONSE = `{
  "valid": true,
  "invoiceType": "388",
  "schemaVersion": "urn:peppol:pint:billing-1@ae-1",
  "errors": [],
  "validationScope": "canonical-json-data-preflight"
}`;

const FORMAT_TABS: Array<{ id: Format; label: string; endpoint: string; contentType: string; icon: typeof FileCode2 }> = [
  { id: 'xml', label: 'XML', endpoint: '/v2/validate', contentType: 'application/xml', icon: FileCode2 },
  { id: 'json', label: 'Canonical JSON', endpoint: '/v1/preflight', contentType: 'application/json', icon: FileJson },
];

const LANGUAGE_TABS: Array<{ id: Language; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
];

function moveTab<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  values: T[],
  current: T,
  setValue: (value: T) => void,
) {
  const index = values.indexOf(current);
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    setValue(values[(index + 1) % values.length]);
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    setValue(values[(index - 1 + values.length) % values.length]);
  }
}

function UsageGraph({ usage }: { usage: UsageSummary }) {
  const max = Math.max(1, ...usage.days.map((day) => day.total));
  const width = 720;
  const height = 180;
  const gap = 2;
  const barWidth = Math.max(2, width / usage.days.length - gap);

  return (
    <svg className="account-usage-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Validation calls per day">
      {usage.days.map((day, index) => {
        const x = index * (barWidth + gap);
        const scale = (value: number) => (value / max) * (height - 20);
        const segments = [
          { key: 'valid', height: scale(day.valid), fill: 'var(--account-accent)' },
          { key: 'invalid', height: scale(day.invalid), fill: 'var(--account-warning)' },
          { key: 'error', height: scale(day.error), fill: 'var(--account-danger)' },
        ];
        let y = height - 20;
        return (
          <g key={day.date}>
            <title>{`${day.date}: ${day.total} calls`}</title>
            {segments.map((segment) => {
              y -= segment.height;
              return <rect key={segment.key} x={x} y={y} width={barWidth} height={segment.height} fill={segment.fill} rx="1" />;
            })}
          </g>
        );
      })}
      <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="var(--account-border)" />
    </svg>
  );
}

function OutcomeBadge({ outcome }: { outcome: 'valid' | 'invalid' | 'error' }) {
  const label = outcome === 'valid' ? 'Valid' : outcome === 'invalid' ? 'Invalid' : 'Error';
  return <span className={`account-outcome account-outcome--${outcome}`}>{label}</span>;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function Step({ number, label, complete, current }: { number: number; label: string; complete: boolean; current: boolean }) {
  return (
    <li className={`account-step${complete ? ' is-complete' : ''}${current ? ' is-current' : ''}`}>
      <span className="account-step__number" aria-hidden="true">{complete ? <Check size={14} strokeWidth={3} /> : number}</span>
      <span>{label}</span>
    </li>
  );
}

export function DashboardClient(props: Props) {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyView[]>(props.keys);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null);
  const copyTimer = useRef<number | null>(null);
  const [keyName, setKeyName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [format, setFormat] = useState<Format>('xml');
  const [language, setLanguage] = useState<Language>('curl');
  const [responseOpen, setResponseOpen] = useState(false);
  const [responseInspected, setResponseInspected] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeKeys = useMemo(() => keys.filter((key) => key.active), [keys]);
  const hasActiveKey = activeKeys.length > 0;
  const integrated = props.usage.totals.allTime > 0;
  const selectedFormat = FORMAT_TABS.find((tab) => tab.id === format) ?? FORMAT_TABS[0];
  const selectedSnippet = format === 'xml' ? XML_SNIPPETS[language] : JSON_SNIPPETS[language];
  const selectedResponse = format === 'xml' ? XML_RESPONSE : JSON_RESPONSE;
  const stepTwoDone = props.usage.totals.allTime > 0;
  const stepThreeDone = responseInspected;
  const stepOneDone = hasActiveKey;
  const nextStep = !stepOneDone ? 1 : !stepTwoDone ? 2 : !stepThreeDone ? 3 : 0;

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
        return;
      }
      if (mobileOpen) {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    if (!mobileOpen && !accountMenuOpen) return undefined;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [accountMenuOpen, mobileOpen]);

  useEffect(() => {
    const ids = SECTIONS.map((section) => section.id);
    const updateFromScroll = () => {
      const current = ids.reduce<{ id: Section; distance: number } | null>((best, id) => {
        const element = document.getElementById(id);
        if (!element) return best;
        const distance = Math.abs(element.getBoundingClientRect().top - 116);
        return !best || distance < best.distance ? { id, distance } : best;
      }, null);
      if (current) setActiveSection(current.id);
    };

    const onHash = () => {
      const hash = window.location.hash.slice(1) as Section;
      if (ids.includes(hash)) setActiveSection(hash);
    };
    onHash();
    window.addEventListener('scroll', updateFromScroll, { passive: true });
    window.addEventListener('hashchange', onHash);
    updateFromScroll();
    return () => {
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  async function post(path: string, body?: unknown) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok || !data.ok) throw new Error(String(data.error ?? 'Request failed.'));
    return data;
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Continue with the old browser fallback below.
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  function flashCopied(target: string) {
    setCopiedTarget(target);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedTarget(null), 1800);
  }

  async function copyValue(value: string, target: string) {
    if (await copyToClipboard(value)) flashCopied(target);
  }

  async function createKey() {
    setBusy('create');
    setError(null);
    try {
      const data = await post('/api/keys', { name: keyName || 'API key' });
      setFreshKey(String(data.apiKey));
      setKeys([data.key as KeyView, ...keys]);
      setKeyName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(id: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not revoke the key.');
      setKeys(keys.map((key) => key.id === id ? { ...key, active: false, revokedAt: new Date().toISOString() } : key));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function subscribe(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      if (props.hasSubscription) {
        const data = await post('/api/billing/change-plan', { plan });
        if (data.approvalUrl) window.location.href = String(data.approvalUrl);
        else router.refresh();
      } else {
        const data = await post('/api/billing/checkout', { plan });
        window.location.href = String(data.checkoutUrl);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!window.confirm('Cancel now? Your account will return to the free limits immediately.')) return;
    setBusy('cancel');
    setError(null);
    try {
      await post('/api/billing/cancel');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function goToSection(section: Section) {
    setActiveSection(section);
    setMobileOpen(false);
    setAccountMenuOpen(false);
  }

  function inspectResponse() {
    setResponseInspected(true);
    setResponseOpen(true);
  }

  return (
    <div className="account-shell">
      {mobileOpen ? (
        <button type="button" className="account-scrim" aria-label="Close account navigation" onClick={() => {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }} />
      ) : null}

      <aside className={`account-sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="Account navigation">
        <div className="account-sidebar__top">
          <Link href="/dashboard" className="account-brand" aria-label="EInvoiceCheck account overview" onClick={() => goToSection('overview')}>
            <img src="/brand/einvoicecheck-mark.svg" alt="" width="28" height="28" />
            <span>EInvoiceCheck</span>
          </Link>
          <div className="account-context">
            <span className="account-eyebrow">Account</span>
            <strong title={props.email}>{props.email}</strong>
            <span className="account-plan-badge"><span className="account-status-dot" />{props.planName}</span>
          </div>
        </div>

        <nav className="account-nav" aria-label="Account sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`account-nav__link${activeSection === id ? ' is-active' : ''}`}
              aria-current={activeSection === id ? 'location' : undefined}
              onClick={() => goToSection(id)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
          <Link href="/docs" className="account-nav__link" onClick={() => setMobileOpen(false)}>
            <BookOpen size={17} aria-hidden="true" />
            <span>API Docs</span>
            <ArrowUpRight size={14} className="account-nav__external" aria-hidden="true" />
          </Link>
        </nav>

        <div className="account-sidebar__bottom">
          <Link href="/#validate" className="account-sidebar__tool-link" onClick={() => setMobileOpen(false)}>
            <Play size={15} aria-hidden="true" />
            <span>Open Validator</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="account-identity"
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            onClick={(event) => {
              accountTriggerRef.current = event.currentTarget;
              setAccountMenuOpen((open) => !open);
            }}
          >
            <span className="account-avatar" aria-hidden="true">{props.email.slice(0, 1).toUpperCase()}</span>
            <span className="account-identity__text"><strong>{props.email}</strong><small>{props.planName}</small></span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="account-main">
        <header className="account-mobile-bar">
          <button
            ref={menuButtonRef}
            type="button"
            className="account-icon-button"
            aria-label={mobileOpen ? 'Close account navigation' : 'Open account navigation'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <span className="account-mobile-bar__title">{SECTIONS.find((section) => section.id === activeSection)?.label}</span>
          <button
            type="button"
            className="account-avatar account-avatar--mobile"
            aria-label="Open account menu"
            aria-expanded={accountMenuOpen}
            onClick={(event) => {
              accountTriggerRef.current = event.currentTarget;
              setMobileOpen(false);
              setAccountMenuOpen((open) => !open);
            }}
          >
            {props.email.slice(0, 1).toUpperCase()}
          </button>
        </header>

        <div className="account-content">
          {error ? <div className="account-alert account-alert--error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button></div> : null}

          <section id="overview" className="account-section account-section--overview">
            <div className="account-page-header">
              <div>
                <p className="account-breadcrumb">Account <span>/</span> {SECTIONS.find((section) => section.id === activeSection)?.label ?? 'Overview'}</p>
                <h1>Overview</h1>
                <p className="account-lede">Your integration workspace for validating invoices before they move downstream.</p>
              </div>
              <div className="account-header-status"><span className="account-status-dot" /> <span>{props.planName}</span><span className="account-header-status__divider" /><span>{props.subscriptionStatus === 'none' ? 'Active account' : props.subscriptionStatus}</span></div>
            </div>

            <div className="account-stat-grid">
              <div className="account-stat-card"><span className="account-stat-card__label">Validations this month</span><strong>{props.usage.totals.last30Days.toLocaleString()}</strong><span className="account-stat-card__meta">Repository-backed usage</span></div>
              <div className="account-stat-card"><span className="account-stat-card__label">Requests / minute</span><strong>{PLANS[props.plan].rateLimitPerMinute}</strong><span className="account-stat-card__meta">Current plan rate limit</span></div>
              <div className="account-stat-card account-stat-card--accent"><span className="account-stat-card__label">Active API keys</span><strong>{activeKeys.length}</strong><span className="account-stat-card__meta">{activeKeys.length ? `${activeKeys[0].prefix}…` : 'Create your first key'}</span></div>
            </div>

            <div className="account-overview-grid">
              <div className="account-card account-next-card">
                <div className="account-card__eyebrow"><Terminal size={15} aria-hidden="true" /> {integrated ? 'Integration active' : 'Next integration step'}</div>
                <h2>{integrated ? 'Your API is receiving requests.' : 'Get your first request through.'}</h2>
                <p className="account-muted">{integrated ? 'Keep the request examples close, inspect the latest outcomes, and jump back into the Validator when you need to investigate an invoice.' : 'Create a key, send the first request from your system, then inspect the response shape before wiring it into your workflow.'}</p>
                {!integrated ? (
                  <ol className="account-stepper" aria-label="API integration progress">
                    <Step number={1} label="Create API key" complete={stepOneDone} current={nextStep === 1} />
                    <Step number={2} label="Send first request" complete={stepTwoDone} current={nextStep === 2} />
                    <Step number={3} label="Inspect response" complete={stepThreeDone} current={nextStep === 3} />
                  </ol>
                ) : (
                  <div className="account-integrated-state"><CircleCheck size={20} aria-hidden="true" /><span>Integration activity is recorded in Usage.</span></div>
                )}
                <a href="#quickstart" className="account-button account-button--primary" onClick={() => goToSection('quickstart')}>{integrated ? 'Open API Quickstart' : 'Continue setup'} <ArrowUpRight size={16} /></a>
              </div>

              <div className="account-card account-key-context">
                <div className="account-card__eyebrow"><KeyRound size={15} aria-hidden="true" /> API key context</div>
                <h2>{hasActiveKey ? 'Ready to authenticate.' : 'No active key yet.'}</h2>
                <p className="account-muted">{hasActiveKey ? 'Use a secret from your environment. Existing secrets are never shown again here.' : 'Create a key to unlock the Quickstart examples and authenticate your first request.'}</p>
                <div className="account-key-context__value"><span className="account-avatar account-avatar--small"><KeyRound size={14} /></span><span>{hasActiveKey ? `${activeKeys[0].name} · ${activeKeys[0].prefix}…` : 'Create API key'}</span>{hasActiveKey ? <span className="account-key-live">active</span> : null}</div>
                <a href="#api-keys" className="account-text-link" onClick={() => goToSection('api-keys')}>{hasActiveKey ? 'View API keys' : 'Create a key'} <ArrowUpRight size={15} /></a>
              </div>
            </div>
          </section>

          <section id="quickstart" className="account-section">
            <div className="account-section-heading"><div><p className="account-breadcrumb">Integration</p><h2>API Quickstart</h2><p className="account-muted">Pick the input your system already produces. The examples below use the current endpoint contracts.</p></div><span className="account-section-code"><Code2 size={15} aria-hidden="true" /> no live request</span></div>
            <div className="account-card account-quickstart-card">
              <div className="account-quickstart-topline"><div><span className="account-card__eyebrow">Request configuration</span><h3>Choose a contract</h3></div><div className="account-key-chip"><KeyRound size={14} aria-hidden="true" /> {hasActiveKey ? `${activeKeys[0].prefix}…` : 'API key required'}</div></div>

              <div className="account-tablist" role="tablist" aria-label="API request format">
                {FORMAT_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return <button key={tab.id} type="button" role="tab" id={`${tab.id}-format-tab`} aria-selected={format === tab.id} aria-controls={`${tab.id}-format-panel`} tabIndex={format === tab.id ? 0 : -1} className={`account-tab${format === tab.id ? ' is-selected' : ''}`} onClick={() => { setFormat(tab.id); setLanguage('curl'); }} onKeyDown={(event) => moveTab(event, FORMAT_TABS.map((item) => item.id), format, setFormat)}><Icon size={16} aria-hidden="true" /> {tab.label}</button>;
                })}
              </div>

              <div className="account-contract-row"><span className="account-contract-endpoint"><span className="account-method">POST</span><code>{selectedFormat.endpoint}</code></span><span className="account-contract-type">{selectedFormat.contentType}</span></div>

              <div id={`${format}-format-panel`} role="tabpanel" aria-labelledby={`${format}-format-tab`} className="account-code-panel">
                <div className="account-code-toolbar"><div className="account-tablist account-tablist--language" role="tablist" aria-label="Code language">
                  {LANGUAGE_TABS.map((tab) => <button key={tab.id} type="button" role="tab" id={`${format}-${tab.id}-tab`} aria-selected={language === tab.id} aria-controls={`${format}-${tab.id}-panel`} tabIndex={language === tab.id ? 0 : -1} className={`account-language-tab${language === tab.id ? ' is-selected' : ''}`} onClick={() => setLanguage(tab.id)} onKeyDown={(event) => moveTab(event, LANGUAGE_TABS.map((item) => item.id), language, setLanguage)}>{tab.label}</button>)}
                </div><button type="button" className="account-copy-button" onClick={() => copyValue(selectedSnippet, 'request')} aria-label="Copy request example">{copiedTarget === 'request' ? <Check size={15} /> : <Copy size={15} />} {copiedTarget === 'request' ? 'Copied' : 'Copy'}</button></div>
                <div id={`${format}-${language}-panel`} role="tabpanel" aria-labelledby={`${format}-${language}-tab`} className="account-code-scroll"><pre><code>{selectedSnippet}</code></pre></div>
                <p className="account-code-note"><CircleAlert size={14} aria-hidden="true" /> Keep <code>EINVOICECHECK_API_KEY</code> in your environment. The example never contains a real secret.</p>
              </div>

              <div className="account-response-callout"><div><span className="account-card__eyebrow"><Play size={14} aria-hidden="true" /> Step 3</span><h3>Inspect response</h3><p className="account-muted">See the shape your integration receives. This is representative output from the current response schema; it does not execute a request.</p></div><button type="button" className="account-button account-button--secondary" onClick={inspectResponse}>{responseOpen ? 'Response open' : 'Inspect response'} <ArrowUpRight size={16} /></button></div>
              {responseOpen ? <div className="account-response-panel"><div className="account-response-summary"><CircleCheck size={20} aria-hidden="true" /><div><strong>{format === 'xml' ? 'Layered XML result' : 'Canonical JSON preflight result'}</strong><p>{format === 'xml' ? 'Read format, structure, and semantic statuses independently. A malformed XML document fails the format layer before deeper layers run.' : 'Read the flat errors array and validationScope. This path checks canonical invoice data; final UBL XML belongs on /v2/validate.'}</p></div></div><div className="account-response-code"><div className="account-code-toolbar"><span className="account-code-label">Raw JSON</span><button type="button" className="account-copy-button" onClick={() => copyValue(selectedResponse, 'response')} aria-label="Copy representative response">{copiedTarget === 'response' ? <Check size={15} /> : <Copy size={15} />} {copiedTarget === 'response' ? 'Copied' : 'Copy'}</button></div><div className="account-code-scroll"><pre><code>{selectedResponse}</code></pre></div></div></div> : null}
            </div>
          </section>

          <section id="api-keys" className="account-section">
            <div className="account-section-heading"><div><p className="account-breadcrumb">Credentials</p><h2>API Keys</h2><p className="account-muted">Raw secrets are shown once at creation. After that, only the prefix is available.</p></div><span className="account-section-code"><KeyRound size={15} aria-hidden="true" /> {activeKeys.length} active</span></div>
            <div className="account-card">
              {freshKey ? <div className="account-one-time-key"><div className="account-one-time-key__heading"><CircleAlert size={18} aria-hidden="true" /><div><strong>Copy this key now</strong><p>This secret is shown exactly once. It will not be revealed again.</p></div></div><div className="account-one-time-key__value"><code>{freshKey}</code><button type="button" className="account-copy-button" onClick={() => copyValue(freshKey, 'key')} aria-label="Copy new API key">{copiedTarget === 'key' ? <Check size={15} /> : <Copy size={15} />} {copiedTarget === 'key' ? 'Copied' : 'Copy'}</button></div><button type="button" className="account-button account-button--secondary" onClick={async () => { if (await copyToClipboard(freshKey)) setFreshKey(null); }}>I have copied it</button></div> : null}
              <div className="account-create-key"><label htmlFor="key-name">New key name</label><div><input id="key-name" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="e.g. CI pipeline" /><button type="button" className="account-button account-button--primary" onClick={createKey} disabled={busy === 'create'}><KeyRound size={16} /> {busy === 'create' ? 'Creating…' : 'Create API key'}</button></div></div>
              <div className="account-table-scroll"><table className="account-table"><caption className="sr-only">API keys for {props.email}</caption><thead><tr><th>Name</th><th>Prefix</th><th>Created</th><th>Last used</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{keys.map((key) => <tr key={key.id}><td><strong>{key.name}</strong></td><td><code>{key.prefix}…</code></td><td>{key.createdAt.slice(0, 10)}</td><td>{key.lastUsedAt ? key.lastUsedAt.slice(0, 10) : '—'}</td><td><span className={`account-status-pill account-status-pill--${key.active ? 'active' : 'revoked'}`}>{key.active ? 'active' : 'revoked'}</span></td><td>{key.active ? <button type="button" className="account-table-action" onClick={() => revokeKey(key.id)} disabled={busy === key.id}>Revoke</button> : null}</td></tr>)}</tbody></table></div>
            </div>
          </section>

          <section id="usage" className="account-section">
            <div className="account-section-heading"><div><p className="account-breadcrumb">Operations</p><h2>Usage</h2><p className="account-muted">Metered request activity from the API keys on this account.</p></div><span className="account-section-code"><Activity size={15} aria-hidden="true" /> last 30 days</span></div>
            <div className="account-usage-grid"><div className="account-card account-activity-card"><div className="account-card__heading"><div><h3>Validation activity</h3><p className="account-muted">Daily request outcomes recorded by the usage meter.</p></div><div className="account-outcome-legend"><span><i className="account-legend-dot account-legend-dot--valid" /> valid {props.usage.outcomes.valid}</span><span><i className="account-legend-dot account-legend-dot--invalid" /> invalid {props.usage.outcomes.invalid}</span><span><i className="account-legend-dot account-legend-dot--error" /> error {props.usage.outcomes.error}</span></div></div><div className="account-chart-scroll"><UsageGraph usage={props.usage} /></div><div className="account-chart-labels"><span>30 days ago</span><span>Today</span></div></div><div className="account-card account-totals-card"><span className="account-card__eyebrow">Usage totals</span><div className="account-total-row"><span>Today</span><strong>{props.usage.totals.today.toLocaleString()}</strong></div><div className="account-total-row"><span>Last 30 days</span><strong>{props.usage.totals.last30Days.toLocaleString()}</strong></div><div className="account-total-row"><span>All time</span><strong>{props.usage.totals.allTime.toLocaleString()}</strong></div><p className="account-muted account-total-note">These are recorded requests, not a promise of downstream acceptance.</p></div></div>
            <div className="account-card account-recent-card"><div className="account-card__heading"><div><h3>Recent activity</h3><p className="account-muted">Only fields exposed by the usage meter are shown.</p></div><span className="account-section-code">{props.usage.recent.length} events</span></div>{props.usage.recent.length ? <div className="account-table-scroll"><table className="account-table account-activity-table"><caption className="sr-only">Recent API usage activity</caption><thead><tr><th>Endpoint</th><th>Method</th><th>Outcome</th><th>Status</th><th>Timestamp</th></tr></thead><tbody>{props.usage.recent.map((event, index) => <tr key={`${event.timestamp}-${event.endpoint}-${index}`}><td><code>{event.endpoint}</code></td><td>{event.method}</td><td><OutcomeBadge outcome={event.outcome} /></td><td>{event.statusCode}</td><td>{formatTimestamp(event.timestamp)}</td></tr>)}</tbody></table></div> : <div className="account-empty-state"><Activity size={20} aria-hidden="true" /><p>No API activity recorded yet. Send the first request from Quickstart to see outcomes here.</p></div>}</div>
          </section>

          <section id="billing" className="account-section">
            <div className="account-section-heading"><div><p className="account-breadcrumb">Account</p><h2>Billing &amp; Plan</h2><p className="account-muted">Plan status and rate limits for this account.</p></div><span className="account-section-code"><CreditCard size={15} aria-hidden="true" /> {props.planName}</span></div>
            <div className="account-card account-billing-card"><div className="account-billing-summary"><div><span className="account-card__eyebrow">Current plan</span><h3>{props.planName}</h3><p className="account-muted">{props.currentPeriodEnd ? `Current period ends ${props.currentPeriodEnd.slice(0, 10)}.` : 'No paid subscription is attached to this account.'}</p></div><div className="account-plan-rate"><strong>{PLANS[props.plan].rateLimitPerMinute}</strong><span>requests / minute</span></div></div>{props.subscriptionStatus === 'on_hold' ? <div className="account-alert account-alert--warning"><CircleAlert size={18} aria-hidden="true" /><div><strong>Payment needs attention.</strong><p>Your account is currently on the free plan limits. Update the automatic payment in PayPal, then contact support if it does not reactivate.</p><a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer">Open PayPal payments <ArrowUpRight size={14} /></a></div></div> : null}{!props.billingConfigured ? <div className="account-alert account-alert--info"><CircleAlert size={18} aria-hidden="true" /><div><strong>Paid checkout is not configured on this deployment.</strong><p>The free trial remains available. Paid plan checkout requires the deployment’s PayPal configuration.</p></div></div> : null}<div className="account-plan-grid">{PLAN_IDS.map((id) => { const plan = PLANS[id]; const current = props.plan === id; const unavailable = id !== 'trial' && !props.billingConfigured; return <div key={id} className={`account-plan-option${current ? ' is-current' : ''}`}><div className="account-plan-option__top"><div><h3>{plan.name}</h3><span className="account-muted">{plan.priceLabel} {plan.cadence}</span></div>{current ? <span className="account-status-pill account-status-pill--active">Current</span> : null}</div><p className="account-muted">{plan.blurb}</p><div className="account-plan-option__limit">{plan.rateLimitPerMinute} requests / minute <span>·</span> plan usage reference: {plan.monthlyQuota.toLocaleString()} validations / month</div><button type="button" className="account-button account-button--secondary" disabled={current || busy === id || id === 'trial' || unavailable} onClick={() => subscribe(id)}>{current ? 'Current plan' : unavailable ? 'Paid checkout unavailable' : props.hasSubscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}</button></div>; })}</div>{props.hasSubscription ? <div className="account-billing-actions"><a className="account-button account-button--secondary" href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noreferrer">Manage payment in PayPal <ArrowUpRight size={15} /></a><button type="button" className="account-button account-button--danger" onClick={cancel} disabled={busy === 'cancel'}>Cancel subscription</button></div> : null}<p className="account-footnote">PayPal processes paid subscriptions. EInvoiceCheck remains the service provider and seller.</p></div>
          </section>

          <section className="account-section account-section--tools" aria-labelledby="continue-heading"><div className="account-section-heading"><div><p className="account-breadcrumb">Continue working</p><h2 id="continue-heading">Tools</h2></div></div><div className="account-tool-grid"><Link href="/#validate" className="account-tool-card"><span className="account-tool-card__icon"><FileCode2 size={19} /></span><span><strong>Validator</strong><small>Inspect XML findings</small></span><ArrowUpRight size={16} /></Link><Link href="/tools/xml-generator" className="account-tool-card"><span className="account-tool-card__icon"><Code2 size={19} /></span><span><strong>Generator</strong><small>Prepare XML input</small></span><ArrowUpRight size={16} /></Link></div></section>

          <footer className="account-footer"><span>Signed in as {props.email}</span><Link href="/docs">API Docs <ArrowUpRight size={13} /></Link><button type="button" onClick={signOut}>Sign out</button></footer>
        </div>
      </main>
      {accountMenuOpen ? (
        <div className="account-menu account-menu--global" role="menu" aria-label="Account menu">
          <div className="account-menu__heading"><span>Signed in as</span><strong>{props.email}</strong></div>
          <a href="#api-keys" role="menuitem" onClick={() => goToSection('api-keys')}><KeyRound size={15} aria-hidden="true" /> API keys</a>
          <button type="button" role="menuitem" onClick={signOut}><LogOut size={15} aria-hidden="true" /> Sign out</button>
        </div>
      ) : null}
      <span className="account-live-region" aria-live="polite">{copiedTarget ? `${copiedTarget} copied` : ''}</span>
    </div>
  );
}
