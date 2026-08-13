#!/usr/bin/env python3
"""Small conservative secret scan for staged or changed text files."""
from __future__ import annotations
import argparse
import re
import subprocess
from pathlib import Path

PATTERNS = {
    "private-key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "api-key": re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][^'\"]{16,}['\"]"),
    "aws-key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "github-token": re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}"),
}

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="HEAD")
    args = ap.parse_args()
    result = subprocess.run(["git", "diff", "--name-only", f"{args.base}...HEAD"], text=True, capture_output=True)
    if result.returncode:
        print(result.stderr.strip()); return result.returncode
    findings = []
    for raw in result.stdout.splitlines():
        path = Path(raw)
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        try: text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError): continue
        for label, pattern in PATTERNS.items():
            if pattern.search(text): findings.append(f"{label}: {path}")
    if findings:
        print("SECRET SCAN FAILED\n" + "\n".join(f"- {x}" for x in findings)); return 1
    print("SECRET SCAN PASSED")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
