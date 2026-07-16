# M2 build report - real `npm run build` output

- Command: `npm run build` in `app/web`
- Run: 14 July 2026
- Next.js 15.5.20, App Router, TypeScript
- **Exit code: 0**
- No deploy performed. No live URL exists. Deploy remains PENDING on the human.

```
> einvoicecheck-web@1.0.0 build
> next build

   ▲ Next.js 15.5.20

   Creating an optimized production build ...
 ✓ Compiled successfully in 3.4s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/18) ...
   Generating static pages (4/18)
   Generating static pages (8/18)
   Generating static pages (13/18)
 ✓ Generating static pages (18/18)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      172 B         106 kB
├ ○ /_not-found                            133 B         103 kB
├ ● /alternatives/[slug]                   172 B         106 kB
├   ├ /alternatives/cleartax
├   ├ /alternatives/comarch
├   └ /alternatives/sovos
├ ƒ /api/waitlist                          133 B         103 kB
├ ○ /blog                                  165 B         106 kB
├ ○ /docs                                  172 B         106 kB
├ ○ /pricing                               172 B         106 kB
├ ○ /robots.txt                            133 B         103 kB
├ ○ /sitemap.xml                           133 B         103 kB
├ ● /tools/[slug]                        1.21 kB         107 kB
├   ├ /tools/uae-e-invoice-validator
├   ├ /tools/pint-ae-validator
├   └ /tools/trn-format-checker
├ ● /vs/[slug]                             172 B         106 kB
├   ├ /vs/cleartax
├   └ /vs/comarch
└ ○ /waitlist                            1.21 kB         107 kB
+ First Load JS shared by all             102 kB
  ├ chunks/255-3981a3d1f3561bd8.js       46.2 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.97 kB


○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

EXIT_CODE=0
```

## What the output proves

| Check | Evidence in the output above |
|---|---|
| 3 alternatives pages prerender | `/alternatives/cleartax`, `/alternatives/comarch`, `/alternatives/sovos` under `● /alternatives/[slug]` |
| 2 vs pages prerender | `/vs/cleartax`, `/vs/comarch` under `● /vs/[slug]` |
| `/vs/sovos` does NOT exist | It is absent from the `/vs/[slug]` list. `vs/[slug]/page.tsx` sets `export const dynamicParams = false` and `generateStaticParams()` iterates `VS_SLUGS` (competitors with `hasVsPage: true`). A request to `/vs/sovos` 404s. This respects `vs_page: null` for Sovos in `handoffs/V1/decision.json`. |
| Build is green | `✓ Compiled successfully`, `✓ Generating static pages (18/18)`, exit 0. No type errors, no lint failures. |

## Sitemap verification (built artifact, not source)

Read out of `.next/server/app/sitemap.xml.body` after the build - 13 URLs, including all 5 M2 pages and no `/vs/sovos`:

```
https://einvoicecheck.ae/
https://einvoicecheck.ae/pricing
https://einvoicecheck.ae/docs
https://einvoicecheck.ae/blog
https://einvoicecheck.ae/waitlist
https://einvoicecheck.ae/tools/uae-e-invoice-validator
https://einvoicecheck.ae/tools/pint-ae-validator
https://einvoicecheck.ae/tools/trn-format-checker
https://einvoicecheck.ae/alternatives/cleartax
https://einvoicecheck.ae/alternatives/comarch
https://einvoicecheck.ae/alternatives/sovos
https://einvoicecheck.ae/vs/cleartax
https://einvoicecheck.ae/vs/comarch
```

## Other gates

- Billing is Dodo Payments. The forbidden competing processor's name appears nowhere in `app/web/src` - verified by case-insensitive ripgrep, 0 matches across 0 files. No payment SDK is embedded anywhere, because billing is not live.
- No deploy credentials were used, no hosting provider was contacted, and no live URL is claimed anywhere in this handoff or on any page.
