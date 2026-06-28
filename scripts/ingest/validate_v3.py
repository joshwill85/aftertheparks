"""Validation and fail-closed publish gates for vision v3 candidates."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "validated_candidates_v3"
REQUIRED_CRITICAL_FIELDS = ("title", "schedule", "location", "fee")
MOVIE_CRITICAL_FIELDS = ("movie_title",)
AUTO_PUBLISH_FAMILIES = {"aframe_recreation", "vertical_digital_rec_sign"}


def _evidence_for(candidate: dict[str, Any], field_name: str) -> dict[str, Any] | None:
    evidence = candidate.get("field_evidence")
    if not isinstance(evidence, dict):
        return None
    field = evidence.get(field_name)
    return field if isinstance(field, dict) else None


def _has_source_crop(candidate: dict[str, Any], field_name: str) -> bool:
    field = _evidence_for(candidate, field_name)
    source = field.get("source") if isinstance(field, dict) else None
    if not isinstance(source, dict):
        return False
    return all(
        source.get(key)
        for key in ("content_sha256", "page_number", "page_image_sha256", "bbox_px", "crop_sha256")
    ) and bool(source.get("crop_storage_path") or source.get("crop_path"))


def _agreement_ok(candidate: dict[str, Any], field_name: str) -> bool:
    field = _evidence_for(candidate, field_name)
    if not isinstance(field, dict):
        return False
    return str(field.get("agreement") or "") in {
        "exact_after_normalization",
        "not_required",
        "manual_reviewed",
    }


def _schedule_ok(schedule: Any) -> bool:
    if not isinstance(schedule, dict):
        return False
    if schedule.get("schedule_type") == "phrase":
        return bool(schedule.get("raw_text"))
    return bool(schedule.get("days_of_week") and (schedule.get("start_time") or schedule.get("raw_text")))


def _fee_marker_conflicts(candidate: dict[str, Any]) -> bool:
    field = _evidence_for(candidate, "fee")
    raw_value = str(field.get("raw_value") or "") if isinstance(field, dict) else ""
    normalized_value = field.get("normalized_value") if isinstance(field, dict) else None
    if normalized_value is not None and normalized_value != candidate.get("fee_required"):
        return True
    return "($)" in raw_value and candidate.get("fee_required") is False


def validate_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    findings = list(candidate.get("validation_findings") or [])

    if candidate.get("document_family") not in AUTO_PUBLISH_FAMILIES:
        findings.append("unknown_document_family")

    if not candidate.get("source_document_id"):
        findings.append("missing_source_document_id")
    if not candidate.get("content_sha256"):
        findings.append("missing_content_sha256")

    required_fields = list(REQUIRED_CRITICAL_FIELDS)
    if candidate.get("candidate_type") == "movie":
        required_fields.extend(MOVIE_CRITICAL_FIELDS)

    for field_name in required_fields:
        if not _has_source_crop(candidate, field_name):
            findings.append(f"missing_required_field:{field_name}")
            continue
        if not _agreement_ok(candidate, field_name):
            findings.append(f"engine_disagreement:{field_name}")

    if not _schedule_ok(candidate.get("schedule_normalized")):
        findings.append("unparsed_schedule")

    location_id = candidate.get("normalized_location_id")
    if not location_id or location_id == "unknown":
        findings.append("unknown_location")
    if _fee_marker_conflicts(candidate):
        findings.append("fee_marker_conflict")

    deduped_findings = list(dict.fromkeys(str(finding) for finding in findings if str(finding)))
    validated = dict(candidate)
    validated["validation_findings"] = deduped_findings
    validated["validation_status"] = "auto_publishable" if not deduped_findings else "needs_review"
    return validated


def validate_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [validate_candidate(candidate) for candidate in candidates]


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate v3 candidates and assign publish gate status")
    parser.add_argument("candidates", type=Path)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    payload = json.loads(args.candidates.read_text())
    candidates = payload if isinstance(payload, list) else []
    validated = validate_candidates(candidates)
    if args.json:
        print(json.dumps(validated, indent=2, sort_keys=True))
        return
    output_path = args.output_dir / args.candidates.name
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(validated, indent=2, sort_keys=True) + "\n")
    print(output_path)


if __name__ == "__main__":
    main()
