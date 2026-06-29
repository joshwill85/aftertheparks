"""Validation and fail-closed publish gates for vision v3 candidates."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_CANDIDATES_DIR = PROCESSED_DIR / "activity_candidates_v3"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_validate_report.json"
REQUIRED_CRITICAL_FIELDS = ("title", "schedule", "location", "fee")
MOVIE_CRITICAL_FIELDS = ("movie_title",)
AUTO_PUBLISH_FAMILIES = {"aframe_recreation", "vertical_digital_rec_sign"}
REVIEW_ONLY_CANDIDATE_TYPES = {"generic_visual_review"}
LINEAGE_BLOCKING_FINDINGS = {
    "missing_pipeline_version",
    "missing_config_hash",
    "missing_runtime_lineage",
    "missing_runtime_lineage_config_hash",
    "missing_runtime_lineage_hash",
    "missing_package_versions",
    "missing_model_asset_hashes",
    "runtime_lineage_config_hash_mismatch",
}
CANONICAL_PAGE_BLOCKING_FINDINGS = {
    "missing_canonical_page_image",
}
SOURCE_PROVENANCE_BLOCKING_FINDINGS = {
    "missing_source_url",
    "missing_source_kind",
    "non_official_source",
    "source_fetch_not_successful",
    "source_not_current",
    "missing_source_captured_at",
}


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
    }


def _requires_manual_review(candidate: dict[str, Any], field_name: str) -> bool:
    field = _evidence_for(candidate, field_name)
    if not isinstance(field, dict):
        return False
    return str(field.get("agreement") or "") == "manual_reviewed"


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


def _has_any_reviewable_evidence(candidate: dict[str, Any]) -> bool:
    evidence = candidate.get("field_evidence")
    if not isinstance(evidence, dict):
        return False
    for field in evidence.values():
        if not isinstance(field, dict):
            continue
        source = field.get("source")
        if isinstance(source, dict) and (
            source.get("page_image_sha256")
            and source.get("crop_sha256")
            and (source.get("crop_storage_path") or source.get("crop_path"))
        ):
            return True
    return False


def _has_source_span(candidate: dict[str, Any], field_name: str) -> bool:
    source_spans = candidate.get("source_spans")
    if not isinstance(source_spans, dict):
        return False
    spans = source_spans.get(field_name)
    if not isinstance(spans, list) or not spans:
        return False
    for span in spans:
        if not isinstance(span, dict):
            continue
        if str(span.get("text") or "").strip() and span.get("page") not in {None, ""}:
            return True
    return False


def _value_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (dict, list, tuple, set)):
        return bool(value)
    return True


def _field_value_findings(candidate: dict[str, Any], field_name: str) -> list[str]:
    field = _evidence_for(candidate, field_name)
    if not isinstance(field, dict):
        return []
    findings: list[str] = []
    if not _value_present(field.get("raw_value")):
        findings.append(f"missing_field_raw_value:{field_name}")
    if "normalized_value" not in field or not _value_present(field.get("normalized_value")):
        findings.append(f"missing_field_normalized_value:{field_name}")
    return findings


def _validation_status(candidate: dict[str, Any], findings: list[str]) -> str:
    if not findings:
        return "auto_publishable"
    if LINEAGE_BLOCKING_FINDINGS.intersection(findings):
        return "rejected"
    if CANONICAL_PAGE_BLOCKING_FINDINGS.intersection(findings):
        return "rejected"
    if SOURCE_PROVENANCE_BLOCKING_FINDINGS.intersection(findings):
        return "rejected"
    if any(finding.startswith("field_page_image_not_canonical:") for finding in findings):
        return "rejected"
    if "missing_source_document_id" in findings or "missing_content_sha256" in findings:
        return "rejected"
    if not _has_any_reviewable_evidence(candidate):
        return "rejected"
    return "needs_review"


def _lineage_findings(candidate: dict[str, Any]) -> list[str]:
    findings: list[str] = []
    pipeline_version = str(candidate.get("pipeline_version") or "").strip()
    config_hash = str(candidate.get("config_hash") or "").strip()
    runtime_lineage = candidate.get("runtime_lineage")

    if not pipeline_version:
        findings.append("missing_pipeline_version")
    if not config_hash:
        findings.append("missing_config_hash")
    if not isinstance(runtime_lineage, dict):
        findings.append("missing_runtime_lineage")
        return findings

    lineage_config_hash = str(runtime_lineage.get("config_hash") or "").strip()
    if not lineage_config_hash:
        findings.append("missing_runtime_lineage_config_hash")
    elif config_hash and lineage_config_hash != config_hash:
        findings.append("runtime_lineage_config_hash_mismatch")
    if not str(runtime_lineage.get("lineage_hash") or "").strip():
        findings.append("missing_runtime_lineage_hash")
    if not isinstance(runtime_lineage.get("package_versions"), dict):
        findings.append("missing_package_versions")
    if not isinstance(runtime_lineage.get("model_asset_hashes"), dict):
        findings.append("missing_model_asset_hashes")
    return findings


def _is_public_http_url(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    return value.startswith("https://") or value.startswith("http://")


def _source_provenance_findings(candidate: dict[str, Any]) -> list[str]:
    findings: list[str] = []
    canonical_url = candidate.get("canonical_url")
    fetched_url = candidate.get("fetched_url")
    if not (_is_public_http_url(canonical_url) or _is_public_http_url(fetched_url)):
        findings.append("missing_source_url")

    source_kind = str(candidate.get("source_kind") or "").strip()
    if not source_kind:
        findings.append("missing_source_kind")
    elif not source_kind.startswith("official_"):
        findings.append("non_official_source")

    http_status = candidate.get("http_status")
    try:
        status_code = int(http_status)
    except (TypeError, ValueError):
        status_code = 0
    if status_code < 200 or status_code >= 300:
        findings.append("source_fetch_not_successful")

    currentness = str(candidate.get("currentness") or "").strip().lower()
    if currentness != "current":
        findings.append("source_not_current")

    if not str(candidate.get("captured_at") or "").strip():
        findings.append("missing_source_captured_at")
    return findings


def _canonical_page_image_findings(candidate: dict[str, Any], required_fields: list[str]) -> list[str]:
    findings: list[str] = []
    canonical_page_hashes = candidate.get("canonical_page_image_sha256s")
    if not isinstance(canonical_page_hashes, list):
        canonical_page_hashes = []
    canonical_page_hash_set = {
        str(page_hash).strip()
        for page_hash in canonical_page_hashes
        if str(page_hash).strip()
    }
    if not canonical_page_hash_set:
        findings.append("missing_canonical_page_image")
        return findings

    for field_name in required_fields:
        field = _evidence_for(candidate, field_name)
        source = field.get("source") if isinstance(field, dict) else None
        page_hash = str(source.get("page_image_sha256") or "").strip() if isinstance(source, dict) else ""
        if page_hash and page_hash not in canonical_page_hash_set:
            findings.append(f"field_page_image_not_canonical:{field_name}")
    return findings


def _activity_region_findings(candidate: dict[str, Any]) -> list[str]:
    findings: list[str] = []
    if not str(candidate.get("region_id") or "").strip():
        findings.append("missing_activity_region_id")
    if not str(candidate.get("region_type") or "").strip():
        findings.append("missing_activity_region_type")
    if not _has_source_crop(candidate, "region"):
        findings.append("missing_activity_region_evidence")
    return findings


def validate_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    findings = list(candidate.get("validation_findings") or [])
    findings.extend(_lineage_findings(candidate))
    findings.extend(_source_provenance_findings(candidate))

    if candidate.get("document_family") not in AUTO_PUBLISH_FAMILIES:
        findings.append("unknown_document_family")
    candidate_type = str(candidate.get("candidate_type") or "").strip()
    if candidate_type in REVIEW_ONLY_CANDIDATE_TYPES:
        findings.append(f"review_only_candidate_type:{candidate_type}")

    if not candidate.get("source_document_id"):
        findings.append("missing_source_document_id")
    if not candidate.get("content_sha256"):
        findings.append("missing_content_sha256")

    required_fields = list(REQUIRED_CRITICAL_FIELDS)
    if candidate.get("candidate_type") == "movie":
        required_fields.extend(MOVIE_CRITICAL_FIELDS)
    findings.extend(_canonical_page_image_findings(candidate, required_fields))
    findings.extend(_activity_region_findings(candidate))

    for field_name in required_fields:
        if not _has_source_span(candidate, field_name):
            findings.append(f"missing_source_span:{field_name}")
        findings.extend(_field_value_findings(candidate, field_name))
        if not _has_source_crop(candidate, field_name):
            findings.append(f"missing_required_field:{field_name}")
            continue
        if _requires_manual_review(candidate, field_name):
            findings.append(f"manual_review_required:{field_name}")
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
    if deduped_findings and not _has_any_reviewable_evidence(candidate):
        deduped_findings.append("missing_reviewable_evidence")
        deduped_findings = list(dict.fromkeys(deduped_findings))
    validated = dict(candidate)
    validated["validation_findings"] = deduped_findings
    validated["validation_status"] = _validation_status(candidate, deduped_findings)
    return validated


def validate_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [validate_candidate(candidate) for candidate in candidates]


def _candidate_paths(candidates_dir: Path) -> list[Path]:
    if not candidates_dir.exists():
        return []
    return sorted(candidates_dir.glob("*.candidates.json"))


def _candidate_matches_filters(
    candidate: dict[str, Any],
    *,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and candidate.get("calendar_group_key") != group:
        return False
    edition = str(candidate.get("edition") or candidate.get("source_edition") or "")
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def _status_counts(candidates: list[dict[str, Any]]) -> dict[str, int]:
    counts = {
        "auto_publishable": 0,
        "needs_review": 0,
        "rejected": 0,
    }
    for candidate in candidates:
        status = str(candidate.get("validation_status") or "")
        if status in counts:
            counts[status] += 1
    return counts


def validated_output_path(candidates_path: Path, *, output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    return output_dir / candidates_path.name


def validate_candidates_from_directory(
    *,
    candidates_dir: Path = DEFAULT_CANDIDATES_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for candidates_path in _candidate_paths(candidates_dir):
        try:
            payload = json.loads(candidates_path.read_text())
            candidates = payload if isinstance(payload, list) else []
            candidates = [
                candidate for candidate in candidates
                if isinstance(candidate, dict)
                and _candidate_matches_filters(candidate, group=group, quarter=quarter)
            ]
            validated = validate_candidates(candidates)
            output_path = validated_output_path(candidates_path, output_dir=output_dir)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(validated, indent=2, sort_keys=True) + "\n")
            counts = _status_counts(validated)
            results.append(
                {
                    "status": "validated",
                    "candidates_path": str(candidates_path),
                    "validated_path": str(output_path),
                    "candidate_count": len(validated),
                    "auto_publishable_count": counts["auto_publishable"],
                    "needs_review_count": counts["needs_review"],
                    "rejected_count": counts["rejected"],
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "candidates_path": str(candidates_path),
                    "validated_path": None,
                    "candidate_count": 0,
                    "auto_publishable_count": 0,
                    "needs_review_count": 0,
                    "rejected_count": 0,
                    "error": str(exc),
                }
            )

    report = {
        "report_kind": "v3_validate",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "candidates_dir": str(candidates_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "candidate_count": sum(int(result["candidate_count"]) for result in results),
            "auto_publishable_count": sum(int(result["auto_publishable_count"]) for result in results),
            "needs_review_count": sum(int(result["needs_review_count"]) for result in results),
            "rejected_count": sum(int(result["rejected_count"]) for result in results),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate v3 candidates and assign publish gate status")
    parser.add_argument("candidates", type=Path, nargs="?")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--candidates-dir", type=Path, default=DEFAULT_CANDIDATES_DIR)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--group")
    parser.add_argument("--quarter")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.candidates:
        payload = json.loads(args.candidates.read_text())
        candidates = payload if isinstance(payload, list) else []
        validated = validate_candidates(candidates)
        if args.json:
            print(json.dumps(validated, indent=2, sort_keys=True))
            return
        output_path = validated_output_path(args.candidates, output_dir=args.output_dir)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(validated, indent=2, sort_keys=True) + "\n")
        print(output_path)
        return

    report = validate_candidates_from_directory(
        candidates_dir=args.candidates_dir,
        output_dir=args.output_dir,
        report_path=args.report_path,
        group=args.group,
        quarter=args.quarter,
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(args.report_path)


if __name__ == "__main__":
    main()
