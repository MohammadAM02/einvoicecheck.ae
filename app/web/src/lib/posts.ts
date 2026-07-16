/**
 * 8-week content plan (1 post/week). Mirrors handoffs/M1/seo_baseline.md.
 * status: 'planned' until the post ships. Nothing here pretends to be published.
 * TODO(M2/GR1): as posts ship, add slug + body and flip status to 'published'.
 */
export type Post = {
  week: number;
  title: string;
  slug: string;
  targetKeyword: string;
  intent: 'informational' | 'commercial' | 'transactional';
  summary: string;
  status: 'planned' | 'published';
};

export const POSTS: Post[] = [
  {
    week: 1,
    title: 'E-invoicing in the UAE: what actually changes for your finance system',
    slug: 'e-invoicing-uae-what-changes',
    targetKeyword: 'e invoicing UAE',
    intent: 'informational',
    summary:
      'The pillar post: structured invoices, accredited providers, the PINT AE format, and where a preflight validator sits in that chain.',
    status: 'planned',
  },
  {
    week: 2,
    title: 'The 12 UAE e-invoice errors that get files rejected (and how to fix each one)',
    slug: 'uae-e-invoice-rejection-errors',
    targetKeyword: 'e invoicing UAE',
    intent: 'informational',
    summary:
      'TRN format, VAT category vs rate mismatches, rounding gaps, missing tax scheme ids - with the exact JSON pointer and the fix.',
    status: 'planned',
  },
  {
    week: 3,
    title: '"FTA approved accounting software in UAE": what that phrase does and does not mean',
    slug: 'fta-approved-accounting-software-uae',
    targetKeyword: 'FTA approved accounting software in UAE',
    intent: 'commercial',
    summary:
      'Accreditation applies to service providers, not to every tool in the chain. How to read the official list, and what a non-accredited validator can legitimately do.',
    status: 'planned',
  },
  {
    week: 4,
    title: 'PINT AE validation rules, explained field by field',
    slug: 'pint-ae-validation-rules',
    targetKeyword: 'PINT AE validation',
    intent: 'informational',
    summary:
      'A developer walkthrough of the PINT AE profile over UBL 2.1: mandatory business terms, code lists, and the arithmetic that has to reconcile.',
    status: 'planned',
  },
  {
    week: 5,
    title: 'How to validate a UAE e-invoice in your CI pipeline (GitHub Actions example)',
    slug: 'validate-uae-e-invoice-in-ci',
    targetKeyword: 'UAE e invoicing API',
    intent: 'transactional',
    summary:
      'A copy-paste workflow that fails the build when an ERP export would be rejected downstream.',
    status: 'planned',
  },
  {
    week: 6,
    title: 'What UAE e-invoicing software actually costs in 2026',
    slug: 'uae-e-invoicing-software-cost',
    targetKeyword: 'UAE e invoicing software',
    intent: 'commercial',
    summary:
      'Published prices, quote-led vendors, onboarding fees buyers report, and where a $29 validator changes the maths.',
    status: 'planned',
  },
  {
    week: 7,
    title: 'UAE TRN format: how to validate a Tax Registration Number before you invoice',
    slug: 'uae-trn-format-validation',
    targetKeyword: 'e invoicing UAE',
    intent: 'informational',
    summary:
      'The 15-digit rule, the common data-entry failures, and a free browser checker. Feeds the free tool.',
    status: 'planned',
  },
  {
    week: 8,
    title: 'Preflight vs transmission: why your accredited provider is not enough on its own',
    slug: 'preflight-vs-transmission',
    targetKeyword: 'UAE e invoicing API',
    intent: 'commercial',
    summary:
      'The positioning post. Where validation belongs in the stack, and the honest limits of a non-accredited validator.',
    status: 'planned',
  },
];
