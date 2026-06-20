"""Silver layer: extract activities from bronze source documents."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from config import PARSER_VERSION, PROFILE_BY_GROUP, PROCESSED_DIR, RAW_DIR
from db import SupabaseClient
from fort_wilderness import FORT_WILDERNESS_ACTIVITIES
from pdf_parser import ParseResult, ParsedActivity, parse_pdf_bytes
from source_manifest import ACTIVITY_SOURCES, ActivitySource


def activity_to_dict(source: ActivitySource, act: ParsedActivity, parse: ParseResult) -> dict:
    return {
        "calendar_group_key": source.calendar_group_key,
        "resort_slugs": list(source.resort_slugs),
        "recreation_page_url": source.recreation_page_url,
        "pdf_url": source.pdf_url,
        "pdf_edition": source.pdf_edition,
        "name": act.name,
        "normalized_name": act.normalized_name,
        "category": act.category,
        "section": act.section,
        "location": act.location,
        "schedule_text": act.schedule_text,
        "description": act.description,
        "is_fee_based": act.is_fee_based,
        "is_daily": act.is_daily,
        "days_of_week": act.days_of_week,
        "start_time": act.start_time,
        "end_time": act.end_time,
        "movie_nights": act.movie_nights,
        "confidence": act.confidence,
        "warnings": act.warnings,
        "profile_key": parse.profile_key,
        "extraction_method": parse.extraction_method,
    }


def extract_source(source: ActivitySource) -> tuple[list[ParsedActivity], ParseResult | None]:
    if source.calendar_group_key == "fort-wilderness":
        parse = ParseResult(
            activities=FORT_WILDERNESS_ACTIVITIES,
            ocr_text="",
            profile_key="fort_wilderness_html",
            confidence=1.0,
            warnings=[],
            extraction_method="manual",
        )
        return FORT_WILDERNESS_ACTIVITIES, parse

    if not source.pdf_url:
        return [], None

    filename = source.pdf_url.rsplit("/", 1)[-1]
    pdf_path = RAW_DIR / filename
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not cached: {pdf_path}. Run fetch.py first.")

    profile = PROFILE_BY_GROUP.get(source.calendar_group_key, "aframe_standard")
    parse = parse_pdf_bytes(pdf_path.read_bytes(), profile_key=profile)
    return parse.activities, parse


def extract_all(*, persist_db: bool = False) -> dict:
    ingested_at = datetime.now(timezone.utc).isoformat()
    payload: dict = {
        "ingested_at": ingested_at,
        "parser_version": PARSER_VERSION,
        "sources": [],
        "activities": [],
    }

    db = SupabaseClient() if persist_db else None
    run_id = None
    if db:
        runs = db.insert("ingest_runs", {
            "parser_version": PARSER_VERSION,
            "trigger": "manual",
            "status": "running",
        })
        run_id = runs[0]["id"]

    for source in ACTIVITY_SOURCES:
        print(f"Extracting {source.calendar_group_key}...")
        activities, parse = extract_source(source)
        payload["sources"].append({
            "calendar_group_key": source.calendar_group_key,
            "resort_slugs": list(source.resort_slugs),
            "recreation_page_url": source.recreation_page_url,
            "pdf_url": source.pdf_url,
            "pdf_edition": source.pdf_edition,
            "notes": source.notes,
            "activity_count": len(activities),
            "confidence": parse.confidence if parse else 0,
            "profile_key": parse.profile_key if parse else None,
            "extraction_method": parse.extraction_method if parse else None,
        })
        for act in activities:
            row = activity_to_dict(source, act, parse)  # type: ignore[arg-type]
            row["ingested_at"] = ingested_at
            payload["activities"].append(row)

        if db and parse and source.pdf_url:
            docs = db.select(
                "source_documents",
                filters={"canonical_url": f"eq.{source.pdf_url}"},
                limit=1,
            )
            if docs:
                db.insert("raw_extractions", {
                    "source_document_id": docs[0]["id"],
                    "ingest_run_id": run_id,
                    "parser_version": PARSER_VERSION,
                    "profile_key": parse.profile_key,
                    "ocr_text": parse.ocr_text[:500000] if parse.ocr_text else None,
                    "extraction_json": {"activity_count": len(activities)},
                    "confidence": parse.confidence,
                    "warnings": parse.warnings,
                })

        print(f"  -> {len(activities)} activities")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / "activities_ingest.json"
    out_path.write_text(json.dumps(payload, indent=2))

    if db and run_id:
        db.update("ingest_runs", {"id": f"eq.{run_id}"}, {
            "status": "success",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "summary_json": {
                "activity_count": len(payload["activities"]),
                "source_count": len(payload["sources"]),
            },
        })

    print(f"Wrote {out_path} ({len(payload['activities'])} activities)")
    return payload


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Extract activities from bronze PDFs")
    parser.add_argument("--persist-db", action="store_true", help="Write raw_extractions to Supabase")
    args = parser.parse_args()
    extract_all(persist_db=args.persist_db)


if __name__ == "__main__":
    main()
