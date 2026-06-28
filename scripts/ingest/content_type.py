"""Source document content-type detection for bronze v3 ingest."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SourceContent:
    source_type: str
    mime_type: str
    file_extension: str


_EXTENSION_BY_MIME = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}


def detect_source_content(data: bytes, *, fallback_path: Path | None = None) -> SourceContent:
    if data.startswith(b"%PDF-"):
        return SourceContent("pdf", "application/pdf", ".pdf")
    if data.startswith(b"\xff\xd8\xff"):
        return SourceContent("image", "image/jpeg", ".jpg")
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return SourceContent("image", "image/png", ".png")

    suffix = fallback_path.suffix.lower() if fallback_path else ""
    if suffix == ".pdf":
        return SourceContent("pdf", "application/pdf", ".pdf")
    if suffix in {".jpg", ".jpeg"}:
        return SourceContent("image", "image/jpeg", ".jpg")
    if suffix == ".png":
        return SourceContent("image", "image/png", ".png")
    return SourceContent("unknown", "application/octet-stream", ".bin")


def extension_for_mime(mime_type: str) -> str:
    return _EXTENSION_BY_MIME.get(mime_type, ".bin")
