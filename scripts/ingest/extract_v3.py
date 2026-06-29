"""Vision v3 candidate extraction scaffolding."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from fee_validator import reconcile_fee_evidence
    from field_evidence import build_field_evidence
    from normalization_v3 import evaluate_field_agreement, normalize_location_text, normalize_schedule_text
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .fee_validator import reconcile_fee_evidence
    from .field_evidence import build_field_evidence
    from .normalization_v3 import evaluate_field_agreement, normalize_location_text, normalize_schedule_text
    from .source_manifest import edition_matches_quarter


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "activity_candidates_v3"
DEFAULT_SNAPSHOTS_DIR = PROCESSED_DIR / "vision_snapshots"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "eval" / "v3_extract_report.json"
PUBLISHABLE_REGION_TYPES = {
    "resort_activities_section": "activity",
    "wellness_section": "activity",
    "vertical_activity_row": "activity",
    "movie_section": "movie",
}
GENERIC_REVIEW_REGION_TYPES = {"unknown"}
SOURCE_METADATA_FIELDS = (
    "source_kind",
    "source_role",
    "canonical_url",
    "fetched_url",
    "http_status",
    "currentness",
    "captured_at",
)


def _canonical_page_image_sha256s(snapshot: dict[str, Any]) -> list[str]:
    source_pages = snapshot.get("source_pages")
    if not isinstance(source_pages, list):
        return []
    page_hashes: list[str] = []
    for page in source_pages:
        if not isinstance(page, dict):
            continue
        page_hash = str(page.get("canonical_image_sha256") or page.get("page_image_sha256") or "").strip()
        if page_hash and page_hash not in page_hashes:
            page_hashes.append(page_hash)
    return page_hashes


def _region_evidence(snapshot: dict[str, Any], region: dict[str, Any]) -> dict[str, Any]:
    return build_field_evidence(
        field="region",
        raw_value=None,
        normalized_value=None,
        content_sha256=str(snapshot.get("source_sha256") or ""),
        region=region,
        agreement="not_evaluated",
        review_status="required",
    )


def _region_tokens(tokens: list[dict[str, Any]], region: dict[str, Any]) -> list[dict[str, Any]]:
    region_id = region.get("region_id")
    page_number = region.get("page_number")
    region_bbox = region.get("bbox_px")
    return [
        token for token in tokens
        if isinstance(token, dict)
        and (
            (region_id and token.get("region_id") == region_id)
            or (not token.get("region_id") and _bbox_contains(region_bbox, token.get("bbox_px")))
            or (not region_id and _bbox_contains(region_bbox, token.get("bbox_px")))
        )
        and (not page_number or token.get("page_number") == page_number)
    ]


def _bbox_contains(container: object, inner: object) -> bool:
    if not (
        isinstance(container, list)
        and isinstance(inner, list)
        and len(container) == 4
        and len(inner) == 4
    ):
        return False
    cx1, cy1, cx2, cy2 = [float(value) for value in container]
    ix1, iy1, ix2, iy2 = [float(value) for value in inner]
    return cx1 <= ix1 and cy1 <= iy1 and ix2 <= cx2 and iy2 <= cy2


def _token_for_field(tokens: list[dict[str, Any]], field_hint: str, engine: str) -> dict[str, Any] | None:
    matching = [
        token for token in tokens
        if token.get("field_hint") == field_hint and token.get("engine") == engine
    ]
    matching.sort(key=lambda token: int(token.get("reading_order") or 0))
    if not matching:
        return None
    token = matching[0]
    return {
        "engine": engine,
        "text": token.get("text") or token.get("token_text"),
        "confidence": token.get("confidence"),
        "bbox_px": token.get("bbox_px"),
        "page_image_sha256": token.get("page_image_sha256"),
        "page_number": token.get("page_number"),
    }


def _field_region(region: dict[str, Any], primary: dict[str, Any] | None, secondary: dict[str, Any] | None) -> dict[str, Any]:
    bbox = None
    if isinstance(primary, dict):
        bbox = primary.get("bbox_px")
    if bbox is None and isinstance(secondary, dict):
        bbox = secondary.get("bbox_px")
    return {
        **region,
        "bbox_px": bbox or region.get("bbox_px"),
    }


def _raw_text(token: dict[str, Any] | None) -> str:
    return str((token or {}).get("text") or "")


def _source_span(
    field: str,
    token: dict[str, Any] | None,
    *,
    text: str | None = None,
    region: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    if not isinstance(token, dict):
        return []
    span_text = str(text if text is not None else token.get("text") or token.get("token_text") or "").strip()
    if not span_text:
        return []
    return [
        {
            "field": field,
            "page": token.get("page_number"),
            "text": span_text,
            "bbox_px": token.get("bbox_px"),
            "page_image_sha256": token.get("page_image_sha256"),
            "engine": token.get("engine"),
            "region_id": (region or {}).get("region_id"),
        }
    ]


def _compose_schedule_text(schedule_token: dict[str, Any] | None, day_token: dict[str, Any] | None) -> str:
    schedule_text = _raw_text(schedule_token)
    day_text = _raw_text(day_token)
    if day_text and schedule_text and not any(day.lower() in schedule_text.lower() for day in (
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
        "daily",
        "nightly",
    )):
        return f"{day_text} at {schedule_text}"
    return schedule_text


def _extracted_candidate(
    snapshot: dict[str, Any],
    region: dict[str, Any],
    region_tokens: list[dict[str, Any]],
    *,
    candidate_type: str,
) -> dict[str, Any] | None:
    primary_title = _token_for_field(region_tokens, "title", "paddleocr_ppstructurev3")
    secondary_title = _token_for_field(region_tokens, "title", "rapidocr")
    primary_schedule = _token_for_field(region_tokens, "schedule", "paddleocr_ppstructurev3")
    secondary_schedule = _token_for_field(region_tokens, "schedule", "rapidocr")
    primary_day = _token_for_field(region_tokens, "day_banner", "paddleocr_ppstructurev3")
    secondary_day = _token_for_field(region_tokens, "day_banner", "rapidocr")
    primary_location = _token_for_field(region_tokens, "location", "paddleocr_ppstructurev3")
    secondary_location = _token_for_field(region_tokens, "location", "rapidocr")
    primary_movie_title = _token_for_field(region_tokens, "movie_title", "paddleocr_ppstructurev3")
    secondary_movie_title = _token_for_field(region_tokens, "movie_title", "rapidocr")
    primary_legend = _token_for_field(region_tokens, "fee_legend", "paddleocr_ppstructurev3")
    secondary_legend = _token_for_field(region_tokens, "fee_legend", "rapidocr")
    if not all([primary_title, secondary_title, primary_schedule, secondary_schedule, primary_location, secondary_location]):
        return None
    if candidate_type == "movie" and not all([primary_movie_title, secondary_movie_title]):
        return None

    primary_schedule_text = _compose_schedule_text(primary_schedule, primary_day)
    secondary_schedule_text = _compose_schedule_text(secondary_schedule, secondary_day)
    title_agreement = evaluate_field_agreement(
        "title",
        primary_text=_raw_text(primary_title),
        secondary_text=_raw_text(secondary_title),
    )
    schedule_agreement = evaluate_field_agreement(
        "schedule",
        primary_text=primary_schedule_text,
        secondary_text=secondary_schedule_text,
    )
    location_agreement = evaluate_field_agreement(
        "location",
        primary_text=_raw_text(primary_location),
        secondary_text=_raw_text(secondary_location),
    )
    movie_title_agreement = None
    if candidate_type == "movie":
        movie_title_agreement = evaluate_field_agreement(
            "title",
            primary_text=_raw_text(primary_movie_title),
            secondary_text=_raw_text(secondary_movie_title),
        )
    fee = reconcile_fee_evidence(
        title_text=_raw_text(primary_title),
        body_text="",
        legend_text=_raw_text(primary_legend),
    )
    fee_agreement = evaluate_field_agreement(
        "fee",
        primary_text=f"{_raw_text(primary_title)} {_raw_text(primary_legend)}",
        secondary_text=f"{_raw_text(secondary_title)} {_raw_text(secondary_legend)}",
    )
    schedule_normalized = normalize_schedule_text(primary_schedule_text)
    location_normalized = normalize_location_text(_raw_text(primary_location))
    findings: list[str] = []
    if fee["status"] != "validated":
        findings.extend(str(finding) for finding in fee.get("findings", []))

    content_sha256 = str(snapshot.get("source_sha256") or "")
    field_evidence = {
        "region": _region_evidence(snapshot, region),
        "title": build_field_evidence(
            field="title",
            raw_value=_raw_text(primary_title),
            normalized_value=title_agreement["normalized_value"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_title, secondary_title),
            primary_engine=primary_title,
            secondary_engine=secondary_title,
            agreement=title_agreement["agreement"],
            review_status="not_required" if title_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "schedule": build_field_evidence(
            field="schedule",
            raw_value=primary_schedule_text,
            normalized_value=schedule_normalized,
            content_sha256=content_sha256,
            region=_field_region(region, primary_schedule, secondary_schedule),
            primary_engine=primary_schedule,
            secondary_engine=secondary_schedule,
            agreement=schedule_agreement["agreement"],
            review_status="not_required" if schedule_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "location": build_field_evidence(
            field="location",
            raw_value=_raw_text(primary_location),
            normalized_value=location_normalized["location_id"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_location, secondary_location),
            primary_engine=primary_location,
            secondary_engine=secondary_location,
            agreement=location_agreement["agreement"],
            review_status="not_required" if location_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
        "fee": build_field_evidence(
            field="fee",
            raw_value=f"{_raw_text(primary_title)} {_raw_text(primary_legend)}".strip(),
            normalized_value=fee["fee_required"],
            content_sha256=content_sha256,
            region=_field_region(region, primary_legend, secondary_legend),
            primary_engine=primary_legend or primary_title,
            secondary_engine=secondary_legend or secondary_title,
            agreement=fee_agreement["agreement"],
            review_status="not_required" if fee_agreement["agreement"] == "exact_after_normalization" else "required",
        ),
    }
    movie_title = None
    normalized_movie_title = None
    if candidate_type == "movie" and movie_title_agreement is not None:
        movie_title = _raw_text(primary_movie_title)
        normalized_movie_title = movie_title_agreement["normalized_value"]
        field_evidence["movie_title"] = build_field_evidence(
            field="movie_title",
            raw_value=movie_title,
            normalized_value=normalized_movie_title,
            content_sha256=content_sha256,
            region=_field_region(region, primary_movie_title, secondary_movie_title),
            primary_engine=primary_movie_title,
            secondary_engine=secondary_movie_title,
            agreement=movie_title_agreement["agreement"],
            review_status="not_required" if movie_title_agreement["agreement"] == "exact_after_normalization" else "required",
        )

    source_spans = {
        "title": _source_span("title", primary_title, region=region),
        "schedule": _source_span("schedule", primary_schedule, text=primary_schedule_text, region=region),
        "location": _source_span("location", primary_location, region=region),
        "fee": _source_span("fee", primary_legend or primary_title, region=region),
    }
    if candidate_type == "movie":
        source_spans["movie_title"] = _source_span("movie_title", primary_movie_title, region=region)

    return {
        "source_title": _raw_text(primary_title),
        "normalized_title": title_agreement["normalized_value"],
        "movie_title": movie_title,
        "normalized_movie_title": normalized_movie_title,
        "location_text": _raw_text(primary_location),
        "normalized_location_id": location_normalized["location_id"],
        "schedule_raw": primary_schedule_text,
        "schedule_normalized": schedule_normalized,
        "fee_required": fee["fee_required"],
        "validation_findings": findings,
        "field_evidence": field_evidence,
        "source_spans": source_spans,
    }


def extract_candidates_from_snapshot(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    regions = snapshot.get("regions") if isinstance(snapshot.get("regions"), list) else []
    tokens = snapshot.get("tokens") if isinstance(snapshot.get("tokens"), list) else []
    canonical_page_image_sha256s = _canonical_page_image_sha256s(snapshot)
    document_family = str(snapshot.get("document_family") or "unknown_visual_schedule")
    candidates: list[dict[str, Any]] = []

    for region in regions:
        if not isinstance(region, dict):
            continue
        region_type = str(region.get("region_type") or "")
        candidate_type = PUBLISHABLE_REGION_TYPES.get(region_type)
        generic_review_only = document_family == "unknown_visual_schedule" and region_type in GENERIC_REVIEW_REGION_TYPES
        if generic_review_only:
            candidate_type = "generic_visual_review"
        if candidate_type is None:
            continue

        findings: list[str] = []
        if generic_review_only:
            findings.extend(["unknown_document_family", "generic_visual_schedule_review_required"])
        if not tokens:
            findings.append("ocr_text_missing")
        extracted = (
            _extracted_candidate(
                snapshot,
                region,
                _region_tokens(tokens, region),
                candidate_type=candidate_type,
            )
            if tokens
            else None
        )
        extracted_fields = extracted or {
            "source_title": None,
            "normalized_title": None,
            "movie_title": None,
            "normalized_movie_title": None,
            "location_text": None,
            "normalized_location_id": None,
            "schedule_raw": None,
            "schedule_normalized": None,
            "fee_required": None,
            "validation_findings": findings or ["field_extraction_not_implemented"],
            "field_evidence": {
                "region": _region_evidence(snapshot, region),
            },
            "source_spans": {},
        }

        candidates.append(
            {
                "pipeline_version": snapshot.get("pipeline_version", "vision_v3_001"),
                "config_hash": snapshot.get("config_hash"),
                "runtime_lineage": snapshot.get("runtime_lineage"),
                "document_family": document_family,
                "source_document_id": snapshot.get("source_document_id"),
                "content_sha256": snapshot.get("source_sha256"),
                "canonical_page_image_sha256s": canonical_page_image_sha256s,
                "calendar_group_key": snapshot.get("calendar_group_key"),
                "edition": snapshot.get("edition"),
                "source_type": snapshot.get("source_type"),
                "candidate_type": candidate_type,
                "region_id": region.get("region_id"),
                "region_type": region_type,
                "source_title": extracted_fields["source_title"],
                "normalized_title": extracted_fields["normalized_title"],
                "movie_title": extracted_fields["movie_title"],
                "normalized_movie_title": extracted_fields["normalized_movie_title"],
                "location_text": extracted_fields["location_text"],
                "normalized_location_id": extracted_fields["normalized_location_id"],
                "schedule_raw": extracted_fields["schedule_raw"],
                "schedule_normalized": extracted_fields["schedule_normalized"],
                "description": None,
                "fee_required": extracted_fields["fee_required"],
                "registration_required": None,
                "weather_note": None,
                "validation_status": "needs_review",
                "validation_findings": extracted_fields["validation_findings"],
                "field_evidence": extracted_fields["field_evidence"],
                "source_spans": extracted_fields["source_spans"],
            }
        )
        for field in SOURCE_METADATA_FIELDS:
            if field in snapshot:
                candidates[-1][field] = snapshot[field]

    return candidates


def _snapshot_paths(snapshots_dir: Path) -> list[Path]:
    if not snapshots_dir.exists():
        return []
    return sorted(snapshots_dir.glob("*.vision.json"))


def _snapshot_matches_filters(
    snapshot: dict[str, Any],
    *,
    group: str | None,
    quarter: str | None,
) -> bool:
    if group and snapshot.get("calendar_group_key") != group:
        return False
    edition = str(snapshot.get("edition") or "")
    if not edition_matches_quarter(edition, quarter):
        return False
    return True


def candidates_output_path(snapshot: dict[str, Any], *, output_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    source_hash = str(snapshot.get("source_sha256") or "unknown")
    return output_dir / f"{source_hash}.candidates.json"


def extract_candidates_from_directory(
    *,
    snapshots_dir: Path = DEFAULT_SNAPSHOTS_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    report_path: Path | None = DEFAULT_REPORT_PATH,
    group: str | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for snapshot_path in _snapshot_paths(snapshots_dir):
        try:
            snapshot = json.loads(snapshot_path.read_text())
            if not _snapshot_matches_filters(snapshot, group=group, quarter=quarter):
                continue
            candidates = extract_candidates_from_snapshot(snapshot)
            output_path = candidates_output_path(snapshot, output_dir=output_dir)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(candidates, indent=2, sort_keys=True) + "\n")
            results.append(
                {
                    "status": "extracted",
                    "snapshot_path": str(snapshot_path),
                    "candidates_path": str(output_path),
                    "source_sha256": snapshot.get("source_sha256"),
                    "calendar_group_key": snapshot.get("calendar_group_key"),
                    "edition": snapshot.get("edition"),
                    "candidate_count": len(candidates),
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "status": "parser_error",
                    "snapshot_path": str(snapshot_path),
                    "candidates_path": None,
                    "source_sha256": None,
                    "calendar_group_key": None,
                    "edition": None,
                    "candidate_count": 0,
                    "error": str(exc),
                }
            )

    report = {
        "report_kind": "v3_extract",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "snapshots_dir": str(snapshots_dir),
        "output_dir": str(output_dir),
        "quarter": quarter,
        "group": group,
        "summary": {
            "snapshot_count": len(results),
            "candidate_count": sum(int(result["candidate_count"]) for result in results),
            "parser_error_count": sum(1 for result in results if result["status"] == "parser_error"),
        },
        "results": results,
    }
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract v3 candidates from a vision snapshot")
    parser.add_argument("snapshot", type=Path, nargs="?")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--snapshots-dir", type=Path, default=DEFAULT_SNAPSHOTS_DIR)
    parser.add_argument("--report-path", type=Path, default=DEFAULT_REPORT_PATH)
    parser.add_argument("--group")
    parser.add_argument("--quarter")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.snapshot:
        snapshot = json.loads(args.snapshot.read_text())
        candidates = extract_candidates_from_snapshot(snapshot)
        if args.json:
            print(json.dumps(candidates, indent=2, sort_keys=True))
            return
        output_path = candidates_output_path(snapshot, output_dir=args.output_dir)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(candidates, indent=2, sort_keys=True) + "\n")
        print(output_path)
        return

    report = extract_candidates_from_directory(
        snapshots_dir=args.snapshots_dir,
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
