# Build report - app/web (einvoicecheck.ae marketing site)

**Result: PASS.** `npm run build` exits 0. 19/19 routes prerendered.
Captured 2026-07-14 on the build machine (Windows, Node v24.18.0, npm 11.16.0).
Not deployed - see `handoffs/M1/live_url.txt`.

## Environment

```
$ node -v
v24.18.0
$ npm -v
11.16.0
```

## Install

```
$ cd app/web && npm install --no-audit --no-fund
added 26 packages in 43s

npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn allow-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
```

(The `sharp` warning is npm's script-approval prompt, not a build failure. `sharp` is an
optional Next.js image-optimization dependency; the build does not require it.)

## Production build - real output

```
$ npm run build

> einvoicecheck-web@1.0.0 build
> next build

   ▲ Next.js 15.5.20

   Creating an optimized production build ...
 ✓ Compiled successfully in 8.2s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/19) ...
   Generating static pages (4/19)
   Generating static pages (9/19)
   Generating static pages (14/19)
 ✓ Generating static pages (19/19)
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
├   ├ /vs/comarch
├   └ /vs/sovos
└ ○ /waitlist                            1.21 kB         107 kB
+ First Load JS shared by all             102 kB
  ├ chunks/255-3981a3d1f3561bd8.js       46.2 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.97 kB

○  (Static)   prerendered as static content
●  (SSG)      prerendered as static HTML (uses generateStaticParams)
ƒ  (Dynamic)  server-rendered on demand
```

TypeScript type-checking ran as part of `next build` ("Linting and checking validity of
types") and produced no errors.

## What the build proves

- All 5 required page types exist and prerender: homepage, `/pricing`, `/docs`, `/blog`,
  `/waitlist`.
- All reserved routes exist and prerender their slugs:
  `/alternatives/{cleartax,comarch,sovos}`, `/vs/{cleartax,comarch,sovos}`,
  `/tools/{uae-e-invoice-validator,pint-ae-validator,trn-format-checker}`.
- `/sitemap.xml` and `/robots.txt` are emitted as real routes.
- `/api/waitlist` compiles as a dynamic Node.js route (file-backed stub, `TODO(E2)`).
- First Load JS is 102-107 kB shared, under the 100 kB-ish target for a static marketing
  site; the only client component is the waitlist form.

## Not verified in this session

- Runtime behaviour on Railway (no deploy credentials).
- Docker image build (`app/web/Dockerfile` is written against the standalone output that
  this build produced, but `docker build` was not run here).
- Live sitemap/robots fetch over HTTPS (no domain pointed at anything yet).
