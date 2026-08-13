#!/usr/bin/env python3
"""Verify final task artifacts and approval integrity."""
from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(cmd, text=True, capture_output=True)
    return p.returncode, p.stdout.strip() + (f"\n{p.stderr.strip()}" if p.stderr.strip() else "")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    args = ap.parse_args()
    spec = Path("specs") / args.task
    work = Path(".hermes") / "work" / args.task
    failures = []
    for path in (spec / "verification.md", spec / "handoff.md", work / "state.json", work / "approval.json"):
        if not path.is_file(): failures.append(f"missing: {path}")
    state_path = work / "state.json"
    if state_path.is_file() and json.loads(state_path.read_text()).get("state") not in {"VERIFIED", "RELEASE_AUTHORIZED", "RELEASED"}:
        failures.append("state is not VERIFIED, RELEASE_AUTHORIZED, or RELEASED")
    gate = Path(__file__).resolve().with_name("rpi.py")
    code, output = run(["python", str(gate), "verify-approval", args.task])
    if code: failures.append(output)
    if failures:
        print("COMPLETION VERIFICATION FAILED\n" + "\n".join(f"- {x}" for x in failures)); return 1
    print("COMPLETION VERIFICATION PASSED")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
