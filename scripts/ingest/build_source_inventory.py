"""Build a complete source inventory for Disney recreation data."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from capture_web_snapshot import write_web_snapshot
    from capture_official_recreation_index import (
        DEFAULT_OUTPUT as DEFAULT_INDEX_SNAPSHOT,
        build_official_recreation_index_snapshot,
        write_official_recreation_index_snapshot,
    )
    from config import RAW_DIR, PROCESSED_DIR
    from disney_recreation_offerings import (
        _index_detail_url,
        official_recreation_index_item_program_key,
    )
    from source_manifest import RESORT_RECREATION_SOURCES
    from web_snapshot import web_snapshot_content_hash
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .capture_web_snapshot import write_web_snapshot
    from .capture_official_recreation_index import (
        DEFAULT_OUTPUT as DEFAULT_INDEX_SNAPSHOT,
        build_official_recreation_index_snapshot,
        write_official_recreation_index_snapshot,
    )
    from .config import RAW_DIR, PROCESSED_DIR
    from .disney_recreation_offerings import (
        _index_detail_url,
        official_recreation_index_item_program_key,
    )
    from .source_manifest import RESORT_RECREATION_SOURCES
    from .web_snapshot import web_snapshot_content_hash


DEFAULT_OUTPUT = PROCESSED_DIR / "source_inventory.json"
MAIN_RECREATION_URL = "https://disneyworld.disney.go.com/recreation/"
PARSER_VERSION = "source-inventory-v1"
DISNEY_VISUAL_PRICE_EVIDENCE_PATH = Path("data/quality/disney_visual_price_evidence.json")
COMMUNITY_HALL_FACTS_PATH = Path("data/quality/community_hall_official_facts.json")
GOLF_OFFICIAL_FACTS_PATH = Path("data/quality/golf_official_facts.json")
EXTRA_OFFICIAL_DETAIL_SOURCES = [
    {
        "canonical_url": "https://disneyworld.disney.go.com/entertainment/magic-kingdom/electrical-water-pageant/",
        "program_key": "electrical-water-pageant",
        "notes": "Dedicated Disney entertainment detail page used for Electrical Water Pageant viewing locations, time range, and no posted fee language.",
    },
    {
        "canonical_url": "https://disneyworld.disney.go.com/events-tours/cabins-at-fort-wilderness-resort/wilderness-back-trail-adventure/",
        "program_key": "wilderness-back-trail-adventure",
        "notes": "Dedicated Disney events/tours detail page used for Wilderness Back Trail Adventure price, booking, restrictions, and location.",
    }
]


def _source_id(source_role: str, canonical_url: str) -> str:
    return hashlib.sha256(f"{source_role}:{canonical_url}".encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _pdf_local_path(pdf_url: str) -> Path:
    return RAW_DIR / pdf_url.rsplit("/", 1)[-1]


def _web_snapshot_path_for_url(url: str) -> Path | None:
    raw_web = Path("data/raw/web")
    if not raw_web.exists():
        return None
    for path in sorted(raw_web.glob("*.snapshot.json")):
        try:
            snapshot = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if snapshot.get("source_url") == url or snapshot.get("url") == url:
            return path
    return None


def _web_snapshot_hash(path: Path | None) -> str | None:
    if path is None or not path.exists():
        return None
    try:
        snapshot = json.loads(path.read_text())
    except json.JSONDecodeError:
        return None
    if isinstance(snapshot.get("content_sha256"), str):
        return snapshot["content_sha256"]
    return web_snapshot_content_hash(snapshot)


def _record(
    *,
    source_role: str,
    source_kind: str,
    canonical_url: str,
    fetched_url: str | None = None,
    http_status: int | None = None,
    content_sha256: str | None = None,
    calendar_group_key: str | None = None,
    resort_slug: str | None = None,
    program_key: str | None = None,
    parent_source_id: str | None = None,
    discovered_from_url: str | None = None,
    storage_path: str | None = None,
    parent_content_sha256: str | None = None,
    discovered_from_storage_path: str | None = None,
    discovered_pdf_url_evidence: dict[str, Any] | None = None,
    currentness: str = "unknown",
    notes: str | None = None,
) -> dict[str, Any]:
    return {
        "source_id": _source_id(source_role, canonical_url),
        "source_role": source_role,
        "source_kind": source_kind,
        "canonical_url": canonical_url,
        "fetched_url": fetched_url or canonical_url,
        "http_status": http_status,
        "content_sha256": content_sha256,
        "captured_at": _now(),
        "calendar_group_key": calendar_group_key,
        "resort_slug": resort_slug,
        "program_key": program_key,
        "parent_source_id": parent_source_id,
        "discovered_from_url": discovered_from_url,
        "storage_path": storage_path,
        "parent_content_sha256": parent_content_sha256,
        "discovered_from_storage_path": discovered_from_storage_path,
        "discovered_pdf_url_evidence": discovered_pdf_url_evidence,
        "parser_version": PARSER_VERSION,
        "currentness": currentness,
        "notes": notes,
    }


def _load_index_snapshot(*, live: bool) -> dict[str, Any]:
    if live:
        snapshot = build_official_recreation_index_snapshot(datetime.now(timezone.utc).date())
        DEFAULT_INDEX_SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        DEFAULT_INDEX_SNAPSHOT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
        return snapshot
    if DEFAULT_INDEX_SNAPSHOT.exists():
        return json.loads(DEFAULT_INDEX_SNAPSHOT.read_text())
    write_official_recreation_index_snapshot(DEFAULT_INDEX_SNAPSHOT)
    return json.loads(DEFAULT_INDEX_SNAPSHOT.read_text())


def _supporting_price_image_records() -> list[dict[str, Any]]:
    if not DISNEY_VISUAL_PRICE_EVIDENCE_PATH.exists():
        return []
    payload = json.loads(DISNEY_VISUAL_PRICE_EVIDENCE_PATH.read_text())
    sources = payload.get("sources") if isinstance(payload, dict) else []
    if not isinstance(sources, list):
        return []
    rows: list[dict[str, Any]] = []
    for source in sources:
        if not isinstance(source, dict):
            continue
        canonical_url = str(source.get("canonical_url") or "")
        content_sha256 = str(source.get("content_sha256") or "")
        storage_path = str(source.get("storage_path") or "")
        if not canonical_url or not content_sha256:
            continue
        rows.append(
            _record(
                source_role="supporting_price_image",
                source_kind=str(source.get("source_kind") or "official_image"),
                canonical_url=canonical_url,
                http_status=200 if storage_path and Path(storage_path).exists() else None,
                content_sha256=content_sha256,
                calendar_group_key=source.get("calendar_group_key"),
                resort_slug=source.get("resort_slug"),
                storage_path=storage_path or None,
                currentness="current" if storage_path and Path(storage_path).exists() else "unknown",
                notes=source.get("notes"),
            )
        )
    return rows


def _community_hall_fact_hash(fact: dict[str, Any]) -> str:
    payload = {
        "source_url": fact.get("source_url"),
        "resort_slug": fact.get("resort_slug"),
        "description": fact.get("description"),
        "availability": fact.get("availability"),
        "amenities": fact.get("amenities"),
        "evidence_lines": fact.get("evidence_lines"),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _golf_fact_hash(fact: dict[str, Any]) -> str:
    payload = {
        "program_key": fact.get("program_key"),
        "title": fact.get("title"),
        "source_url": fact.get("source_url"),
        "price_source_url": fact.get("price_source_url"),
        "resort_slugs": fact.get("resort_slugs"),
        "variant_key": fact.get("variant_key"),
        "location_label": fact.get("location_label"),
        "description": fact.get("description"),
        "availability": fact.get("availability"),
        "price": fact.get("price"),
        "booking": fact.get("booking"),
        "amenities": fact.get("amenities"),
        "evidence_lines": fact.get("evidence_lines"),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _community_hall_fact_records() -> list[dict[str, Any]]:
    if not COMMUNITY_HALL_FACTS_PATH.exists():
        return []
    payload = json.loads(COMMUNITY_HALL_FACTS_PATH.read_text())
    facts = payload.get("facts") if isinstance(payload, dict) else []
    if not isinstance(facts, list):
        return []
    rows: list[dict[str, Any]] = []
    for fact in facts:
        if not isinstance(fact, dict):
            continue
        source_url = str(fact.get("source_url") or "")
        if not source_url:
            continue
        rows.append(
            _record(
                source_role="community_hall_official_fact",
                source_kind="official_manual_extract",
                canonical_url=source_url,
                http_status=200,
                content_sha256=_community_hall_fact_hash(fact),
                resort_slug=fact.get("resort_slug"),
                program_key="community-halls",
                storage_path=str(COMMUNITY_HALL_FACTS_PATH),
                currentness="current",
                notes="Manual structured extract from official Disney resort recreation page details because the current SPA HTML snapshot does not expose rendered Community Hall text.",
            )
        )
    return rows


def _golf_official_fact_records() -> list[dict[str, Any]]:
    if not GOLF_OFFICIAL_FACTS_PATH.exists():
        return []
    payload = json.loads(GOLF_OFFICIAL_FACTS_PATH.read_text())
    facts = payload.get("facts") if isinstance(payload, dict) else []
    if not isinstance(facts, list):
        return []
    rows: list[dict[str, Any]] = []
    for fact in facts:
        if not isinstance(fact, dict):
            continue
        source_url = str(fact.get("source_url") or "")
        if not source_url:
            continue
        resort_slugs = [
            str(slug)
            for slug in fact.get("resort_slugs") or []
            if str(slug).strip()
        ]
        rows.append(
            _record(
                source_role="golf_official_fact",
                source_kind="official_manual_extract",
                canonical_url=source_url,
                http_status=200,
                content_sha256=_golf_fact_hash(fact),
                resort_slug=resort_slugs[0] if resort_slugs else None,
                program_key=fact.get("program_key"),
                storage_path=str(GOLF_OFFICIAL_FACTS_PATH),
                currentness="current",
                notes=(
                    "Manual structured extract from official Disney and Golf WDW pages used to preserve "
                    "dynamic golf pricing, mini-golf exact prices, and resort-area joins. "
                    f"Price source: {fact.get('price_source_url') or source_url}"
                ),
            )
        )
    return rows


def _safe_snapshot_name(source_role: str, url: str) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")[:96]
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    return RAW_DIR.parent / "web" / f"{source_role}-{slug}-{digest}.snapshot.json"


def _refresh_or_find_web_snapshot(url: str, *, source_kind: str, refresh: bool) -> tuple[Path | None, dict[str, Any] | None]:
    if refresh:
        output_path = _safe_snapshot_name(source_kind, url)
        written = write_web_snapshot(url, output_path, source_kind=source_kind)
        if isinstance(written, dict):
            snapshot = written
            output_path.parent.mkdir(parents=True, exist_ok=True)
            snapshot.setdefault("source_url", url)
            snapshot.setdefault("source_kind", source_kind)
            snapshot.setdefault("content_sha256", web_snapshot_content_hash(snapshot))
            output_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
            return output_path, snapshot
        path = Path(written)
        try:
            return path, json.loads(path.read_text())
        except json.JSONDecodeError:
            return path, None
    path = _web_snapshot_path_for_url(url)
    if not path:
        return None, None
    try:
        return path, json.loads(path.read_text())
    except json.JSONDecodeError:
        return path, None


def _snapshot_hash(snapshot_path: Path | None, snapshot: dict[str, Any] | None) -> str | None:
    if isinstance(snapshot, dict):
        if isinstance(snapshot.get("content_sha256"), str):
            return snapshot["content_sha256"]
        return web_snapshot_content_hash(snapshot)
    return _web_snapshot_hash(snapshot_path)


def _parent_detail_records(index_snapshot: dict[str, Any], parent_source_id: str, *, refresh_web_snapshots: bool = False) -> list[dict[str, Any]]:
    results = index_snapshot.get("results")
    if not isinstance(results, list):
        return []

    rows: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    for item in results:
        if not isinstance(item, dict):
            continue
        detail_url = _index_detail_url(item, MAIN_RECREATION_URL)
        if not detail_url or detail_url == MAIN_RECREATION_URL or detail_url in seen_urls:
            continue
        seen_urls.add(detail_url)
        snapshot_path, snapshot = _refresh_or_find_web_snapshot(
            detail_url,
            source_kind="official_html",
            refresh=refresh_web_snapshots,
        )
        rows.append(
            _record(
                source_role="parent_activity_detail",
                source_kind="official_html",
                canonical_url=detail_url,
                http_status=200 if snapshot_path else None,
                content_sha256=_snapshot_hash(snapshot_path, snapshot),
                program_key=official_recreation_index_item_program_key(item),
                parent_source_id=parent_source_id,
                discovered_from_url=MAIN_RECREATION_URL,
                storage_path=str(snapshot_path) if snapshot_path else None,
                currentness="current" if snapshot_path else "unknown",
            )
        )
    return rows


def _extra_official_detail_records(parent_source_id: str, *, refresh_web_snapshots: bool = False) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for source in EXTRA_OFFICIAL_DETAIL_SOURCES:
        detail_url = str(source.get("canonical_url") or "")
        if not detail_url:
            continue
        snapshot_path, snapshot = _refresh_or_find_web_snapshot(
            detail_url,
            source_kind="official_html",
            refresh=refresh_web_snapshots,
        )
        rows.append(
            _record(
                source_role="parent_activity_detail",
                source_kind="official_html",
                canonical_url=detail_url,
                http_status=200 if snapshot_path else None,
                content_sha256=_snapshot_hash(snapshot_path, snapshot),
                program_key=source.get("program_key"),
                parent_source_id=parent_source_id,
                discovered_from_url=MAIN_RECREATION_URL,
                storage_path=str(snapshot_path) if snapshot_path else None,
                currentness="current" if snapshot_path else "unknown",
                notes=source.get("notes"),
            )
        )
    return rows


def build_source_inventory(*, live: bool = False, refresh_web_snapshots: bool = False) -> list[dict[str, Any]]:
    index_snapshot = _load_index_snapshot(live=live)
    index_row = _record(
        source_role="main_recreation_index",
        source_kind="official_api",
        canonical_url=MAIN_RECREATION_URL,
        fetched_url=str(index_snapshot.get("api_url") or MAIN_RECREATION_URL),
        http_status=200,
        content_sha256=str(index_snapshot.get("content_sha256") or ""),
        storage_path=str(DEFAULT_INDEX_SNAPSHOT),
        currentness="current",
    )

    rows: list[dict[str, Any]] = [index_row]
    rows.extend(_supporting_price_image_records())
    rows.extend(_community_hall_fact_records())
    rows.extend(_golf_official_fact_records())
    rows.extend(
        _parent_detail_records(
            index_snapshot,
            index_row["source_id"],
            refresh_web_snapshots=refresh_web_snapshots,
        )
    )
    rows.extend(
        _extra_official_detail_records(
            index_row["source_id"],
            refresh_web_snapshots=refresh_web_snapshots,
        )
    )

    resort_page_ids_by_url: dict[str, str] = {}
    resort_page_rows_by_url: dict[str, dict[str, Any]] = {}
    for source in RESORT_RECREATION_SOURCES:
        snapshot_path, snapshot = _refresh_or_find_web_snapshot(
            source.recreation_page_url,
            source_kind="official_html",
            refresh=refresh_web_snapshots,
        )
        if source.recreation_page_url not in resort_page_ids_by_url:
            page_hash = _snapshot_hash(snapshot_path, snapshot)
            page_row = _record(
                source_role="resort_recreation_page",
                source_kind="official_html",
                canonical_url=source.recreation_page_url,
                http_status=200 if snapshot_path else None,
                content_sha256=page_hash,
                calendar_group_key=source.calendar_group_key,
                resort_slug=source.resort_slug,
                parent_source_id=index_row["source_id"],
                discovered_from_url=MAIN_RECREATION_URL,
                storage_path=str(snapshot_path) if snapshot_path else None,
                currentness="current" if snapshot_path else "unknown",
                notes=source.notes,
            )
            rows.append(page_row)
            resort_page_ids_by_url[source.recreation_page_url] = page_row["source_id"]
            resort_page_rows_by_url[source.recreation_page_url] = page_row

        if source.pdf_url:
            local_path = _pdf_local_path(source.pdf_url)
            parent_row = resort_page_rows_by_url.get(source.recreation_page_url, {})
            rows.append(
                _record(
                    source_role="resort_pdf",
                    source_kind="official_pdf",
                    canonical_url=source.pdf_url,
                    http_status=200 if local_path.exists() else None,
                    content_sha256=_sha256(local_path),
                    calendar_group_key=source.calendar_group_key,
                    resort_slug=source.resort_slug,
                    parent_source_id=resort_page_ids_by_url[source.recreation_page_url],
                    discovered_from_url=source.recreation_page_url,
                    storage_path=str(local_path) if local_path.exists() else None,
                    parent_content_sha256=parent_row.get("content_sha256"),
                    discovered_from_storage_path=parent_row.get("storage_path"),
                    discovered_pdf_url_evidence={
                        "parent_url": source.recreation_page_url,
                        "pdf_url": source.pdf_url,
                        "source_note": source.notes,
                    },
                    currentness="current" if local_path.exists() else "unknown",
                    notes=source.pdf_edition,
                )
            )

    deduped: dict[tuple[str, str, str | None], dict[str, Any]] = {}
    for row in rows:
        key = (row["source_role"], row["canonical_url"], row.get("resort_slug") if row["source_role"] == "resort_pdf" else None)
        deduped.setdefault(key, row)
    return list(deduped.values())


def write_source_inventory(output: Path = DEFAULT_OUTPUT, *, live: bool = False, refresh_web_snapshots: bool = False) -> Path:
    rows = build_source_inventory(live=live, refresh_web_snapshots=refresh_web_snapshots)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Disney activity source inventory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--live", action="store_true", help="refresh the official recreation index from Disney")
    parser.add_argument(
        "--refresh-web-snapshots",
        action="store_true",
        help="fetch and save current official HTML parent/detail page snapshots",
    )
    args = parser.parse_args()

    output = write_source_inventory(args.output, live=args.live, refresh_web_snapshots=args.refresh_web_snapshots)
    rows = json.loads(output.read_text())
    roles: dict[str, int] = {}
    for row in rows:
        roles[row["source_role"]] = roles.get(row["source_role"], 0) + 1
    print(json.dumps({"output": str(output), "sources": len(rows), "roles": roles}, indent=2))


if __name__ == "__main__":
    main()
