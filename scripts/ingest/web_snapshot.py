"""Stable hashing helpers for official web line snapshots."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


def _canonical_lines(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    lines = snapshot.get("lines")
    if not isinstance(lines, list):
        return []
    canonical: list[dict[str, Any]] = []
    for line in lines:
        if not isinstance(line, dict):
            continue
        if not isinstance(line.get("line"), int) or not isinstance(line.get("text"), str):
            continue
        canonical.append({"line": int(line["line"]), "text": str(line["text"])})
    return canonical


def canonical_web_snapshot_payload(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_kind": str(snapshot.get("source_kind") or ""),
        "source_url": str(snapshot.get("source_url") or ""),
        "lines": _canonical_lines(snapshot),
    }


def web_snapshot_content_hash(snapshot: dict[str, Any]) -> str:
    payload = canonical_web_snapshot_payload(snapshot)
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def web_snapshot_file_content_hash(path: str | Path) -> str:
    snapshot = json.loads(Path(str(path)).read_text())
    if not isinstance(snapshot, dict):
        snapshot = {}
    return web_snapshot_content_hash(snapshot)
