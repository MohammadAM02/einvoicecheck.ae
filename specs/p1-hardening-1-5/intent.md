# Intent

Task: `p1-hardening-1-5`

## Goal

Harden the five approved P1 areas in EInvoiceCheck with the smallest verified changes:

1. Generated XML must pass the same complete PINT-AE validation pipeline exposed to users.
2. Invalid non-zero seller VAT for reverse-charge category `AE` must be rejected.
3. Monthly API quotas must be enforced atomically.
4. Batch validation must debit quota per accepted invoice and avoid unnecessary upstream request patterns where the existing architecture permits.
5. `GET /usage` must be rate-limited and its database work bounded.

## Non-goals

- API/Pricing/legacy contract confirmation.
- Legal/support founder or operator content.
- Indexed placeholder tool pages.
- PayPal webhook deduplication or ordering.
- Deployment, production-data changes, secret rotation, or public release.
- New frameworks, services, or speculative abstractions.

## Operating constraints

- One visible Kanban supervision card.
- The supervising worker and every delegated worker use DeepSeek V4 Flash.
- Every worker loads Ponytail full, Hermes RPI gates, the applicable Superpowers spec/plan workflow, TDD, and verification-before-completion.
- Two implementation lanes may run concurrently only in isolated child worktrees: validation (Tasks 1-2) and metering (Tasks 3-5).
- Integration, review, and full verification happen on the supervising worktree after both lanes converge.
- No push or deploy authorization.
