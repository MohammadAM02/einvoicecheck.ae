# Legal review notes — M1b

**Workflow:** proven-demand-api-v1 · **Step:** M1b · **Date:** 2026-07-14 · **Author:** seo_marketer (not a lawyer)

---

## 1. These drafts are NOT lawyer-reviewed

**The Terms of Service, Privacy Policy and Refund Policy at `/legal/terms`, `/legal/privacy` and `/legal/refunds` were drafted by an AI agent and have not been reviewed by any qualified legal counsel, in the UAE or anywhere else.** They are not legal advice. They are a good-faith, honest first draft written to (a) survive Dodo Payments' merchant review and (b) avoid stating anything false about the operator or the product. They are not a substitute for a lawyer, and they should not be relied on as an enforceable allocation of risk.

Every page carries a visible "Draft — not reviewed by a lawyer" notice on the site itself. Do not remove those notices until counsel has actually reviewed the documents.

Nothing on these pages was fabricated. Where a real-world fact was required and unknown, a highlighted `[OPERATOR TO COMPLETE: ...]` placeholder was rendered instead. No company, LLC, FZE, trade licence, commercial registration, VAT number, street address, founder name, phone number or support email was invented.

---

## 2. Complete placeholder inventory

All placeholders are defined in one place — `app/web/src/lib/site.ts`, the `TODO` constant — and rendered through the `<Todo>` component (yellow highlight, dashed border) so they are impossible to miss on the rendered page. Two are inlined directly in the privacy page. Fill in the constant and every page updates.

| # | Placeholder | Defined in | Appears on |
|---|---|---|---|
| 1 | `[OPERATOR TO COMPLETE: legal name of operator (individual / sole proprietor)]` | `lib/site.ts` → `TODO.operatorLegalName` | `/contact`, `/legal/terms` §1, `/legal/privacy` §1 |
| 2 | `[OPERATOR TO COMPLETE: UAE emirate of residence]` | `lib/site.ts` → `TODO.operatorEmirate` | `/contact`, `/legal/terms` §1, `/legal/privacy` §1 |
| 3 | `[OPERATOR TO COMPLETE: support email address - not yet provisioned]` | `lib/site.ts` → `TODO.supportEmail` | `/contact` (×3), `/legal/terms` §6 and §11, `/legal/privacy` §1, §6, §10, `/legal/refunds` §6, §7 |
| 4 | `[OPERATOR TO COMPLETE: name of the point of contact]` | `lib/site.ts` → `TODO.contactName` | `/contact` |
| 5 | `[OPERATOR TO COMPLETE: support response-time commitment]` | `lib/site.ts` → `TODO.supportSla` | `/contact` (×2), `/legal/privacy` §6, `/legal/refunds` §6 |
| 6 | `[OPERATOR TO COMPLETE: retention period for submitted invoice payloads]` | `lib/site.ts` → `TODO.payloadRetention` | `/legal/privacy` §2a |
| 7 | `[OPERATOR TO COMPLETE: retention period for request logs and metering events]` | `lib/site.ts` → `TODO.logRetention` | `/legal/privacy` §2b |
| 8 | `[OPERATOR TO COMPLETE: retention period for waitlist email addresses]` | `lib/site.ts` → `TODO.waitlistRetention` | `/legal/privacy` §2b |
| 9 | `[OPERATOR TO COMPLETE: effective date of these terms]` | `lib/site.ts` → `TODO.legalEffectiveDate` | `/legal/terms`, `/legal/privacy`, `/legal/refunds` (page meta line) |
| 10 | `[OPERATOR TO COMPLETE: governing law / courts (emirate) - confirm with counsel]` | `lib/site.ts` → `TODO.governingLawEmirate` | `/legal/terms` §10 |
| 11 | `[OPERATOR TO COMPLETE: named sub-processor list (hosting, MongoDB host, Redis host, email provider)]` | inline | `/legal/privacy` §4 |
| 12 | `[OPERATOR TO COMPLETE: hosting region(s) for API, MongoDB and Redis]` | inline | `/legal/privacy` §5 |

A 13th string, the generic `[OPERATOR TO COMPLETE: ...]`, appears inside the explanatory draft-notice on `/legal/terms` — it is illustrative, not a field to fill.

**Verification command:** `grep -rho "OPERATOR TO COMPLETE: [^]]*" app/web/src/ | sort -u`

---

## 3. Open legal questions the operator MUST resolve before going public

These are not soft. Each one is a live exposure.

### 3.1 Who is the contracting legal person? There is no company.
There is no LLC, FZE, sole-establishment licence or commercial registration behind einvoicecheck.ae. That means **the contracting party is you, personally, as a natural person** — and so is the liability. The limitation-of-liability clause in the Terms caps exposure at fees paid, but an unreviewed contract term does not reliably shield a natural person, and there is no corporate veil at all here. Before taking a single dirham: decide whether you contract as a named individual or incorporate first. Dodo's merchant onboarding will ask you to identify the seller entity; whatever you tell Dodo must match what `/legal/terms` §1 says. **Do not let those two diverge.**

### 3.2 Operating a paid service as a UAE individual without a trade licence
The UAE generally requires a trade licence to carry on commercial activity from within the country, and freelance/e-trader permits exist precisely for this case. Whether taking recurring subscription revenue from a UAE-hosted product as an unlicensed individual is permissible — and whether the Dodo merchant-of-record structure changes that analysis, since Dodo is the seller of record and you are its supplier — is a question for a UAE-qualified adviser. **This is the single highest-risk open item.** It is a licensing question, not a website question, and no wording on the site fixes it. Resolve it before billing goes live, not after.

### 3.3 What happens to invoice payload data (retention / PII)
Submitted invoices contain **real personal and commercial data**: counterparty names, TRNs, addresses, contact names, amounts. We currently have **no decided retention period** — placeholders 6, 7 and 8. This is the most likely thing to blow up. Decide and publish: (a) do payloads persist at all beyond the request, and where — memory only, or logs? (b) how long do metering events live in MongoDB? (c) what does the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021) actually require of you here, and does any customer's own GDPR position make you their processor (in which case they will ask for a DPA you do not have)? Until this is settled, the Privacy Policy tells users to redact before validating — which is honest but is a workaround, not an answer.

### 3.4 Are our refund terms consistent with Dodo's merchant-of-record terms?
The Refund Policy promises a 14-day full refund on first payment, pro-rata refunds for outage/discontinuation, and full refunds for duplicate charges. **None of this has been checked against Dodo Payments' actual MoR agreement.** Dodo is the seller of record: they execute refunds, they set the operational refund window, and their terms may cap the period, forbid pro-rata partials, or handle chargebacks in a way that conflicts with what we published. Read Dodo's merchant terms and reconcile line by line before billing opens. The page currently states that Dodo's terms govern where the two conflict — that limits the damage, but publishing a promise you cannot execute is still a consumer-facing problem.

### 3.5 Secondary items
- **Governing law is deliberately unasserted** (placeholder 10). Pick one with counsel; do not guess an emirate or a free-zone court.
- **VAT.** No VAT number exists. If Dodo as MoR handles VAT/sales tax on the end-customer sale, confirm that in writing — and confirm what your own UAE VAT registration obligation becomes once revenue is real.
- **No support mailbox exists yet.** The site currently tells users the mailbox is not provisioned and routes them to the waitlist form. A merchant reviewer may reject that. Provision the address before submitting to Dodo.
- **The product guardrail is a legal shield, not just marketing.** "Not FTA-accredited, does not transmit, does not replace an ASP, no statutory archival" appears on every page and in the Terms and the Refund Policy. Never let a copy edit remove it.
