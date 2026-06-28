"""Build replacement PDF source overrides from live official resort-page evidence."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import PROCESSED_DIR


OVERRIDES_PATH = PROCESSED_DIR / "resort_pdf_source_overrides.json"


def edition_id(live_edition: str | None, live_url: str) -> str:
    if live_edition:
        match = re.match(r"(fy\d+-q\d+)\s*/\s*(\d{4})", live_edition)
        if match:
            return f"{match.group(1)}-{match.group(2)}"
        date_match = re.search(r"/\s*(\d{4})", live_edition)
        if date_match:
            return f"official-schedule-{date_match.group(1)}"
    folder = re.search(r"/(fy\d+-q\d+)/", live_url, flags=re.I)
    mmddyy = re.search(r"(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)", live_url)
    mmyy = re.search(r"(?<!\d)(\d{2})(\d{2})(?!\d)", live_url)
    date_value = (
        f"{mmddyy.group(1)}{mmddyy.group(3)}"
        if mmddyy
        else f"{mmyy.group(1)}{mmyy.group(2)}"
        if mmyy
        else None
    )
    if folder and date_value:
        return f"{folder.group(1).lower()}-{date_value}"
    if date_value:
        return f"official-schedule-{date_value}"
    raise ValueError(f"Cannot determine edition for {live_url}")


def build_replacement_overrides(audit: dict[str, Any]) -> dict[str, dict[str, str | None]]:
    overrides: dict[str, dict[str, str | None]] = {}
    for row in audit.get("sources", []):
        if not isinstance(row, dict) or not row.get("stale"):
            continue
        evidence = row.get("discovery_evidence") or {}
        if evidence.get("evidence_kind") != "official_resort_recreation_page":
            raise ValueError(
                f"{row.get('calendar_group_key')} replacement lacks official page evidence"
            )
        live_url = row["live_url"]
        override = {
            "pdf_url": live_url,
            "pdf_edition": edition_id(row.get("live_edition"), live_url),
            "replaced_stale_url": row.get("manifest_url"),
        }
        if evidence.get("parent_url"):
            override["discovery_parent_url"] = evidence.get("parent_url")
        if evidence.get("source_api_url"):
            override["source_api_url"] = evidence.get("source_api_url")
        if evidence.get("evidence_detail"):
            override["evidence_detail"] = evidence.get("evidence_detail")
        overrides[row["calendar_group_key"]] = override
    return overrides


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, default=PROCESSED_DIR / "resort_pdf_date_audit.json")
    parser.add_argument("--out", type=Path, default=OVERRIDES_PATH)
    args = parser.parse_args()

    audit = json.loads(args.audit.read_text())
    overrides = build_replacement_overrides(audit)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(overrides, indent=2))
    print(json.dumps({"overrides": len(overrides), "groups": sorted(overrides)}, indent=2))


if __name__ == "__main__":
    main()
