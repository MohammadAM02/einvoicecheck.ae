# Tasks

Task: `p1-hardening-1-5`

- [ ] **Lane A / Task 1:** Make generated standard (`380`), summary (`480`), and credit-note XML pass the complete validation pipeline.
- [ ] **Lane A / Task 2:** Reject invalid non-zero AE seller VAT while preserving legitimate zero-tax AE behavior.
- [ ] **Lane B / Task 3:** Enforce UTC calendar-month quotas atomically across validation, conversion, and generation.
- [ ] **Lane B / Task 4:** Reserve batch free-tool quota per accepted invoice and reject insufficient-quota batches before processing.
- [ ] **Lane B / Task 5:** Rate-limit `/usage` and bound its hot-path queries.
- [ ] Supervisor: inspect lane commits and diffs against approved scope.
- [ ] Supervisor: integrate both lanes and resolve conflicts minimally.
- [ ] Reviewer: review merged tree for spec, security, and code quality.
- [ ] Supervisor: run all verification commands once on the merged tree.
- [ ] Supervisor: write `verification.md` and `handoff.md`; request review, no push/deploy.

Parallelizable: Lane A and Lane B only, and only in isolated child worktrees. Tasks within each lane are sequential.
