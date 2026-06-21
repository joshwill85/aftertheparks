"""Parse Disney resort recreation calendar PDFs into normalized activities (v2)."""

from __future__ import annotations

import io
import re
import unicodedata
from dataclasses import dataclass, field

import fitz
import pytesseract
from PIL import Image

try:
    import pdfplumber
except ImportError:
    pdfplumber = None  # type: ignore

PARSER_VERSION = "2.0.0"

DEFAULT_SECTION_HEADERS = {
    "FAMILY WELLNESS",
    "RESORT ACTIVITIES",
    "SIGNATURE ACTIVITIES",
    "SIGNATURE ACTIVITY",
    "MOVIE UNDER THE STARS",
}

DAY_ALIASES = {
    "monday": "monday", "mon": "monday",
    "tuesday": "tuesday", "tue": "tuesday", "tues": "tuesday", "tucscay": "tuesday",
    "wednesday": "wednesday", "wed": "wednesday", "wenscay": "wednesday",
    "thursday": "thursday", "thu": "thursday", "thur": "thursday",
    "friday": "friday", "fri": "friday", "frigay": "friday",
    "saturday": "saturday", "sat": "saturday", "saturay": "saturday",
    "sunday": "sunday", "sun": "sunday",
}

CATEGORY_RULES: list[tuple[str, str]] = [
    (r"movie under the stars", "movies_under_stars"),
    (r"poolside|pool party|lava pool", "poolside"),
    (r"campfire|camp fire", "campfire"),
    (r"yoga|fitness|wellness|tai chi|pickleball|aqua", "fitness_wellness"),
    (r"tie-?dye|arts|craft|mosaic|paint|ceramic|lei|bowling pin|vinyl", "arts_crafts"),
    (r"arcade|video game", "arcade"),
    (r"character|greeting", "character_experience"),
    (r"trivia|bingo|disco|dance party|glow|nighttime", "nighttime_entertainment"),
    (r"find a friend|scavenger|nature walk|nature guide", "scavenger_hunt"),
    (r"bike|bicycle|surrey|boat|cabana|rental|marina", "rental"),
    (r"archery|pony|wagon|sleigh|carriage|chip.*dale|tri-circle", "resort_activity"),
    (r"community hall|lobby", "resort_activity"),
]


@dataclass
class ParseResult:
    activities: list["ParsedActivity"]
    ocr_text: str
    profile_key: str
    confidence: float
    warnings: list[str]
    extraction_method: str


@dataclass
class ParsedActivity:
    name: str
    normalized_name: str
    category: str
    section: str
    location: str | None = None
    schedule_text: str | None = None
    description: str | None = None
    is_fee_based: bool = False
    is_daily: bool = False
    days_of_week: list[str] = field(default_factory=list)
    start_time: str | None = None
    end_time: str | None = None
    movie_nights: list[dict[str, str]] = field(default_factory=list)
    confidence: float = 1.0
    warnings: list[str] = field(default_factory=list)


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name.lower())
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def _title_case_words(words: list[str]) -> str:
    parts: list[str] = []
    for w in words:
        if re.fullmatch(r"\d+", w):
            parts.append(w)
        elif len(w) <= 2 and w.isupper():
            parts.append(w)
        else:
            parts.append(w[:1].upper() + w[1:].lower() if w else w)
    return " ".join(parts)


def _split_words(s: str) -> list[str]:
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    s = s.replace("-", " ")
    return [w for w in s.split() if w]


def _clean_activity_name(name: str) -> str:
    """Fix OCR-spaced titles like 'R E E L F U N A R C A D E' → 'Reel Fun Arcade'."""
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        return name

    tokens = name.split()
    short_tokens = sum(1 for t in tokens if len(t) <= 2)
    looks_spaced = len(tokens) >= 4 and short_tokens / len(tokens) >= 0.65

    if looks_spaced or re.match(r"^(?:[A-Za-z]\s+){4,}[A-Za-z]$", name):
        collapsed = re.sub(r"\s+", "", name)
        try:
            import wordninja

            return _title_case_words(wordninja.split(collapsed.lower()))
        except ImportError:
            return _title_case_words(_split_words(collapsed))

    for sep in (" – ", " - "):
        if sep in name:
            return sep.join(_clean_activity_name(part) for part in name.split(sep))

    return name


def categorize(name: str, section: str) -> str:
    """Match activity name first; use section only as a tiebreaker."""
    name_hay = name.lower()
    section_hay = section.lower()

    for pattern, category in CATEGORY_RULES:
        if re.search(pattern, name_hay):
            return category

    # Section-only wellness header should not classify arcade/craft by name miss
    if re.search(r"yoga|fitness|wellness|tai chi|pickleball|aqua", name_hay):
        return "fitness_wellness"

    for pattern, category in CATEGORY_RULES:
        if re.search(pattern, section_hay):
            return category

    if section == "SIGNATURE ACTIVITIES":
        return "signature"
    return "other"


