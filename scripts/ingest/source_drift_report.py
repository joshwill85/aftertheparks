"""Source drift report for v3 quarterly review gates."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "source_drift_report.json"


def _index_by_slug(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(row.get("canonical_slug") or row.get("normalized_title") or row.get("title")): row
        for row in rows
        if isinstance(row, dict)
    }


def _field(row: dict[str, Any], field_name: str) -> Any:
    value = row.get(field_name)
    if isinstance(value, dict):
        return value.get("text") or value.get("label") or value.get("state") or value
    return value


def _changed(old_by_slug: dict[str, dict[str, Any]], new_by_slug: dict[str, dict[str, Any]], field_name: str) -> list[dict[str, Any]]:
    changes: list[dict[str, Any]] = []
    for slug in sorted(set(old_by_slug) & set(new_by_slug)):
        old_value = _field(old_by_slug[slug], field_name)
        new_value = _field(new_by_slug[slug], field_name)
        if old_value != new_value:
            changes.append(
                {
                    "canonical_slug": slug,
                    "title": new_by_slug[slug].get("title") or old_by_slug[slug].get("title"),
                    "old": old_value,
                    "new": new_value,
                }
            )
    return changes


def build_source_drift_report(
    *,
    old_source_hash: str,
    new_source_hash: str,
    old_rows: list[dict[str, Any]],
    new_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    old_by_slug = _index_by_slug(old_rows)
    new_by_slug = _index_by_slug(new_rows)
    added = sorted(set(new_by_slug) - set(old_by_slug))
    removed = sorted(set(old_by_slug) - set(new_by_slug))
    changed_schedules = _changed(old_by_slug, new_by_slug, "schedule")
    changed_locations = _changed(old_by_slug, new_by_slug, "location")
    changed_fees = _changed(old_by_slug, new_by_slug, "price")
    manual_review_required = bool(
        old_source_hash != new_source_hash
        or added
        or removed
        or changed_schedules
        or changed_locations
        or changed_fees
    )
    return {
        "status": "review_required" if manual_review_required else "clean",
        "old_hash": old_source_hash,
        "new_hash": new_source_hash,
        "old_activity_count": len(old_rows),
        "new_activity_count": len(new_rows),
        "new_titles": [str(new_by_slug[slug].get("title") or slug) for slug in added],
        "removed_titles": [str(old_by_slug[slug].get("title") or slug) for slug in removed],
        "changed_schedules": changed_schedules,
        "changed_locations": changed_locations,
        "changed_fees": changed_fees,
        "manual_review_required": manual_review_required,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 source drift report")
    parser.add_argument("--old", type=Path, required=True)
    parser.add_argument("--new", type=Path, required=True)
    parser.add_argument("--old-source-hash", required=True)
    parser.add_argument("--new-source-hash", required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    old_rows = json.loads(args.old.read_text())
    new_rows = json.loads(args.new.read_text())
    report = build_source_drift_report(
        old_source_hash=args.old_source_hash,
        new_source_hash=args.new_source_hash,
        old_rows=old_rows if isinstance(old_rows, list) else [],
        new_rows=new_rows if isinstance(new_rows, list) else [],
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
