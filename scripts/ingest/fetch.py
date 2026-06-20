"""Bronze layer: fetch official PDFs with sha256 dedup and storage upload."""

from __future__ import annotations

import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from config import DISNEY_USER_AGENT, PARSER_VERSION, RAW_DIR, PROCESSED_DIR
from db import SupabaseClient
from source_manifest import ACTIVITY_SOURCES, ActivitySource


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
                "last_modified": resp.headers.get("Last-Modified"),
                "http_status": resp.status,
            }
    except urllib.error.HTTPError as e:
        return {"http_status": e.code, "etag": None, "content_length": None, "last_modified": None}


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
    filename = url.rsplit("/", 1)[-1]
    local_path = RAW_DIR / filename
    edition = source.pdf_edition or "unknown"

    existing = latest_document_for_url(db, url) if db else None
    if existing and local_path.exists() and not force:
        local_hash = sha256_bytes(local_path.read_bytes())
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

        data = download_bytes(url, local_path)
        digest = sha256_bytes(data)
        if existing and existing["content_sha256"] == digest and not force:
            return FetchResult(
                source.calendar_group_key,
                "unchanged",
                source_document_id=existing["id"],
                content_sha256=digest,
            )

        storage_path = f"{source.calendar_group_key}/{edition}/{digest}.pdf"
        if db and upload_storage:
            db.upload_storage(storage_path, data)

        if not db:
            return FetchResult(source.calendar_group_key, "fetched", content_sha256=digest, message=storage_path)

        row = {
            "source_type": "pdf",
            "canonical_url": url,
            "fetched_url": url,
            "content_sha256": digest,
            "etag": meta.get("etag"),
            "content_length": meta.get("content_length"),
            "storage_path": storage_path,
            "http_status": meta.get("http_status"),
            "calendar_group_key": source.calendar_group_key,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        inserted = db.upsert("source_documents", row, on_conflict="content_sha256")
        doc_id = inserted[0]["id"] if inserted else existing["id"] if existing else None
        return FetchResult(source.calendar_group_key, "fetched", source_document_id=doc_id, content_sha256=digest)

    except Exception as exc:
        return FetchResult(source.calendar_group_key, "error", message=str(exc))


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Fetch official recreation PDFs (bronze layer)")
    parser.add_argument("--force", action="store_true", help="Re-download even if hash matches")
    parser.add_argument("--local-only", action="store_true", help="Skip Supabase upload/insert")
    parser.add_argument("--group", help="Fetch single calendar_group_key")
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

    sources = ACTIVITY_SOURCES
    if args.group:
        sources = [s for s in ACTIVITY_SOURCES if s.calendar_group_key == args.group]

    results: list[dict] = []
    for source in sources:
        print(f"Fetching {source.calendar_group_key}...")
        result = fetch_source(db, source, force=args.force, upload_storage=not args.local_only)
        print(f"  -> {result.status}" + (f" ({result.message})" if result.message else ""))
        results.append({
            "calendar_group_key": result.calendar_group_key,
            "status": result.status,
            "source_document_id": result.source_document_id,
            "content_sha256": result.content_sha256,
            "message": result.message,
        })

    report = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "ingest_run_id": run_id,
        "results": results,
    }
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
