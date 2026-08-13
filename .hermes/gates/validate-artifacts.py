#!/usr/bin/env python3
"""Validate a Hermes hybrid task's required artifacts and clarification markers."""
from __future__ import annotations
import argparse
import re
from pathlib import Path

REQUIRED = ("intent.md", "research.md", "spec.md", "acceptance.md", "plan.md", "tasks.md")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    args = ap.parse_args()
    root = Path("specs") / args.task
    failures = []
    for name in REQUIRED:
        path = root / name
        if not path.is_file() or not path.read_text(encoding="utf-8").strip():
            failures.append(f"missing or empty: {path}")
    if root.exists():
        for path in root.rglob("*.md"):
            text = path.read_text(encoding="utf-8")
            if "[NEEDS CLARIFICATION:" in text:
                failures.append(f"unresolved clarification: {path}")
    if failures:
        print("ARTIFACT VALIDATION FAILED")
        print("\n".join(f"- {x}" for x in failures))
        return 1
    print(f"ARTIFACT VALIDATION PASSED: {root}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
