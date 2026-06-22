"""Publish source-backed Gold v2 rows to Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_GOLD_PATH = Path("data/processed/activity_gold_v2_preview.json")


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _source_type(row: dict[str, Any]) -> str:
    source_url = str(row.get("source_url") or row.get("source", {}).get("url") or "")
    source_path = str(row.get("source", {}).get("path") or "")
    return "pdf" if source_url.lower().endswith(".pdf") or source_path.lower().endswith(".pdf") else "html"


def _source_document_row(row: dict[str, Any]) -> dict[str, Any]:
    source_url = str(row.get("source_url") or row.get("source", {}).get("url") or "")
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return {
        "source_type": _source_type(row),
        "canonical_url": source_url,
        "fetched_url": source_url,
        "content_sha256": row["source_sha256"],
        "storage_path": source.get("path"),
        "calendar_group_key": row["calendar_group_key"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _catalog_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["activity_catalog_id"],
        "calendar_group_key": row["calendar_group_key"],
        "canonical_name": row["title"],
        "normalized_name": row["canonical_slug"],
        "default_category": row["category"],
    }


def _public_gold_row(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    return {
        "id": _stable_uuid(f"gold:{row['calendar_group_key']}:{row['canonical_slug']}"),
        "activity_catalog_id": row["activity_catalog_id"],
        "calendar_group_key": row["calendar_group_key"],
        "resort_slugs": row.get("resort_slugs") or [],
        "canonical_slug": row["canonical_slug"],
        "title": row["title"],
        "category": row["category"],
        "schedule": row["schedule"],
        "location": row["location"],
        "description": row.get("description"),
        "price": row.get("price") or {"state": "unknown"},
        "claims": row.get("claims") or {},
        "field_provenance": row["field_provenance"],
        "source_document_id": source_document_id,
        "source_url": row["source_url"],
        "source_sha256": row["source_sha256"],
        "source_pdf_edition": row.get("source_pdf_edition"),
        "trust_state": row.get("trust_state") or "source_backed",
        "valid_from": row.get("valid_from"),
        "valid_until": row.get("valid_until"),
        "is_current": True,
        "promoted_from_candidate_id": row["candidate_id"],
        "promoted_at": datetime.now(timezone.utc).isoformat(),
        "enrichment": row.get("enrichment") or {},
        "external_facts": row.get("external_facts") or [],
    }


def _source_document_id(db: Any, row: dict[str, Any]) -> str:
    inserted = db.upsert(
        "source_documents",
        _source_document_row(row),
        on_conflict="content_sha256",
    )
    if not inserted or not inserted[0].get("id"):
        raise RuntimeError(f"source_document_upsert_missing_id:{row.get('source_sha256')}")
    return str(inserted[0]["id"])


def _retire_missing_current_rows(db: Any, rows: list[dict[str, Any]]) -> int:
    expected_ids_by_key = {
        (row["calendar_group_key"], row["canonical_slug"]): _public_gold_row(
            row,
            source_document_id="00000000-0000-0000-0000-000000000000",
        )["id"]
        for row in rows
    }
    existing = db.select(
        "public_activity_gold",
        columns="id,calendar_group_key,canonical_slug",
        filters={"is_current": "eq.true"},
    )
    retired = 0
    for row in existing:
        key = (row.get("calendar_group_key"), row.get("canonical_slug"))
        if row.get("id") == expected_ids_by_key.get(key):
            continue
        row_id = row.get("id")
        if not row_id:
            continue
        db.update("public_activity_gold", {"id": f"eq.{row_id}"}, {"is_current": False})
        retired += 1
    return retired


def publish_gold_rows(db: Any, rows: list[dict[str, Any]]) -> dict[str, int]:
    if not rows:
        raise RuntimeError("gold_rows_empty")

    retired_count = _retire_missing_current_rows(db, rows)
    source_ids_by_hash: dict[str, str] = {}
    catalog_count = 0
    gold_count = 0

    for row in rows:
        source_hash = row["source_sha256"]
        if source_hash not in source_ids_by_hash:
            source_ids_by_hash[source_hash] = _source_document_id(db, row)

        db.upsert(
            "activity_catalog",
            _catalog_row(row),
            on_conflict="id",
        )
        catalog_count += 1

        db.upsert(
            "public_activity_gold",
            _public_gold_row(row, source_ids_by_hash[source_hash]),
            on_conflict="id",
        )
        gold_count += 1

    health = db.rpc("check_activity_pipeline_v2_health")
    if health:
        details = ", ".join(
            f"{row.get('check_name')}:{row.get('detail')}"
            for row in health
            if isinstance(row, dict)
        )
        raise RuntimeError(f"activity_pipeline_v2_health_failed:{details}")

    return {
        "gold_rows": gold_count,
        "source_documents": len(source_ids_by_hash),
        "activity_catalog": catalog_count,
        "retired_gold_rows": retired_count,
    }


def publish_gold_file(path: Path = DEFAULT_GOLD_PATH) -> dict[str, int]:
    try:
        from db import SupabaseClient
    except ImportError:  # pragma: no cover - supports package-style imports in tests
        from .db import SupabaseClient

    rows = json.loads(path.read_text())
    if not isinstance(rows, list):
        raise RuntimeError("gold_file_invalid")
    return publish_gold_rows(SupabaseClient(), rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish Gold v2 preview rows to Supabase")
    parser.add_argument("--input", type=Path, default=DEFAULT_GOLD_PATH)
    args = parser.parse_args()

    print(json.dumps(publish_gold_file(args.input), indent=2))


if __name__ == "__main__":
    main()
