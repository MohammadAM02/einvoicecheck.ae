import Link from 'next/link';
import { GuardrailNotice, Todo } from '@/components/Chrome';
import { breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/seo';
import { GUARDRAIL, TODO } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for einvoicecheck.ae, the UAE e-invoice preflight validation API. Purchases are sold by Dodo Payments as merchant of record. Preflight validation only - not an accredited service provider.',
  path: '/legal/terms',
});

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Terms of Service', path: '/legal/terms' },
          ]),
        )}
      />

      <section>
        <div className="container legal">
          <h1>Terms of Service</h1>
          <p className="meta">
            Effective date: <Todo>{TODO.legalEffectiveDate}</Todo>
          </p>

          <div className="notice">
            <strong>Draft - not reviewed by a lawyer</strong>
            <p>
              This document has not been reviewed by qualified legal counsel. Highlighted{' '}
              <Todo>[OPERATOR TO COMPLETE: ...]</Todo> items are real-world facts that have not been
              established yet. They are deliberately left blank rather than guessed.
            </p>
          </div>

          <h2>1. Who you are contracting with</h2>
          <p>
            &quot;einvoicecheck.ae&quot;, &quot;we&quot; and &quot;us&quot; mean{' '}
            <Todo>{TODO.operatorLegalName}</Todo>, an individual (sole proprietor) resident in{' '}
            <Todo>{TODO.operatorEmirate}</Todo>, United Arab Emirates, operating the website
            einvoicecheck.ae and the validation API at api.einvoicecheck.ae.
          </p>
          <p>
            There is no registered company behind this service. It is not an LLC, an FZE, a free
            zone entity or a licensed establishment, and no trade licence number, commercial
            registration number or VAT registration number is published, because none exists.
            &quot;You&quot; means the person or organisation using the service.
          </p>

          <h2>2. Payments: Dodo Payments is the merchant of record</h2>
          <p>
            When paid plans open, <strong>Dodo Payments is the merchant of record</strong> and the
            seller of record for every purchase of an einvoicecheck.ae plan. That means:
          </p>
          <ul>
            <li>
              Dodo Payments sells the subscription to you, processes the payment, and issues the
              receipt or invoice for it.
            </li>
            <li>
              We never receive, handle or store your card number, CVC or bank details. This website
              contains no card fields and no payment form.
            </li>
            <li>
              Your purchase is additionally subject to Dodo Payments&apos; own terms and refund
              handling. Where their terms as merchant of record conflict with these terms on
              anything to do with payment, billing, tax or refunds, their terms govern the
              transaction.
            </li>
            <li>
              Refunds are requested and processed through Dodo Payments. See the{' '}
              <Link href="/legal/refunds">Refund Policy</Link>.
            </li>
          </ul>
          <p>
            <strong>Billing is not live.</strong> At the time of writing, checkout is in test mode.
            No plan can be purchased, no card details are collected anywhere on this site, and no
            money changes hands. Joining the <Link href="/waitlist">waitlist</Link> creates no
            payment obligation.
          </p>

          <h2>3. What the service does - and what it does not do</h2>
          <p>{GUARDRAIL}</p>
          <p>
            The service accepts an invoice you submit (canonical JSON, an envelope, or UBL 2.1 /
            PINT AE XML) and returns a list of field-level validation findings with a path, a rule
            id, a severity and a suggested fix. That is the entire scope of what you are buying.
          </p>
          <ul>
            <li>
              We are <strong>not accredited</strong> by the UAE Federal Tax Authority or the
              Ministry of Finance and we are not on any list of approved e-invoicing service
              providers.
            </li>
            <li>
              We <strong>do not transmit</strong> legal e-invoices to any tax authority, peer, or
              network, and we are not an access point.
            </li>
            <li>
              We <strong>do not replace</strong> an accredited service provider. You still need one.
            </li>
            <li>
              We <strong>do not provide statutory archival</strong> and must not be relied on as a
              record-keeping system.
            </li>
            <li>
              Nothing the service returns is tax, accounting or legal advice. A &quot;valid&quot;
              result is not a guarantee that any authority or provider will accept your invoice.
            </li>
          </ul>

          <h2>4. Your account and API keys</h2>
          <ul>
            <li>
              You are responsible for keeping your API key secret. Usage authenticated with your key
              is treated as your usage.
            </li>
            <li>
              Plans are metered per validation request. Requests may be rate limited. Exceeding your
              plan&apos;s quota may result in throttling or rejected requests.
            </li>
            <li>
              You must not resell, sublicense or wrap the API as a substitute for accredited
              e-invoicing services, and you must not present our output as accreditation,
              certification or clearance.
            </li>
            <li>
              You must not use the service to attack it - no attempts to bypass metering, no probing
              for vulnerabilities without permission, no denial-of-service.
            </li>
          </ul>

          <h2>5. Your data</h2>
          <p>
            Invoice payloads you POST to the API may contain personal and commercial data about you
            and your counterparties. You keep ownership of that content. You confirm you have the
            right to submit it to us for validation. What we do with it, and for how long, is set out
            in the <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>

          <h2>6. Availability</h2>
          <p>
            The service is provided on an as-is, as-available basis. There is no uptime SLA on any
            published plan. It is operated by one person; maintenance, outages and breaking changes
            are possible. Breaking API changes will be announced to active key holders at{' '}
            <Todo>{TODO.supportEmail}</Todo> before they take effect where reasonably possible.
          </p>

          <h2>7. Disclaimers and limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the service is provided without warranties of
            any kind, express or implied, including fitness for a particular purpose and
            non-infringement. We do not warrant that validation is exhaustive, that it reflects the
            current published UAE specification at any moment in time, or that an invoice passing
            validation will be accepted by an accredited service provider or by the FTA.
          </p>
          <p>
            To the maximum extent permitted by law, our total aggregate liability arising out of or
            in connection with the service is limited to the amount you actually paid for the
            service in the twelve months preceding the event giving rise to the claim. We are not
            liable for indirect or consequential loss, including tax penalties, fines, rejected
            filings, lost revenue or lost data.
          </p>

          <h2>8. Termination</h2>
          <p>
            You may stop using the service at any time and cancel a subscription through Dodo
            Payments. We may suspend or terminate access for breach of these terms, for abuse, or if
            we discontinue the service. If we discontinue the service, see the{' '}
            <Link href="/legal/refunds">Refund Policy</Link> for what happens to a prepaid period.
          </p>

          <h2>9. Changes to these terms</h2>
          <p>
            We may update these terms. Material changes will be announced on this page with a new
            effective date, and to active key holders by email where we have one. Continuing to use
            the service after a change means you accept it.
          </p>

          <h2>10. Governing law</h2>
          <p>
            <Todo>{TODO.governingLawEmirate}</Todo>. The operator is resident in the United Arab
            Emirates; the applicable law and the competent courts have not been settled with counsel
            and are deliberately not asserted here.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these terms: <Todo>{TODO.supportEmail}</Todo>. See the{' '}
            <Link href="/contact">contact page</Link> for the full list of channels.
          </p>

          <GuardrailNotice />
        </div>
      </section>
    </>
  );
}
