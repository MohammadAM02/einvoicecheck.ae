# Project Constitution

## Core principles

1. **Observed truth first.** Repository code, tests, Git history, configuration, and runtime evidence outrank stale documentation.
2. **Explicit intent.** Requirements must be testable; unresolved ambiguity is marked `[NEEDS CLARIFICATION: ...]` rather than guessed.
3. **Approval before implementation.** Feature and production changes require explicit user approval of the specification and plan.
4. **Security by design.** Enforce authorization server-side, protect secrets, validate boundaries, and document data-handling risks.
5. **Integration evidence.** Verify contracts and realistic runtime paths, not only isolated unit behavior.
6. **Simplicity.** Prefer the smallest design that satisfies approved requirements; justify new abstractions and services.
7. **Traceable changes.** Every changed file maps to an approved task and every acceptance scenario maps to verification.
8. **Release separation.** Passing tests does not itself authorize deployment or production-data changes.

## Governance

Changes to this constitution require a documented rationale, explicit maintainer approval, and a review of compatibility impact.
