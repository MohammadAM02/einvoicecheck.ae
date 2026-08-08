import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Refund Policy',
  description: 'Refund policy for einvoicecheck.ae PayPal subscriptions, including first-payment refunds, renewals, duplicate charges and outages.',
  path: '/legal/refunds',
  noindex: true,
});

export default function RefundsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Refund Policy', path: '/legal/refunds' }]))} />
      <div className="section"><div className="container legal">
        <div className="section-label">Legal</div><h1>Refund Policy</h1>
        <p className="meta">Effective date: <Todo>{TODO.legalEffectiveDate}</Todo></p>
        <div className="notice"><strong>Draft — not reviewed by a lawyer</strong><p>This policy must be reviewed before paid subscriptions are switched to live mode.</p></div>
        <h2>1. Payment processing</h2>
        <p>Paid subscriptions are processed by PayPal. einvoicecheck.ae remains the provider of the service and decides whether a refund is approved. We do not receive or store your full card number, CVC or bank credentials.</p>
        <h2>2. Try before you pay</h2>
        <p>The <Link href="/pricing">free tier</Link> includes 100 validations and requires no card. Use it before buying.</p>
        <h2>3. Refund eligibility</h2>
        <ul>
          <li><strong>First payment:</strong> request a refund within <strong>14 days</strong> if the service materially fails to do what the site says.</li>
          <li><strong>Renewals:</strong> renewal charges are not refunded by default. Cancel before the next billing date.</li>
          <li><strong>Duplicate charges:</strong> refunded in full after verification.</li>
          <li><strong>Sustained outage or confirmed validator defect:</strong> the affected period may be refunded pro rata.</li>
          <li><strong>Service discontinuation:</strong> unused prepaid time will be reviewed for a pro-rata refund.</li>
        </ul>
        <h2>4. What is not refundable</h2>
        <ul><li>Downstream rejection by an accredited provider or authority.</li><li>Tax penalties, fines or consequential losses.</li><li>Normal use outside the cases listed above.</li></ul>
        <h2>5. How to request a refund</h2>
        <ol><li>Email <Todo>{TODO.supportEmail}</Todo> with the PayPal subscription email, charge date and reason.</li><li>We respond within <Todo>{TODO.supportSla}</Todo>.</li><li>If approved, the refund is issued through PayPal to the original payment method.</li></ol>
        <h2>6. Contact</h2><p>See the <Link href="/contact">contact page</Link>.</p>
        <GuardrailNotice />
      </div></div>
    </>
  );
}
