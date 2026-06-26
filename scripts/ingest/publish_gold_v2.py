"""Publish source-backed Gold v2 rows to Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from audit_coverage import build_coverage_audit
    from promote_gold import generate_gold_records
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .audit_coverage import build_coverage_audit
    from .promote_gold import generate_gold_records


DEFAULT_GOLD_PATH = Path("data/processed/activity_gold_v2_preview.json")


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _source_type(row: dict[str, Any]) -> str:
    source_url = str(row.get("source_url") or row.get("source", {}).get("url") or "")
    source_path = str(row.get("source", {}).get("path") or "")
    return "pdf" if source_url.lower().endswith(".pdf") or source_path.lower().endswith(".pdf") else "html"


def _db_category(row: dict[str, Any]) -> str:
    category = str(row.get("category") or "other")
    return {
        "scavenger_hunt": "resort_activity",
        "sports_games": "resort_activity",
    }.get(category, category)


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
        "default_category": _db_category(row),
    }


def _catalog_row_with_id(row: dict[str, Any], catalog_id: str) -> dict[str, Any]:
    catalog_row = _catalog_row(row)
    catalog_row["id"] = catalog_id
    return catalog_row


def _row_with_catalog_id(row: dict[str, Any], catalog_id: str) -> dict[str, Any]:
    copy = dict(row)
    copy["activity_catalog_id"] = catalog_id
    return copy


def _public_gold_row(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    source = dict(row.get("source") or {})
    source.setdefault("url", row["source_url"])
    source.setdefault("documentHash", row["source_sha256"])
    source.setdefault("documentId", source_document_id)
    if row.get("source_pdf_edition"):
        source.setdefault("edition", row.get("source_pdf_edition"))
    source.setdefault("documentKeyLegends", [])

    return {
        "id": _stable_uuid(f"gold:{row['calendar_group_key']}:{row['canonical_slug']}"),
        "activity_catalog_id": row["activity_catalog_id"],
        "calendar_group_key": row["calendar_group_key"],
        "resort_slugs": row.get("resort_slugs") or [],
        "canonical_slug": row["canonical_slug"],
        "title": row["title"],
        "category": _db_category(row),
        "schedule": row["schedule"],
        "location": row["location"],
        "description": row.get("description"),
        "price": row.get("price") or {"state": "unknown"},
        "claims": row.get("claims") or {},
        "field_provenance": row["field_provenance"],
        "source": source,
        "source_document_id": source_document_id,
        "source_url": row["source_url"],
        "source_sha256": row["source_sha256"],
        "source_pdf_edition": row.get("source_pdf_edition"),
        "trust_state": row.get("trust_state") or "source_backed",
        "valid_from": row.get("valid_from"),
        "valid_until": row.get("valid_until"),
        "is_current": True,
        # The preview file can be published independently of the extraction
        # candidate audit table. Keep source URL/hash and field provenance as
        # the durable lineage contract, and avoid a dangling optional FK.
        "promoted_from_candidate_id": None,
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


def _existing_catalog_id(db: Any, row: dict[str, Any]) -> str | None:
    existing = db.select(
        "activity_catalog",
        columns="id",
        filters={
            "calendar_group_key": f"eq.{row['calendar_group_key']}",
            "normalized_name": f"eq.{row['canonical_slug']}",
        },
        limit=1,
    )
    if existing and existing[0].get("id"):
        return str(existing[0]["id"])
    return None


def _activity_catalog_id(db: Any, row: dict[str, Any], cache: dict[tuple[str, str], str]) -> str:
    key = (row["calendar_group_key"], row["canonical_slug"])
    if key in cache:
        return cache[key]
    cache[key] = _existing_catalog_id(db, row) or row["activity_catalog_id"]
    return cache[key]


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
    catalog_ids_by_key: dict[tuple[str, str], str] = {}
    catalog_count = 0
    gold_count = 0

    for row in rows:
        source_hash = row["source_sha256"]
        if source_hash not in source_ids_by_hash:
            source_ids_by_hash[source_hash] = _source_document_id(db, row)
        catalog_id = _activity_catalog_id(db, row, catalog_ids_by_key)
        row = _row_with_catalog_id(row, catalog_id)

        db.upsert(
            "activity_catalog",
            _catalog_row_with_id(row, catalog_id),
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
    rows = json.loads(path.read_text())
    if not isinstance(rows, list):
        raise RuntimeError("gold_file_invalid")
    if rows != generate_gold_records().gold_records:
        raise RuntimeError("gold_publish_preflight_failed:gold:processed_artifact_stale")
    audit = build_coverage_audit(gold_path=path, require_production_ready=True)
    if not audit.passed:
        details = ", ".join(audit.errors)
        raise RuntimeError(f"gold_publish_preflight_failed:{details}")

    try:
        from db import SupabaseClient
    except ImportError:  # pragma: no cover - supports package-style imports in tests
        from .db import SupabaseClient

    return publish_gold_rows(SupabaseClient(), rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish Gold v2 preview rows to Supabase")
    parser.add_argument("--input", type=Path, default=DEFAULT_GOLD_PATH)
    args = parser.parse_args()

    print(json.dumps(publish_gold_file(args.input), indent=2))


if __name__ == "__main__":
    main()
