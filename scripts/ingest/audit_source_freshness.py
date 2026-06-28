"""Audit whether current published sources still match the source inventory."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from capture_official_recreation_index import build_official_recreation_index_snapshot
    from capture_web_snapshot import build_web_snapshot
    from build_source_inventory import DEFAULT_OUTPUT as DEFAULT_INVENTORY_PATH
    from config import DISNEY_USER_AGENT, PROCESSED_DIR
    from web_snapshot import web_snapshot_content_hash
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .capture_official_recreation_index import build_official_recreation_index_snapshot
    from .capture_web_snapshot import build_web_snapshot
    from .build_source_inventory import DEFAULT_OUTPUT as DEFAULT_INVENTORY_PATH
    from .config import DISNEY_USER_AGENT, PROCESSED_DIR
    from .web_snapshot import web_snapshot_content_hash


DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_OFFICIAL_OFFERINGS_PATH = PROCESSED_DIR / "official_recreation_offerings.json"
DEFAULT_OUTPUT = PROCESSED_DIR / "source_freshness_report.json"

BLOCKING_CURRENTNESS_STATES = {
    "url_changed",
    "hash_changed",
    "missing_from_parent",
    "unreachable",
    "expired",
}

FRESHNESS_STATES = {
    "current": "Live URL and content hash match the cached/published source.",
    "url_changed": "Live parent page links a different PDF or detail URL.",
    "hash_changed": "Live URL is the same but content hash changed.",
    "missing_from_parent": "Expected source is no longer discoverable from parent page.",
    "unreachable": "Live request failed or returned non-200.",
    "unchecked": "Source has not been checked in this run.",
    "expired": "Reviewed source is outside its visible validity window.",
    "unknown": "Source inventory does not yet have enough evidence to judge freshness.",
}

STALE_RESORT_SOURCE_RE = (
    r"(?:/fy26-q[12]/|_DRAFT|Recreation[-_](?:0126|0326)|"
    r"(?:0126|0326)(?:_DIGITAL)?\.(?:pdf|jpe?g|png)\b)"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _source_urls_from_gold(path: Path = DEFAULT_GOLD_PATH) -> set[str]:
    rows = _read_json(path, [])
    urls: set[str] = set()
    if not isinstance(rows, list):
        return urls
    for row in rows:
        if not isinstance(row, dict):
            continue
        for value in (
            row.get("source_url"),
            (row.get("source") or {}).get("url") if isinstance(row.get("source"), dict) else None,
        ):
            if isinstance(value, str) and value.strip():
                urls.add(value.strip())
    return urls


def _source_urls_from_official_offerings(path: Path = DEFAULT_OFFICIAL_OFFERINGS_PATH) -> set[str]:
    payload = _read_json(path, {})
    urls: set[str] = set()
    if not isinstance(payload, dict):
        return urls
    for collection_name in ("programs", "offerings", "quarantine"):
        collection = payload.get(collection_name)
        if not isinstance(collection, list):
            continue
        for row in collection:
            if not isinstance(row, dict):
                continue
            value = row.get("source_url")
            if isinstance(value, str) and value.strip():
                urls.add(value.strip())
    return urls


def load_used_source_urls(
    *,
    gold_path: Path = DEFAULT_GOLD_PATH,
    official_offerings_path: Path = DEFAULT_OFFICIAL_OFFERINGS_PATH,
) -> set[str]:
    return _source_urls_from_gold(gold_path) | _source_urls_from_official_offerings(official_offerings_path)


def source_freshness_errors(report: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    missing_used_urls = report.get("missing_used_source_urls")
    if isinstance(missing_used_urls, list):
        for url in sorted(str(value) for value in missing_used_urls if str(value).strip()):
            errors.append(f"source_freshness:used_source_missing_from_inventory:{url}")

    sources = report.get("sources")
    if not isinstance(sources, list):
        return errors

    for source in sources:
        if not isinstance(source, dict):
            continue
        state = str(source.get("currentness") or "")
        used = bool(
            source.get("used_by_current_gold")
            or source.get("used_by_current_official_offering")
            or source.get("publish_required")
        )
        if used and state in BLOCKING_CURRENTNESS_STATES:
            errors.append(f"source_freshness:{state}:{source.get('canonical_url')}")
        if used and state == "unknown" and not str(source.get("freshness_exemption_reason") or "").strip():
            errors.append(f"source_freshness:unknown:{source.get('canonical_url')}")
        if used and re.search(STALE_RESORT_SOURCE_RE, str(source.get("canonical_url") or ""), flags=re.I):
            errors.append(f"source_freshness:stale_resort_schedule_url:{source.get('canonical_url')}")
    return errors


def _summary_for_sources(sources: list[dict[str, Any]]) -> dict[str, int]:
    summary = {
        "sources_checked": len(sources),
        "current": 0,
        "url_changed": 0,
        "hash_changed": 0,
        "missing_from_parent": 0,
        "unreachable": 0,
        "unchecked": 0,
        "expired": 0,
        "unknown": 0,
    }
    for source in sources:
        state = str(source.get("currentness") or "unknown")
        if state not in summary:
            summary[state] = 0
        summary[state] += 1
    return summary


def build_source_freshness_report(
    sources: list[dict[str, Any]],
    *,
    used_source_urls: set[str] | None = None,
) -> dict[str, Any]:
    used_source_urls = used_source_urls or set()
    inventory_urls = {
        str(source.get("canonical_url") or "").strip()
        for source in sources
        if isinstance(source, dict) and str(source.get("canonical_url") or "").strip()
    }
    missing_used_source_urls = sorted(used_source_urls - inventory_urls)
    enriched_sources: list[dict[str, Any]] = []
    for source in sources:
        row = dict(source)
        url = str(row.get("canonical_url") or "")
        used = url in used_source_urls
        row["used_by_current_gold"] = used
        row["used_by_current_official_offering"] = used
        row["publish_required"] = used
        row["currentness"] = str(row.get("currentness") or "unknown")
        enriched_sources.append(row)

    report = {
        "passed": True,
        "generated_at": _now(),
        "summary": _summary_for_sources(enriched_sources),
        "errors": [],
        "warnings": [],
        "missing_used_source_urls": missing_used_source_urls,
        "sources": enriched_sources,
    }
    report["errors"] = source_freshness_errors(report)
    report["passed"] = len(report["errors"]) == 0
    return report


def _fetch_bytes(url: str) -> tuple[int, str, bytes]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": DISNEY_USER_AGENT,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return int(response.status), response.geturl(), response.read()


def _live_checked_source(source: dict[str, Any], *, all_source_kinds: bool = False) -> dict[str, Any]:
    row = dict(source)
    url = str(row.get("canonical_url") or "")
    if not url:
        row["currentness"] = "unreachable"
        row["freshness_detail"] = "missing canonical_url"
        return row

    source_kind = str(row.get("source_kind") or "")
    if source_kind == "official_html" and all_source_kinds:
        try:
            snapshot = build_web_snapshot(url, source_kind=source_kind)
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            row["currentness"] = "unreachable"
            row["freshness_detail"] = str(error)
            return row
        live_hash = web_snapshot_content_hash(snapshot)
        row["live_content_sha256"] = live_hash
        row["http_status"] = int(snapshot.get("http_status") or 200) if isinstance(snapshot, dict) else 200
        row["fetched_url"] = str(snapshot.get("fetched_url") or snapshot.get("source_url") or url) if isinstance(snapshot, dict) else url
        stored_hash = str(row.get("content_sha256") or "")
        row["currentness"] = "current" if stored_hash and live_hash == stored_hash else "hash_changed"
        return row

    if source_kind == "official_api" and all_source_kinds:
        try:
            snapshot = build_official_recreation_index_snapshot(datetime.now(timezone.utc).date())
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            row["currentness"] = "unreachable"
            row["freshness_detail"] = str(error)
            return row
        live_hash = str(snapshot.get("content_sha256") or "")
        row["live_content_sha256"] = live_hash
        row["http_status"] = 200
        row["fetched_url"] = str(snapshot.get("api_url") or url)
        stored_hash = str(row.get("content_sha256") or "")
        row["currentness"] = "current" if stored_hash and live_hash == stored_hash else "hash_changed"
        return row

    if source_kind not in {"official_pdf", "official_image"}:
        row["currentness"] = row.get("currentness") or "unchecked"
        row["freshness_detail"] = "live comparison requires --all-source-kinds for non-PDF sources"
        return row

    try:
        status, fetched_url, body = _fetch_bytes(url)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        row["currentness"] = "unreachable"
        row["freshness_detail"] = str(error)
        return row

    row["http_status"] = status
    row["fetched_url"] = fetched_url
    if status != 200:
        row["currentness"] = "unreachable"
        return row
    if fetched_url.rstrip("/") != url.rstrip("/"):
        row["currentness"] = "url_changed"
        return row

    live_hash = hashlib.sha256(body).hexdigest()
    row["live_content_sha256"] = live_hash
    stored_hash = str(row.get("content_sha256") or "")
    row["currentness"] = "current" if live_hash == stored_hash else "hash_changed"
    return row


def audit_source_freshness(
    *,
    inventory_path: Path = DEFAULT_INVENTORY_PATH,
    output_path: Path | None = None,
    live: bool = False,
    all_source_kinds: bool = False,
) -> dict[str, Any]:
    sources = _read_json(inventory_path, [])
    if not isinstance(sources, list):
        raise RuntimeError(f"source_inventory_invalid:{inventory_path}")

    if live:
        sources = [
            _live_checked_source(source, all_source_kinds=all_source_kinds)
            for source in sources
            if isinstance(source, dict)
        ]

    used_source_urls = load_used_source_urls()
    report = build_source_freshness_report(sources, used_source_urls=used_source_urls)
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit source freshness for current Disney activity sources")
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--live", action="store_true", help="fetch live official PDFs and compare hashes")
    parser.add_argument(
        "--all-source-kinds",
        action="store_true",
        help="with --live, compare official PDFs, HTML snapshots, and API snapshots",
    )
    parser.add_argument("--json", action="store_true", help="print full JSON report instead of summary")
    args = parser.parse_args()

    report = audit_source_freshness(
        inventory_path=args.inventory,
        output_path=args.output,
        live=args.live,
        all_source_kinds=args.all_source_kinds,
    )
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(json.dumps({"passed": report["passed"], "summary": report["summary"], "errors": report["errors"]}, indent=2))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
