"""Capture Disney's official recreation parent list from the finder API."""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import DISNEY_USER_AGENT
except ImportError:  # pragma: no cover
    from .config import DISNEY_USER_AGENT


DEFAULT_PAGE_URL = "https://disneyworld.disney.go.com/recreation/"
DEFAULT_OUTPUT = Path("data/raw/web/official-recreation-index-api.snapshot.json")
WDW_DESTINATION_ID = "80007798;entityType=destination"


def official_recreation_index_api_url(snapshot_date: date) -> str:
    encoded_destination = WDW_DESTINATION_ID.replace(";", "%3B").replace("=", "%3D")
    return (
        "https://disneyworld.disney.go.com/finder/api/v1/"
        f"explorer-service/list-ancestor-entities/wdw/{encoded_destination}/"
        f"{snapshot_date.isoformat()}/recreation"
    )


def _content_hash(snapshot: dict[str, Any]) -> str:
    canonical = {
        "source_kind": snapshot.get("source_kind"),
        "source_url": snapshot.get("source_url"),
        "api_url": snapshot.get("api_url"),
        "title": snapshot.get("title"),
        "results": snapshot.get("results", []),
    }
    payload = json.dumps(canonical, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def fetch_official_recreation_index(api_url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        api_url,
        headers={
            "User-Agent": DISNEY_USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def build_official_recreation_index_snapshot(snapshot_date: date) -> dict[str, Any]:
    api_url = official_recreation_index_api_url(snapshot_date)
    payload = fetch_official_recreation_index(api_url)
    snapshot = {
        "source_kind": "official_recreation_index_api",
        "source_url": DEFAULT_PAGE_URL,
        "api_url": api_url,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "title": payload.get("title"),
        "results": payload.get("results", []),
    }
    snapshot["content_sha256"] = _content_hash(snapshot)
    return snapshot


def write_official_recreation_index_snapshot(
    output: Path = DEFAULT_OUTPUT,
    snapshot_date: date | None = None,
) -> Path:
    snapshot = build_official_recreation_index_snapshot(snapshot_date or date.today())
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture official Disney recreation parent index")
    parser.add_argument("--date", dest="snapshot_date", type=date.fromisoformat, default=date.today())
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    output = write_official_recreation_index_snapshot(args.output, args.snapshot_date)
    snapshot = json.loads(output.read_text())
    print(
        json.dumps(
            {
                "output": str(output),
                "api_url": snapshot["api_url"],
                "results": len(snapshot.get("results", [])),
                "sha256": snapshot["content_sha256"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
