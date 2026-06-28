"""Shared configuration for the activity ingest pipeline."""

from __future__ import annotations

import os
from pathlib import Path

PARSER_VERSION = "2.0.0"
ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "pdfs"
SOURCE_DOCUMENTS_RAW_DIR = ROOT / "data" / "raw" / "source_documents"
PROCESSED_DIR = ROOT / "data" / "processed"
STORAGE_BUCKET = "source-documents"

DISNEY_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

CONFIDENCE_PUBLISH_THRESHOLD = 0.5
MOVIE_TITLE_GARBAGE_RATIO = 0.2

PROFILE_BY_GROUP: dict[str, str] = {
    "caribbean-beach": "aframe_caribbean_graphic",
    "fort-wilderness": "fort_wilderness_html",
}


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))


def supabase_service_key() -> str:
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
