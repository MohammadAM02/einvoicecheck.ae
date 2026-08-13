#!/usr/bin/env python3
"""Check changed Git paths against newline-delimited allowed path patterns."""
from __future__ import annotations
import argparse
import fnmatch
import subprocess
from pathlib import Path

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow", required=True, help="file containing allowed path patterns")
    ap.add_argument("--base", default="HEAD")
    args = ap.parse_args()
    patterns = [x.strip() for x in Path(args.allow).read_text(encoding="utf-8").splitlines() if x.strip() and not x.startswith("#")]
    result = subprocess.run(["git", "diff", "--name-only", f"{args.base}...HEAD"], text=True, capture_output=True)
    if result.returncode:
        print(result.stderr.strip()); return result.returncode
    changed = [x for x in result.stdout.splitlines() if x]
    outside = [p for p in changed if not any(fnmatch.fnmatch(p, pattern) for pattern in patterns)]
    if outside:
        print("SCOPE FAILED")
        print("Out-of-scope paths:")
        print("\n".join(f"- {x}" for x in outside))
        return 1
    print(f"SCOPE PASSED: {len(changed)} changed path(s)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
