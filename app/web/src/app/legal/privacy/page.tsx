import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How einvoicecheck.ae handles invoice payloads, API-key hashes, usage events, Redis counters and PayPal subscription identifiers.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Privacy Policy', path: '/legal/privacy' }]))} />
      <div className="section"><div className="container legal">
        <div className="section-label">Legal</div><h1>Privacy Policy</h1>
        <p className="meta">Effective date: <Todo>{TODO.legalEffectiveDate}</Todo></p>
        <div className="notice"><strong>Draft — not reviewed by a lawyer</strong><p>Retention periods and the final sub-processor list must be completed before paid subscriptions go live.</p></div>
        <h2>1. Data controller</h2><p>The service is operated by <Todo>{TODO.operatorLegalName}</Todo>, resident in <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates. Privacy requests: <Todo>{TODO.supportEmail}</Todo>.</p>
        <h2>2. What we receive and store</h2>
        <h3>Invoice payloads</h3><p>We receive the JSON or XML document you submit to run validation and return findings. It may include names, TRNs, addresses, line items and amounts.</p>
        <ul><li>We do not sell payloads or use them to train models.</li><li>We do not transmit them to tax authorities or accredited providers.</li><li>Retention: <Todo>{TODO.payloadRetention}</Todo>.</li></ul>
        <h3>Accounts, keys and usage</h3><ul><li>We store your account email.</li><li>We store hashes of API keys, not full keys in plain text.</li><li>We store usage events needed to enforce plan limits.</li><li>Retention: <Todo>{TODO.logRetention}</Todo>.</li></ul>
        <h3>Rate limiting</h3><p>Short-lived Redis counters enforce limits and are not used for advertising or profiling.</p>
        <h3>PayPal billing</h3><p>PayPal collects and processes payment credentials under its own privacy terms. We do not store your full card number, CVC or bank login. We store the PayPal subscription ID, payer ID, plan ID, payment status and billing dates needed to control paid access.</p>
        <h2>3. Why we process data</h2><ul><li><strong>Contract:</strong> validation, accounts and plan enforcement.</li><li><strong>Legitimate interest:</strong> security, abuse prevention and reliability.</li><li><strong>Consent:</strong> optional service emails.</li></ul>
        <h2>4. Sub-processors</h2><p>Providers may include Railway, MongoDB and Redis hosts, a transactional email provider and PayPal. Final list: <Todo>[OPERATOR TO COMPLETE: named sub-processor list]</Todo>.</p>
        <h2>5. Data location</h2><p>Infrastructure may be outside the UAE. Regions: <Todo>[OPERATOR TO COMPLETE: hosting regions]</Todo>.</p>
        <h2>6. Your rights</h2><p>Request access, correction or deletion at <Todo>{TODO.supportEmail}</Todo>. Response target: <Todo>{TODO.supportSla}</Todo>.</p>
        <h2>7. Security</h2><p>Traffic is served over TLS and API keys are hashed. No SOC 2, ISO 27001 or independent security certification is claimed.</p>
        <h2>8. Children</h2><p>This business developer tool is not directed at children.</p>
        <h2>9. Changes</h2><p>Material changes will be published and communicated where practical.</p>
        <h2>10. Contact</h2><p>See the <Link href="/contact">contact page</Link>.</p>
        <GuardrailNotice />
      </div></div>
    </>
  );
}
