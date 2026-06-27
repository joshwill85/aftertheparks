"""Generate processed official recreation offerings from captured web snapshots."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from disney_recreation_offerings import extract_official_recreation_offerings
    from web_snapshot import web_snapshot_content_hash
except ImportError:  # pragma: no cover
    from .disney_recreation_offerings import extract_official_recreation_offerings
    from .web_snapshot import web_snapshot_content_hash


DEFAULT_SNAPSHOT_DIR = Path("data/raw/web")
DEFAULT_OUTPUT = Path("data/processed/official_recreation_offerings.json")
INDEX_SNAPSHOT = "official-recreation-index-api.snapshot.json"
RESORT_PAGE_SNAPSHOT_CONFIG = {
    "fort-wilderness-recreation-page.snapshot.json": {
        "resort_slug": "campsites-at-fort-wilderness-resort",
        "include_program_keys": [
            "basketball-courts",
            "electrical-water-pageant",
            "wilderness-back-trail-adventure",
        ],
    },
    "fort-wilderness-cabins-recreation-page.snapshot.json": {
        "resort_slug": "cabins-at-fort-wilderness-resort",
        "include_program_keys": [
            "basketball-courts",
            "wilderness-back-trail-adventure",
        ],
    },
}

DETAIL_SNAPSHOT_PATTERNS = (
    "official-*.snapshot.json",
    "fort-wilderness-archery-experience.snapshot.json",
    "fort-wilderness-canoe-rentals.snapshot.json",
    "fort-wilderness-kayak-rentals.snapshot.json",
    "fort-wilderness-pony-rides.snapshot.json",
    "fort-wilderness-wagon-rides.snapshot.json",
)


def _snapshot_payload(path: Path) -> dict[str, Any]:
    snapshot = json.loads(path.read_text())
    return {
        "source_kind": "official_recreation_detail",
        "source_url": snapshot.get("source_url"),
        "source_web_sha256": web_snapshot_content_hash(snapshot),
        "source_path": str(path),
        "lines": snapshot.get("lines", []),
    }


def _has_snapshot_lines(path: Path) -> bool:
    try:
        snapshot = json.loads(path.read_text())
    except json.JSONDecodeError:
        return False
    lines = snapshot.get("lines")
    return isinstance(lines, list) and any(
        isinstance(line, dict) and str(line.get("text", "")).strip()
        for line in lines
    )


def _index_snapshot_payload(path: Path) -> dict[str, Any]:
    snapshot = json.loads(path.read_text())
    return {
        "source_kind": "official_recreation_index_api",
        "source_url": snapshot.get("source_url"),
        "api_url": snapshot.get("api_url"),
        "source_web_sha256": snapshot.get("content_sha256") or web_snapshot_content_hash(snapshot),
        "source_path": str(path),
        "title": snapshot.get("title"),
        "results": snapshot.get("results", []),
    }


def _resort_page_snapshot_payload(path: Path, config: dict[str, Any]) -> dict[str, Any]:
    snapshot = json.loads(path.read_text())
    return {
        "source_kind": "official_recreation_resort_page",
        "resort_slug": config["resort_slug"],
        "include_program_keys": config.get("include_program_keys", []),
        "source_url": snapshot.get("source_url"),
        "source_web_sha256": web_snapshot_content_hash(snapshot),
        "source_path": str(path),
        "lines": snapshot.get("lines", []),
    }


def load_snapshot_payloads(snapshot_dir: Path = DEFAULT_SNAPSHOT_DIR) -> list[dict[str, Any]]:
    paths: list[Path] = []
    seen: set[Path] = set()
    for pattern in DETAIL_SNAPSHOT_PATTERNS:
        for path in sorted(snapshot_dir.glob(pattern)):
            if path.name.endswith("recreation-page.snapshot.json"):
                continue
            if path.name in {INDEX_SNAPSHOT, "official-recreation-index.snapshot.json"}:
                continue
            if not _has_snapshot_lines(path):
                continue
            if path in seen:
                continue
            seen.add(path)
            paths.append(path)
    payloads = [_snapshot_payload(path) for path in sorted(paths)]
    index_path = snapshot_dir / INDEX_SNAPSHOT
    if index_path.exists():
        payloads.append(_index_snapshot_payload(index_path))
    for filename, config in RESORT_PAGE_SNAPSHOT_CONFIG.items():
        path = snapshot_dir / filename
        if path.exists():
            payloads.append(_resort_page_snapshot_payload(path, config))
    return payloads


def generate_official_recreation_offerings(
    snapshot_dir: Path = DEFAULT_SNAPSHOT_DIR,
) -> dict[str, list[dict[str, Any]]]:
    return extract_official_recreation_offerings(
        load_snapshot_payloads(snapshot_dir),
        apply_quality_facts=snapshot_dir == DEFAULT_SNAPSHOT_DIR,
    )


def write_official_recreation_offerings(
    output: Path = DEFAULT_OUTPUT,
    snapshot_dir: Path = DEFAULT_SNAPSHOT_DIR,
) -> dict[str, int]:
    extraction = generate_official_recreation_offerings(snapshot_dir)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(extraction, indent=2, ensure_ascii=False) + "\n")
    return {
        "programs": len(extraction["programs"]),
        "offerings": len(extraction["offerings"]),
        "quarantine": len(extraction["quarantine"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate official recreation offerings")
    parser.add_argument("--snapshot-dir", type=Path, default=DEFAULT_SNAPSHOT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    print(json.dumps(write_official_recreation_offerings(args.output, args.snapshot_dir), indent=2))


if __name__ == "__main__":
    main()
