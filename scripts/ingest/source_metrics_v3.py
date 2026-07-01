"""Build v3 per-source quality and candidate metrics."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from publish_gold_v3 import _dual_run_preview_fingerprint
    from source_manifest import edition_matches_quarter
except ImportError:  # pragma: no cover - supports package-style imports
    from .config import PROCESSED_DIR
    from .publish_gold_v3 import _dual_run_preview_fingerprint
    from .source_manifest import edition_matches_quarter


DEFAULT_SNAPSHOTS_PATH = PROCESSED_DIR / "vision_snapshots"
DEFAULT_CANDIDATES_PATH = PROCESSED_DIR / "validated_candidates_v3"
DEFAULT_SOURCE_INVENTORY_PATH = PROCESSED_DIR / "source_inventory.json"
DEFAULT_PREVIEW_PATH = PROCESSED_DIR / "activity_gold_v3_preview.json"
DEFAULT_OUTPUT_PATH = PROCESSED_DIR / "eval" / "v3_source_metrics.json"
AGREEMENT_OK = {"exact_after_normalization", "not_required", "manual_reviewed"}
LOW_DESCRIPTION_CONFIDENCE_THRESHOLD = 0.5


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


def _json_dict(path: Path) -> dict[str, Any] | None:
    if not path.exists() or path.is_dir():
        return None
    payload = json.loads(path.read_text())
    return payload if isinstance(payload, dict) else None


def _source_hash(row: dict[str, Any]) -> str:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return str(
        row.get("content_sha256")
        or row.get("source_sha256")
        or row.get("documentHash")
        or row.get("document_hash")
        or source.get("documentHash")
        or source.get("document_hash")
        or ""
    ).strip()


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
    return [row for row in rows if edition_matches_quarter(_edition(row), quarter)]


def _is_movie_candidate(row: dict[str, Any]) -> bool:
    return (
        row.get("candidate_type") == "movie"
        or bool(row.get("movie_title"))
        or row.get("category") == "movie"
    )


def _page_count(snapshot: dict[str, Any]) -> int:
    source_pages = snapshot.get("source_pages")
    if isinstance(source_pages, list):
        return len(source_pages)
    quality = snapshot.get("quality")
    if isinstance(quality, dict):
        return int(quality.get("page_count") or 0)
    return 0


def _region_count(snapshot: dict[str, Any]) -> int:
    regions = snapshot.get("regions")
    if isinstance(regions, list):
        return len(regions)
    quality = snapshot.get("quality")
    if isinstance(quality, dict):
        return int(quality.get("region_count") or 0)
    return 0


def _page_render_success(snapshot: dict[str, Any]) -> bool:
    quality = snapshot.get("quality")
    findings = quality.get("findings") if isinstance(quality, dict) else []
    return _page_count(snapshot) > 0 and "missing_source_pages" not in (findings or [])


def _ocr_success(snapshot: dict[str, Any]) -> bool:
    quality = snapshot.get("quality")
    if isinstance(quality, dict) and "ocr_success" in quality:
        return bool(quality["ocr_success"])
    engine_runs = snapshot.get("engine_runs")
    if isinstance(engine_runs, list):
        return any(run.get("status") == "success" for run in engine_runs if isinstance(run, dict))
    return False


def _recognized_family(snapshot: dict[str, Any]) -> str | None:
    family_classification = snapshot.get("family_classification")
    if isinstance(family_classification, dict):
        return family_classification.get("document_family") or snapshot.get("document_family")
    return snapshot.get("document_family")


def _candidate_status_counts(candidates: list[dict[str, Any]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for candidate in candidates:
        status = str(candidate.get("validation_status") or candidate.get("status") or "").strip()
        if status:
            counts[status] += 1
    return counts


def _findings(candidate: dict[str, Any]) -> set[str]:
    findings = candidate.get("validation_findings")
    if not isinstance(findings, list):
        return set()
    return {str(finding) for finding in findings if str(finding)}


def _field_evidence(candidate: dict[str, Any], field_name: str) -> dict[str, Any]:
    evidence = candidate.get("field_evidence")
    if not isinstance(evidence, dict):
        return {}
    field = evidence.get(field_name)
    return field if isinstance(field, dict) else {}


def _has_title(candidate: dict[str, Any]) -> bool:
    return bool(
        str(
            candidate.get("title")
            or candidate.get("source_title")
            or candidate.get("normalized_title")
            or candidate.get("movie_title")
            or ""
        ).strip()
    )


def _schedule_missing(candidate: dict[str, Any], findings: set[str]) -> bool:
    if "missing_required_field:schedule" in findings:
        return True
    schedule = candidate.get("schedule_normalized")
    if isinstance(schedule, dict) and schedule:
        return False
    return not str(candidate.get("schedule_text") or candidate.get("schedule_raw") or "").strip()


def _schedule_unparsed(candidate: dict[str, Any], findings: set[str]) -> bool:
    if "unparsed_schedule" in findings:
        return True
    schedule = candidate.get("schedule_normalized")
    if not isinstance(schedule, dict):
        return True
    if schedule.get("schedule_type") == "phrase":
        return not bool(schedule.get("raw_text"))
    return not bool(schedule.get("days_of_week") and (schedule.get("start_time") or schedule.get("raw_text")))


def _fee_disagreement(candidate: dict[str, Any], findings: set[str]) -> bool:
    if "fee_marker_conflict" in findings:
        return True
    agreement = str(_field_evidence(candidate, "fee").get("agreement") or "")
    return bool(agreement and agreement not in AGREEMENT_OK)


def _engine_disagreement(candidate: dict[str, Any], findings: set[str]) -> bool:
    if any(finding.startswith("engine_disagreement:") for finding in findings):
        return True
    evidence = candidate.get("field_evidence")
    if not isinstance(evidence, dict):
        return False
    for field in evidence.values():
        if not isinstance(field, dict):
            continue
        agreement = str(field.get("agreement") or "")
        if agreement and agreement not in AGREEMENT_OK:
            return True
    return False


def _description_low_confidence(candidate: dict[str, Any], findings: set[str]) -> bool:
    if "candidate_warning:description:text_quality_low" in findings:
        return True
    description = _field_evidence(candidate, "description")
    engines = description.get("engines")
    if not isinstance(engines, list):
        return False
    confidences = [
        engine.get("confidence")
        for engine in engines
        if isinstance(engine, dict) and isinstance(engine.get("confidence"), (int, float))
    ]
    return bool(confidences) and max(float(confidence) for confidence in confidences) < LOW_DESCRIPTION_CONFIDENCE_THRESHOLD


def _rate(count: int, total: int) -> float:
    return count / total if total else 0.0


def _first_present(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def _source_inventory_by_hash(source_inventory: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for source in source_inventory:
        source_hash = _source_hash(source)
        if source_hash:
            rows[source_hash] = source
    return rows


def _is_v3_visual_source(row: dict[str, Any], inventory_source: dict[str, Any] | None = None) -> bool:
    inventory_source = inventory_source or {}
    source_role = str(_first_present(row.get("source_role"), inventory_source.get("source_role")) or "").strip()
    source_type = str(_first_present(row.get("source_type"), inventory_source.get("source_type")) or "").strip()
    source_kind = str(_first_present(row.get("source_kind"), inventory_source.get("source_kind")) or "").strip()
    return (
        source_role in {"resort_pdf", "supporting_price_image"}
        and source_type in {"pdf", "image"}
        and source_kind in {"official_pdf", "official_image"}
    )


def _field_metrics(candidates: list[dict[str, Any]]) -> dict[str, float]:
    total = len(candidates)
    counts: Counter[str] = Counter()
    for candidate in candidates:
        findings = _findings(candidate)
        location_id = str(candidate.get("normalized_location_id") or "").strip()
        if not _has_title(candidate):
            counts["title_missing"] += 1
        if "missing_required_field:location" in findings or not (
            str(candidate.get("location") or "").strip() or location_id
        ):
            counts["location_missing"] += 1
        if not location_id or location_id == "unknown":
            counts["location_unknown"] += 1
        if _schedule_missing(candidate, findings):
            counts["schedule_missing"] += 1
        if _schedule_unparsed(candidate, findings):
            counts["schedule_unparsed"] += 1
        if _fee_disagreement(candidate, findings):
            counts["fee_disagreement"] += 1
        if _engine_disagreement(candidate, findings):
            counts["engine_disagreement"] += 1
        if _description_low_confidence(candidate, findings):
            counts["description_low_confidence"] += 1
    return {
        "title_missing_rate": _rate(counts["title_missing"], total),
        "location_missing_rate": _rate(counts["location_missing"], total),
        "location_unknown_rate": _rate(counts["location_unknown"], total),
        "schedule_missing_rate": _rate(counts["schedule_missing"], total),
        "schedule_unparsed_rate": _rate(counts["schedule_unparsed"], total),
        "fee_disagreement_rate": _rate(counts["fee_disagreement"], total),
        "engine_disagreement_rate": _rate(counts["engine_disagreement"], total),
        "description_low_confidence_rate": _rate(counts["description_low_confidence"], total),
    }


def _source_metric_row(
    snapshot: dict[str, Any],
    candidates: list[dict[str, Any]],
    inventory_source: dict[str, Any] | None = None,
) -> dict[str, Any]:
    status_counts = _candidate_status_counts(candidates)
    inventory_source = inventory_source or {}
    return {
        "source_sha256": _source_hash(snapshot),
        "source_kind": _first_present(snapshot.get("source_kind"), inventory_source.get("source_kind")),
        "source_type": _first_present(snapshot.get("source_type"), inventory_source.get("source_type")),
        "canonical_url": _first_present(snapshot.get("canonical_url"), inventory_source.get("canonical_url")),
        "fetched_url": _first_present(snapshot.get("fetched_url"), inventory_source.get("fetched_url")),
        "storage_path": _first_present(snapshot.get("storage_path"), inventory_source.get("storage_path")),
        "calendar_group_key": _first_present(
            snapshot.get("calendar_group_key"),
            inventory_source.get("calendar_group_key"),
        ),
        "edition": _first_present(_edition(snapshot), _edition(inventory_source)),
        "mime_type": _first_present(snapshot.get("mime_type"), inventory_source.get("mime_type")),
        "http_content_type": _first_present(
            snapshot.get("http_content_type"),
            inventory_source.get("http_content_type"),
        ),
        "detected_content_type": _first_present(
            snapshot.get("detected_content_type"),
            inventory_source.get("detected_content_type"),
        ),
        "file_extension": _first_present(snapshot.get("file_extension"), inventory_source.get("file_extension")),
        "http_status": _first_present(snapshot.get("http_status"), inventory_source.get("http_status")),
        "page_count": _page_count(snapshot),
        "page_render_success": _page_render_success(snapshot),
        "ocr_success": _ocr_success(snapshot),
        "recognized_family": _recognized_family(snapshot),
        "region_count": _region_count(snapshot),
        "activity_candidate_count": sum(1 for candidate in candidates if not _is_movie_candidate(candidate)),
        "movie_candidate_count": sum(1 for candidate in candidates if _is_movie_candidate(candidate)),
        "auto_publishable_count": status_counts["auto_publishable"],
        "needs_review_count": status_counts["needs_review"],
        "rejected_count": status_counts["rejected"],
        "parser_error_count": 1 if snapshot.get("status") == "parser_error" else 0,
    }


def build_source_metrics_report(
    *,
    snapshots: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    source_inventory: list[dict[str, Any]] | None = None,
    preview: dict[str, Any] | None = None,
    quarter: str | None = None,
    v3_visual_only: bool = False,
) -> dict[str, Any]:
    snapshots = _filter_quarter(snapshots, quarter)
    candidates = _filter_quarter(candidates, quarter)
    source_inventory = _filter_quarter(source_inventory or [], quarter)
    inventory_by_hash = _source_inventory_by_hash(source_inventory)
    if v3_visual_only:
        snapshots = [
            snapshot
            for snapshot in snapshots
            if _is_v3_visual_source(snapshot, inventory_by_hash.get(_source_hash(snapshot), {}))
        ]
        scoped_hashes = {_source_hash(snapshot) for snapshot in snapshots if _source_hash(snapshot)}
        candidates = [
            candidate
            for candidate in candidates
            if _source_hash(candidate) in scoped_hashes or _is_v3_visual_source(candidate, inventory_by_hash.get(_source_hash(candidate), {}))
        ]
        source_inventory = [
            source
            for source in source_inventory
            if _source_hash(source) in scoped_hashes or _is_v3_visual_source(source)
        ]
        inventory_by_hash = _source_inventory_by_hash(source_inventory)
    candidates_by_source: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for candidate in candidates:
        source_hash = _source_hash(candidate)
        if source_hash:
            candidates_by_source[source_hash].append(candidate)

    sources = [
        _source_metric_row(
            snapshot,
            candidates_by_source.get(_source_hash(snapshot), []),
            inventory_by_hash.get(_source_hash(snapshot), {}),
        )
        for snapshot in sorted(snapshots, key=_source_hash)
        if _source_hash(snapshot)
    ]
    candidate_count = len(candidates)
    auto_publishable_count = sum(row["auto_publishable_count"] for row in sources)
    needs_review_count = sum(row["needs_review_count"] for row in sources)
    rejected_count = sum(row["rejected_count"] for row in sources)
    parser_error_count = sum(row["parser_error_count"] for row in sources)
    source_count = len(sources)
    return {
        "report_kind": "vision_v3_source_metrics",
        "schema_version": "vision_v3_source_metrics_001",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "quarter": quarter,
        "v3_preview_fingerprint": _dual_run_preview_fingerprint(preview) if isinstance(preview, dict) else None,
        "summary": {
            "source_count": source_count,
            "page_count": sum(row["page_count"] for row in sources),
            "activity_candidate_count": sum(row["activity_candidate_count"] for row in sources),
            "movie_candidate_count": sum(row["movie_candidate_count"] for row in sources),
            "candidate_count": candidate_count,
            "auto_publishable_count": auto_publishable_count,
            "needs_review_count": needs_review_count,
            "rejected_count": rejected_count,
            "parser_error_count": parser_error_count,
            "auto_publish_rate": _rate(auto_publishable_count, candidate_count),
            "manual_review_rate": _rate(needs_review_count, candidate_count),
            "rejected_rate": _rate(rejected_count, candidate_count),
            "parser_error_source_rate": _rate(parser_error_count, source_count),
            "field_metrics": _field_metrics(candidates),
        },
        "sources": sources,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build v3 per-source quality and candidate metrics")
    parser.add_argument("--snapshots", type=Path, default=DEFAULT_SNAPSHOTS_PATH)
    parser.add_argument("--candidates", type=Path, default=DEFAULT_CANDIDATES_PATH)
    parser.add_argument("--source-inventory", type=Path, default=DEFAULT_SOURCE_INVENTORY_PATH)
    parser.add_argument("--preview", type=Path, default=DEFAULT_PREVIEW_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--quarter")
    parser.add_argument("--v3-visual-only", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    report = build_source_metrics_report(
        snapshots=_json_objects(args.snapshots),
        candidates=_json_objects(args.candidates),
        source_inventory=_json_objects(args.source_inventory),
        preview=_json_dict(args.preview),
        quarter=args.quarter,
        v3_visual_only=args.v3_visual_only,
    )
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(args.output)


if __name__ == "__main__":
    main()
