"""Build v3 per-source processing status rows for dual-run coverage."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .source_manifest import edition_matches_quarter


DEFAULT_EXPECTED_SOURCES_PATH = PROCESSED_DIR / "source_inventory.json"
DEFAULT_SNAPSHOTS_PATH = PROCESSED_DIR / "vision_snapshots"
DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "eval" / "v3_source_statuses.json"
SOURCE_METADATA_FIELDS = (
    "source_kind",
    "source_role",
    "canonical_url",
    "fetched_url",
    "http_status",
    "currentness",
    "captured_at",
    "source_type",
    "mime_type",
    "http_content_type",
    "detected_content_type",
    "file_extension",
    "raw_page_count",
    "raw_width",
    "raw_height",
)


def _source_id(row: dict[str, Any]) -> str:
    return str(
        row.get("source_document_id")
        or row.get("source_id")
        or row.get("id")
        or row.get("document_id")
        or ""
    ).strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


def _config_hash(row: dict[str, Any]) -> str:
    runtime = row.get("runtime_lineage") if isinstance(row.get("runtime_lineage"), dict) else {}
    return str(row.get("config_hash") or runtime.get("config_hash") or "").strip()


def _pipeline_version(row: dict[str, Any]) -> str:
    runtime = row.get("runtime_lineage") if isinstance(row.get("runtime_lineage"), dict) else {}
    return str(row.get("pipeline_version") or runtime.get("pipeline_version") or "").strip()


def _source_metadata(row: dict[str, Any]) -> dict[str, Any]:
    return {field: row.get(field) for field in SOURCE_METADATA_FIELDS if row.get(field) is not None}


def _first_status_message(row: dict[str, Any], fallback: str) -> str:
    errors = row.get("errors") if isinstance(row.get("errors"), list) else []
    if errors:
        return str(errors[0])
    message = str(row.get("message") or "").strip()
    if message:
        return message
    quality = row.get("quality") if isinstance(row.get("quality"), dict) else {}
    findings = quality.get("findings") if isinstance(quality.get("findings"), list) else []
    if findings:
        return str(findings[0])
    return fallback


def _edition(row: dict[str, Any]) -> str | None:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return (
        row.get("edition")
        or row.get("source_pdf_edition")
        or row.get("pdf_edition")
        or row.get("source_edition")
        or source.get("edition")
        or source.get("pdfEdition")
    )


def _filter_quarter(rows: list[dict[str, Any]], quarter: str | None) -> list[dict[str, Any]]:
    if not quarter:
        return rows
    return [row for row in rows if not _edition(row) or edition_matches_quarter(_edition(row), quarter)]


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
        return [
            {**row, "path": str(path)}
            for row in payload["rows"]
            if isinstance(row, dict)
        ]
    if isinstance(payload, dict):
        return [{**payload, "path": str(path)}]
    if isinstance(payload, list):
        return [
            {**row, "path": str(path)}
            for row in payload
            if isinstance(row, dict)
        ]
    return []


def build_v3_source_statuses(
    *,
    expected_sources: list[dict[str, Any]],
    snapshots: list[dict[str, Any]],
    quarter: str | None = None,
) -> list[dict[str, Any]]:
    expected_sources = _filter_quarter(expected_sources, quarter)
    snapshots_by_hash: dict[str, list[dict[str, Any]]] = {}
    for snapshot in snapshots:
        snapshot_hash = _source_hash(snapshot)
        if snapshot_hash:
            snapshots_by_hash.setdefault(snapshot_hash, []).append(snapshot)
    statuses: list[dict[str, Any]] = []
    for source in expected_sources:
        source_id = _source_id(source)
        source_hash = _source_hash(source)
        expected_config_hash = _config_hash(source)
        expected_pipeline_version = _pipeline_version(source)
        source_snapshots = snapshots_by_hash.get(source_hash, [])
        snapshot = (
            next(
                (
                    candidate_snapshot
                    for candidate_snapshot in source_snapshots
                    if _config_hash(candidate_snapshot) == expected_config_hash
                    and (
                        not expected_pipeline_version
                        or _pipeline_version(candidate_snapshot) == expected_pipeline_version
                    )
                ),
                None,
            )
            if expected_config_hash or expected_pipeline_version
            else None
        ) or (source_snapshots[0] if source_snapshots else None)
        base = {
            "source_document_id": source_id,
            "content_sha256": source_hash,
            "config_hash": expected_config_hash or None,
            "pipeline_version": expected_pipeline_version or None,
            "calendar_group_key": source.get("calendar_group_key"),
            **_source_metadata(source),
        }
        if snapshot:
            snapshot_config_hash = _config_hash(snapshot)
            snapshot_pipeline_version = _pipeline_version(snapshot)
            if expected_config_hash and snapshot_config_hash != expected_config_hash:
                statuses.append(
                    {
                        **base,
                        "status": "unprocessed",
                        "snapshot_status": snapshot.get("status"),
                        "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                        "snapshot_config_hash": snapshot_config_hash or None,
                        "snapshot_pipeline_version": snapshot_pipeline_version or None,
                        "message": "stale_v3_snapshot_config_hash",
                    }
                )
                continue
            if expected_pipeline_version and snapshot_pipeline_version != expected_pipeline_version:
                statuses.append(
                    {
                        **base,
                        "status": "unprocessed",
                        "snapshot_status": snapshot.get("status"),
                        "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                        "snapshot_config_hash": snapshot_config_hash or None,
                        "snapshot_pipeline_version": snapshot_pipeline_version or None,
                        "message": "stale_v3_snapshot_pipeline_version",
                    }
                )
                continue
            snapshot_status = str(snapshot.get("status") or "")
            quality = snapshot.get("quality") if isinstance(snapshot.get("quality"), dict) else {}
            if snapshot_status == "source_error":
                statuses.append(
                    {
                        **base,
                        "status": "source_error",
                        "snapshot_status": snapshot_status,
                        "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                        "snapshot_config_hash": snapshot_config_hash or None,
                        "snapshot_pipeline_version": snapshot_pipeline_version or None,
                        "message": _first_status_message(snapshot, "source_error"),
                    }
                )
                continue
            if snapshot_status in {"parser_error", "error"} or quality.get("ocr_success") is False:
                statuses.append(
                    {
                        **base,
                        "status": "parser_error",
                        "snapshot_status": snapshot_status,
                        "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                        "snapshot_config_hash": snapshot_config_hash or None,
                        "snapshot_pipeline_version": snapshot_pipeline_version or None,
                        "ocr_success": quality.get("ocr_success"),
                        "message": _first_status_message(snapshot, "parser_error"),
                    }
                )
                continue
            statuses.append(
                {
                    **base,
                    "status": "processed",
                    "snapshot_status": snapshot.get("status"),
                    "snapshot_path": snapshot.get("snapshot_path") or snapshot.get("path"),
                    "snapshot_config_hash": snapshot_config_hash or None,
                    "snapshot_pipeline_version": snapshot_pipeline_version or None,
                    "ocr_success": quality.get("ocr_success"),
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
    parser.add_argument("--quarter")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    statuses = build_v3_source_statuses(
        expected_sources=_json_objects(args.expected_sources),
        snapshots=_json_objects(args.snapshots),
        quarter=args.quarter,
    )
    if args.json:
        print(json.dumps(statuses, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(statuses, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
