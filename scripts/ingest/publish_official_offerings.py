"""Publish official Disney recreation offerings to Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from audit_official_recreation_coverage import build_official_recreation_coverage_audit
    from generate_official_recreation_offerings import generate_official_recreation_offerings
except ImportError:  # pragma: no cover
    from .audit_official_recreation_coverage import build_official_recreation_coverage_audit
    from .generate_official_recreation_offerings import generate_official_recreation_offerings


DEFAULT_INPUT_PATH = Path("data/processed/official_recreation_offerings.json")
DEFAULT_SOURCE_INVENTORY_PATH = Path("data/processed/source_inventory.json")
DEFAULT_SOURCE_FRESHNESS_REPORT_PATH = Path("data/processed/source_freshness_report.json")
DEFAULT_PUBLICATION_PARITY_REPORT_PATH = Path("data/processed/publication_parity_report.json")


def _stable_uuid(key: str) -> str:
    return str(uuid.UUID(bytes=bytes.fromhex(hashlib.md5(key.encode()).hexdigest())))


def _source_document_row(row: dict[str, Any]) -> dict[str, Any]:
    source_url = str(row.get("source_url") or "")
    return {
        "source_type": "html",
        "canonical_url": source_url,
        "fetched_url": source_url,
        "content_sha256": row["source_sha256"],
        "storage_path": row.get("source_path"),
        "http_status": row.get("http_status") or 200,
        "calendar_group_key": None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


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


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _source_trust_publish_preflight() -> None:
    inventory = _read_json(DEFAULT_SOURCE_INVENTORY_PATH, None)
    if not isinstance(inventory, list) or not inventory:
        raise RuntimeError("official_offerings_publish_preflight_failed:source_inventory_stale")

    freshness = _read_json(DEFAULT_SOURCE_FRESHNESS_REPORT_PATH, {})
    if not isinstance(freshness, dict) or freshness.get("passed") is not True:
        raise RuntimeError("official_offerings_publish_preflight_failed:source_freshness_failed")

    parity = _read_json(DEFAULT_PUBLICATION_PARITY_REPORT_PATH, {})
    if isinstance(parity, dict) and parity.get("passed") is False:
        raise RuntimeError("official_offerings_publish_preflight_failed:publication_parity_failed")


def _source_document_id(db: Any, row: dict[str, Any], cache: dict[str, str]) -> str:
    source_hash = row["source_sha256"]
    if source_hash in cache:
        return cache[source_hash]

    inserted = db.upsert(
        "source_documents",
        _source_document_row(row),
        on_conflict="content_sha256",
    )
    if not inserted or not inserted[0].get("id"):
        raise RuntimeError(f"source_document_upsert_missing_id:{source_hash}")
    cache[source_hash] = str(inserted[0]["id"])
    return cache[source_hash]


def _program_id(program_key: str) -> str:
    return _stable_uuid(f"official-program:{program_key}")


def _program_row(program: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    return {
        "id": _program_id(program["program_key"]),
        "program_key": program["program_key"],
        "title": program["title"],
        "category": program.get("category") or "resort_activity",
        "description": program.get("description"),
        "tags": program.get("tags") or [],
        "availability": program.get("availability") or {},
        "source_document_id": source_document_id,
        "source_url": program["source_url"],
        "source_sha256": program["source_sha256"],
        "field_provenance": program.get("field_provenance") or {},
        "trust_state": program.get("trust_state") or "source_backed",
        "is_current": True,
    }


def _offering_row(offering: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    program_key = offering["program_key"]
    return {
        "id": _stable_uuid(f"official-offering:{offering['offering_key']}"),
        "program_id": _program_id(program_key),
        "offering_key": offering["offering_key"],
        "resort_slug": offering["resort_slug"],
        "variant_key": offering.get("variant_key") or "default",
        "title": offering["title"],
        "description": offering.get("description"),
        "category": offering.get("category") or "resort_activity",
        "tags": offering.get("tags") or [],
        "location": offering.get("location") or {},
        "availability": offering.get("availability") or {},
        "price": offering.get("price") or {"state": "unknown"},
        "booking": offering.get("booking") or {},
        "eligibility": offering.get("eligibility") or {},
        "amenities": offering.get("amenities") or [],
        "claims": offering.get("claims") or {},
        "source_document_id": source_document_id,
        "source_url": offering["source_url"],
        "source_sha256": offering["source_sha256"],
        "field_provenance": offering.get("field_provenance") or {},
        "trust_state": offering.get("trust_state") or "source_backed",
        "is_current": True,
        "promoted_at": datetime.now(timezone.utc).isoformat(),
    }


def _source_currentness_check_row(row: dict[str, Any], source_document_id: str) -> dict[str, Any]:
    source_url = str(row.get("source_url") or "")
    return {
        "source_document_id": source_document_id,
        "canonical_url": source_url,
        "fetched_url": row.get("fetched_url") or source_url,
        "live_content_sha256": row.get("live_content_sha256") or row.get("source_sha256"),
        "stored_content_sha256": row.get("source_sha256"),
        "http_status": row.get("http_status") or 200,
        "currentness": row.get("currentness") or "current",
        "detail": {
            "program_key": row.get("program_key"),
            "offering_key": row.get("offering_key"),
            "method": "publish_preflight_source_freshness",
        },
    }


def _specific_price(row: dict[str, Any]) -> bool:
    price = row.get("price")
    if not isinstance(price, dict):
        return False
    if price.get("state") in {"free", "fee"}:
        return True
    return any(price.get(key) not in (None, "", [], {}) for key in ("notes", "amountCents", "amount_cents", "options"))


def _specific_booking(row: dict[str, Any]) -> bool:
    booking = row.get("booking")
    return isinstance(booking, dict) and any(value not in (None, "", False, [], {}) for value in booking.values())


def _specific_availability(row: dict[str, Any]) -> bool:
    availability = row.get("availability")
    if not isinstance(availability, dict):
        return False
    if availability.get("hours_state") == "source_unspecified":
        return False
    return bool(str(availability.get("label") or "").strip())


def _required_offering_fields(row: dict[str, Any]) -> list[str]:
    fields = ["title", "resort_join"]
    if str(row.get("description") or "").strip():
        fields.append("description")
    if _specific_price(row):
        fields.append("price")
    if _specific_booking(row):
        fields.append("booking")
    if _specific_availability(row):
        fields.append("availability")
    return fields


def _observed_value(row: dict[str, Any], field_name: str) -> str:
    value = row.get(field_name)
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, ensure_ascii=False)
    return str(value or "")


def _field_audit_observation_rows(
    row: dict[str, Any],
    published_row: dict[str, Any],
    source_document_id: str,
) -> list[dict[str, Any]]:
    provenance = row.get("field_provenance") if isinstance(row.get("field_provenance"), dict) else {}
    observations: list[dict[str, Any]] = []
    for field_name in _required_offering_fields(row):
        evidence = provenance.get(field_name)
        spans = evidence if isinstance(evidence, list) else []
        observations.append(
            {
                "published_row_id": published_row["id"],
                "source_document_id": source_document_id,
                "row_kind": "official_offering",
                "row_key": row["offering_key"],
                "field_name": field_name,
                "observed_value": _observed_value(row, field_name),
                "method": "deterministic_parser",
                "confidence": "high" if spans else "unknown",
                "evidence": {"spans": spans},
            }
        )
    return observations


def _quarantine_row(row: dict[str, Any], source_document_id: str | None) -> dict[str, Any]:
    return {
        "id": _stable_uuid(
            f"official-quarantine:{row['program_key']}:{row['source_sha256']}:{row['reason_code']}"
        ),
        "program_key": row["program_key"],
        "source_document_id": source_document_id,
        "source_url": row["source_url"],
        "source_sha256": row["source_sha256"],
        "reason_code": row["reason_code"],
        "detail": row.get("detail"),
        "source_spans": row.get("source_spans") or [],
        "status": row.get("status") or "pending",
    }


def _retire_missing_current_offerings(db: Any, offerings: list[dict[str, Any]]) -> int:
    expected_keys = {offering["offering_key"] for offering in offerings}
    existing = db.select(
        "official_activity_offerings",
        columns="id,offering_key",
        filters={"is_current": "eq.true"},
    )
    retired = 0
    for row in existing:
        if row.get("offering_key") in expected_keys:
            continue
        row_id = row.get("id")
        if not row_id:
            continue
        db.update("official_activity_offerings", {"id": f"eq.{row_id}"}, {"is_current": False})
        retired += 1
    return retired


def _retire_missing_current_programs(db: Any, programs: list[dict[str, Any]]) -> int:
    expected_keys = {program["program_key"] for program in programs}
    existing = db.select(
        "official_activity_programs",
        columns="id,program_key",
        filters={"is_current": "eq.true"},
    )
    retired = 0
    for row in existing:
        if row.get("program_key") in expected_keys:
            continue
        row_id = row.get("id")
        if not row_id:
            continue
        db.update("official_activity_programs", {"id": f"eq.{row_id}"}, {"is_current": False})
        retired += 1
    return retired


def _quarantine_key(row: dict[str, Any]) -> tuple[str, str, str]:
    return (
        str(row.get("program_key") or ""),
        str(row.get("source_sha256") or ""),
        str(row.get("reason_code") or ""),
    )


def _resolve_missing_pending_quarantine(db: Any, quarantine: list[dict[str, Any]]) -> int:
    expected_keys = {_quarantine_key(row) for row in quarantine}
    existing = db.select(
        "official_activity_ingest_quarantine",
        columns="id,program_key,source_sha256,reason_code",
        filters={"status": "eq.pending"},
    )
    resolved = 0
    for row in existing:
        if _quarantine_key(row) in expected_keys:
            continue
        row_id = row.get("id")
        if not row_id:
            continue
        db.update("official_activity_ingest_quarantine", {"id": f"eq.{row_id}"}, {"status": "resolved"})
        resolved += 1
    return resolved


def publish_official_offering_rows(db: Any, extraction: dict[str, list[dict[str, Any]]]) -> dict[str, int]:
    programs = extraction.get("programs") or []
    offerings = extraction.get("offerings") or []
    quarantine = extraction.get("quarantine") or []
    if not programs and not offerings and not quarantine:
        raise RuntimeError("official_offerings_empty")

    retired_count = _retire_missing_current_offerings(db, offerings)
    retired_program_count = _retire_missing_current_programs(db, programs)
    resolved_quarantine_count = _resolve_missing_pending_quarantine(db, quarantine)
    source_ids_by_hash: dict[str, str] = {}
    source_rows_by_hash: dict[str, dict[str, Any]] = {}
    for row in [*programs, *offerings, *quarantine]:
        if isinstance(row, dict) and row.get("source_sha256"):
            source_rows_by_hash.setdefault(str(row["source_sha256"]), row)
    source_documents = _batch_upsert(
        db,
        "source_documents",
        [_source_document_row(row) for row in source_rows_by_hash.values()],
        on_conflict="content_sha256",
    )
    for source_document in source_documents:
        source_hash = str(source_document.get("content_sha256") or "")
        source_id = source_document.get("id")
        if source_hash and source_id:
            source_ids_by_hash[source_hash] = str(source_id)
    missing_source_ids = sorted(set(source_rows_by_hash) - set(source_ids_by_hash))
    if missing_source_ids:
        raise RuntimeError(f"source_document_upsert_missing_id:{','.join(missing_source_ids)}")

    currentness_rows = [
        _source_currentness_check_row(row, source_ids_by_hash[source_hash])
        for source_hash, row in sorted(source_rows_by_hash.items())
    ]
    _batch_insert(db, "source_currentness_checks", currentness_rows)

    program_count = 0
    offering_count = 0
    quarantine_count = 0
    field_observation_count = 0
    field_observation_rows: list[dict[str, Any]] = []

    for program in programs:
        source_document_id = source_ids_by_hash[program["source_sha256"]]
        db.upsert(
            "official_activity_programs",
            _program_row(program, source_document_id),
            on_conflict="id",
        )
        program_count += 1

    for offering in offerings:
        source_document_id = source_ids_by_hash[offering["source_sha256"]]
        offering_row = _offering_row(offering, source_document_id)
        db.upsert("official_activity_offerings", offering_row, on_conflict="id")
        observations = _field_audit_observation_rows(offering, offering_row, source_document_id)
        if observations:
            field_observation_rows.extend(observations)
            field_observation_count += len(observations)
        offering_count += 1

    for row in quarantine:
        source_document_id = source_ids_by_hash[row["source_sha256"]]
        db.upsert(
            "official_activity_ingest_quarantine",
            _quarantine_row(row, source_document_id),
            on_conflict="id",
        )
        quarantine_count += 1

    _batch_insert(db, "field_audit_observations", field_observation_rows)

    health = db.rpc("check_official_activity_offerings_health")
    if health:
        details = ", ".join(
            f"{row.get('check_name')}:{row.get('detail')}"
            for row in health
            if isinstance(row, dict)
        )
        raise RuntimeError(f"official_activity_offerings_health_failed:{details}")

    return {
        "source_documents": len(source_ids_by_hash),
        "programs": program_count,
        "offerings": offering_count,
        "quarantine": quarantine_count,
        "retired_offerings": retired_count,
        "retired_programs": retired_program_count,
        "resolved_quarantine": resolved_quarantine_count,
        "source_currentness_checks": len(currentness_rows),
        "field_audit_observations": field_observation_count,
    }


def publish_official_offering_file(path: Path = DEFAULT_INPUT_PATH) -> dict[str, int]:
    extraction = json.loads(path.read_text())
    if not isinstance(extraction, dict):
        raise RuntimeError("official_offerings_file_invalid")
    if extraction != generate_official_recreation_offerings():
        raise RuntimeError(
            "official_offerings_publish_preflight_failed:official_recreation:processed_offerings_stale"
        )
    audit = build_official_recreation_coverage_audit(offerings_path=path)
    if not audit.passed:
        details = ", ".join(audit.errors)
        raise RuntimeError(f"official_offerings_publish_preflight_failed:{details}")
    _source_trust_publish_preflight()

    try:
        from db import SupabaseClient
    except ImportError:  # pragma: no cover
        from .db import SupabaseClient

    return publish_official_offering_rows(SupabaseClient(), extraction)


def rollback_official_offerings(
    db: Any,
    *,
    source_sha256: str | None = None,
    offering_key: str | None = None,
) -> dict[str, int]:
    filters = {"is_current": "eq.true"}
    if source_sha256:
        filters["source_sha256"] = f"eq.{source_sha256}"
    if offering_key:
        filters["offering_key"] = f"eq.{offering_key}"
    if len(filters) == 1:
        raise RuntimeError("official_offerings_rollback_requires_source_hash_or_offering_key")

    rows = db.select("official_activity_offerings", columns="id", filters=filters)
    for row in rows:
        row_id = row.get("id")
        if row_id:
            db.update("official_activity_offerings", {"id": f"eq.{row_id}"}, {"is_current": False})
    return {"retired_offerings": len(rows)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish official Disney recreation offerings")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_PATH)
    parser.add_argument("--rollback-source-sha256")
    parser.add_argument("--rollback-offering-key")
    args = parser.parse_args()

    if args.rollback_source_sha256 or args.rollback_offering_key:
        try:
            from db import SupabaseClient
        except ImportError:  # pragma: no cover
            from .db import SupabaseClient
        print(
            json.dumps(
                rollback_official_offerings(
                    SupabaseClient(),
                    source_sha256=args.rollback_source_sha256,
                    offering_key=args.rollback_offering_key,
                ),
                indent=2,
            )
        )
        return

    print(json.dumps(publish_official_offering_file(args.input), indent=2))


if __name__ == "__main__":
    main()
