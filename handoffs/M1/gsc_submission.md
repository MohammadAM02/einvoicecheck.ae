# Google Search Console submission - einvoicecheck.ae

## STATUS: **NOT YET SUBMITTED**

This build session has **no Google Search Console access and no DNS write access**, and the
site is **not deployed**. Nothing below has been executed. No verification was performed and
no sitemap was submitted. These are steps for the human, in order.

**Prerequisite:** `https://einvoicecheck.ae/` must return 200 first. Do
`handoffs/M1/live_url.txt` (Railway deploy + DNS) before anything here.

---

## Step 1 - Add the Domain property (DNS TXT method)

You have DNS access, so use the **Domain** property, not the URL-prefix property. A Domain
property covers apex + www + http + https in one, which is what you want.

1. Go to <https://search.google.com/search-console>, sign in with the Google account that
   should own the property (use a company-controlled account, not a personal throwaway).
2. Click the property dropdown -> **Add property**.
3. Choose **Domain** (left-hand box).
4. Enter exactly: `einvoicecheck.ae`  (no `https://`, no `www.`)
5. Click **Continue**. Google shows a TXT record value that looks like:
   `google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   Copy the value Google shows you. Do not reuse a token from anywhere else.

## Step 2 - Create the TXT record at your DNS provider

At the DNS host for `einvoicecheck.ae`:

| Field | Value |
|-------|-------|
| Type  | `TXT` |
| Name / Host | `@`  (some providers want `einvoicecheck.ae.` - it means the apex) |
| Value / Content | `google-site-verification=XXXX...` (the exact string Google gave you) |
| TTL   | `300` (raise later; low TTL just speeds up the first check) |

Notes:
- Do **not** delete or overwrite existing TXT records at the apex (SPF, DMARC, etc.).
  Multiple TXT records at `@` are legal - add, don't replace.
- Keep the record forever. Google re-checks it periodically; removing it un-verifies the
  property and you lose the data view.
- On Cloudflare, TXT records are never proxied - nothing to toggle.

Confirm it is live before clicking verify:

```
dig +short TXT einvoicecheck.ae
# or
nslookup -type=TXT einvoicecheck.ae
```

You should see the `google-site-verification=...` string. Propagation is usually minutes;
allow up to a few hours.

## Step 3 - Verify

Back in Search Console, click **Verify**. If it fails, wait for the TTL to expire and retry -
the most common cause is Google reading a cached, pre-change DNS answer.

## Step 4 - Submit the sitemap

1. In Search Console, select the `einvoicecheck.ae` property.
2. Left nav -> **Indexing** -> **Sitemaps**.
3. In "Add a new sitemap", enter: `sitemap.xml`
   (the full URL submitted is `https://einvoicecheck.ae/sitemap.xml`)
4. Click **Submit**. Status should move to "Success" with a discovered-URL count.

Sanity-check the sitemap resolves publicly first:

```
curl -s https://einvoicecheck.ae/sitemap.xml
curl -s https://einvoicecheck.ae/robots.txt   # must contain: Sitemap: https://einvoicecheck.ae/sitemap.xml
```

Expected URLs in the sitemap (14):
`/`, `/pricing`, `/docs`, `/blog`, `/waitlist`,
`/tools/uae-e-invoice-validator`, `/tools/pint-ae-validator`, `/tools/trn-format-checker`,
`/alternatives/cleartax`, `/alternatives/comarch`, `/alternatives/sovos`,
`/vs/cleartax`, `/vs/comarch`, `/vs/sovos`

## Step 5 - Request indexing for the money pages (optional, speeds up week 1)

Use **URL Inspection** at the top of Search Console, one URL at a time, then
"Request indexing":

- `https://einvoicecheck.ae/`
- `https://einvoicecheck.ae/pricing`
- `https://einvoicecheck.ae/docs`
- `https://einvoicecheck.ae/tools/pint-ae-validator`

There is a daily quota; four is fine.

---

## What to check afterwards

**Within 48 hours**
- Sitemaps report: status **Success**, "Discovered URLs" = 14. If it says "Couldn't fetch",
  the sitemap URL is wrong or the site is not publicly reachable.
- URL Inspection on `/`: "URL is on Google" or "Crawled - currently not indexed" (normal for
  a brand-new domain).

**Within 7-14 days**
- **Indexing -> Pages**: how many of the 14 are indexed. Expect the homepage, `/pricing`,
  `/docs` first. Thin pages may sit in "Crawled - currently not indexed" - that is the
  signal to add content, not a bug.
- **Enhancements / Rich results**: confirm `FAQPage` and `SoftwareApplication` structured
  data is detected with no errors. Cross-check any error at
  <https://search.google.com/test/rich-results>.
- **Performance**: first impressions on the 5 target keywords
  (`e invoicing UAE`, `UAE e invoicing software`, `FTA approved accounting software in UAE`,
  `UAE e invoicing API`, `PINT AE validation`). Clicks at this stage will be ~0; impressions
  are the signal.

**Ongoing**
- Watch for the manual-actions panel (should stay empty).
- Re-submit nothing: the sitemap is regenerated on every deploy at the same URL, and Google
  re-fetches it on its own schedule.

## Update this file when done

Replace the STATUS line above with the verification date, the GSC account used, and the
sitemap submission timestamp.
