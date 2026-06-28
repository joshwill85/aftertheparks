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
DEFAULT_SOURCE_INVENTORY_PATH = Path("data/processed/source_inventory.json")
DEFAULT_SOURCE_FRESHNESS_REPORT_PATH = Path("data/processed/source_freshness_report.json")
DEFAULT_VISUAL_AUDIT_REPORT_PATH = Path("data/processed/pdf_visual_audit_report.json")
DEFAULT_FIELD_AUDIT_REPORT_PATH = Path("data/processed/field_audit_report.json")


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _source_type(row: dict[str, Any]) -> str:
    source_url = str(row.get("source_url") or row.get("source", {}).get("url") or "")
    source_path = str(row.get("source", {}).get("path") or "")
    lower_url = source_url.lower()
    lower_path = source_path.lower()
    if lower_url.endswith(".pdf") or lower_path.endswith(".pdf"):
        return "pdf"
    if lower_url.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")) or lower_path.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        return "image"
    return "html"


def _db_category(row: dict[str, Any]) -> str:
    category = str(row.get("category") or "other")
    return {
        "character": "character_experience",
        "scavenger_hunt": "resort_activity",
        "sports_games": "resort_activity",
    }.get(category, category)


def _source_document_row(row: dict[str, Any]) -> dict[str, Any]:
    source_url = str(row.get("source_url") or row.get("source", {}).get("url") or "")
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    return {
        "source_type": _source_type(row),
        "canonical_url": source_url,
        "fetched_url": source.get("fetchedUrl") or source_url,
        "content_sha256": row["source_sha256"],
        "etag": source.get("etag"),
        "content_length": source.get("contentLength"),
        "storage_path": source.get("path"),
        "http_status": source.get("httpStatus") or 200,
        "calendar_group_key": row["calendar_group_key"],
        "fetched_at": source.get("fetchedAt") or datetime.now(timezone.utc).isoformat(),
    }


def _source_type_from_inventory(row: dict[str, Any]) -> str:
    source_kind = row.get("source_kind")
    if source_kind == "official_pdf":
        return "pdf"
    if source_kind == "official_image":
        return "image"
    return "html"


def _source_document_row_from_inventory(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_type": _source_type_from_inventory(row),
        "canonical_url": row["canonical_url"],
        "fetched_url": row.get("fetched_url") or row["canonical_url"],
        "content_sha256": row["content_sha256"],
        "etag": None,
        "content_length": None,
        "storage_path": row.get("storage_path"),
        "http_status": row.get("http_status") or 200,
        "calendar_group_key": row.get("calendar_group_key"),
        "fetched_at": row.get("captured_at") or datetime.now(timezone.utc).isoformat(),
    }


def _supporting_document_hashes(row: dict[str, Any]) -> list[str]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    supporting = source.get("supportingDocuments")
    if not isinstance(supporting, list):
        return []
    hashes: list[str] = []
    for document in supporting:
        if not isinstance(document, dict):
            continue
        document_hash = str(document.get("documentHash") or document.get("content_sha256") or "")
        if document_hash:
            hashes.append(document_hash)
    return hashes


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


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _batch_insert(db: Any, table: str, rows: list[dict[str, Any]], *, chunk_size: int = 500) -> None:
    for index in range(0, len(rows), chunk_size):
        db.insert(table, rows[index : index + chunk_size])


def _batch_upsert(
    db: Any,
    table: str,
    rows: list[dict[str, Any]],
    *,
    on_conflict: str,
    chunk_size: int = 500,
) -> list[dict[str, Any]]:
    returned: list[dict[str, Any]] = []
    for index in range(0, len(rows), chunk_size):
        result = db.upsert(table, rows[index : index + chunk_size], on_conflict=on_conflict)
        if isinstance(result, list):
            returned.extend(result)
    return returned


def _source_inventory_indexes(path: Path = DEFAULT_SOURCE_INVENTORY_PATH) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    inventory = _read_json(path, [])
    if not isinstance(inventory, list):
        inventory = []
    by_hash: dict[str, dict[str, Any]] = {}
    by_source_id: dict[str, dict[str, Any]] = {}
    role_priority = {
        "resort_pdf": 4,
        "reviewed_visual_schedule": 4,
        "resort_recreation_page": 3,
        "parent_activity_detail": 2,
        "supporting_price_image": 1,
    }
    for row in inventory:
        if not isinstance(row, dict):
            continue
        source_id = str(row.get("source_id") or "")
        source_hash = str(row.get("content_sha256") or "")
        if source_id:
            by_source_id[source_id] = row
        if source_hash:
            existing = by_hash.get(source_hash)
            if existing is None or role_priority.get(str(row.get("source_role") or ""), 0) > role_priority.get(str(existing.get("source_role") or ""), 0):
                by_hash[source_hash] = row
    return by_hash, by_source_id


