"""Compare captured official recreation parent index with Disney's live source."""

from __future__ import annotations

import argparse
import json
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from capture_official_recreation_index import (
        DEFAULT_OUTPUT,
        write_official_recreation_index_snapshot,
    )
except ImportError:  # pragma: no cover
    from .capture_official_recreation_index import (
        DEFAULT_OUTPUT,
        write_official_recreation_index_snapshot,
    )


STABLE_PARENT_FIELDS = (
    "name",
    "urlFriendlyId",
    "locationName",
    "url",
    "webLinks",
    "locationsList",
    "parkIds",
)


@dataclass
class OfficialRecreationSourceDriftAudit:
    passed: bool
    errors: list[str]
    summary: dict[str, Any]
    added: list[str]
    removed: list[str]
    changed: list[str]


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _item_key(item: dict[str, Any]) -> str:
    return str(
        item.get("urlFriendlyId")
        or item.get("id")
        or item.get("name")
        or "<missing-key>"
    )


def _stable_item(item: dict[str, Any]) -> dict[str, Any]:
    return {field: item.get(field) for field in STABLE_PARENT_FIELDS}


def _item_map(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    results = snapshot.get("results")
    if not isinstance(results, list):
        return {}
    return {
        _item_key(item): item
        for item in results
        if isinstance(item, dict)
    }


def build_official_recreation_source_drift_audit(
    captured_snapshot: dict[str, Any],
    comparison_snapshot: dict[str, Any],
) -> OfficialRecreationSourceDriftAudit:
    captured = _item_map(captured_snapshot)
    comparison = _item_map(comparison_snapshot)

    added = sorted(set(comparison) - set(captured))
    removed = sorted(set(captured) - set(comparison))
    changed = sorted(
        key
        for key in set(captured) & set(comparison)
        if _stable_item(captured[key]) != _stable_item(comparison[key])
    )

    errors: list[str] = []
    if added:
        errors.append(f"official_recreation_source:added:{len(added)}")
    if removed:
        errors.append(f"official_recreation_source:removed:{len(removed)}")
    if changed:
        errors.append(f"official_recreation_source:changed:{len(changed)}")

    return OfficialRecreationSourceDriftAudit(
        passed=not errors,
        errors=errors,
        summary={
            "captured_at": captured_snapshot.get("captured_at"),
            "comparison_captured_at": comparison_snapshot.get("captured_at"),
            "captured_parent_items": len(captured),
            "comparison_parent_items": len(comparison),
            "captured_hash": captured_snapshot.get("content_sha256"),
            "comparison_hash": comparison_snapshot.get("content_sha256"),
            "added_count": len(added),
            "removed_count": len(removed),
            "changed_count": len(changed),
        },
        added=added,
        removed=removed,
        changed=changed,
    )


def audit_snapshot_paths(
    captured_path: Path = DEFAULT_OUTPUT,
    comparison_path: Path | None = None,
    *,
    live: bool = False,
) -> OfficialRecreationSourceDriftAudit:
    captured = _load_json(captured_path)
    if live:
        with tempfile.TemporaryDirectory() as tmp:
            live_path = Path(tmp) / "official-recreation-index-live.snapshot.json"
            write_official_recreation_index_snapshot(live_path)
            comparison = _load_json(live_path)
    elif comparison_path:
        comparison = _load_json(comparison_path)
    else:
        comparison = captured
    return build_official_recreation_source_drift_audit(captured, comparison)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit Disney official recreation parent source drift")
    parser.add_argument("--captured", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--comparison", type=Path)
    parser.add_argument("--live", action="store_true", help="Fetch Disney's current parent API and compare without overwriting snapshots")
    args = parser.parse_args()

    audit = audit_snapshot_paths(args.captured, args.comparison, live=args.live)
    print(
        json.dumps(
            {
                "passed": audit.passed,
                "errors": audit.errors,
                "summary": audit.summary,
                "added": audit.added[:20],
                "removed": audit.removed[:20],
                "changed": audit.changed[:20],
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    if not audit.passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
