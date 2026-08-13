# Agent Rules

This repository uses the Hermes-native hybrid specification workflow.

- Read `.hermes.md` before changing code.
- Treat repository code, tests, Git, and runtime output as observed truth.
- Read the active task artifacts under `specs/<task-id>/` before implementation.
- Do not implement when the task is `AWAITING_APPROVAL`.
- Follow the allowed and forbidden file scope in `plan.md`.
- Add or update regression, contract, and acceptance tests as required by `acceptance.md`.
- Do not claim tests pass without running them and recording exact results.
- Do not push or deploy unless the worker brief explicitly authorizes it.
- Report changed files, commands run, exact results, limitations, and uncommitted changes.
