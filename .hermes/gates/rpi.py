#!/usr/bin/env python3
"""Hermes-native R.P.I.V.E.C. task gate.

Stdlib only. Run from a repository root through Hermes' terminal tool.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

STATES = [
    "RESEARCH_REQUIRED", "RESEARCH_COMPLETE", "SPEC_DRAFT", "PLAN_DRAFT",
    "AWAITING_APPROVAL", "APPROVED", "IMPLEMENTING", "AWAITING_REVIEW",
    "VERIFYING", "VERIFIED", "RELEASE_AUTHORIZED", "RELEASED", "BLOCKED",
]


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def task_paths(task: str) -> tuple[Path, Path]:
    return Path("specs") / task, Path(".hermes") / "work" / task


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def read_state(task: str) -> dict:
    _, work = task_paths(task)
    path = work / "state.json"
    if not path.exists():
        raise SystemExit(f"missing state: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def git_value(*args: str) -> str:
    result = subprocess.run(["git", *args], text=True, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def cmd_init(args: argparse.Namespace) -> int:
    spec, work = task_paths(args.task)
    if spec.exists() and any(spec.iterdir()) and not args.force:
        raise SystemExit(f"refusing to overwrite non-empty task: {spec}; use --force")
    spec.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    for name in ("intent.md", "research.md", "spec.md", "acceptance.md", "plan.md", "tasks.md", "verification.md", "handoff.md"):
        path = spec / name
        if not path.exists():
            path.write_text(f"# {name.removesuffix('.md').replace('-', ' ').title()}\n\nTask: `{args.task}`\n\n", encoding="utf-8")
    state = {
        "task_id": args.task,
        "state": "RESEARCH_REQUIRED",
        "created_at": now(),
        "repository": str(Path.cwd()),
        "branch": git_value("branch", "--show-current"),
        "base_commit": git_value("rev-parse", "HEAD"),
        "spec_dir": str(spec),
        "work_dir": str(work),
    }
    write_json(work / "state.json", state)
    print(json.dumps(state, indent=2))
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    state = read_state(args.task)
    print(json.dumps(state, indent=2))
    return 0


def cmd_set_state(args: argparse.Namespace) -> int:
    if args.state not in STATES:
        raise SystemExit(f"invalid state: {args.state}")
    state = read_state(args.task)
    state["state"] = args.state
    state["updated_at"] = now()
    write_json(task_paths(args.task)[1] / "state.json", state)
    print(f"{args.task}: {args.state}")
    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    spec, work = task_paths(args.task)
    for name in ("spec.md", "plan.md"):
        if not (spec / name).is_file():
            raise SystemExit(f"missing required artifact: {spec / name}")
    approval = {
        "task_id": args.task,
        "spec_sha256": digest(spec / "spec.md"),
        "plan_sha256": digest(spec / "plan.md"),
        "approved_by": args.approved_by,
        "approved_at": now(),
        "scope": args.scope,
        "deployment_authorized": bool(args.deployment_authorized),
    }
    write_json(work / "approval.json", approval)
    state = read_state(args.task)
    state.update({"state": "APPROVED", "updated_at": now()})
    write_json(work / "state.json", state)
    print(json.dumps(approval, indent=2))
    return 0


def cmd_verify_approval(args: argparse.Namespace) -> int:
    spec, work = task_paths(args.task)
    approval_path = work / "approval.json"
    if not approval_path.is_file():
        raise SystemExit(f"FAIL: missing {approval_path}")
    approval = json.loads(approval_path.read_text(encoding="utf-8"))
    expected = {"spec_sha256": digest(spec / "spec.md"), "plan_sha256": digest(spec / "plan.md")}
    for key, value in expected.items():
        if approval.get(key) != value:
            raise SystemExit(f"FAIL: stale approval; {key} does not match current artifact")
    print("PASS: approval hashes match current spec and plan")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Hermes R.P.I.V.E.C. task gate")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("init"); p.add_argument("task"); p.add_argument("--force", action="store_true"); p.set_defaults(func=cmd_init)
    p = sub.add_parser("status"); p.add_argument("task"); p.set_defaults(func=cmd_status)
    p = sub.add_parser("state"); p.add_argument("task"); p.add_argument("state", choices=STATES); p.set_defaults(func=cmd_set_state)
    p = sub.add_parser("approve"); p.add_argument("task"); p.add_argument("--approved-by", default="user"); p.add_argument("--scope", required=True); p.add_argument("--deployment-authorized", action="store_true"); p.set_defaults(func=cmd_approve)
    p = sub.add_parser("verify-approval"); p.add_argument("task"); p.set_defaults(func=cmd_verify_approval)
    return parser


if __name__ == "__main__":
    parsed = build_parser().parse_args()
    raise SystemExit(parsed.func(parsed))
