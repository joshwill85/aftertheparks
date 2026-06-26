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
        "calendar_group_key": None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


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
    program_count = 0
    offering_count = 0
    quarantine_count = 0

    for program in programs:
        source_document_id = _source_document_id(db, program, source_ids_by_hash)
        db.upsert(
            "official_activity_programs",
            _program_row(program, source_document_id),
            on_conflict="id",
        )
        program_count += 1

    for offering in offerings:
        source_document_id = _source_document_id(db, offering, source_ids_by_hash)
        db.upsert(
            "official_activity_offerings",
            _offering_row(offering, source_document_id),
            on_conflict="id",
        )
        offering_count += 1

    for row in quarantine:
        source_document_id = _source_document_id(db, row, source_ids_by_hash)
        db.upsert(
            "official_activity_ingest_quarantine",
            _quarantine_row(row, source_document_id),
            on_conflict="id",
        )
        quarantine_count += 1

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

    try:
        from db import SupabaseClient
    except ImportError:  # pragma: no cover
        from .db import SupabaseClient

    return publish_official_offering_rows(SupabaseClient(), extraction)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish official Disney recreation offerings")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_PATH)
    args = parser.parse_args()

    print(json.dumps(publish_official_offering_file(args.input), indent=2))


if __name__ == "__main__":
    main()
