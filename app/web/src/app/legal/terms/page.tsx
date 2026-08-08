import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { GUARDRAIL, TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'Terms for the einvoicecheck.ae UAE e-invoice preflight validation API. Paid subscriptions are processed through PayPal.',
  path: '/legal/terms',
  noindex: true,
});

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Terms of Service', path: '/legal/terms' }]))} />
      <div className="section"><div className="container legal">
        <div className="section-label">Legal</div><h1>Terms of Service</h1>
        <p className="meta">Effective date: <Todo>{TODO.legalEffectiveDate}</Todo></p>
        <div className="notice"><strong>Draft — not reviewed by a lawyer</strong><p>Complete the operator facts and obtain legal review before paid subscriptions go live.</p></div>
        <h2>1. Who you are contracting with</h2>
        <p>&quot;einvoicecheck.ae&quot;, &quot;we&quot; and &quot;us&quot; mean <Todo>{TODO.operatorLegalName}</Todo>, an individual resident in <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates. &quot;You&quot; means the person or organisation using the service.</p>
        <h2>2. Payments and subscriptions</h2>
        <ul>
          <li>PayPal processes paid subscription payments and stores payment credentials used in its checkout.</li>
          <li>einvoicecheck.ae remains the provider and seller of the service and is responsible for prices, support and refund decisions.</li>
          <li>Paid subscriptions renew automatically until cancelled.</li>
          <li>Plan changes may require approval of the revised PayPal subscription.</li>
          <li>Cancellation through the dashboard is immediate and returns the account to free-tier limits.</li>
          <li>Refunds are governed by the <Link href="/legal/refunds">Refund Policy</Link>.</li>
        </ul>
        <p>Paid checkout remains unavailable until PayPal is switched from sandbox to live mode. A free account creates no payment obligation.</p>
        <h2>3. Service scope</h2><p>{GUARDRAIL}</p><p>The service returns field-level validation findings. It does not provide tax, accounting or legal advice.</p>
        <h2>4. Accounts and usage</h2>
        <ul><li>Keep API keys secret.</li><li>Plans are metered per validation and may be rate limited or blocked above quota.</li><li>Do not resell the API as an accredited service or misrepresent output as certification.</li><li>Do not bypass metering, probe without permission or disrupt the service.</li></ul>
        <h2>5. Your data</h2><p>You keep ownership of submitted content and confirm you have the right to submit it. See the <Link href="/legal/privacy">Privacy Policy</Link>.</p>
        <h2>6. Availability</h2><p>The service is provided as-is and as-available with no published uptime SLA.</p>
        <h2>7. Liability</h2><p>We do not guarantee exhaustive validation or downstream acceptance. To the maximum extent permitted by law, aggregate liability is limited to the amount paid in the twelve months before the claim. We are not liable for indirect loss, tax penalties, fines, rejected filings, lost revenue or lost data.</p>
        <h2>8. Termination</h2><p>You may stop using the service and cancel from the dashboard. We may suspend access for breach, abuse or discontinuation.</p>
        <h2>9. Changes</h2><p>Material changes will be published with a new effective date and communicated where practical.</p>
        <h2>10. Governing law</h2><p><Todo>{TODO.governingLawEmirate}</Todo>.</p>
        <h2>11. Contact</h2><p><Todo>{TODO.supportEmail}</Todo>. See the <Link href="/contact">contact page</Link>.</p>
        <GuardrailNotice />
      </div></div>
    </>
  );
}
