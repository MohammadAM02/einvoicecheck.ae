# O1 — Canned First-Responses (einvoicecheck.ae)

Ten responses. **Every one maps to a failure mode that E1's test suite actually exercised**
(`handoffs/E1/test_report.md`) or to a rule family the engine actually emits — nothing here is
invented. Source column cites the E1 test row / rule code.

**Rules for using these**
- Paste, then spend 20 seconds personalising the first line. A robotic reply in 3 minutes still
  beats a beautiful one in 3 hours, but a *named* robotic reply beats both.
- Sign every one with `[OPERATOR TO COMPLETE: operator full name]` and
  `[OPERATOR TO COMPLETE: support email]`.
- The guardrail sentence is **mandatory** in CR-10 and in any reply where scope is in question.
  It is never optional to keep a sale.

---

## CR-01 — 401, missing or invalid API key
**Maps to E1:** `POST /v1/validate` — *"Missing API key header → 401 unauthorized"* and
*"Invalid API key → 401"* (both PASS). Also `GET /usage` — *"No API key → 401"*.
**Trigger:** customer reports `401 {"error":"unauthorized"}`, "it says unauthorized", "my key doesn't work".

> Hi [name] — that 401 means the request reached us but carried no valid API key.
>
> Two things to check:
> 1. **Is the key on the request at all?** We accept it as `Authorization: Bearer <your_key>`.
>    A missing header and a wrong key both return the same 401 — that's deliberate, we don't
>    confirm which keys exist.
> 2. **Is it the whole key?** Trailing whitespace and a truncated copy-paste are the two most
>    common causes.
>
> ```bash
> curl -X POST https://einvoicecheck.ae/v1/validate \
>   -H "Authorization: Bearer YOUR_KEY" \
>   -H "Content-Type: application/json" \
>   --data @invoice.json
> ```
>
> `GET /health` needs no key — if that returns 200 but `/v1/validate` returns 401, it's
> definitely the key, not us. If you've confirmed both and still get 401, send me the timestamp
> of a failing request and I'll look it up.

**Fix the customer applies:** send the key in the `Authorization: Bearer` header, whole and untrimmed.

---

## CR-02 — 429, rate limit exceeded
**Maps to E1:** `POST /v1/validate` — *"Rate limit — 4th call over a 3/window key → 429 `rate_limited` + `Retry-After`"* (PASS).
**Trigger:** `429`, "rate_limited", "I'm being throttled", bulk backfill failing partway.

