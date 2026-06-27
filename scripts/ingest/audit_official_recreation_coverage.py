"""Audit official Disney recreation parent-list coverage."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from disney_recreation_offerings import (
        extract_official_recreation_offerings,
        official_recreation_index_item_program_key,
        official_recreation_index_item_resort_slugs,
    )
    from generate_official_recreation_offerings import load_snapshot_payloads
except ImportError:  # pragma: no cover
    from .disney_recreation_offerings import (
        extract_official_recreation_offerings,
        official_recreation_index_item_program_key,
        official_recreation_index_item_resort_slugs,
    )
    from .generate_official_recreation_offerings import load_snapshot_payloads


DEFAULT_INDEX = Path("data/raw/web/official-recreation-index-api.snapshot.json")
DEFAULT_OFFERINGS = Path("data/processed/official_recreation_offerings.json")
DEFAULT_SNAPSHOT_DIR = Path("data/raw/web")
DEFAULT_CLASSIFICATION = Path("data/quality/official_recreation_parent_classification.json")


@dataclass
class OfficialRecreationCoverageAudit:
    passed: bool
    errors: list[str]
    warnings: list[str]
    summary: dict[str, int]
    missing_items: list[dict[str, Any]]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def _parent_classification_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = _load_json(path)
    if not isinstance(payload, dict):
        return []
    items = payload.get("items")
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


def _covered_program_keys(extraction: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for collection_name in ("offerings", "quarantine"):
        collection = extraction.get(collection_name)
        if not isinstance(collection, list):
            continue
        for row in collection:
            if not isinstance(row, dict):
                continue
            key = row.get("program_key")
            if isinstance(key, str) and key.strip():
                keys.add(key)
    return keys


def _covered_program_resort_pairs(extraction: dict[str, Any]) -> set[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    offerings = extraction.get("offerings")
    if not isinstance(offerings, list):
        return pairs

    for row in offerings:
        if not isinstance(row, dict):
            continue
        program_key = row.get("program_key")
        resort_slug = row.get("resort_slug")
        if (
            isinstance(program_key, str)
            and program_key.strip()
            and isinstance(resort_slug, str)
            and resort_slug.strip()
        ):
            pairs.add((program_key, resort_slug))
    return pairs


def _quarantined_program_keys(extraction: dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    quarantine = extraction.get("quarantine")
    if not isinstance(quarantine, list):
        return keys

    for row in quarantine:
        if not isinstance(row, dict):
            continue
        key = row.get("program_key")
        if isinstance(key, str) and key.strip():
            keys.add(key)
    return keys


def _offering_rows_missing_resort_join(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    missing: list[dict[str, Any]] = []
    offerings = extraction.get("offerings")
    if not isinstance(offerings, list):
        return missing

    for row in offerings:
        if not isinstance(row, dict):
            continue
        resort_slug = row.get("resort_slug")
        provenance = row.get("field_provenance")
        resort_join = provenance.get("resort_join") if isinstance(provenance, dict) else None
        if (
            not isinstance(resort_slug, str)
            or not resort_slug.strip()
            or not isinstance(resort_join, list)
            or not resort_join
        ):
            missing.append(row)
    return missing


def _program_keys_without_joined_offerings(extraction: dict[str, Any]) -> set[str]:
    programs = extraction.get("programs")
    if not isinstance(programs, list):
        return set()
    offering_programs = _covered_program_keys({"offerings": extraction.get("offerings", [])})
    missing: set[str] = set()
    for row in programs:
        if not isinstance(row, dict):
            continue
        program_key = row.get("program_key")
        if (
            isinstance(program_key, str)
            and program_key.strip()
            and program_key not in offering_programs
        ):
            missing.add(program_key)
    return missing


def _offering_rows_with_unsourced_availability_labels(extraction: dict[str, Any]) -> list[dict[str, Any]]:
    missing: list[dict[str, Any]] = []
    offerings = extraction.get("offerings")
    if not isinstance(offerings, list):
        return missing

    for row in offerings:
        if not isinstance(row, dict):
            continue
        availability = row.get("availability")
        if not isinstance(availability, dict):
            continue
        label = str(availability.get("label") or "").strip()
        if not label:
            continue
        if availability.get("hours_state") == "source_unspecified":
            continue
        provenance = row.get("field_provenance")
        availability_spans = provenance.get("availability") if isinstance(provenance, dict) else None
        if not isinstance(availability_spans, list) or not availability_spans:
            missing.append(row)
    return missing


def _has_provenance(row: dict[str, Any], field: str) -> bool:
    provenance = row.get("field_provenance")
    spans = provenance.get(field) if isinstance(provenance, dict) else None
    return isinstance(spans, list) and bool(spans)


def _has_specific_price(row: dict[str, Any]) -> bool:
    price = row.get("price")
    if not isinstance(price, dict):
        return False
    if price.get("state") in {"fee", "free"}:
        return True
    for key in ("notes", "amountCents", "amount_cents", "options"):
        value = price.get(key)
        if isinstance(value, list):
            if value:
                return True
            continue
        if value not in {None, ""}:
            return True
    return False


def _has_specific_booking(row: dict[str, Any]) -> bool:
    booking = row.get("booking")
    if not isinstance(booking, dict):
        return False
    return any(value not in {None, False, ""} for value in booking.values())


def _has_specific_eligibility(row: dict[str, Any]) -> bool:
    eligibility = row.get("eligibility")
    if not isinstance(eligibility, dict):
        return False
    return any(
      key != "ages" and value not in {None, False, ""}
        for key, value in eligibility.items()
    )


def _has_specific_amenities(row: dict[str, Any]) -> bool:
    amenities = row.get("amenities")
    return isinstance(amenities, list) and bool(amenities)


def _has_specific_location(row: dict[str, Any]) -> bool:
    location = row.get("location")
    if not isinstance(location, dict):
        return False
    label = str(location.get("label") or "").strip()
    title = str(row.get("title") or "").strip()
    return bool(label and label != title)


def _offering_rows_with_unsourced_specific_fields(extraction: dict[str, Any]) -> list[tuple[dict[str, Any], str]]:
    missing: list[tuple[dict[str, Any], str]] = []
    offerings = extraction.get("offerings")
    if not isinstance(offerings, list):
        return missing

    checks = [
        ("price", _has_specific_price),
        ("booking", _has_specific_booking),
        ("eligibility", _has_specific_eligibility),
        ("amenities", _has_specific_amenities),
        ("location", _has_specific_location),
    ]
    for row in offerings:
        if not isinstance(row, dict):
            continue
        for field, predicate in checks:
            if predicate(row) and not _has_provenance(row, field):
                missing.append((row, field))
    return missing


def _joinable_parent_items(index_snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    results = index_snapshot.get("results")
    if not isinstance(results, list):
        return []

    items: list[dict[str, Any]] = []
    for index, item in enumerate(results):
        if not isinstance(item, dict):
            continue
        resort_slugs, unresolved = official_recreation_index_item_resort_slugs(item)
        if not resort_slugs:
            continue
        items.append(
            {
                "index": index,
                "program_key": official_recreation_index_item_program_key(item),
                "name": item.get("name"),
                "urlFriendlyId": item.get("urlFriendlyId"),
                "resort_slugs": resort_slugs,
                "unresolved_locations": unresolved,
            }
        )
    return items


def _parent_detail_url(item: dict[str, Any], fallback_url: str) -> str | None:
    web_links = item.get("webLinks")
    if isinstance(web_links, dict):
        detail = web_links.get("wdwDetail")
        if isinstance(detail, dict):
            href = str(detail.get("href") or "").strip()
            if href:
                return href.replace("http://", "https://")

    url = str(item.get("url") or "").strip()
    if not url:
        return None
    if url.startswith("/"):
        return f"https://disneyworld.disney.go.com{url}"
    if url == fallback_url:
        return None
    return url.replace("http://", "https://")


def _parent_item_requires_detail_snapshot(item: dict[str, Any]) -> bool:
    if item.get("locationName") == "Multiple Locations":
        return True
    locations_list = item.get("locationsList")
    if isinstance(locations_list, dict) and len(locations_list) > 1:
        return True
    park_ids = item.get("parkIds")
    return isinstance(park_ids, list) and len(park_ids) > 1


def _required_parent_detail_snapshots(index_snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    results = index_snapshot.get("results")
    if not isinstance(results, list):
        return []

    source_url = str(index_snapshot.get("source_url") or "https://disneyworld.disney.go.com/recreation/")
    required: list[dict[str, Any]] = []
    for index, item in enumerate(results):
        if not isinstance(item, dict) or not _parent_item_requires_detail_snapshot(item):
            continue
        detail_url = _parent_detail_url(item, source_url)
        if not detail_url:
            continue
        required.append(
            {
                "index": index,
                "program_key": official_recreation_index_item_program_key(item),
                "name": item.get("name"),
                "detail_url": detail_url,
            }
        )
    return required


def _joinable_downstream_items(snapshot_dir: Path) -> list[dict[str, Any]]:
    if not snapshot_dir.exists():
        return []

    items: list[dict[str, Any]] = []
    for payload in load_snapshot_payloads(snapshot_dir):
        if payload.get("source_kind") not in {
            "official_recreation_detail",
            "official_recreation_resort_page",
        }:
            continue
        extraction = extract_official_recreation_offerings(payload)
        grouped: dict[str, dict[str, Any]] = {}
        for offering in extraction.get("offerings", []):
            if not isinstance(offering, dict):
                continue
            program_key = offering.get("program_key")
            resort_slug = offering.get("resort_slug")
            if not isinstance(program_key, str) or not program_key.strip():
                continue
            if not isinstance(resort_slug, str) or not resort_slug.strip():
                continue
            grouped.setdefault(
                program_key,
                {
                    "program_key": program_key,
                    "name": offering.get("title"),
                    "source_kind": payload.get("source_kind"),
                    "source_url": payload.get("source_url"),
                    "source_path": payload.get("source_path"),
                    "resort_slugs": [],
                },
            )
            if resort_slug not in grouped[program_key]["resort_slugs"]:
                grouped[program_key]["resort_slugs"].append(resort_slug)
        items.extend(grouped.values())
    return items


def build_official_recreation_coverage_audit(
    index_snapshot_path: Path = DEFAULT_INDEX,
    offerings_path: Path = DEFAULT_OFFERINGS,
    snapshot_dir: Path = DEFAULT_SNAPSHOT_DIR,
    classification_path: Path = DEFAULT_CLASSIFICATION,
) -> OfficialRecreationCoverageAudit:
    errors: list[str] = []
    warnings: list[str] = []
    missing_items: list[dict[str, Any]] = []

    if not index_snapshot_path.exists():
        return OfficialRecreationCoverageAudit(
            passed=False,
            errors=[f"official_recreation:index_snapshot_missing:{index_snapshot_path}"],
            warnings=[],
            summary={
                "parent_items": 0,
                "joinable_parent_items": 0,
                "covered_joinable_items": 0,
                "missing_joinable_items": 0,
            },
            missing_items=[],
        )

    if not offerings_path.exists():
        return OfficialRecreationCoverageAudit(
            passed=False,
            errors=[f"official_recreation:offerings_missing:{offerings_path}"],
            warnings=[],
            summary={
                "parent_items": 0,
                "joinable_parent_items": 0,
                "covered_joinable_items": 0,
                "missing_joinable_items": 0,
            },
            missing_items=[],
        )

    index_snapshot = _load_json(index_snapshot_path)
    extraction = _load_json(offerings_path)
    classification_rows = _parent_classification_rows(classification_path)
    classified_program_keys = {
        str(row.get("program_key") or "").strip()
        for row in classification_rows
        if str(row.get("program_key") or "").strip()
    }
    manual_classifications = [
        row
        for row in classification_rows
        if row.get("classification") == "requires_manual_classification"
    ]
    results = index_snapshot.get("results") if isinstance(index_snapshot, dict) else None
    if not isinstance(results, list) or not results:
        errors.append("official_recreation:index_results_missing")
        results = []

    joinable = _joinable_parent_items(index_snapshot if isinstance(index_snapshot, dict) else {})
    downstream_joinable = _joinable_downstream_items(snapshot_dir)
    extraction_dict = extraction if isinstance(extraction, dict) else {}
    covered = _covered_program_keys(extraction_dict)
    covered_pairs = _covered_program_resort_pairs(extraction_dict)
    quarantined_programs = _quarantined_program_keys(extraction_dict)
    missing_resort_join_rows = _offering_rows_missing_resort_join(extraction_dict)
    unsourced_availability_rows = _offering_rows_with_unsourced_availability_labels(extraction_dict)
    unsourced_specific_field_rows = _offering_rows_with_unsourced_specific_fields(extraction_dict)
    programs_without_joined_offerings = _program_keys_without_joined_offerings(extraction_dict)
    captured_detail_urls = {
        str(payload.get("source_url") or "")
        for payload in load_snapshot_payloads(snapshot_dir)
        if payload.get("source_kind") == "official_recreation_detail"
    }

    parent_program_keys = {
        official_recreation_index_item_program_key(item)
        for item in results
        if isinstance(item, dict)
    }
    missing_classifications = sorted(parent_program_keys - classified_program_keys)
    extra_classifications = sorted(classified_program_keys - parent_program_keys)
    for program_key in missing_classifications:
        errors.append(f"official_recreation:parent_item_missing_classification:{program_key}")
    for row in manual_classifications:
        errors.append(
            "official_recreation:classification_requires_manual_review:"
            + str(row.get("program_key") or "<missing>")
        )

    for row in missing_resort_join_rows:
        key = row.get("offering_key") or row.get("program_key") or "<missing>"
        errors.append(f"official_recreation:offering_missing_resort_join:{key}")

    for row in unsourced_availability_rows:
        key = row.get("offering_key") or row.get("program_key") or "<missing>"
        errors.append(f"official_recreation:availability_label_missing_source_span:{key}")

    for row, field in unsourced_specific_field_rows:
        key = row.get("offering_key") or row.get("program_key") or "<missing>"
        errors.append(f"official_recreation:{field}_missing_source_span:{key}")

    for program_key in sorted(programs_without_joined_offerings):
        if program_key in quarantined_programs:
            continue
        errors.append(f"official_recreation:program_without_joined_offering:{program_key}")

    for item in _required_parent_detail_snapshots(index_snapshot if isinstance(index_snapshot, dict) else {}):
        if item["detail_url"] in captured_detail_urls:
            continue
        errors.append(
            f"official_recreation:missing_detail_snapshot:{item['program_key']}:{item['detail_url']}"
        )
        missing_items.append({**item, "reason_code": "missing_detail_snapshot"})

    for item in joinable:
        program_key = item["program_key"]
        if program_key in quarantined_programs:
            continue
        missing_resort_slugs = [
            resort_slug
            for resort_slug in item["resort_slugs"]
            if (program_key, resort_slug) not in covered_pairs
        ]
        if not missing_resort_slugs:
            continue

        missing_item = {**item, "missing_resort_slugs": missing_resort_slugs}
        missing_items.append(missing_item)
        if program_key not in covered:
            errors.append(f"official_recreation:missing_joinable:{program_key}")
        errors.extend(
            f"official_recreation:missing_joinable:{program_key}:{resort_slug}"
            for resort_slug in missing_resort_slugs
        )

    for item in downstream_joinable:
        program_key = item["program_key"]
        if program_key in quarantined_programs:
            continue
        missing_resort_slugs = [
            resort_slug
            for resort_slug in item["resort_slugs"]
            if (program_key, resort_slug) not in covered_pairs
        ]
        if not missing_resort_slugs:
            continue

        missing_item = {**item, "missing_resort_slugs": missing_resort_slugs}
        missing_items.append(missing_item)
        if program_key not in covered:
            errors.append(f"official_recreation:missing_detail_joinable:{program_key}")
        errors.extend(
            f"official_recreation:missing_detail_joinable:{program_key}:{resort_slug}"
            for resort_slug in missing_resort_slugs
        )

    downstream_source_kinds = {"official_recreation_detail", "official_recreation_resort_page"}
    parent_missing_items = [
        item for item in missing_items if item.get("source_kind") not in downstream_source_kinds
    ]
    downstream_missing_items = [
        item for item in missing_items if item.get("source_kind") in downstream_source_kinds
    ]
    downstream_sources = {
        str(item.get("source_path") or item.get("source_url") or item.get("program_key"))
        for item in downstream_joinable
    }

    summary = {
        "parent_items": len(results),
        "joinable_parent_items": len(joinable),
        "covered_joinable_items": len(joinable) - len(parent_missing_items),
        "missing_joinable_items": len(parent_missing_items),
        "joinable_parent_resort_pairs": sum(len(item["resort_slugs"]) for item in joinable),
        "covered_joinable_parent_resort_pairs": sum(
            1
            for item in joinable
            for resort_slug in item["resort_slugs"]
            if item["program_key"] in quarantined_programs
            or (item["program_key"], resort_slug) in covered_pairs
        ),
        "missing_joinable_parent_resort_pairs": sum(
            len(item.get("missing_resort_slugs", [])) for item in parent_missing_items
        ),
        "downstream_sources": len(downstream_sources),
        "joinable_downstream_items": len(downstream_joinable),
        "covered_joinable_downstream_items": sum(
            1
            for item in downstream_joinable
            if all(
                item["program_key"] in quarantined_programs
                or (item["program_key"], resort_slug) in covered_pairs
                for resort_slug in item["resort_slugs"]
            )
        ),
        "missing_joinable_downstream_items": len(downstream_missing_items),
        "joinable_downstream_resort_pairs": sum(len(item["resort_slugs"]) for item in downstream_joinable),
        "covered_joinable_downstream_resort_pairs": sum(
            1
            for item in downstream_joinable
            for resort_slug in item["resort_slugs"]
            if item["program_key"] in quarantined_programs
            or (item["program_key"], resort_slug) in covered_pairs
        ),
        "missing_joinable_downstream_resort_pairs": sum(
            1
            for item in downstream_joinable
            for resort_slug in item["resort_slugs"]
            if item["program_key"] not in quarantined_programs
            and (item["program_key"], resort_slug) not in covered_pairs
        ),
        "published_offerings_missing_resort_join": len(missing_resort_join_rows),
        "published_offerings_unsourced_availability_labels": len(unsourced_availability_rows),
        "published_offerings_unsourced_specific_fields": len(unsourced_specific_field_rows),
        "programs_without_joined_offerings": len(programs_without_joined_offerings),
        "classified_parent_items": len(classification_rows),
        "classified_parent_program_keys": len(classified_program_keys),
        "missing_parent_classifications": len(missing_classifications),
        "extra_parent_classifications": len(extra_classifications),
        "manual_parent_classifications": len(manual_classifications),
    }
    return OfficialRecreationCoverageAudit(
        passed=not errors,
        errors=errors,
        warnings=warnings,
        summary=summary,
        missing_items=missing_items,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit official recreation parent-list coverage")
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX)
    parser.add_argument("--offerings", type=Path, default=DEFAULT_OFFERINGS)
    parser.add_argument("--classification", type=Path, default=DEFAULT_CLASSIFICATION)
    parser.add_argument("--json", action="store_true", help="Print machine-readable audit JSON")
    args = parser.parse_args()

    audit = build_official_recreation_coverage_audit(
        args.index,
        args.offerings,
        classification_path=args.classification,
    )
    print(
        json.dumps(
            {
                "passed": audit.passed,
                "errors": audit.errors,
                "warnings": audit.warnings,
                "summary": audit.summary,
                "missing_items": audit.missing_items,
            },
            indent=2,
        )
    )
    if not audit.passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
