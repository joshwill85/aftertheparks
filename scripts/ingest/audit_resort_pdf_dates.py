"""Date-aware audit for official Disney resort recreation PDF sources."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from discover import discover_source
    from fetch import head_metadata
    from source_manifest import ACTIVITY_SOURCES, apply_pdf_source_overrides
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import PROCESSED_DIR
    from .discover import discover_source
    from .fetch import head_metadata
    from .source_manifest import ACTIVITY_SOURCES, apply_pdf_source_overrides


def filename_schedule_date(url: str | None) -> str | None:
    if not url:
        return None
    mmddyy = re.search(r"(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)", url)
    if mmddyy:
        return f"{mmddyy.group(1)}{mmddyy.group(3)}"
    mmyy = re.search(r"(?<!\d)(\d{2})(\d{2})(?!\d)", url)
    if mmyy:
        return f"{mmyy.group(1)}{mmyy.group(2)}"
    return None


def pdf_edition(url: str | None) -> str | None:
    if not url:
        return None
    folder = re.search(r"/(fy\d+-q\d+)/", url, flags=re.I)
    date_value = filename_schedule_date(url)
    folder_value = folder.group(1).lower() if folder else "?"
    date_value = date_value or "?"
    return f"{folder_value} / {date_value}"


def edition_sort_key(url: str | None) -> tuple[int, int, int, int]:
    if not url:
        return (0, 0, 0, 0)
    folder = re.search(r"fy(\d+)-q(\d+)", url, flags=re.I)
    fy = int(folder.group(1)) if folder else 0
    quarter = int(folder.group(2)) if folder else 0
    date_value = filename_schedule_date(url)
    year = int(date_value[2:4]) if date_value else 0
    month = int(date_value[0:2]) if date_value else 0
    return (year, month, fy, quarter)


def manifest_rows_from_sources(sources: list[Any] | None = None) -> list[dict[str, Any]]:
    selected_sources = sources or ACTIVITY_SOURCES
    return [
        {
            "calendar_group_key": source.calendar_group_key,
            "manifest_url": source.pdf_url,
            "resort_slugs": list(source.resort_slugs),
        }
        for source in selected_sources
    ]


def _is_official_page_evidence(row: dict[str, Any]) -> bool:
    evidence = row.get("discovery_evidence")
    return isinstance(evidence, dict) and evidence.get("evidence_kind") == "official_resort_recreation_page"


def build_resort_pdf_date_audit(
    *,
    manifest_rows: list[dict[str, Any]],
    discovery_rows: list[dict[str, Any]],
    head_by_url: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    discovery_by_group = {
        row["calendar_group_key"]: row
        for row in discovery_rows
        if row.get("calendar_group_key")
    }
    sources: list[dict[str, Any]] = []
    stale_groups: list[str] = []
    missing_live_evidence: list[str] = []

    for manifest in manifest_rows:
        group = manifest["calendar_group_key"]
        manifest_url = manifest.get("manifest_url")
        discovery = discovery_by_group.get(group, {})
        live_url = discovery.get("discovered_url") or discovery.get("url")
        source_kind = "official_web" if not manifest_url else "pdf"

        stale = False
        if source_kind == "pdf":
            if not live_url:
                missing_live_evidence.append(group)
            elif (
                live_url != manifest_url
                and edition_sort_key(live_url) >= edition_sort_key(manifest_url)
                and _is_official_page_evidence(discovery)
            ):
                stale = True

        if stale:
            stale_groups.append(group)

        sources.append(
            {
                "calendar_group_key": group,
                "resort_slugs": manifest.get("resort_slugs", []),
                "manifest_url": manifest_url,
                "manifest_edition": pdf_edition(manifest_url),
                "manifest_last_modified": head_by_url.get(manifest_url or "", {}).get("last_modified"),
                "live_url": live_url,
                "live_edition": pdf_edition(live_url),
                "live_last_modified": head_by_url.get(live_url or "", {}).get("last_modified"),
                "stale": stale,
                "source_kind": source_kind,
                "discovery_evidence": discovery.get("discovery_evidence"),
                "status": discovery.get("status"),
            }
        )

    return {
        "passed": not stale_groups and not missing_live_evidence,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "sources_checked": len(sources),
            "stale_groups": stale_groups,
            "missing_live_evidence": missing_live_evidence,
        },
        "sources": sources,
    }


def live_discovery_rows(*, use_playwright: bool) -> list[dict[str, Any]]:
    return [
        discover_source(source, use_playwright=use_playwright)
        for source in ACTIVITY_SOURCES
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-playwright", action="store_true")
    parser.add_argument("--allow-stale", action="store_true")
    parser.add_argument("--source-overrides", type=Path, help="Generated replacement overrides to audit as the publish source set")
    args = parser.parse_args()

    sources = ACTIVITY_SOURCES
    if args.source_overrides:
        sources = apply_pdf_source_overrides(
            ACTIVITY_SOURCES,
            json.loads(args.source_overrides.read_text()),
        )
    discovery_rows = live_discovery_rows(use_playwright=not args.no_playwright)
    urls = {
        url
        for row in discovery_rows
        for url in (row.get("manifest_url"), row.get("discovered_url"))
        if url
    }
    head_by_url = {url: head_metadata(url) for url in sorted(urls)}
    audit = build_resort_pdf_date_audit(
        manifest_rows=manifest_rows_from_sources(sources),
        discovery_rows=discovery_rows,
        head_by_url=head_by_url,
    )
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / "resort_pdf_date_audit.json"
    out.write_text(json.dumps(audit, indent=2))
    print(json.dumps(audit["summary"], indent=2))
    if not audit["passed"] and not args.allow_stale:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
