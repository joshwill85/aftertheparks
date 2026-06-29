"""Bronze layer: fetch official source documents with sha256 dedup."""

from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

try:
    from config import (
        DISNEY_USER_AGENT,
        PARSER_VERSION,
        RAW_DIR,
        SOURCE_DOCUMENTS_RAW_DIR,
        PROCESSED_DIR,
    )
    from content_type import detect_source_content
    from db import SupabaseClient
    from source_manifest import (
        ACTIVITY_SOURCES,
        ActivitySource,
        apply_pdf_source_overrides,
        filter_activity_sources_for_quarter,
    )
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import (
        DISNEY_USER_AGENT,
        PARSER_VERSION,
        RAW_DIR,
        SOURCE_DOCUMENTS_RAW_DIR,
        PROCESSED_DIR,
    )
    from .content_type import detect_source_content
    from .db import SupabaseClient
    from .source_manifest import (
        ACTIVITY_SOURCES,
        ActivitySource,
        apply_pdf_source_overrides,
        filter_activity_sources_for_quarter,
    )


@dataclass
class FetchResult:
    calendar_group_key: str
    status: str  # skipped | fetched | unchanged | error | no_pdf
    source_document_id: str | None = None
    content_sha256: str | None = None
    message: str | None = None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def head_metadata(url: str) -> dict[str, str | int | None]:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": DISNEY_USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return {
                "etag": resp.headers.get("ETag"),
                "content_length": int(resp.headers["Content-Length"]) if resp.headers.get("Content-Length") else None,
                "content_type": resp.headers.get("Content-Type"),
                "last_modified": resp.headers.get("Last-Modified"),
                "http_status": resp.status,
            }
    except urllib.error.HTTPError as e:
        return {
            "http_status": e.code,
            "etag": None,
            "content_length": None,
            "content_type": None,
            "last_modified": None,
        }


def download_bytes(url: str, dest: Path | None = None) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": DISNEY_USER_AGENT})
    data = urllib.request.urlopen(req, timeout=120).read()
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    return data


def latest_document_for_url(db: SupabaseClient, url: str) -> dict | None:
    rows = db.select("source_documents", filters={"canonical_url": f"eq.{url}"}, limit=1)
    return rows[0] if rows else None


def _clean_http_content_type(value: object) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    return value.split(";", 1)[0].strip().lower()


def _raw_image_dimensions(data: bytes) -> tuple[int | None, int | None]:
    try:
        from io import BytesIO

        with Image.open(BytesIO(data)) as image:
            return image.size
    except Exception:
        return None, None


def source_document_cache_path(
    *,
    calendar_group_key: str,
    edition: str,
    content_sha256: str,
    file_extension: str,
    base_dir: Path = Path("data/raw/source_documents"),
) -> Path:
    return base_dir / calendar_group_key / edition / f"{content_sha256}{file_extension}"


def source_document_storage_path(
    *,
    calendar_group_key: str,
    edition: str,
    content_sha256: str,
    file_extension: str,
) -> str:
    return f"{calendar_group_key}/{edition}/{content_sha256}{file_extension}"