def _source_trust_publish_preflight() -> None:
    inventory = _read_json(DEFAULT_SOURCE_INVENTORY_PATH, None)
    if not isinstance(inventory, list) or not inventory:
        raise RuntimeError("gold_publish_preflight_failed:source_inventory_stale")

    freshness = _read_json(DEFAULT_SOURCE_FRESHNESS_REPORT_PATH, {})
    if not isinstance(freshness, dict) or freshness.get("passed") is not True:
        raise RuntimeError("gold_publish_preflight_failed:source_freshness_failed")

    visual = _read_json(DEFAULT_VISUAL_AUDIT_REPORT_PATH, {})
    visual_summary = visual.get("summary") if isinstance(visual, dict) else {}
    if not isinstance(visual_summary, dict) or int(visual_summary.get("activities_compared") or 0) <= 0:
        raise RuntimeError("gold_publish_preflight_failed:visual_audit_missing")
    if visual.get("passed") is not True:
        raise RuntimeError("gold_publish_preflight_failed:visual_audit_failed")

    field = _read_json(DEFAULT_FIELD_AUDIT_REPORT_PATH, {})
    if not isinstance(field, dict) or field.get("passed") is not True:
        raise RuntimeError("gold_publish_preflight_failed:field_audit_failed")


def _source_currentness_check_row(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    source_url = str(row.get("source_url") or source.get("url") or "")
    return {
        "source_document_id": source_document_id,
        "canonical_url": source_url,
        "fetched_url": source.get("fetchedUrl") or source_url,
        "live_content_sha256": source.get("liveContentSha256") or row.get("source_sha256"),
        "stored_content_sha256": row.get("source_sha256"),
        "http_status": source.get("httpStatus") or 200,
        "currentness": source.get("currentness") or "current",
        "detail": {
            "calendar_group_key": row.get("calendar_group_key"),
            "canonical_slug": row.get("canonical_slug"),
            "source_pdf_edition": row.get("source_pdf_edition"),
            "method": "publish_preflight_source_freshness",
        },
    }


def _source_currentness_check_row_from_inventory(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    return {
        "source_document_id": source_document_id,
        "canonical_url": row["canonical_url"],
        "fetched_url": row.get("fetched_url") or row["canonical_url"],
        "live_content_sha256": row.get("live_content_sha256") or row.get("content_sha256"),
        "stored_content_sha256": row.get("content_sha256"),
        "http_status": row.get("http_status") or 200,
        "currentness": row.get("currentness") or "current",
        "detail": {
            "source_role": row.get("source_role"),
            "calendar_group_key": row.get("calendar_group_key"),
            "resort_slug": row.get("resort_slug"),
            "method": "publish_preflight_source_inventory",
        },
    }


def _field_observed_value(row: dict[str, Any], field_name: str) -> str:
    value = row.get(field_name)
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, ensure_ascii=False)
    return str(value or "")


def _required_gold_fields(row: dict[str, Any]) -> list[str]:
    fields = ["title", "schedule", "location"]
    if str(row.get("description") or "").strip():
        fields.append("description")
    price = row.get("price") if isinstance(row.get("price"), dict) else {}
    if price.get("state") in {"free", "fee"}:
        fields.append("price")
    return fields


def _field_audit_observation_rows(
    row: dict[str, Any],
    published_row: dict[str, Any],
    source_document_id: str,
    source_ids_by_hash: dict[str, str],
) -> list[dict[str, Any]]:
    provenance = row.get("field_provenance") if isinstance(row.get("field_provenance"), dict) else {}
    row_key = f"{row['calendar_group_key']}:{row['canonical_slug']}"
    observations: list[dict[str, Any]] = []
    for field_name in _required_gold_fields(row):
        evidence = provenance.get(field_name)
        spans = evidence if isinstance(evidence, list) else []
        observation_source_document_id = source_document_id
        for span in spans:
            if not isinstance(span, dict):
                continue
            span_source_hash = str(span.get("source_sha256") or "")
            if span_source_hash and span_source_hash in source_ids_by_hash:
                observation_source_document_id = source_ids_by_hash[span_source_hash]
                break
        method = "manual_visual_review" if any(span.get("source") == "manual_visual_bbox" for span in spans if isinstance(span, dict)) else "deterministic_parser"
        observations.append(
            {
                "published_row_id": published_row["id"],
                "source_document_id": observation_source_document_id,
                "row_kind": "gold_activity",
                "row_key": row_key,
                "field_name": field_name,
                "observed_value": _field_observed_value(row, field_name),
                "method": method,
                "confidence": "high" if spans else "unknown",
                "evidence": {"spans": spans},
            }
        )
    return observations


def _source_relationship_rows(
    row: dict[str, Any],
    source_document_id: str,
    *,
    source_ids_by_hash: dict[str, str],
    inventory_by_hash: dict[str, dict[str, Any]],
    inventory_by_source_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    if _source_type(row) != "pdf":
        return []
    source_hash = str(row.get("source_sha256") or "")
    child_inventory = inventory_by_hash.get(source_hash)
    if not child_inventory:
        raise RuntimeError(f"source_graph_child_inventory_missing:{row.get('source_url')}")
    parent_inventory = inventory_by_source_id.get(str(child_inventory.get("parent_source_id") or ""))
    parent_hash = str(parent_inventory.get("content_sha256") or "") if isinstance(parent_inventory, dict) else ""
    if not parent_hash:
        raise RuntimeError(f"source_graph_parent_missing_hash:{row.get('source_url')}")
    parent_source_document_id = source_ids_by_hash.get(parent_hash)
    if not parent_source_document_id:
        raise RuntimeError(f"source_graph_parent_document_missing:{row.get('source_url')}")
    return [
        {
            "parent_source_document_id": parent_source_document_id,
            "child_source_document_id": source_document_id,
            "relationship_type": "resort_page_links_pdf",
            "relationship_evidence": {
                "calendar_group_key": row.get("calendar_group_key"),
                "source_url": row.get("source_url"),
                "parent_url": parent_inventory.get("canonical_url"),
                "parent_content_sha256": parent_hash,
                "parent_storage_path": parent_inventory.get("storage_path"),
                "source_pdf_edition": row.get("source_pdf_edition"),
            },
        }
    ]


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


def _existing_catalog_ids(db: Any, rows: list[dict[str, Any]]) -> dict[tuple[str, str], str]:
    existing = db.select(
        "activity_catalog",
        columns="id,calendar_group_key,normalized_name",
    )
    wanted = {
        (str(row["calendar_group_key"]), str(row["canonical_slug"]))
        for row in rows
    }
    result: dict[tuple[str, str], str] = {}
    for row in existing:
        key = (str(row.get("calendar_group_key") or ""), str(row.get("normalized_name") or ""))
        if key in wanted and row.get("id"):
            result[key] = str(row["id"])
    return result


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
    inventory_by_hash, inventory_by_source_id = _source_inventory_indexes()
    source_ids_by_hash: dict[str, str] = {}
    catalog_ids_by_key: dict[tuple[str, str], str] = _existing_catalog_ids(db, rows)
    catalog_count = 0
    gold_count = 0
    field_observation_count = 0

    source_document_rows_by_hash: dict[str, dict[str, Any]] = {}
    currentness_source_rows_by_hash: dict[str, dict[str, Any]] = {}
    gold_rows_by_source_hash: dict[str, dict[str, Any]] = {}
    for row in rows:
        source_hash = row["source_sha256"]
        gold_rows_by_source_hash.setdefault(source_hash, row)
        source_document_rows_by_hash.setdefault(source_hash, _source_document_row(row))
        inventory_row = inventory_by_hash.get(source_hash)
        if inventory_row:
            currentness_source_rows_by_hash[source_hash] = inventory_row
            if _source_type(row) == "pdf":
                parent_inventory = inventory_by_source_id.get(str(inventory_row.get("parent_source_id") or ""))
                parent_hash = str(parent_inventory.get("content_sha256") or "") if isinstance(parent_inventory, dict) else ""
                if not parent_hash:
                    raise RuntimeError(f"source_graph_parent_missing_hash:{row.get('source_url')}")
                source_document_rows_by_hash.setdefault(parent_hash, _source_document_row_from_inventory(parent_inventory))
                currentness_source_rows_by_hash[parent_hash] = parent_inventory
        for supporting_hash in _supporting_document_hashes(row):
            supporting_inventory = inventory_by_hash.get(supporting_hash)
            if not supporting_inventory:
                raise RuntimeError(f"supporting_source_inventory_missing:{supporting_hash}")
            source_document_rows_by_hash.setdefault(supporting_hash, _source_document_row_from_inventory(supporting_inventory))
            currentness_source_rows_by_hash[supporting_hash] = supporting_inventory

    source_documents = _batch_upsert(
        db,
        "source_documents",
        list(source_document_rows_by_hash.values()),
        on_conflict="content_sha256",
    )
    for source_document in source_documents:
        source_hash = str(source_document.get("content_sha256") or "")
        source_id = source_document.get("id")
        if source_hash and source_id:
            source_ids_by_hash[source_hash] = str(source_id)
    missing_source_ids = sorted(set(source_document_rows_by_hash) - set(source_ids_by_hash))
    if missing_source_ids:
        raise RuntimeError(f"source_document_upsert_missing_id:{','.join(missing_source_ids)}")

    currentness_rows: list[dict[str, Any]] = []
    for source_hash, source_id in source_ids_by_hash.items():
        inventory_row = currentness_source_rows_by_hash.get(source_hash)
        if inventory_row:
            currentness_rows.append(_source_currentness_check_row_from_inventory(inventory_row, source_id))
        elif source_hash in gold_rows_by_source_hash:
            currentness_rows.append(_source_currentness_check_row(gold_rows_by_source_hash[source_hash], source_id))
    _batch_insert(db, "source_currentness_checks", currentness_rows)

    relationship_rows: list[dict[str, Any]] = []
    relationship_keys_seen: set[tuple[str, str, str]] = set()
    for row in rows:
        source_hash = row["source_sha256"]
        for relationship in _source_relationship_rows(
            row,
            source_ids_by_hash[source_hash],
            source_ids_by_hash=source_ids_by_hash,
            inventory_by_hash=inventory_by_hash,
            inventory_by_source_id=inventory_by_source_id,
        ):
            key = (
                str(relationship["parent_source_document_id"]),
                str(relationship["child_source_document_id"]),
                str(relationship["relationship_type"]),
            )
            if key in relationship_keys_seen:
                continue
            relationship_keys_seen.add(key)
            relationship_rows.append(relationship)
    if relationship_rows:
        _batch_upsert(
            db,
            "source_relationships",
            relationship_rows,
            on_conflict="parent_source_document_id,child_source_document_id,relationship_type",
        )

    field_observation_rows: list[dict[str, Any]] = []

    for row in rows:
        source_hash = row["source_sha256"]
        key = (row["calendar_group_key"], row["canonical_slug"])
        catalog_id = catalog_ids_by_key.setdefault(key, row["activity_catalog_id"])
        row = _row_with_catalog_id(row, catalog_id)

        db.upsert(
            "activity_catalog",
            _catalog_row_with_id(row, catalog_id),
            on_conflict="id",
        )
        catalog_count += 1

        public_row = _public_gold_row(row, source_ids_by_hash[source_hash])
        db.upsert("public_activity_gold", public_row, on_conflict="id")
        observations = _field_audit_observation_rows(row, public_row, source_ids_by_hash[source_hash], source_ids_by_hash)
        if observations:
            field_observation_rows.extend(observations)
            field_observation_count += len(observations)
        gold_count += 1

    _batch_insert(db, "field_audit_observations", field_observation_rows)

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
        "source_documents": len(source_documents),
        "activity_catalog": catalog_count,
        "retired_gold_rows": retired_count,
        "source_currentness_checks": len(currentness_rows),
        "source_relationships": len(relationship_rows),
        "field_audit_observations": field_observation_count,
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
    _source_trust_publish_preflight()

    try:
        from db import SupabaseClient
    except ImportError:  # pragma: no cover - supports package-style imports in tests
        from .db import SupabaseClient

    return publish_gold_rows(SupabaseClient(), rows)


def rollback_gold_rows(
    db: Any,
    *,
    source_sha256: str | None = None,
    canonical_slug: str | None = None,
    calendar_group_key: str | None = None,
) -> dict[str, int]:
    filters = {"is_current": "eq.true"}
    if source_sha256:
        filters["source_sha256"] = f"eq.{source_sha256}"
    if canonical_slug:
        filters["canonical_slug"] = f"eq.{canonical_slug}"
    if calendar_group_key:
        filters["calendar_group_key"] = f"eq.{calendar_group_key}"
    if len(filters) == 1:
        raise RuntimeError("gold_rollback_requires_source_hash_or_row_key")

    rows = db.select("public_activity_gold", columns="id", filters=filters)
    for row in rows:
        row_id = row.get("id")
        if row_id:
            db.update("public_activity_gold", {"id": f"eq.{row_id}"}, {"is_current": False})
    return {"retired_gold_rows": len(rows)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish Gold v2 preview rows to Supabase")
    parser.add_argument("--input", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--rollback-source-sha256")
    parser.add_argument("--rollback-calendar-group")
    parser.add_argument("--rollback-canonical-slug")
    args = parser.parse_args()

    if args.rollback_source_sha256 or args.rollback_canonical_slug or args.rollback_calendar_group:
        try:
            from db import SupabaseClient
        except ImportError:  # pragma: no cover
            from .db import SupabaseClient
        print(
            json.dumps(
                rollback_gold_rows(
                    SupabaseClient(),
                    source_sha256=args.rollback_source_sha256,
                    canonical_slug=args.rollback_canonical_slug,
                    calendar_group_key=args.rollback_calendar_group,
                ),
                indent=2,
            )
        )
        return

    print(json.dumps(publish_gold_file(args.input), indent=2))


if __name__ == "__main__":
    main()
