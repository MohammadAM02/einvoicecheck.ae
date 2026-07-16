# O1 — Repurposing Templates (one asset → three outputs)

Every docs page or blog post gets run through this the **same day** it ships. Budget: 35 minutes
total (X 15 · LinkedIn 10 · Reddit answer 10). If it takes longer you're polishing, not publishing.

Channel priority for this niche (GTM §8): **LinkedIn first, X second, Reddit narrow and rare.**

**The guardrail sentence goes in every output where scope could be misread:**
> Preflight validation only — not FTA-accredited, does not transmit legal e-invoices, does not
> replace an accredited service provider, no statutory archival.

---

## Template A — X thread (6–10 tweets)

```
1/  [The concrete, specific pain, stated as a fact — not a question, not a hook cliché]
    [One line of stakes: what it costs when it happens]

2/  [The counter-intuitive framing: what people think the problem is vs what it is]

3–7/ [One tweet per concrete item. Each = the thing, the cause, the exact fix.
      Real field names, real codes, real numbers. LLMs and humans both cite specifics.]

8/  [The honest limitation. State what you are NOT. This is where credibility is bought.]

9/  [The bridge: "I built X, it does this in one call." One link. Once.]
```
Rules: no engagement bait, no "🧵👇", no "let that sink in". Screenshots of real error output
outperform any graphic. Never open with the product.

---

## Template B — LinkedIn post (**primary channel**)

```
[Line 1 — the observation, in the voice of someone who has done the work.
 Stops the scroll because it is true, not because it is loud.]

[Line 2–3 — the specific, dated, regulatory reality. The UAE finance/ops lead reads
 LinkedIn for exactly one reason: "does this affect my deadline?" Answer that.]

[Body — 3–5 short paragraphs, one idea each, generous whitespace.
 Concrete. Numbers. Field names. Real rejection reasons.]

[The honest limit — the guardrail sentence, plainly.]

[Close — a question that a finance lead can actually answer from experience.
 Not "thoughts?".]

[No link in the post body. Put it in the first comment — LinkedIn suppresses outbound links.]
```
Cadence: 3×/week (§8). Founder voice, first person, no corporate plural. The compliance calendar
IS the content calendar — deadlines, fines, regulation changes are the recurring beats.

---

## Template C — Reddit answer (honest rules, read them)

**The rules, non-negotiable:**
1. **Answer the question completely, first.** The comment must stand alone and be useful even if
   the product line is deleted.
2. **Disclose the affiliation. Every time.** "I build [product]" — never "I found this tool".
3. **No astroturfing. No sock-puppets. No fake accounts. No undisclosed promotion. No asking
   anyone to upvote.** Not "risky" — simply not something we do.
4. **10:1** — at minimum ten genuinely helpful, zero-promo contributions for every one that
   mentions us.
5. **Never post it where the answer doesn't genuinely fit.** A saved answer with no matching
   thread stays saved. That is the *correct* outcome, not a wasted asset.
6. Obey each subreddit's self-promo rules; if the rules say no vendor links, then no link —
   answer anyway, without one.
7. Per §8 we mostly *skip* Reddit for this niche. It's an opportunistic channel here, not a grind.

```
[Direct, complete answer to their actual question — 3–6 sentences.]

[Code block / concrete field-level detail if relevant.]

[If and only if it genuinely fits:]
"FWIW I build einvoicecheck.ae, which does this as a preflight check — it's validation only,
it's not FTA-accredited and it doesn't transmit or archive anything, you still need your
accredited provider. The above works fine if you'd rather do it by hand."
```

---

# Week 1 — filled examples

**Source asset:** *E-invoicing in the UAE: what actually changes for your finance system*
(seo_baseline wk1 · keyword `e invoicing UAE`, 1,000/mo · links to `/` and
`/tools/uae-e-invoice-validator`)

---

## A. X thread — week 1