def source_document_row(
    *,
    data: bytes,
    calendar_group_key: str,
    canonical_url: str,
    fetched_url: str,
    edition: str,
    http_metadata: dict[str, Any],
) -> dict[str, Any]:
    detected = detect_source_content(data, fallback_path=Path(canonical_url))
    digest = sha256_bytes(data)
    width, height = _raw_image_dimensions(data) if detected.source_type == "image" else (None, None)
    return {
        "source_type": detected.source_type,
        "mime_type": detected.mime_type,
        "http_content_type": _clean_http_content_type(http_metadata.get("content_type")),
        "detected_content_type": detected.mime_type,
        "file_extension": detected.file_extension,
        "raw_page_count": 1 if detected.source_type == "image" else None,
        "raw_width": width,
        "raw_height": height,
        "canonical_url": canonical_url,
        "fetched_url": fetched_url,
        "content_sha256": digest,
        "etag": http_metadata.get("etag"),
        "content_length": http_metadata.get("content_length") or len(data),
        "storage_path": source_document_storage_path(
            calendar_group_key=calendar_group_key,
            edition=edition,
            content_sha256=digest,
            file_extension=detected.file_extension,
        ),
        "http_status": http_metadata.get("http_status"),
        "calendar_group_key": calendar_group_key,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_report_row(
    *,
    calendar_group_key: str,
    status: str,
    source_document_id: str | None,
    content_sha256: str | None,
    message: str | None,
    canonical_url: str | None = None,
    replaced_stale_url: str | None = None,
    last_modified: str | None = None,
    discovery_parent_url: str | None = None,
    source_type: str | None = None,
) -> dict:
    return {
        "calendar_group_key": calendar_group_key,
        "status": status,
        "source_document_id": source_document_id,
        "content_sha256": content_sha256,
        "message": message,
        "source_type": source_type,
        "canonical_url": canonical_url,
        "replaced_stale_url": replaced_stale_url,
        "last_modified": last_modified,
        "discovery_parent_url": discovery_parent_url,
    }


def build_fetch_report(
    results: list[dict[str, Any]],
    *,
    ingest_run_id: str | None,
    quarter: str | None = None,
    fetched_at: str | None = None,
) -> dict[str, Any]:
    source_type_counts: dict[str, int] = {}
    for row in results:
        source_type = str(row.get("source_type") or "unknown")
        source_type_counts[source_type] = source_type_counts.get(source_type, 0) + 1
    return {
        "fetched_at": fetched_at or datetime.now(timezone.utc).isoformat(),
        "ingest_run_id": ingest_run_id,
        "quarter": quarter,
        "source_type_counts": source_type_counts,
        "document_source_count": sum(source_type_counts.get(kind, 0) for kind in ("pdf", "image")),
        "results": results,
    }


def select_sources_for_fetch(
    sources: list[ActivitySource],
    *,
    group: str | None = None,
    quarter: str | None = None,
) -> list[ActivitySource]:
    selected = filter_activity_sources_for_quarter(sources, quarter)
    if group:
        selected = [source for source in selected if source.calendar_group_key == group]
    return selected


def fetch_source(
    db: SupabaseClient | None,
    source: ActivitySource,
    *,
    force: bool = False,
    upload_storage: bool = True,
) -> FetchResult:
    if not source.pdf_url:
        return FetchResult(source.calendar_group_key, "no_pdf", message="HTML-only source")

    url = source.pdf_url
    edition = source.pdf_edition or "unknown"

    existing = latest_document_for_url(db, url) if db else None
    if existing and not force:
        existing_extension = str(existing.get("file_extension") or Path(str(existing.get("storage_path") or "")).suffix or ".bin")
        existing_cache_path = source_document_cache_path(
            calendar_group_key=source.calendar_group_key,
            edition=edition,
            content_sha256=str(existing["content_sha256"]),
            file_extension=existing_extension,
            base_dir=SOURCE_DOCUMENTS_RAW_DIR,
        )
        legacy_filename = url.rsplit("/", 1)[-1]
        legacy_path = RAW_DIR / legacy_filename
        candidate_paths = [existing_cache_path, legacy_path]
        for candidate_path in candidate_paths:
            if not candidate_path.exists():
                continue
            local_hash = sha256_bytes(candidate_path.read_bytes())
            if local_hash == existing["content_sha256"]:
                return FetchResult(
                    source.calendar_group_key,
                    "unchanged",
                    source_document_id=existing["id"],
                    content_sha256=local_hash,
                )

    try:
        meta = head_metadata(url)
        if existing and not force:
            etag = meta.get("etag")
            if etag and existing.get("etag") == etag:
                return FetchResult(
                    source.calendar_group_key,
                    "unchanged",
                    source_document_id=existing["id"],
                    content_sha256=existing["content_sha256"],
                )

        data = download_bytes(url)
        row = source_document_row(
            data=data,
            calendar_group_key=source.calendar_group_key,
            canonical_url=url,
            fetched_url=url,
            edition=edition,
            http_metadata=meta,
        )
        digest = str(row["content_sha256"])
        if existing and existing["content_sha256"] == digest and not force:
            return FetchResult(
                source.calendar_group_key,
                "unchanged",
                source_document_id=existing["id"],
                content_sha256=digest,
            )

        local_path = source_document_cache_path(
            calendar_group_key=source.calendar_group_key,
            edition=edition,
            content_sha256=digest,
            file_extension=str(row["file_extension"]),
            base_dir=SOURCE_DOCUMENTS_RAW_DIR,
        )
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        if db and upload_storage:
            db.upload_storage(str(row["storage_path"]), data, content_type=str(row["mime_type"]))

        if not db:
            return FetchResult(source.calendar_group_key, "fetched", content_sha256=digest, message=str(row["storage_path"]))

        inserted = db.upsert("source_documents", row, on_conflict="content_sha256")
        doc_id = inserted[0]["id"] if inserted else existing["id"] if existing else None
        return FetchResult(source.calendar_group_key, "fetched", source_document_id=doc_id, content_sha256=digest)

    except Exception as exc:
        return FetchResult(source.calendar_group_key, "error", message=str(exc))


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Fetch official recreation source documents (bronze layer)")
    parser.add_argument("--force", action="store_true", help="Re-download even if hash matches")
    parser.add_argument("--local-only", action="store_true", help="Skip Supabase upload/insert")
    parser.add_argument("--group", help="Fetch single calendar_group_key")
    parser.add_argument("--quarter", help="Fetch only source editions in this quarter, e.g. fy26-q4")
    parser.add_argument("--source-overrides", type=Path, help="JSON overrides from replace_resort_pdf_sources.py")
    args = parser.parse_args()

    db = None if args.local_only else SupabaseClient()
    run_id = None
    if db:
        runs = db.insert("ingest_runs", {
            "parser_version": PARSER_VERSION,
            "trigger": "manual",
            "status": "running",
        })
        run_id = runs[0]["id"]

    overrides = {}
    sources = ACTIVITY_SOURCES
    if args.source_overrides:
        overrides = json.loads(args.source_overrides.read_text())
        sources = apply_pdf_source_overrides(ACTIVITY_SOURCES, overrides)
    sources = select_sources_for_fetch(sources, group=args.group, quarter=args.quarter)

    results: list[dict] = []
    for source in sources:
        print(f"Fetching {source.calendar_group_key}...")
        result = fetch_source(db, source, force=args.force, upload_storage=not args.local_only)
        print(f"  -> {result.status}" + (f" ({result.message})" if result.message else ""))
        override = overrides.get(source.calendar_group_key, {}) if overrides else {}
        meta = head_metadata(source.pdf_url) if source.pdf_url else {}
        results.append(
            fetch_report_row(
                calendar_group_key=result.calendar_group_key,
                status=result.status,
                source_document_id=result.source_document_id,
                content_sha256=result.content_sha256,
                message=result.message,
                canonical_url=source.pdf_url,
                replaced_stale_url=override.get("replaced_stale_url"),
                last_modified=meta.get("last_modified"),
                discovery_parent_url=override.get("discovery_parent_url"),
                source_type=source.source_type,
            )
        )

    report = build_fetch_report(results, ingest_run_id=run_id, quarter=args.quarter)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    (PROCESSED_DIR / "fetch_report.json").write_text(json.dumps(report, indent=2))

    if db and run_id:
        db.update("ingest_runs", {"id": f"eq.{run_id}"}, {
            "status": "success",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "summary_json": {"fetch": results},
        })

    print(f"Wrote {PROCESSED_DIR / 'fetch_report.json'}")


if __name__ == "__main__":
    main()
