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


@dataclass
class OfficialRecreationCoverageAudit:
    passed: bool
    errors: list[str]
    warnings: list[str]
    summary: dict[str, int]
    missing_items: list[dict[str, Any]]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text())


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
    captured_detail_urls = {
        str(payload.get("source_url") or "")
        for payload in load_snapshot_payloads(snapshot_dir)
        if payload.get("source_kind") == "official_recreation_detail"
    }

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
    args = parser.parse_args()

    audit = build_official_recreation_coverage_audit(args.index, args.offerings)
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
