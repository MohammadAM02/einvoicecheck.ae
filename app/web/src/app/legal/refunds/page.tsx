import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Refund Policy',
  description:
    'Refund policy for einvoicecheck.ae. Dodo Payments is the merchant of record and processes refunds. 14-day refund window on the first payment of a plan; free trial means you can test before paying anything.',
  path: '/legal/refunds',
});

export default function RefundsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Refund Policy', path: '/legal/refunds' },
          ]),
        )}
      />

      <section>
        <div className="container legal">
          <h1>Refund Policy</h1>
          <p className="meta">
            Effective date: <Todo>{TODO.legalEffectiveDate}</Todo>
          </p>

          <div className="notice">
            <strong>Draft - not reviewed by a lawyer, and not yet reconciled with Dodo</strong>
            <p>
              This policy has not been reviewed by legal counsel, and it has not been checked against
              Dodo Payments&apos; own merchant-of-record refund terms. Where the two differ,
              Dodo&apos;s terms govern the transaction.
            </p>
          </div>

          <h2>1. Nothing is on sale yet</h2>
          <p>
            Billing is not live. Checkout is in test mode, no plan can be purchased today, and no
            card details are collected anywhere on this site. This policy describes what will apply
            once paid plans open.
          </p>

          <h2>2. Dodo Payments is the merchant of record</h2>
          <p>
            All purchases of einvoicecheck.ae plans are sold and processed by{' '}
            <strong>Dodo Payments</strong>, which acts as the merchant of record. Dodo takes the
            payment, issues the receipt, and executes refunds back to your original payment method.
            We never hold your card details and cannot move money ourselves - we authorise the
            refund, Dodo performs it.
          </p>

          <h2>3. Try before you pay</h2>
          <p>
            Every plan starts with a <Link href="/pricing">free trial</Link> - 100 validations, no
            card required. The trial exists so that you can prove the API works on your real invoices
            before any money is involved. Use it.
          </p>

          <h2>4. The refund window</h2>
          <ul>
            <li>
              <strong>First payment on a plan:</strong> if the service does not do what this site
              says it does, request a refund within <strong>14 days</strong> of that first charge
              and we will authorise a full refund, regardless of how many validations you ran.
            </li>
            <li>
              <strong>Renewals:</strong> subscription renewals are not refunded by default. Cancel
              before the renewal date to avoid the charge - cancellation stops future billing and
              your key keeps working to the end of the period you already paid for.
            </li>
            <li>
              <strong>Accidental duplicate charges:</strong> refunded in full, always, no time
              limit.
            </li>
            <li>
              <strong>Sustained outage or a validator defect that made the service unusable:</strong>{' '}
              tell us and we will refund the affected period, pro rata, on request.
            </li>
            <li>
              <strong>If we discontinue the service:</strong> we refund the unused remainder of any
              prepaid period, pro rata.
            </li>
          </ul>

          <h2>5. What we will not refund</h2>
          <ul>
            <li>
              A rejection by your accredited service provider or by the FTA. einvoicecheck.ae is a
              preflight validator. It is not FTA-accredited, it does not transmit legal e-invoices,
              and passing our validation is never a guarantee of downstream acceptance. This is
              stated on every page of this site before you buy anything.
            </li>
            <li>
              Tax penalties, fines or losses of any kind. See the limits in the{' '}
              <Link href="/legal/terms">Terms of Service</Link>.
            </li>
            <li>
              Renewals after the plan has been used normally for the period, outside the cases above.
            </li>
          </ul>

          <h2>6. How to request a refund</h2>
          <ol>
            <li>
              Email <Todo>{TODO.supportEmail}</Todo> with the email address on the subscription and
              the reason. You do not need to justify a request made inside the 14-day window.
            </li>
            <li>
              We acknowledge within <Todo>{TODO.supportSla}</Todo> and authorise the refund with
              Dodo Payments.
            </li>
            <li>
              Dodo Payments returns the money to your original payment method. The time it takes to
              appear depends on Dodo and on your bank or card issuer.
            </li>
          </ol>
          <p>
            You may also raise the request directly with Dodo Payments using the receipt they sent
            you, since they are the seller of record for the transaction.
          </p>

          <h2>7. Contact</h2>
          <p>
            Refund and billing questions: <Todo>{TODO.supportEmail}</Todo>, or see the{' '}
            <Link href="/contact">contact page</Link>.
          </p>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
