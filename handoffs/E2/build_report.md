# E2 — Build report (`app/web`)

**Date:** 2026-07-14 · **Command:** `cd app/web && npm run build` · **Result: EXIT 0** ✅

Next.js 15.5.20, App Router, TypeScript strict. 24 pages prerendered (22 pre-existing + `/login` + `/signup`); `/dashboard`, the 7 billing/auth/key routes, `/api/usage` and `/api/webhooks/dodo` are correctly dynamic (they read Mongo/Redis/session).

Real, unedited output:

```

> einvoicecheck-web@1.0.0 build
> next build

   ▲ Next.js 15.5.20

   Creating an optimized production build ...
 ✓ Compiled successfully in 6.2s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/24) ...
   Generating static pages (6/24) 
   Generating static pages (12/24) 
   Generating static pages (18/24) 
 ✓ Generating static pages (24/24)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      182 B         106 kB
├ ○ /_not-found                            161 B         103 kB
├ ● /alternatives/[slug]                   182 B         106 kB
├   ├ /alternatives/cleartax
├   ├ /alternatives/comarch
├   └ /alternatives/sovos
├ ƒ /api/auth/login                        161 B         103 kB
├ ƒ /api/auth/logout                       161 B         103 kB
├ ƒ /api/auth/signup                       161 B         103 kB
├ ƒ /api/billing/cancel                    161 B         103 kB
├ ƒ /api/billing/change-plan               161 B         103 kB
├ ƒ /api/billing/checkout                  161 B         103 kB
├ ƒ /api/billing/portal                    161 B         103 kB
├ ƒ /api/billing/recover                   161 B         103 kB
├ ƒ /api/keys                              161 B         103 kB
├ ƒ /api/keys/[id]                         161 B         103 kB
├ ƒ /api/usage                             161 B         103 kB
├ ƒ /api/waitlist                          161 B         103 kB
├ ƒ /api/webhooks/dodo                     161 B         103 kB
├ ○ /blog                                  165 B         106 kB
├ ○ /contact                               182 B         106 kB
├ ƒ /dashboard                            3.3 kB         106 kB
├ ○ /docs                                  182 B         106 kB
├ ○ /legal/privacy                         182 B         106 kB
├ ○ /legal/refunds                         182 B         106 kB
├ ○ /legal/terms                           182 B         106 kB
├ ○ /login                               1.17 kB         107 kB
├ ○ /pricing                               182 B         106 kB
├ ○ /robots.txt                            161 B         103 kB
├ ○ /signup                              1.18 kB         107 kB
├ ○ /sitemap.xml                           161 B         103 kB
├ ● /tools/[slug]                        1.21 kB         107 kB
├   ├ /tools/uae-e-invoice-validator
├   ├ /tools/pint-ae-validator
├   └ /tools/trn-format-checker
├ ● /vs/[slug]                             182 B         106 kB
├   ├ /vs/cleartax
├   └ /vs/comarch
└ ○ /waitlist                            1.21 kB         107 kB
+ First Load JS shared by all             102 kB
  ├ chunks/255-3981a3d1f3561bd8.js       46.2 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.99 kB


○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

BUILD_EXIT=0
```
