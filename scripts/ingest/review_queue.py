"""Durable human-review decisions for Silver v2 candidate promotion."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_QUEUE_PATH = ROOT / "data/processed/activity_review_queue_v2_preview.json"
DEFAULT_DECISIONS_PATH = ROOT / "data/processed/activity_review_decisions_v2.json"
VALID_DECISIONS = {"approved", "rejected"}


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def load_review_queue(queue_path: Path = DEFAULT_QUEUE_PATH) -> list[dict[str, Any]]:
    rows = _read_json(queue_path, [])
    return rows if isinstance(rows, list) else []


def load_review_decisions(decisions_path: Path = DEFAULT_DECISIONS_PATH) -> dict[str, dict[str, Any]]:
    decisions = _read_json(decisions_path, {})
    if isinstance(decisions, list):
        return {
            str(decision["candidate_id"]): decision
            for decision in decisions
            if isinstance(decision, dict) and decision.get("candidate_id")
        }
    if isinstance(decisions, dict):
        return {
            str(candidate_id): decision
            for candidate_id, decision in decisions.items()
            if isinstance(decision, dict)
        }
    return {}


def list_pending_reviews(
    *,
    queue_path: Path = DEFAULT_QUEUE_PATH,
    decisions_path: Path = DEFAULT_DECISIONS_PATH,
) -> list[dict[str, Any]]:
    decisions = load_review_decisions(decisions_path)
    return [
        row
        for row in load_review_queue(queue_path)
        if row.get("candidate_id") not in decisions
    ]


def record_review_decision(
    *,
    decisions_path: Path = DEFAULT_DECISIONS_PATH,
    candidate_id: str,
    decision: str,
    reviewer: str,
    field_decisions: dict[str, Any] | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    normalized_decision = decision.strip().lower()
    if normalized_decision not in VALID_DECISIONS:
        raise ValueError(f"decision must be one of: {', '.join(sorted(VALID_DECISIONS))}")
    if not candidate_id:
        raise ValueError("candidate_id is required")
    if not reviewer:
        raise ValueError("reviewer is required")

    review = {
        "candidate_id": candidate_id,
        "decision": normalized_decision,
        "reviewer": reviewer,
        "reviewed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "field_decisions": field_decisions or {},
    }
    if notes:
        review["notes"] = notes

    decisions = load_review_decisions(decisions_path)
    decisions[candidate_id] = review
    _write_json(decisions_path, decisions)
    return review


def _parse_field_decisions(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise ValueError("--field-decisions-json must decode to an object")
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage local Silver v2 review decisions")
    parser.add_argument("--queue-path", type=Path, default=DEFAULT_QUEUE_PATH)
    parser.add_argument("--decisions-path", type=Path, default=DEFAULT_DECISIONS_PATH)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List candidates still awaiting review")

    for command in ("approve", "reject"):
        command_parser = subparsers.add_parser(command, help=f"{command.title()} a candidate")
        command_parser.add_argument("candidate_id")
        command_parser.add_argument("--reviewer", default=os.environ.get("USER", "unknown"))
        command_parser.add_argument("--notes")
        command_parser.add_argument(
            "--field-decisions-json",
            help='JSON object, for example {"title":"source_verified"}',
        )

    args = parser.parse_args()

    if args.command == "list":
        payload: Any = list_pending_reviews(
            queue_path=args.queue_path,
            decisions_path=args.decisions_path,
        )
    else:
        payload = record_review_decision(
            decisions_path=args.decisions_path,
            candidate_id=args.candidate_id,
            decision="approved" if args.command == "approve" else "rejected",
            reviewer=args.reviewer,
            field_decisions=_parse_field_decisions(args.field_decisions_json),
            notes=args.notes,
        )

    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