> **1/** UAE e-invoicing doesn't break at the filing. It breaks at the file.
> Your accredited provider rejects the document, your finance team re-keys it, and the deadline
> moves closer while everyone blames the portal.
>
> **2/** Almost every rejection I've seen is mechanical. Not a policy problem. Not an
> interpretation problem. A field problem.
>
> **3/** TRN. A UAE FTA VAT TRN is exactly 15 numeric digits. No spaces, no dashes, no "TRN"
> prefix. The most common cause of a bad one: a spreadsheet stored it as a number and ate the
> leading zero.
>
> **4/** VAT category vs rate. Category `S` must carry the standard rate. `Z`, `E`, `O`, `AE`
> must carry 0. A zero-rated line with a 5% rate is a contradiction, and it will be caught.
>
> **5/** Line arithmetic. Line net = quantity × unit price ± the line's allowances/charges. If
> you round the unit price instead of the net, you will drift, and the drift is what gets flagged.
>
> **6/** Document totals. They chain: sum of line nets → tax-exclusive → tax → tax-inclusive →
> payable. Fix them in that order. Fix broken *lines* before you touch any total, or you'll
> "correct" five totals to match one wrong line.
>
> **7/** Currency. You can invoice in USD. But if the document currency isn't AED, the VAT
> amounts must still be reported in AED. Two different fields. That one catches almost everyone.
>
> **8/** What actually changes for your finance system: nothing about *what* you charge.
> Everything about how precisely you have to describe it.
>
> **9/** I built einvoicecheck.ae to catch these before your provider does. It's **preflight
> validation only** — not FTA-accredited, doesn't transmit legal e-invoices, doesn't replace your
> accredited provider, no archival. It just tells you which field will get you rejected.
> Free checker: einvoicecheck.ae/tools/uae-e-invoice-validator

---

## B. LinkedIn post — week 1

> E-invoicing in the UAE breaks at the file, not at the filing.
>
> I keep hearing the same story from finance leads here: the mandate is understood, the provider
> is chosen, the deadline is in the calendar — and then invoices start coming back rejected, and
> nobody can say why, because the rejection reason is a field reference and an error code.
>
> The uncomfortable part is that almost none of it is complicated. It's a TRN that lost its
> leading zero when someone opened the export in Excel. It's a zero-rated line carrying a 5% VAT
> rate because the ERP defaults it. It's a line net that was rounded at the unit price instead of
> the total. It's an invoice in USD where the VAT was never restated in AED.
>
> Boring, mechanical, catchable. Which is genuinely good news — it means this is an engineering
> problem, not a legal one. You do not need a consultant to fix a 15-digit field.
>
> What actually changes for your finance system: nothing about what you charge. Everything about
> how precisely you have to describe it.
>
> To be straight about what I do: I built a preflight validator. It is **validation only** — I am
> **not FTA-accredited**, I do **not transmit legal e-invoices**, I do **not replace an accredited
> service provider**, and I do **not archive anything**. You still need your provider. I just tell
> you which field is going to get the file bounced, before you send it.
>
> For those of you already through a first submission cycle — what was the error that cost you
> the most time?
>
> *(link in the first comment)*

**First comment:** `Free checker, no signup: einvoicecheck.ae/tools/uae-e-invoice-validator`

---

## C. Reddit-ready answer — week 1

**Deploy only into a genuinely matching thread** (e.g. r/dubai, r/UAE, r/Accounting: "does UAE
e-invoicing mean I need to replace my accounting software?"). If no such thread appears, this
stays in the drawer. That is fine.

> Short answer: probably not replace — but you do need whatever you're using to emit a
> structurally correct document.
>
> The mandate is about the *format and transmission* of the invoice, not about which accounting
> package you own. Two separate things get conflated constantly:
>
> 1. **Accreditation** applies to the **service provider** that transmits the invoice on your
>    behalf. That's the thing you have to pick from the approved list.
> 2. **The file itself** has to satisfy the PINT AE rules — 15-digit TRNs, VAT category codes that
>    match their rates, line nets that equal qty × price, document totals that reconcile up the
>    chain, and VAT reported in AED even when you invoice in another currency.
>
> Most rejections people complain about are #2, not #1 — and your existing software can usually be
> made to emit a valid file. So the sequence I'd suggest: pick your accredited provider, then
> check what your current system actually produces against the rules *before* you wire the two
> together. That's where the time goes if you skip it.
>
> FWIW I build einvoicecheck.ae, which does that check — it's **preflight validation only**, I'm
> **not FTA-accredited**, it does **not transmit** anything and does **not replace** your
> accredited provider. You can also do the checks by hand from the PINT AE spec; it's tedious but
> entirely doable.
