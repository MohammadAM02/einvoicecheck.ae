# ChatGPT Scheduled Task Prompt — Repo Monitor + critic-loop.md Sync

Paste this into ChatGPT to set up a scheduled task that watches the repo and keeps `.hermes/critic-loop.md` current regardless of who makes changes.

---

## Background

I have a repo at `C:\Users\AMG\code\https-einvoicecheck.ae` (GitHub: `motivatedc-creator/https-einvoicecheck.ae`). A shared state file lives at `.hermes/critic-loop.md` inside that repo. This file tracks findings, regressions, and deployment state. Two AI agents (Hermes running DeepSeek, and you running GPT-4o) both read and write this file to stay in sync.

The problem: either of us can commit code. A parallel agent session can push. Railway auto-deploys. If I fix something and you don't know, or you audit something I haven't seen, we have a disconnect.

## What I need you to set up

A scheduled task on my Windows machine that:

1. **Polls the repo** every 30 minutes via `git fetch origin` + `git log main..origin/main --oneline` (or equivalent) to detect new commits on the remote.
2. **On new commits:** reads the diff (`git diff main..origin/main --stat` + key files) and evaluates whether any finding in `critic-loop.md` is affected:
   - If a change resolves an open finding → mark it as potentially resolved, add a note with the commit SHA and ask me to verify.
   - If a change introduces a new risk (new code touching validation, parsing, auth, payment, legal pages, accessibility) → add a new finding entry.
   - If a change is purely cosmetic/styling and touches nothing in the findings table → no action.
3. **Updates ONLY `.hermes/critic-loop.md`** in the working tree with its observations. Uses the same format as the existing file (table rows for new findings, status updates for resolved ones). The root `critic-loop.md` was deleted — do NOT recreate it. There is exactly one state file: `.hermes/critic-loop.md`.
4. **Leaves a git diff** so I can review what changed before committing its updates.

## Technical constraints

- Windows 10 with Git Bash (MSYS2). Shell scripts run under bash, not PowerShell.
- `gh` CLI is authenticated as `MohammadAM02`.
- The machine may be powered off between sessions. The task should be a Windows Scheduled Task (or a persistent cron if using WSL).
- It must NOT auto-commit or auto-push — it only modifies the working tree. I review and commit manually.
- It must handle the case where the local working tree has uncommitted changes (check `git status --porcelain` first — if dirty, skip the fetch+diff and log a notice).
- It must not run if the machine is on battery (laptop).

## critic-loop.md format

Use this exact format. Findings table:

```
| # | Finding | Severity | Status | Hermes note |
|---|---|---|---|---|
| F-01 | ... | P0 | ✅ RESOLVED | ... |
| F-02 | ... | P1 | unresolved | ... |
```

Resolved table:

```
| # | Finding | Resolved | Commit | Verified |
|---|---|---|---|---|
| F-01 | ... | 2026-08-07 21:09 | 5af5169 | ... |
```

Severity: P0 (live broken), P1 (trust/compliance), P2 (correctness gap), P3 (UX/polish).

Status: `unresolved`, `✅ RESOLVED`, `🔄 IN PROGRESS`, `⏸️ DEFERRED`.

## What to do on first run

1. Clone or verify access to `C:\Users\AMG\code\https-einvoicecheck.ae`.
2. Read the existing `.hermes/critic-loop.md` so you know the current state.
3. Create the scheduled task (`.bat` or `.sh` script + Windows Task Scheduler entry, or a cron job if using WSL).
4. Do a dry run — fetch, diff, evaluate — and show me what it WOULD write before creating the scheduled task.
5. After I approve, activate the schedule.

## Script skeleton

The scheduled script should follow this pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO="C:/Users/AMG/code/https-einvoicecheck.ae"
LOOPFILE="$REPO/.hermes/critic-loop.md"
LOCKFILE="$REPO/.hermes/.critic-watch.lock"

cd "$REPO"

# Don't run if working tree is dirty
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "[$(date -Iseconds)] Working tree dirty — skipping." >> "$LOCKFILE"
  exit 0
fi

# Fetch and detect new commits
LAST_CHECK=$(cat "$LOCKFILE" 2>/dev/null || echo "never")
git fetch origin 2>/dev/null
NEW_COMMITS=$(git log main..origin/main --oneline 2>/dev/null || true)

if [ -z "$NEW_COMMITS" ]; then
  # No new commits — nothing to do
  date -Iseconds > "$LOCKFILE"
  exit 0
fi

# New commits detected. Read the diff.
DIFF_STAT=$(git diff main..origin/main --stat 2>/dev/null || true)

# --- Your GPT-4o logic goes here ---
# Evaluate whether any finding in critic-loop.md is affected.
# Append observations to critic-loop.md.
# ---

# Record check time
date -Iseconds > "$LOCKFILE"
```

## Success criteria

- After any push to `origin/main` (by Hermes, a parallel agent, or direct commit), within 30 minutes `critic-loop.md` reflects what changed and whether any finding is affected.
- I never have to manually tell ChatGPT "FYI we deployed X" — the file already knows.
- Hermes reads the same file before its next commit and sees ChatGPT's latest observations.