> Hi [name] — a 429 `rate_limited` means you've gone over your plan's request allowance for the
> current window. Nothing is broken and nothing is lost — the calls that got 429 simply weren't
> processed.
>
> Every 429 carries a **`Retry-After`** header telling you how many seconds to wait. The fix is
> to honour it rather than retry immediately:
>
> ```js
> if (res.status === 429) {
>   const wait = Number(res.headers.get('retry-after') || 1);
>   await new Promise(r => setTimeout(r, wait * 1000));
>   // then retry
> }
> ```
>
> If you're validating a backlog, throttle to your plan's rate and run it as a queue rather than
> a burst. If you need a genuinely higher limit, tell me the volume and shape (invoices/day, and
> whether it's a one-off migration or steady-state) and I'll tell you which plan fits — or
> whether we should just lift the ceiling for the migration window.

**Fix the customer applies:** read `Retry-After`, back off, queue instead of burst; upgrade if steady-state volume exceeds plan.

---

## CR-03 — Malformed / unparseable payload (`ENG-PARSE-01`)
**Maps to E1:** Rule engine — *"Unparseable input → single `ENG-PARSE-01` structural error"* (PASS).
**Trigger:** response contains one error, `ENG-PARSE-01`; "it says parse error"; "why did it only find one problem?".

> Hi [name] — `ENG-PARSE-01` means we couldn't parse the document at all, so we stopped before
> running any of the content rules. That's why you only see one error instead of a full report:
> there was nothing structurally valid to check.
>
> Usual causes, in the order I'd check them:
> 1. The body isn't valid JSON / valid XML (a truncated file, a trailing comma, an unclosed tag).
> 2. The body is a JSON **string** containing your invoice, rather than the invoice object itself
>    (double-encoding — you'll see it as a payload starting `"{\"invoice\"...`).
> 3. It's an empty body, or a file the framework serialized as `[object Object]`.
>
> Run the raw file through a JSON/XML linter first; once it parses, resubmit and you'll get the
> real rule report. If it lints clean and we still say `ENG-PARSE-01`, send me the exact bytes
> you sent (redact the TRNs) — that would be our bug and I want it.

**Fix the customer applies:** send a syntactically valid, non-double-encoded JSON or XML body.

---

## CR-04 — TRN format failures (`ENG-TRN-01..04`)
**Maps to E1:** Rule engine — *"Broken invoice flags TRN + VAT + line + total rules"* (PASS), TRN family.
**Trigger:** `ENG-TRN-01` (seller TRN missing), `ENG-TRN-02` (seller TRN not 15 digits), `ENG-TRN-03` (buyer TRN absent), `ENG-TRN-04` (buyer TRN not 15 digits).

> Hi [name] — those `ENG-TRN-*` errors are all about the Tax Registration Number format:
>
> - **`ENG-TRN-01`** — seller TRN (BT-31) is missing entirely. It's mandatory.
> - **`ENG-TRN-02`** — seller TRN is present but isn't a valid UAE TRN. A UAE FTA VAT TRN is
>   **exactly 15 numeric digits** — no spaces, no dashes, no `TRN` prefix, no letters. The single
>   most common cause is that a spreadsheet stored it as a number and stripped a leading zero, or
>   that it was exported with formatting.
> - **`ENG-TRN-03`** — buyer TRN (BT-48) is absent. Include it for a B2B tax invoice; omit it
>   only if the sale is genuinely B2C.
> - **`ENG-TRN-04`** — buyer TRN present but not 15 digits, same rules as above.
>
> Every error we return carries a `fix` field with the exact remedy and a `path` pointing at the
> offending field — worth reading those before changing anything upstream.
>
> Note we validate the **format**, not the existence of the TRN in the FTA register. We're a
> preflight checker; we're not FTA-accredited and we don't query FTA systems.

**Fix the customer applies:** emit the TRN as a 15-digit numeric string (quote it in JSON to preserve leading zeros).

---

## CR-05 — VAT category / rate mismatch (`ENG-VAT-01..04`)
**Maps to E1:** Rule engine — broken-invoice test, VAT rule family (PASS).
**Trigger:** `ENG-VAT-01` (category code missing), `ENG-VAT-02` (unknown category), `ENG-VAT-03` (rate missing for a rated category), `ENG-VAT-04` (category/rate contradiction, e.g. category `Z` with rate 5).

> Hi [name] — the `ENG-VAT-*` family fires when the VAT **category code** and the VAT **rate**
> disagree with each other.
>
> The rule is simple: the category determines the rate.
> - Standard-rated (`S`) must carry the standard rate — it cannot be 0.
> - Zero-rated (`Z`), exempt (`E`), out-of-scope (`O`) and reverse-charge (`AE`) must carry **0**
>   — a zero-rated line with a 5% rate is a contradiction, and that's what `ENG-VAT-04` is telling you.
>
> Practically, this almost always means one of two things upstream:
> 1. Your ERP writes a tax **amount** but defaults the category code to a hardcoded value; or
> 2. an export step drops the rate for non-standard categories and something downstream backfills it.
>
> Fix the category first, then the rate — our `fix` field on each error tells you exactly which
> value to set. Also check the tax subtotals, not just the lines: the category has to be
> consistent in both places.

**Fix the customer applies:** align category code and rate (rated categories carry their rate; Z/E/O/AE carry 0), on both lines and tax subtotals.

---

## CR-06 — Line-item arithmetic mismatch (`ENG-LINE-01..03`)
**Maps to E1:** Rule engine — broken-invoice test, line rule family (PASS).
**Trigger:** `ENG-LINE-01` (line net ≠ qty × price), `ENG-LINE-02` (quantity missing/non-numeric), `ENG-LINE-03` (unit price missing/non-numeric).

> Hi [name] — `ENG-LINE-01` means a line's net amount (BT-131) doesn't equal
> **quantity × unit price** (± that line's allowances and charges). `ENG-LINE-02` / `-03` mean
> the quantity or unit price isn't there, or isn't numeric.
>
> In practice this is nearly always one of:
> - **Rounding at the wrong step.** Round the *line net*, not the unit price. A unit price of
>   33.333 × 3 has to reconcile to the net you actually state.
> - **Numbers sent as strings** ("1,250.00" with a thousands separator, or a localized decimal
>   comma). Send plain numeric values.
> - **A discount applied to the net but not represented as a line allowance**, so our arithmetic
>   and yours diverge by exactly the discount.
>
> The `path` in each error points at the exact line index, so you can go straight to it. Fix the
> lines before you look at the document totals — line errors cascade upward into the `ENG-TOT-*`
> family and you'll chase ghosts otherwise.

**Fix the customer applies:** make each line net equal qty × price ± line allowance/charge; send numerics as numbers.

---

## CR-07 — Document-total mismatch (`ENG-TOT-10, -13, -14, -15, -16`)
**Maps to E1:** Rule engine — broken-invoice test, totals rule family (PASS).
**Trigger:** any `ENG-TOT-*`; "your totals disagree with my ERP".

> Hi [name] — the `ENG-TOT-*` family checks that the document totals reconcile with the lines.
> Each one is a specific equation, and each error tells you the value we computed:
>
> - **`ENG-TOT-10`** — `lineExtensionAmount` (BT-106) must equal the **sum of line nets**.
> - **`ENG-TOT-13`** — `taxExclusiveAmount` (BT-109) = line sum − allowances + charges.
> - **`ENG-TOT-14`** — `taxAmount` (BT-110) = **sum of the tax subtotal amounts**.
> - **`ENG-TOT-15`** — `taxInclusiveAmount` (BT-112) = tax-exclusive + tax.
> - **`ENG-TOT-16`** — `payableAmount` (BT-115) = tax-inclusive − prepaid + rounding.
>
> Work them **in that order** — 10 → 13 → 14 → 15 → 16 — because they chain. And fix any
> `ENG-LINE-*` errors first: a bad line net makes every total downstream of it wrong, and you'll
> otherwise "fix" five totals to match a broken line.
>
> If your ERP's total is right and ours is wrong, send me the payload (TRNs redacted) — the
> engine is deterministic, so if it's genuinely our arithmetic I can reproduce it exactly and
> it's a bug I'll fix, not a debate.

**Fix the customer applies:** fix lines first, then recompute totals in the 10→13→14→15→16 chain.

---

## CR-08 — Foreign currency / AED tax-currency rule (`ENG-CUR-03`)
**Maps to E1:** Rule engine — *"Foreign currency requires AED tax currency → `ENG-CUR-03` raised"* (PASS).
**Trigger:** `ENG-CUR-03`; "I invoice in USD/EUR and you're rejecting it".

> Hi [name] — we're not rejecting the foreign currency. You can absolutely invoice in USD, EUR
> or anything else. `ENG-CUR-03` is about the **tax accounting currency**, which is a separate
> field.
>
> The rule: when the invoice currency (BT-5) is not AED, the **VAT amounts must still be reported
> in AED** (BT-6). So you send both:
>
> ```json
> {
>   "currency": "USD",
>   "taxCurrency": "AED",
>   "...": "VAT amounts expressed in AED"
> }
> ```
>
> Set `taxCurrency` to `"AED"` and carry the AED tax amounts alongside your USD document totals.
> That's the whole fix — the rest of the invoice stays in your trading currency.

**Fix the customer applies:** set `taxCurrency: "AED"` and report VAT amounts in AED when the document currency isn't AED.

---

## CR-09 — XML vs JSON confusion
**Maps to E1:** `POST /v1/validate` — *"UBL 2.1 / PINT AE XML via `application/xml` → 200 valid"* (PASS) and Rule engine — *"UBL XML parsed + validated"* (PASS). Also the most likely real cause behind an `ENG-PARSE-01` (see CR-03).
**Trigger:** "do you accept XML?", "I sent UBL and got a parse error", `Content-Type` mismatch.

> Hi [name] — we accept **both**. JSON and UBL 2.1 / PINT AE XML both work on the same endpoint,
> `POST /v1/validate`. The thing that has to be right is the **`Content-Type` header**, because
> it's what tells us which parser to use:
>
> - JSON body → `Content-Type: application/json`
> - UBL / PINT AE XML body → `Content-Type: application/xml`
>
> Sending an XML body with `Content-Type: application/json` (or the reverse) is the number-one
> cause of a lone `ENG-PARSE-01` in the response. Many HTTP clients default to `application/json`
> silently, so it's worth printing the header you're actually sending rather than the one you
> think you are.
>
> ```bash
> curl -X POST https://einvoicecheck.ae/v1/validate \
>   -H "Authorization: Bearer YOUR_KEY" \
>   -H "Content-Type: application/xml" \
>   --data-binary @invoice.xml
> ```
>
> Same rules, same error codes, same response shape either way.

**Fix the customer applies:** match `Content-Type` to the body format; use `--data-binary` for XML files.

---

## CR-10 — "Can you replace my ASP? / Are you FTA-accredited?"
**Maps to E1:** the positioning guardrail carried through every E1 artifact; and the
`/v1/validate` contract — we return a validation *report*, never a transmission receipt.
**Trigger:** "are you FTA-accredited?", "can we file through you?", "can you replace [ASP]?",
"do you archive our invoices?", procurement questionnaires.

> Hi [name] — thanks for asking directly; here's the straight answer.
>
> **No.** einvoicecheck.ae is **preflight validation only**. Specifically:
> - We are **not FTA-accredited**.
> - We do **not transmit legal e-invoices** to anyone.
> - We do **not replace an accredited service provider** — you still need yours.
> - We provide **no statutory archival**.
>
> **What we actually do:** we check your invoice *before* it reaches your accredited provider,
> and tell you exactly which fields would get it rejected — TRN format, VAT category/rate
> consistency, line arithmetic, document totals, currency and tax-currency rules — each with the
> spec reference and the exact fix. One `POST /v1/validate` call, JSON or UBL/PINT AE XML,
> deterministic result.
>
> The reason people run us alongside their ASP is that rejections are expensive and slow, and
> they're almost always caused by boring, mechanical, catchable errors. We catch them at your
> side of the wire, in CI or before you hit send.
>
> If what you need is accredited transmission and archival, you need an accredited service
> provider, and I'd rather tell you that now than take your money for the wrong thing.

**Fix the customer applies:** none — this is a scope answer. Keep the accredited provider; use us upstream of it.
**Never** dilute this response. It is the product's integrity, and the whole positioning
guardrail depends on it being said the same way every single time.

---

## Coverage check against E1's test report

| E1 test row | Canned response |
|---|---|
| Missing API key header → 401 | CR-01 |
| Invalid API key → 401 | CR-01 |
| `GET /usage` no API key → 401 | CR-01 |
| Rate limit → 429 + `Retry-After` | CR-02 |
| Unparseable input → `ENG-PARSE-01` | CR-03 |
| Broken invoice flags TRN rules | CR-04 |
| Broken invoice flags VAT rules | CR-05 |
| Broken invoice flags line rules | CR-06 |
| Broken invoice flags total rules | CR-07 |
| Foreign currency → `ENG-CUR-03` | CR-08 |
| UBL 2.1 / PINT AE XML via `application/xml` → 200 | CR-09 |
| (positioning guardrail, all artifacts) | CR-10 |