def _clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def _movie_title_quality(title: str) -> float:
    if not title:
        return 0.0
    cleaned = _clean_movie_title(title)
    if not cleaned:
        return 0.0
    alpha = sum(c.isalpha() for c in cleaned)
    return alpha / len(cleaned)


def _clean_movie_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"\s*\[[A-Za-z]{0,4}$", "", title)
    title = re.sub(r"\s*\([¢$Pe]{0,4}$", "", title)
    title = re.sub(r"\s+PG\)?\s*$", "", title, flags=re.I)

    quoted = re.search(r'"([^"]+)"', title)
    if quoted:
        return quoted.group(1).strip(' "\'|')

    match = re.search(
        r"(?:^|[.\s])([A-Z][\w\s'':,&-]+(?:\(\d{4}\))?(?:\s+PG)?)\s*$",
        title,
    )
    if match:
        return match.group(1).strip(' "\'|')

    segments = re.findall(r"[A-Z][a-zA-Z0-9\s'':,&-]+(?:\(\d{4}\))?", title)
    if segments:
        return segments[-1].strip(' "\'|')

    return title.strip(' "\'|')


def extract_text_layer(pdf_bytes: bytes) -> str | None:
    if pdfplumber is None:
        return None
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            chunks = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(chunks).strip()
        if len(text) > 200:
            return text
    except Exception:
        pass
    return None


def ocr_pdf_bytes(pdf_bytes: bytes, dpi: int = 200) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    chunks: list[str] = []
    for page in doc:
        pix = page.get_pixmap(dpi=dpi)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        chunks.append(pytesseract.image_to_string(img))
    return "\n".join(chunks)


