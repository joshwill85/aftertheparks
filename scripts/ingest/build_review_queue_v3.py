"""Build review tasks for non-publishable vision v3 candidates."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "review_queue" / "vision_v3_review_queue.json"
DEFAULT_VALIDATED_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_SOURCE_STATUSES_PATH = PROCESSED_DIR / "eval" / "v3_source_statuses.json"
SOURCE_STATUS_REVIEW_TASK_TYPES = {"parser_error", "source_error"}


def _task_type(findings: list[str]) -> str:
    if not findings:
        return "needs_review"
    first = findings[0]
    if first.startswith("missing_required_field:"):
        return "missing_required_field"
    if first == "unknown_location":
        return "unknown_location"
    if first == "unparsed_schedule":
        return "unparsed_schedule"
    if first.startswith("engine_disagreement:"):
        return "ocr_disagreement"
    if first == "unknown_document_family":
        return "unknown_document_family"
    return first


def _field_from_findings(findings: list[str]) -> str | None:
    for finding in findings:
        if ":" in finding and (
            finding.startswith("missing_required_field:")
            or finding.startswith("engine_disagreement:")
        ):
            return finding.split(":", 1)[1]
    if "unknown_location" in findings:
        return "location"
    if "unparsed_schedule" in findings:
        return "schedule"
    if "fee_marker_conflict" in findings:
        return "fee"
    return None


def _field_evidence(candidate: dict[str, Any], field_name: str | None) -> dict[str, Any]:
    evidence = candidate.get("field_evidence") if isinstance(candidate.get("field_evidence"), dict) else {}
    if field_name and isinstance(evidence.get(field_name), dict):
        return evidence[field_name]
    if isinstance(evidence.get("region"), dict):
        return evidence["region"]
    return {}


def _region_source(candidate: dict[str, Any], field_name: str | None = None) -> dict[str, Any]:
    evidence = candidate.get("field_evidence") if isinstance(candidate.get("field_evidence"), dict) else {}
    selected = _field_evidence(candidate, field_name)
    source = selected.get("source") if isinstance(selected.get("source"), dict) else {}
    if not source:
        region = evidence.get("region") if isinstance(evidence.get("region"), dict) else {}
        source = region.get("source") if isinstance(region.get("source"), dict) else {}
    return source


def _engine_text(evidence: dict[str, Any], index: int) -> str | None:
    engines = evidence.get("engines")
    if not isinstance(engines, list) or len(engines) <= index or not isinstance(engines[index], dict):
        return None
    return engines[index].get("text")


def _source_id(row: dict[str, Any]) -> str:
    return str(row.get("source_document_id") or row.get("id") or row.get("document_id") or "").strip()


def _source_hash(row: dict[str, Any]) -> str:
    return str(row.get("content_sha256") or row.get("source_sha256") or row.get("documentHash") or "").strip()


def _source_status_review_tasks(source_statuses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, status in enumerate(source_statuses, start=1):
        task_type = str(status.get("status") or "")
        if task_type not in SOURCE_STATUS_REVIEW_TASK_TYPES:
            continue
        source_id = _source_id(status)
        source_hash = _source_hash(status)
        identifier = source_id or source_hash or f"{index:04d}"
        message = str(status.get("message") or task_type)
        tasks.append(
            {
                "task_id": f"source-{task_type.replace('_', '-')}-{identifier}",
                "task_type": task_type,
                "field": None,
                "source_document_id": source_id or None,
                "content_sha256": source_hash or None,
                "calendar_group_key": status.get("calendar_group_key"),
                "candidate_type": "source",
                "page_number": None,
                "page_image": None,
                "field_crop": None,
                "field_crop_sha256": None,
                "field_bbox": None,
                "primary_text": None,
                "secondary_text": None,
                "candidate_value": None,
                "normalized_value": None,
                "validation_findings": [message],
                "snapshot_path": status.get("snapshot_path"),
                "source_status": status,
            }
        )
    return tasks


def build_review_tasks(
    candidates: list[dict[str, Any]],
    *,
    source_statuses: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, candidate in enumerate(candidates, start=1):
        if candidate.get("validation_status") not in {"needs_review", "parser_error", "source_error"}:
            continue
        findings = [str(finding) for finding in candidate.get("validation_findings") or []]
        field_name = _field_from_findings(findings)
        evidence = _field_evidence(candidate, field_name)
        source = _region_source(candidate, field_name)
        tasks.append(
            {
                "task_id": str(candidate.get("candidate_id") or f"vision-v3-review-{index:04d}"),
                "task_type": _task_type(findings),
                "field": field_name,
                "source_document_id": candidate.get("source_document_id"),
                "content_sha256": candidate.get("content_sha256"),
                "calendar_group_key": candidate.get("calendar_group_key"),
                "candidate_type": candidate.get("candidate_type"),
                "page_number": source.get("page_number"),
                "page_image": source.get("page_image_sha256"),
                "field_crop": source.get("crop_storage_path"),
                "field_crop_sha256": source.get("crop_sha256"),
                "field_bbox": source.get("bbox_px"),
                "primary_text": _engine_text(evidence, 0),
                "secondary_text": _engine_text(evidence, 1),
                "candidate_value": evidence.get("raw_value") or candidate.get("source_title") or candidate.get("schedule_raw"),
                "normalized_value": evidence.get("normalized_value"),
                "validation_findings": findings,
                "candidate": candidate,
            }
        )
    tasks.extend(_source_status_review_tasks(source_statuses or []))
    return tasks


def review_approval_is_current(
    approval: dict[str, Any],
    *,
    current_content_sha256: str,
    current_page_image_sha256: str | None,
) -> bool:
    if approval.get("content_sha256") != current_content_sha256:
        return False
    if current_page_image_sha256 and approval.get("page_image_sha256") != current_page_image_sha256:
        return False
    return True


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    if path.is_dir():
        rows: list[dict[str, Any]] = []
        for child in sorted(path.glob("*.json")):
            rows.extend(_load_json_list(child))
        return rows
    payload = json.loads(path.read_text())
    if isinstance(payload, dict) and isinstance(payload.get("rows"), list):
        return [item for item in payload["rows"] if isinstance(item, dict)]
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 review queue tasks")
    parser.add_argument("validated_candidates", type=Path, nargs="?", default=DEFAULT_VALIDATED_CANDIDATES_PATH)
    parser.add_argument("--source-statuses", type=Path, default=DEFAULT_SOURCE_STATUSES_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    candidates = _load_json_list(args.validated_candidates)
    tasks = build_review_tasks(candidates, source_statuses=_load_json_list(args.source_statuses))
    if args.json:
        print(json.dumps(tasks, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(tasks, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
