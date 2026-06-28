"""Build v3 per-source processing status rows for dual-run coverage."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_EXPECTED_SOURCES_PATH = PROCESSED_DIR / "source_inventory.json"
DEFAULT_SNAPSHOTS_PATH = PROCESSED_DIR / "vision_snapshots"
DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "eval" / "v3_source_statuses.json"


def _source_id(row: dict[str, Any]) -> str:
    return str(row.get("source_document_id") or row.get("id") or row.get("document_id") or "").strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


def _json_objects(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    if path.is_dir():
        rows: list[dict[str, Any]] = []
        for child in sorted(path.glob("*.json")):
            rows.extend(_json_objects(child))
        return rows
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [row for row in payload["rows"] if isinstance(row, dict)]
    if isinstance(payload, dict):
        return [payload]
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    return []


def build_v3_source_statuses(
    *,
    expected_sources: list[dict[str, Any]],
    snapshots: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    snapshots_by_hash = {_source_hash(snapshot): snapshot for snapshot in snapshots if _source_hash(snapshot)}
    statuses: list[dict[str, Any]] = []
    for source in expected_sources:
        source_id = _source_id(source)
        source_hash = _source_hash(source)
        snapshot = snapshots_by_hash.get(source_hash)
        base = {
            "source_document_id": source_id,
            "content_sha256": source_hash,
            "calendar_group_key": source.get("calendar_group_key"),
        }
        if snapshot:
            snapshot_status = str(snapshot.get("status") or "")
            if snapshot_status == "parser_error":
                errors = snapshot.get("errors") if isinstance(snapshot.get("errors"), list) else []
                statuses.append(
                    {
                        **base,
                        "status": "parser_error",
                        "snapshot_status": snapshot_status,
                        "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                        "message": str(errors[0]) if errors else "parser_error",
                    }
                )
                continue
            statuses.append(
                {
                    **base,
                    "status": "processed",
                    "snapshot_status": snapshot.get("status"),
                    "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                    "ocr_success": (snapshot.get("quality") or {}).get("ocr_success")
                    if isinstance(snapshot.get("quality"), dict)
                    else None,
                }
            )
            continue
        if source.get("status") == "source_error":
            statuses.append({**base, "status": "source_error", "message": source.get("message")})
            continue
        statuses.append({**base, "status": "unprocessed", "message": "missing_v3_snapshot"})
    return statuses


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 per-source status rows for dual-run coverage")
    parser.add_argument("--expected-sources", type=Path, default=DEFAULT_EXPECTED_SOURCES_PATH)
    parser.add_argument("--snapshots", type=Path, default=DEFAULT_SNAPSHOTS_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    statuses = build_v3_source_statuses(
        expected_sources=_json_objects(args.expected_sources),
        snapshots=_json_objects(args.snapshots),
    )
    if args.json:
        print(json.dumps(statuses, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(statuses, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
