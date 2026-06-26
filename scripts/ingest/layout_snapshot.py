"""Bronze+ layout snapshots: immutable PDF words and line geometry."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import fitz
from PIL import Image, ImageEnhance, ImageOps

OCR_ZOOM = 2.0
ENHANCED_OCR_ZOOM = 3.0
OCR_MIN_CONFIDENCE = 45.0
DEFAULT_LAYOUT_SNAPSHOT_DIR = Path("data/processed/layout_snapshots")
LINE_COLUMN_GAP = 80.0
NEAR_COLUMN_GAP = 70.0
ENHANCED_OCR_MIN_HEADING_GAIN = 8
HEADING_SCORE_KEYS = {
    "FIND",
    "FRIEND",
    "NATURE",
    "WALK",
    "POOLSIDE",
    "UNDER",
    "SEASHELL",
    "PAINTING",
    "MICKEY",
    "TIEDYE",
    "CARIBBEAN",
    "CAMPFIRE",
    "ISLAND",
    "PARTY",
    "GLOW",
    "FESTIVAL",
    "MOVIE",
    "BICYCLE",
    "RENTALS",
    "PAINT",
    "SHOW",
}


def _round_bbox(values: tuple[float, float, float, float]) -> list[float]:
    return [round(value, 3) for value in values]


def _word_row(raw_word: tuple[Any, ...]) -> dict[str, Any]:
    x0, y0, x1, y1, text, block_no, line_no, word_no = raw_word[:8]
    return {
        "text": text,
        "bbox": _round_bbox((x0, y0, x1, y1)),
        "block_no": int(block_no),
        "line_no": int(line_no),
        "word_no": int(word_no),
    }


def _line_rows(words: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for word in words:
        key = (word["block_no"], word["line_no"])
        grouped.setdefault(key, []).append(word)

    def split_segments(line_words: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
        ordered = sorted(line_words, key=lambda word: (word["bbox"][0], word["word_no"]))
        if not ordered:
            return []

        segments: list[list[dict[str, Any]]] = [[ordered[0]]]
        previous = ordered[0]
        for word in ordered[1:]:
            gap = word["bbox"][0] - previous["bbox"][2]
            if gap >= LINE_COLUMN_GAP or _should_split_near_column_gap(previous, word, gap):
                segments.append([])
            segments[-1].append(word)
            previous = word
        return segments

    lines: list[dict[str, Any]] = []
    for (block_no, line_no), line_words in sorted(grouped.items()):
        for segment_no, ordered in enumerate(split_segments(line_words), start=1):
            x0 = min(word["bbox"][0] for word in ordered)
            y0 = min(word["bbox"][1] for word in ordered)
            x1 = max(word["bbox"][2] for word in ordered)
            y1 = max(word["bbox"][3] for word in ordered)
            lines.append(
                {
                    "text": " ".join(word["text"] for word in ordered),
                    "bbox": _round_bbox((x0, y0, x1, y1)),
                    "block_no": block_no,
                    "line_no": line_no,
                    "segment_no": segment_no,
                    "word_count": len(ordered),
                }
            )

    return sorted(lines, key=lambda line: (line["bbox"][1], line["bbox"][0]))


def _should_split_near_column_gap(
    previous: dict[str, Any],
    current: dict[str, Any],
    gap: float,
) -> bool:
    if gap < NEAR_COLUMN_GAP:
        return False
    previous_text = str(previous.get("text", "")).strip()
    if not re.fullmatch(r"\[[A-Z0-9]{1,3}\]|\(\d{4}\)", previous_text):
        return False
    previous_right = float(previous["bbox"][2])
    current_left = float(current["bbox"][0])
    return previous_right <= 860 and current_left >= 850


def _ocr_words_from_render(
    page: fitz.Page,
    *,
    zoom: float,
    enhanced: bool = False,
    page_segmentation_mode: str = "6",
) -> list[dict[str, Any]]:
    if not shutil.which("tesseract"):
        return []

    with tempfile.TemporaryDirectory() as tmp:
        image_path = Path(tmp) / "page.png"
        pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        pixmap.save(image_path)
        if enhanced:
            image = Image.open(image_path)
            image = ImageOps.grayscale(image)
            image = ImageEnhance.Contrast(image).enhance(2.5)
            image_path = Path(tmp) / "page-enhanced.png"
            image.save(image_path)

        try:
            result = subprocess.run(
                [
                    "tesseract",
                    str(image_path),
                    "stdout",
                    "--psm",
                    page_segmentation_mode,
                    "tsv",
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=60,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return []

    rows = csv.DictReader(io.StringIO(result.stdout), delimiter="\t")
    words: list[dict[str, Any]] = []
    for row in rows:
        if row.get("level") != "5":
            continue
        text = (row.get("text") or "").strip()
        if not text:
            continue
        try:
            confidence = float(row.get("conf") or "-1")
            left = float(row.get("left") or "0") / zoom
            top = float(row.get("top") or "0") / zoom
            width = float(row.get("width") or "0") / zoom
            height = float(row.get("height") or "0") / zoom
            block_no = int(row.get("block_num") or "0")
            paragraph_no = int(row.get("par_num") or "0")
            line_no = int(row.get("line_num") or "0")
            word_no = int(row.get("word_num") or "0")
        except ValueError:
            continue
        if confidence < OCR_MIN_CONFIDENCE:
            continue
        words.append(
            {
                "text": text,
                "bbox": _round_bbox((left, top, left + width, top + height)),
                "block_no": block_no,
                "line_no": paragraph_no * 1000 + line_no,
                "word_no": word_no,
            }
        )

    return words


def _ocr_heading_score(words: list[dict[str, Any]]) -> int:
    score = 0
    for word in words:
        text = str(word.get("text", "")).strip()
        compact = "".join(character for character in text if character.isalnum()).upper()
        if len(compact) < 4:
            continue
        if text.upper() == text or compact in HEADING_SCORE_KEYS:
            score += 1
    return score


def _ocr_result_score(words: list[dict[str, Any]]) -> int:
    lines = _line_rows(words)
    meaningful_lines = 0
    titleish_lines = 0
    time_lines = 0
    noise_lines = 0
    for line in lines:
        text = str(line.get("text", "")).strip()
        alpha_count = sum(character.isalpha() for character in text)
        if len(text.split()) >= 2 and alpha_count >= 8:
            meaningful_lines += 1
        if text.upper() == text and alpha_count >= 6:
            titleish_lines += 1
        if re.search(r"\d{1,2}:\d{2}", text):
            time_lines += 1
        if len(text) <= 8 and alpha_count <= 2:
            noise_lines += 1
    return (
        _ocr_heading_score(words) * 2
        + meaningful_lines
        + titleish_lines
        + time_lines * 2
        - noise_lines
    )


def _ocr_damage_score(words: list[dict[str, Any]]) -> int:
    damage = 0
    for line in _line_rows(words):
        text = str(line.get("text", "")).strip()
        if re.fullmatch(r"[A-Z]{1,2}\s+RENTALS\s*(?:\(\$\))?", text):
            damage += 3
        if re.search(r"\bDaily\s+f\s+\d{1,2}:\s*[-–—]\s*\d", text, flags=re.I):
            damage += 3
        if re.search(r"\bDaily\s+at\s*$", text, flags=re.I):
            damage += 3
        if re.search(r"\bmain\s+buil\b", text, flags=re.I):
            damage += 3
        if re.search(r"\bBar & Grill warm glow\b|\bwarm glow af\b|\bcomplimentar\b", text, flags=re.I):
            damage += 3
    return damage


def _ocr_word_rows(page: fitz.Page) -> list[dict[str, Any]]:
    """Return OCR words for image-only PDFs, scaled back into PDF coordinates."""
    primary_words = _ocr_words_from_render(page, zoom=OCR_ZOOM)
    enhanced_psm6_words = _ocr_words_from_render(
        page,
        zoom=ENHANCED_OCR_ZOOM,
        enhanced=True,
        page_segmentation_mode="6",
    )
    enhanced_psm4_words = _ocr_words_from_render(
        page,
        zoom=ENHANCED_OCR_ZOOM,
        enhanced=True,
        page_segmentation_mode="4",
    )
    candidates = [
        words
        for words in (
            primary_words,
            enhanced_psm6_words,
            enhanced_psm4_words,
        )
        if words
    ]
    if not primary_words:
        return max(
            candidates,
            key=_ocr_result_score,
            default=[],
        )
    primary_score = _ocr_heading_score(primary_words)
    enhanced_words = max(
        (enhanced_psm6_words, enhanced_psm4_words),
        key=_ocr_heading_score,
        default=[],
    )
    strongest_words = primary_words
    if (
        enhanced_words
        and _ocr_heading_score(enhanced_words)
        >= primary_score + ENHANCED_OCR_MIN_HEADING_GAIN
    ):
        strongest_words = enhanced_words
    if strongest_words and _ocr_damage_score(strongest_words):
        psm11_words = _ocr_words_from_render(
            page,
            zoom=ENHANCED_OCR_ZOOM,
            enhanced=False,
            page_segmentation_mode="11",
        )
        enhanced_psm11_words = _ocr_words_from_render(
            page,
            zoom=ENHANCED_OCR_ZOOM,
            enhanced=True,
            page_segmentation_mode="11",
        )
        best_sparse_words = max(
            (words for words in (psm11_words, enhanced_psm11_words) if words),
            key=lambda words: (-_ocr_damage_score(words), _ocr_result_score(words)),
            default=[],
        )
        if best_sparse_words and (
            _ocr_damage_score(best_sparse_words) < _ocr_damage_score(strongest_words)
            or _ocr_result_score(best_sparse_words) >= _ocr_result_score(strongest_words)
        ):
            strongest_words = best_sparse_words
    return strongest_words


def build_layout_snapshot(pdf_path: Path) -> dict[str, Any]:
    """Return deterministic PDF text evidence with page, word, and line boxes."""
    data = pdf_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    cached = _read_cached_layout_snapshot(digest)
    if cached is not None:
        return cached

    doc = fitz.open(stream=data, filetype="pdf")

    pages: list[dict[str, Any]] = []
    for page_index, page in enumerate(doc):
        words = [_word_row(word) for word in page.get_text("words", sort=True)]
        text_source = "pdf_text"
        if not words:
            words = _ocr_word_rows(page)
            text_source = "ocr" if words else "none"
        pages.append(
            {
                "page_number": page_index + 1,
                "width": round(page.rect.width, 3),
                "height": round(page.rect.height, 3),
                "text_source": text_source,
                "words": words,
                "lines": _line_rows(words),
            }
        )

    snapshot = {
        "source_path": str(pdf_path),
        "content_sha256": digest,
        "page_count": len(pages),
        "pages": pages,
    }
    _write_cached_layout_snapshot(snapshot)
    return snapshot


def _layout_snapshot_cache_dir() -> Path | None:
    value = os.environ.get("ACTIVITY_LAYOUT_SNAPSHOT_CACHE_DIR")
    if value is not None:
        value = value.strip()
        if value.lower() in {"", "0", "false", "off", "none"}:
            return None
        return Path(value)
    return DEFAULT_LAYOUT_SNAPSHOT_DIR


def _read_cached_layout_snapshot(digest: str) -> dict[str, Any] | None:
    cache_dir = _layout_snapshot_cache_dir()
    if cache_dir is None:
        return None
    path = cache_dir / f"{digest}.layout.json"
    try:
        snapshot = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    if snapshot.get("content_sha256") != digest:
        return None
    if not isinstance(snapshot.get("pages"), list):
        return None
    return snapshot


def _write_cached_layout_snapshot(snapshot: dict[str, Any]) -> None:
    cache_dir = _layout_snapshot_cache_dir()
    digest = snapshot.get("content_sha256")
    if cache_dir is None or not isinstance(digest, str) or not digest:
        return
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"{digest}.layout.json"
    if path.exists():
        return
    tmp_path = path.with_suffix(".layout.json.tmp")
    tmp_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))
    tmp_path.replace(path)


def write_layout_snapshot(pdf_path: Path, out_dir: Path) -> Path:
    snapshot = build_layout_snapshot(pdf_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{snapshot['content_sha256']}.layout.json"
    out_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))
    return out_path


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Write PDF layout evidence snapshot")
    parser.add_argument("pdf", type=Path)
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("data/processed/layout_snapshots"),
    )
    args = parser.parse_args()

    out_path = write_layout_snapshot(args.pdf, args.out_dir)
    print(out_path)


if __name__ == "__main__":
    main()