def extract_layout_blocks(pdf_bytes: bytes) -> str:
    """Use block geometry to recover section structure when OCR misses graphic headers."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    lines: list[str] = []
    for page in doc:
        blocks = page.get_text("blocks")
        blocks = sorted(blocks, key=lambda b: (round(b[1] / 20), b[0]))
        for block in blocks:
            text = _clean_line(block[4])
            if text:
                lines.append(text)
    return "\n".join(lines)


def extract_pdf_text(pdf_bytes: bytes) -> tuple[str, str]:
    text = extract_text_layer(pdf_bytes)
    if text:
        return text, "text_layer"
    ocr = ocr_pdf_bytes(pdf_bytes)
    if len(ocr.strip()) > 100:
        return ocr, "ocr"
    layout = extract_layout_blocks(pdf_bytes)
    if len(layout.strip()) > len(ocr.strip()):
        return layout, "layout_blocks"
    return ocr, "ocr"


HEADING_BLOCKLIST = ("activities schedule", "information digitally", "scan this qr code")


def _is_heading(line: str, section_headers: set[str]) -> bool:
    line = _clean_line(line)
    if not line or len(line) > 80:
        return False
    if any(block in line.lower() for block in HEADING_BLOCKLIST):
        return False
    upper = line.upper()
    if upper in section_headers:
        return True
    if line.startswith("($)") or line.startswith("SCAN THIS"):
        return False
    if re.match(r"^[A-Z0-9][A-Z0-9 '&/().$-]{2,}$", line) and sum(c.isalpha() for c in line) >= 3:
        return True
    return False


def _infer_name_from_buffer(lines: list[str], section: str) -> str | None:
    blob = " ".join(lines).lower()
    rules = [
        (r"hidden .+ photo prop", "Find a Friend"),
        (r"nature guide|nature walk", "Nature Walk"),
        (r"poolside activities", "Poolside Activities"),
        (r"painting experience|inner artist", "Painting Experience"),
        (r"tie-dye|arts and crafts favorite", "Mickey Tie-Dye"),
        (r"campfire.+marshmallow|marshmallow.+campfire", "Campfire"),
        (r"island party", "Island Party"),
        (r"evening poolside", "Evening Poolside Activities"),
        (r"scavenger", "Resort Scavenger Hunt"),
        (r"pickleball", "Pickleball Clinic"),
        (r"yoga", "Disney Fit Yoga"),
        (r"community hall", "Community Hall"),
        (r"arcade", "Arcade"),
    ]
    for pattern, name in rules:
        if re.search(pattern, blob):
            return name
    if section == "MOVIE UNDER THE STARS":
        return "Movie Under the Stars"
    return None


def _parse_days(schedule: str) -> tuple[bool, list[str]]:
    lower = schedule.lower()
    if "daily" in lower or "nightly" in lower:
        return True, []
    days: list[str] = []
    for token in re.split(r"[^a-z]+", lower):
        if token in DAY_ALIASES:
            day = DAY_ALIASES[token]
            if day not in days:
                days.append(day)
    return False, days


def _parse_times(schedule: str) -> tuple[str | None, str | None]:
    times = re.findall(r"(\d{1,2}:\d{2}\s*(?:am|pm))", schedule, flags=re.I)
    if not times:
        times = re.findall(r"(\d{1,2}:\d{2})", schedule)
    if not times:
        return None, None
    start = times[0].lower().replace(" ", "")
    end = times[1].lower().replace(" ", "") if len(times) > 1 else None
    return start, end


def _normalize_day_token(token: str) -> str | None:
    cleaned = re.sub(r"[^a-z]", "", token.lower())
    for key, day in DAY_ALIASES.items():
        if cleaned.startswith(key[:3]) and len(cleaned) >= 3:
            return day
    return DAY_ALIASES.get(cleaned)


def _parse_movie_section(lines: list[str], section: str) -> ParsedActivity | None:
    if not lines:
        return None
    location = None
    rain_backup = None
    show_time = None
    movie_nights: list[dict[str, str]] = []
    warnings: list[str] = []

    for line in lines:
        clean = _clean_line(line)
        lower = clean.lower()
        if "rain" in lower or "inclement" in lower:
            rain_backup = clean
            continue
        if "|" in clean and re.search(r"\d{1,2}:\d{2}", clean):
            parts = [p.strip() for p in clean.split("|", 1)]
            location = parts[0]
            show_time = parts[1] if len(parts) > 1 else None
            continue
        if re.search(r"\d{1,2}:\d{2}", clean) and not movie_nights:
            show_time = clean

        # Day...Title patterns (ellipsis, dots, dashes)
        for sep in ("...", "…", " - ", " – "):
            if sep in clean:
                day_part, _, title_part = clean.partition(sep)
                day = _normalize_day_token(day_part)
                title = re.sub(r"\[[^\]]*\]", "", title_part).strip(" .|")
                title = re.sub(r"^[^A-Za-z0-9]+", "", title)
                title = re.sub(r"\|.*$", "", title).strip()
                title = _clean_movie_title(title)
                if day and title and _movie_title_quality(title) >= 0.55:
                    movie_nights.append({
                        "day_of_week": day,
                        "movie_title": title,
                        "show_time": show_time or "",
                        "rain_backup_location": rain_backup or "",
                    })
                elif day and title:
                    warnings.append(f"low_quality_movie_title:{title[:40]}")
                break
        else:
            # Monday: Title or Monday Title
            m = re.match(
                r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[:\-]?\s*(.+)$",
                clean,
                re.I,
            )
            if m:
                day = _normalize_day_token(m.group(1))
                title = m.group(2).strip()
                title = _clean_movie_title(title)
                if day and title and _movie_title_quality(title) >= 0.55:
                    movie_nights.append({
                        "day_of_week": day,
                        "movie_title": title,
                        "show_time": show_time or "",
                        "rain_backup_location": rain_backup or "",
                    })
                continue
            # Tab or multi-space separated: Monday    Title
            m2 = re.match(
                r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s{2,}(.+)$",
                clean,
                re.I,
            )
            if m2:
                day = _normalize_day_token(m2.group(1))
                title = re.sub(r"\|.*$", "", m2.group(2)).strip()
                title = _clean_movie_title(title)
                if day and title and _movie_title_quality(title) >= 0.55:
                    movie_nights.append({
                        "day_of_week": day,
                        "movie_title": title,
                        "show_time": show_time or "",
                        "rain_backup_location": rain_backup or "",
                    })

    conf = 0.9 if movie_nights else 0.4
    if warnings:
        conf = min(conf, 0.5)

    return ParsedActivity(
        name="Movie Under the Stars",
        normalized_name="movie-under-the-stars",
        category="movies_under_stars",
        section=section,
        location=location,
        schedule_text=show_time,
        movie_nights=movie_nights,
        confidence=conf,
        warnings=warnings,
    )


def parse_ocr_text(
    text: str,
    *,
    section_headers: set[str] | None = None,
    profile_key: str = "aframe_standard",
) -> ParseResult:
    headers = section_headers or DEFAULT_SECTION_HEADERS
    lines = [_clean_line(l) for l in text.splitlines()]
    lines = [l for l in lines if l and not l.startswith("SCAN THIS")]

    activities: list[ParsedActivity] = []
    warnings: list[str] = []
    current_section = "RESORT ACTIVITIES"
    buffer: list[str] = []
    current_name: str | None = None

    def flush_block() -> None:
        nonlocal current_name, buffer
        if not current_name and buffer:
            current_name = _infer_name_from_buffer(buffer, current_section)
        if not current_name:
            buffer = []
            return
        if current_section == "MOVIE UNDER THE STARS":
            movie = _parse_movie_section(buffer, current_section)
            if movie:
                activities.append(movie)
                warnings.extend(movie.warnings)
        else:
            act = _parse_activity_block(current_name, buffer, current_section)
            if act:
                activities.append(act)
                warnings.extend(act.warnings)
        current_name = None
        buffer = []

    for line in lines:
        upper = line.upper()
        if upper in headers or upper.startswith("SIGNATURE ACTIVIT"):
            flush_block()
            current_section = "SIGNATURE ACTIVITIES" if "SIGNATURE" in upper else upper
            continue
        if _is_heading(line, headers) and not line.lower().startswith("($)"):
            flush_block()
            current_name = line.title() if line.isupper() else line
            buffer = []
            continue
        if current_name:
            buffer.append(line)

    flush_block()

    if current_section != "MOVIE UNDER THE STARS":
        orphan_blob = "\n".join(lines)
        for chunk in re.split(
            r"(?=\n(?:Daily|Nightly|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b)",
            orphan_blob,
        ):
            chunk_lines = [_clean_line(l) for l in chunk.splitlines() if _clean_line(l)]
            if len(chunk_lines) < 2:
                continue
            name = _infer_name_from_buffer(chunk_lines, current_section)
            if not name:
                continue
            norm = normalize_name(name)
            if norm in {a.normalized_name for a in activities}:
                continue
            act = _parse_activity_block(name, chunk_lines, current_section)
            if act:
                activities.append(act)

    merged: dict[str, ParsedActivity] = {}
    for act in activities:
        key = act.normalized_name
        if key not in merged:
            merged[key] = act
        else:
            existing = merged[key]
            existing.movie_nights.extend(act.movie_nights)
            if not existing.location and act.location:
                existing.location = act.location
            if not existing.schedule_text and act.schedule_text:
                existing.schedule_text = act.schedule_text
            existing.confidence = min(existing.confidence, act.confidence)

    result_acts = list(merged.values())
    avg_conf = sum(a.confidence for a in result_acts) / len(result_acts) if result_acts else 0.0
    return ParseResult(
        activities=result_acts,
        ocr_text=text,
        profile_key=profile_key,
        confidence=round(avg_conf, 3),
        warnings=warnings,
        extraction_method="parse",
    )


def _parse_activity_block(name: str, lines: list[str], section: str) -> ParsedActivity | None:
    if not lines:
        return None

    warnings: list[str] = []
    is_fee = "($)" in name or any("($)" in l for l in lines)
    name = _clean_activity_name(re.sub(r"\s*\(\$\)\s*", "", name).strip())

    location = None
    schedule = None
    description_lines: list[str] = []

    for line in lines:
        lower = line.lower()
        if schedule is None and (
            "daily" in lower or "nightly" in lower
            or re.search(r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", lower)
            or re.search(r"\d{1,2}:\d{2}", lower)
        ):
            schedule = line
            continue
        if location is None and not re.search(r"\d{1,2}:\d{2}", line) and len(line) < 90:
            location = line
            continue
        description_lines.append(line)

    schedule = schedule or (lines[1] if len(lines) > 1 else None)
    is_daily, days = _parse_days(schedule or "")
    start, end = _parse_times(schedule or "")
    category = categorize(name, section)
    confidence = 0.85
    if category == "other":
        confidence = 0.6
        warnings.append(f"uncategorized:{name}")
    if not schedule:
        confidence = min(confidence, 0.7)
        warnings.append(f"missing_schedule:{name}")

    return ParsedActivity(
        name=name,
        normalized_name=normalize_name(name),
        category=category,
        section=section,
        location=location,
        schedule_text=schedule,
        description=" ".join(description_lines)[:500] if description_lines else None,
        is_fee_based=is_fee,
        is_daily=is_daily,
        days_of_week=days,
        start_time=start,
        end_time=end,
        confidence=confidence,
        warnings=warnings,
    )


def parse_pdf_bytes(pdf_bytes: bytes, profile_key: str = "aframe_standard") -> ParseResult:
    text, method = extract_pdf_text(pdf_bytes)
    headers = set(DEFAULT_SECTION_HEADERS)
    result = parse_ocr_text(text, section_headers=headers, profile_key=profile_key)
    result.extraction_method = method
    return result


# Backward-compatible helper
def parse_pdf_bytes_legacy(pdf_bytes: bytes) -> list[ParsedActivity]:
    return parse_pdf_bytes(pdf_bytes).activities
