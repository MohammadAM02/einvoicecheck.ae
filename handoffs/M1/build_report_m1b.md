# Build report — M1b

**Date:** 2026-07-14 · **Command:** `npm run build` in `app/web` · **Result: exit 0**

No deploy credentials exist in this environment. Nothing was deployed and no live URL is claimed. This is the real, unedited build output.

```

> einvoicecheck-web@1.0.0 build
> next build

   ▲ Next.js 15.5.20

   Creating an optimized production build ...
 ✓ Compiled successfully in 3.2s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/22) ...
   Generating static pages (5/22) 
   Generating static pages (10/22) 
   Generating static pages (16/22) 
 ✓ Generating static pages (22/22)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      182 B         106 kB
├ ○ /_not-found                            133 B         103 kB
├ ● /alternatives/[slug]                   182 B         106 kB
├   ├ /alternatives/cleartax
├   ├ /alternatives/comarch
├   └ /alternatives/sovos
├ ƒ /api/waitlist                          133 B         103 kB
├ ○ /blog                                  165 B         106 kB
├ ○ /contact                               182 B         106 kB
├ ○ /docs                                  182 B         106 kB
├ ○ /legal/privacy                         182 B         106 kB
├ ○ /legal/refunds                         182 B         106 kB
├ ○ /legal/terms                           182 B         106 kB
├ ○ /pricing                               182 B         106 kB
├ ○ /robots.txt                            133 B         103 kB
├ ○ /sitemap.xml                           133 B         103 kB
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
  └ other shared chunks (total)          1.97 kB


○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand

EXIT CODE: 0
```
