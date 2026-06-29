"""Silver v2 extraction from Bronze+ layout snapshots with source spans."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import fitz

try:
    from layout_snapshot import build_layout_snapshot
    from title_quality import (
        activity_title_repair_key,
        is_blocked_activity_title,
        repair_known_activity_field,
        repair_known_context_activity_title,
        repair_known_activity_title,
    )
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .layout_snapshot import build_layout_snapshot
    from .title_quality import (
        activity_title_repair_key,
        is_blocked_activity_title,
        repair_known_activity_field,
        repair_known_context_activity_title,
        repair_known_activity_title,
    )


PARSER_VERSION = "layout-v2.0.0"
SECTION_KEYS = {
    "FAMILYWELLNESS",
    "RESORTACTIVITIES",
    "SIGNATUREACTIVITIES",
    "SIGNATUREACTIVITY",
}
TITLE_CONTINUATION_KEYS = {
    "ARTOFANIMATION",
    "DISNEYSWILDERNESSLODGE",
}
STACKED_TITLE_PAIR_KEYS = {
    ("MEDICINESHOW", "ARCADE"),
    ("UNDERTHE", "SEASHELLPAINTING"),
}
NON_ACTIVITY_TITLE_KEYS = {
    "DISNEY",
    "DISNEYS",
    "REST",
    "SUNDAY",
    "SUND",
    "MONDAY",
    "MONAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "THURSAY",
    "FRIDAY",
    "FRIDAYAY",
    "SATURDAY",
}
TITLE_CATEGORY_RULES: list[tuple[str, str]] = [
    ("MOVIE", "movies_under_stars"),
    ("POOLSIDE", "poolside"),
    ("CAMPFIRE", "campfire"),
    ("YOGA", "fitness_wellness"),
    ("WELLNESS", "fitness_wellness"),
    ("TIE-DYE", "arts_crafts"),
    ("MOSAIC", "arts_crafts"),
    ("MARBLE PAINTING", "arts_crafts"),
    ("BOWLING PIN", "arts_crafts"),
    ("ARTS & CRAFTS", "arts_crafts"),
    ("ARCADE", "arcade"),
    ("ARCHERY", "sports_games"),
    ("CANOE", "rental"),
    ("KAYAK", "rental"),
    ("PONY", "resort_activity"),
    ("WAGON", "resort_activity"),
    ("WINTER", "resort_activity"),
    ("LOBBY", "resort_activity"),
    ("SCAVENGER HUNT", "scavenger_hunt"),
    ("FIND A FRIEND", "scavenger_hunt"),
]
LOW_QUALITY_TEXT_PATTERNS = (
    r"\btoaether\b",
    r"\bunforaettable\b",
    r"\bbinao\b",
    r"\bull of fun\b",
    r"\bal levels\b",
    r"\bDisney and up\b",
    r"\bVetta\b",
    r"\bmain buil\b",
    r"\bpram\b",
    r"\bsaga Disney\b",
    r"\bGuests ages and up\b",
    r"\bplease call see\b",
    r"¢ a PY",
    r"\bBar & Grill warm glow\b",
    r"\bwarm glow af\b",
    r"\bcomplimentar\b",
    r"\bdally\b",
    r"\bpanis\b",
    r"\by our\b",
    r"\bh Spanish Mosaic\b",
    r"\bsca Pans\b",
)


def _slugify(value: str) -> str:
    value = value.replace("’", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _canonical_web_slug(title: str) -> str:
    key = _official_web_title_key(title)
    if key in {"MOVIEUNDERTHESTARS", "MOVIESUNDERTHESTARS"}:
        return "movie-under-the-stars"
    return _slugify(title)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u202f", " ")).strip()


def _repair_location_text(value: str) -> tuple[str, bool]:
    repaired = value
    repaired = re.sub(r"^[\s\-–—]+", "", repaired)
    repaired = re.sub(r"^OP Man Island\b", "Ol’ Man Island", repaired)
    repaired = re.sub(r"^Ol Man Island\b", "Ol’ Man Island", repaired)
    return repaired, repaired != value


def _repair_description_text(value: str) -> tuple[str, bool]:
    repaired = re.sub(r"\bselfled\b", "self-led", value, flags=re.I)
    repaired = re.sub(r"\bour Lush lawn\b", "our lush lawn", repaired)
    return repaired, repaired != value


def _repair_ocr_spaced_title(text: str) -> str | None:
    compact = re.sub(r"[^A-Za-z]+", "", text).upper()
    if compact in {
        "MOVEUNDERTESTARS",
        "MOVEUNDERTHESSTAR",
        "MOVEUNDERTHESTARS",
        "MOVVEUNDERTHESTARS",
        "MOVIEUNDERTESTARS",
        "MOVIEUNDERTHESSTAR",
        "MOVIEUNDERTHESTARS",
    }:
        return "Movie Under the Stars"
    if compact.startswith(("MOVEUNDER", "MOVIEUNDER")) and compact.endswith(("STAR", "STARS")):
        return "Movie Under the Stars"
    return None


def _line_span(line: dict[str, Any], index: int, page_number: int = 1) -> dict[str, Any]:
    return {
        "page": page_number,
        "line": index,
        "bbox": line["bbox"],
        "text": _clean_text(line["text"]),
    }


def _web_line_span(line: dict[str, Any]) -> dict[str, Any]:
    return {
        "page": 1,
        "line": int(line["line"]),
        "text": _clean_text(str(line["text"])),
    }


def extract_document_key_legends(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    legends: list[dict[str, Any]] = []
    seen: set[tuple[str, int, int]] = set()
    for page_number, page in enumerate(snapshot.get("pages", []), start=1):
        for index, line in enumerate(page.get("lines", []), start=1):
            text = _clean_text(line.get("text", ""))
            if re.search(r"\bfee associated\b", text, flags=re.I):
                key = ("fee", page_number, index)
                if key in seen:
                    continue
                seen.add(key)
                legends.append(
                    {
                        "kind": "fee",
                        "marker": "($)",
                        "label": "There is a fee associated with this activity.",
                        "spans": [_line_span(line, index, page_number)],
                    }
                )
    return legends


def _fee_legend_spans(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        span
        for legend in extract_document_key_legends(snapshot)
        if legend.get("kind") == "fee"
        for span in legend.get("spans", [])
        if isinstance(span, dict)
    ]


def _fee_claim_evidence(
    title_spans: list[dict[str, Any]],
    *,
    is_fee_based: bool,
    fee_legend_spans: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if is_fee_based:
        return [*title_spans, *fee_legend_spans]
    if not title_spans or not fee_legend_spans:
        return []
    title_evidence = dict(title_spans[0])
    title_evidence["field"] = "source_pdf_fee_marker_absent"
    title_evidence["source"] = "pdf_layout"
    title_evidence["text"] = (
        f"{title_evidence.get('text', '').strip()} (no ($) marker)"
        if title_evidence.get("text")
        else "Title has no ($) marker"
    )
    legend_evidence = []
    for span in fee_legend_spans:
        evidence = dict(span)
        evidence["field"] = "source_pdf_fee_legend"
        evidence["source"] = "pdf_layout"
        legend_evidence.append(evidence)
    return [title_evidence, *legend_evidence]


def _body_fee_claim_evidence(description: str, description_spans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not re.search(r"\bfees?\s+may\s+apply\b", description, flags=re.I):
        return []
    evidence: list[dict[str, Any]] = []
    for span in description_spans:
        item = dict(span)
        item["field"] = "source_pdf_body_fee_language"
        item["source"] = "pdf_layout"
        evidence.append(item)
    return evidence


def _parse_time_range(schedule_text: str) -> tuple[str | None, str | None]:
    if re.search(r"\bopen\s+24\s+hours\b|\b24\s+hours a day\b", schedule_text, flags=re.I):
        return "12:00am", "11:59pm"
    matches = list(re.finditer(r"\d{1,2}:\d{2}\s*(?:am|pm)", schedule_text, flags=re.I))
    times = [match.group(0) for match in matches]
    cleaned = [time.lower().replace(" ", "") for time in times]
    if not cleaned:
        return None, None
    if len(cleaned) < 2:
        return cleaned[0], None
    between = schedule_text[matches[0].end() : matches[1].start()]
    if re.search(r"[-–—]|\bto\b", between, flags=re.I):
        return cleaned[0], cleaned[1]
    return cleaned[0], None


def _split_combined_schedule_location(schedule_text: str) -> tuple[str, str] | None:
    text = _clean_text(schedule_text)
    match = re.match(r"^(daily|nightly)\s+(throughout|at|around)\s+(.+)$", text, flags=re.I)
    if not match:
        return None
    recurrence, preposition, location = match.groups()
    if re.search(r"\d{1,2}:\d{2}", location):
        return None
    location_text = (
        f"{preposition.lower()} {location}"
        if preposition.lower() in {"throughout", "around"}
        else location
    )
    return recurrence.title(), _clean_text(location_text)


def _split_pipe_schedule_location(schedule_text: str) -> tuple[str, str] | None:
    text = _clean_text(schedule_text)
    if "|" not in text:
        return None
    location, schedule = [_clean_text(part) for part in text.split("|", 1)]
    if not location or not schedule:
        return None
    if re.search(r"\d{1,2}:\d{2}", location):
        return None
    if not _looks_like_schedule(schedule):
        return None
    return schedule, location.title()


def _title_text(line_text: str) -> str | None:
    text = _clean_text(re.sub(r"\s*\(\$\)\s*$", "", line_text))
    if not text:
        return None
    key = activity_title_repair_key(text)
    lower = text.lower()
    if key in SECTION_KEYS or key in NON_ACTIVITY_TITLE_KEYS or is_blocked_activity_title(text):
        return None
    if (
        key
        in {
            "SCANTHISQR",
            "THISQRCODEANDSELECT",
            "CODEFORMORE",
            "INFORMATION",
            "SCANTHISQRCODEANDSELECT",
            "ACTIVITIESSCHEDULETOVIEW",
            "THISINFORMATIONDIGITALLY",
        }
        or lower.startswith("scan this")
        or "qr code and select" in lower
        or "information digitally" in lower
        or re.fullmatch(r"\d+", text)
    ):
        return None

    ocr_spaced_repair = _repair_ocr_spaced_title(text)
    if ocr_spaced_repair:
        return ocr_spaced_repair

    if re.search(r"\d{1,2}:\d{2}", text) or "|" in text or "." * 5 in text:
        return None
    if re.fullmatch(r"\d{3}[-–—]?[A-Z]{3}[-–—]?[A-Z]{4}[.!]?", text):
        return None
    if re.fullmatch(r"STORY\s+TIME\s+YOGA", text, flags=re.I):
        return "Story Time Yoga"

    repaired = repair_known_activity_title(text)
    raw_without_fee = _clean_text(re.sub(r"\s*\(\$\)\s*$", "", line_text))
    heading_text_pattern = r"[A-Z0-9 &'’\-.,!:]+"
    is_heading_style = (
        raw_without_fee.upper() == raw_without_fee
        or _title_is_fee_based(line_text)
        or re.fullmatch(heading_text_pattern, raw_without_fee)
    )
    if repaired and is_heading_style:
        return repaired
    if (
        repaired
        and key in {"FITNESCENTERS", "FITNESSSCENTERS"}
        and sum(c.isalpha() for c in text) >= 3
        and not re.search(r"[.!?]", text)
    ):
        return repaired
    if (
        not repaired
        and re.fullmatch(r"[A-Z]+", text)
        and len(text) <= 4
    ):
        return None
    if re.fullmatch(heading_text_pattern, text) and len(text) <= 52 and sum(c.isalpha() for c in text) >= 3:
        return text.title().replace("’S", "’s")
    return None


def _is_section_heading(text: str) -> bool:
    key = activity_title_repair_key(text)
    return key in SECTION_KEYS or is_blocked_activity_title(text)


def _is_footer_or_notice_line(text: str) -> bool:
    cleaned = _clean_text(text)
    return bool(
        re.match(r"^\(?\$\)\s+there is a fee associated", cleaned, flags=re.I)
        or re.match(r"^\d{4}\s*[-–—]\s*V\d+\b", cleaned, flags=re.I)
        or re.match(r"^\d{4}$", cleaned)
    )


def _title_is_fee_based(line_text: str) -> bool:
    return bool(re.search(r"\(\$\)\s*$", line_text))


def _category_for_title(title: str) -> str:
    upper = title.upper()
    for needle, category in TITLE_CATEGORY_RULES:
        if needle in upper:
            return category
    return "other"


def _title_can_serve_as_location(title: str) -> bool:
    return bool(
        re.search(
            r"\b(arcade|games|fitness center|activity center|community hall|cabana rentals|boat rentals)\b",
            title,
            flags=re.I,
        )
        or re.search(
            r"\broom\b",
            title,
            flags=re.I,
        )
    )


def _looks_like_schedule(text: str) -> bool:
    cleaned = _clean_text(text)
    return bool(
        re.search(r"\d{1,2}:\d{2}", cleaned, flags=re.I)
        or re.match(
            r"^(daily|nightly|open\s+24|hours a day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
            cleaned,
            flags=re.I,
        )
    )


def _looks_like_schedule_continuation(text: str) -> bool:
    cleaned = _clean_text(text)
    day_pattern = r"sunday|monday|tuesday|wednesday|thursday|friday|saturday"
    return bool(
        (
            re.search(r"\d{1,2}:\d{2}\s*(?:am|pm)", cleaned, flags=re.I)
            and re.search(rf"\b(and|or|from|to|{day_pattern})\b", cleaned, flags=re.I)
        )
        or re.match(rf"^(and\s+)?({day_pattern})\b", cleaned, flags=re.I)
        or re.match(r"^additional activities and crafts on\b", cleaned, flags=re.I)
        or re.match(r"^from\s+\d{1,2}:\d{2}\s*(?:am|pm)", cleaned, flags=re.I)
    )


def _looks_like_orphan_activity_schedule_block(text: str) -> bool:
    cleaned = _clean_text(text)
    if not re.search(r"\d{1,2}:\d{2}\s*(?:am|pm)", cleaned, flags=re.I):
        return False
    return bool(
        re.match(
            r"^(daily|nightly|from|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b",
            cleaned,
            flags=re.I,
        )
    )


def _looks_like_location_line(text: str) -> bool:
    cleaned = _clean_text(text)
    if not cleaned or _looks_like_schedule(cleaned) or _is_section_heading(cleaned):
        return False
    if re.match(
        r"^(enjoy|join|play|get|create|search|continue|put|ground|design|learn|teach|pre-register)\b",
        cleaned,
        flags=re.I,
    ):
        return False
    words = cleaned.split()
    if len(words) > 10:
        return False
    location_noun = bool(
        re.search(
            r"\b(throughout|inside|outside|near|between|around|lawn|pool|deck|court|hall|arcade|beach|bridge|fountain|lobby|courtyard|building|buildings|springs|bay|cay|green|marina|field|overlook|spa|summerhouse|library|place|playground|club|lounge)\b",
            cleaned,
            flags=re.I,
        )
    )
    if re.search(r"[.!?]", cleaned) and not (location_noun and len(words) <= 8):
        return False
    titlecaseish = all(
        word[:1].isupper() or word.lower() in {"and", "at", "of", "the", "near", "-"}
        for word in re.split(r"\s+", cleaned.replace("—", " "))
        if word
    )
    return location_noun or titlecaseish


def _looks_like_location_continuation_line(text: str) -> bool:
    cleaned = _clean_text(text)
    if not cleaned or _looks_like_schedule(cleaned) or _is_section_heading(cleaned):
        return False
    if _title_text(cleaned) or _is_decorative_fragment(cleaned) or _is_footer_or_notice_line(cleaned):
        return False
    if len(cleaned.split()) > 5:
        return False
    return _looks_like_location_line(cleaned)


def _collect_location_parts(
    location_item: tuple[int, dict[str, Any]],
    location_search_lines: list[tuple[int, dict[str, Any]]],
) -> list[tuple[int, dict[str, Any]]]:
    location_index, location_line = location_item
    parts = [location_item]
    location_text = _clean_text(location_line["text"])
    if not re.search(r"[-–—]\s*$", location_text):
        for continuation_index, continuation_line in location_search_lines:
            if continuation_index <= location_index:
                continue
            continuation_text = _clean_text(continuation_line["text"])
            if not _same_column(continuation_line, location_line):
                continue
            if continuation_line["bbox"][1] - location_line["bbox"][3] > 70:
                break
            is_parenthetical_location = continuation_text.startswith("(")
            if not re.match(r"^and\s+", continuation_text, flags=re.I) and not is_parenthetical_location:
                break
            if not _looks_like_location_continuation_line(continuation_text):
                break
            parts.append((continuation_index, continuation_line))
            break
        return parts

    for continuation_index, continuation_line in location_search_lines:
        if continuation_index <= location_index:
            continue
        continuation_text = _clean_text(continuation_line["text"])
        if not _same_column(continuation_line, location_line):
            continue
        if not _looks_like_location_continuation_line(continuation_text):
            break
        parts.append((continuation_index, continuation_line))
        break
    return parts


def _split_location_prefixed_schedule(text: str) -> tuple[str, str] | None:
    cleaned = _clean_text(text)
    match = re.match(r"^(.+?):\s+(.+)$", cleaned)
    if not match:
        return None
    location, schedule = match.groups()
    if not _looks_like_location_line(location):
        return None
    if not (
        _looks_like_schedule(schedule)
        or _looks_like_schedule_continuation(schedule)
    ):
        return None
    return location, schedule


def _is_decorative_fragment(text: str) -> bool:
    cleaned = _clean_text(text)
    if not cleaned:
        return True
    if cleaned in {"—}", "|", "iy", "4", "x", "‘", "»", "~~", "."}:
        return True
    alpha_count = sum(character.isalpha() for character in cleaned)
    return len(cleaned) <= 8 and alpha_count <= 2


def _field_quality_warnings(field_name: str, text: str) -> list[str]:
    cleaned = _clean_text(text)
    day_name = r"Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday"
    day_fragment = rf"(?:{day_name}|and|or|,|\s)+"
    if (
        field_name == "description"
        and re.fullmatch(
            rf"(?:{day_name})(?:,\s*(?:{day_name}))*\s*(?:(?:and|or)(?:\s+(?:{day_name}))?)?",
            cleaned,
            flags=re.I,
        )
    ):
        return [f"{field_name}:text_quality_low"]
    if (
        field_name == "description"
        and re.fullmatch(day_fragment, cleaned, flags=re.I)
    ):
        return [f"{field_name}:text_quality_low"]
    if (
        field_name == "description"
        and re.fullmatch(day_fragment, cleaned, flags=re.I)
        and re.search(r"\b(and|or)\s*$", cleaned, flags=re.I)
    ):
        return [f"{field_name}:text_quality_low"]
    if any(re.search(pattern, text, flags=re.I) for pattern in LOW_QUALITY_TEXT_PATTERNS):
        return [f"{field_name}:text_quality_low"]
    return []


def _schedule_quality_warnings(schedule_text: str) -> list[str]:
    text = _clean_text(schedule_text)
    if not text:
        return []
    if (
        re.match(r"^\d{1,2}:\d{2}\s*(?:am|pm)\s+(?:and|or)\s+\d{1,2}:\d{2}\s*(?:am|pm)$", text, flags=re.I)
        and not re.search(r"\b(daily|nightly|sunday|monday|tuesday|wednesday|thursday|friday|saturday|open)\b", text, flags=re.I)
    ):
        return ["schedule:text_quality_low"]
    if re.search(r":\s*;|;\s*\d{2}\s*(?:am|pm)|\d{1,2}:\s*[-–—]|f\s+\d{1,2}:\s*[-–—]\s*\d", text, flags=re.I):
        return ["schedule:text_quality_low"]
    if re.search(r"\bat\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+at\b", text, flags=re.I):
        return ["schedule:text_quality_low"]
    if re.search(r"^(?:and|or)\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b", text, flags=re.I):
        return ["schedule:text_quality_low"]
    if (
        re.fullmatch(r"(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|and|or|,|\s)+", text, flags=re.I)
        and not re.search(r"\d{1,2}:\d{2}|\b(?:daily|nightly|open)\b", text, flags=re.I)
    ):
        return ["schedule:text_quality_low"]
    if re.search(r"\b(?:daily|nightly|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:at|from)\s*$", text, flags=re.I):
        return ["schedule:incomplete_time_phrase"]
    if re.search(r"\bfrom\s*$", text, flags=re.I):
        return ["schedule:incomplete_time_phrase"]
    if re.search(r"\d{1,2}:\s*[-–—]\s*\d{1,2}:", text):
        return ["schedule:incomplete_time_phrase"]
    return []


def _movie_title_from_line(text: str) -> tuple[str, str] | None:
    match = re.match(
        r"^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\.*\s*(.+)$",
        text,
        flags=re.I,
    )
    if not match:
        return None
    day = match.group(1).lower()
    title = match.group(2).replace("“", "").replace("”", "").strip(" .\"")
    if re.match(r"^(?:,|and)\b", title, flags=re.I):
        return None
    if re.search(r"\b(?:at|from)\s+\d{1,2}:\d{2}\s*(?:am|pm)", title, flags=re.I):
        return None
    if title:
        return day, title
    return None


def _clean_movie_title(text: str) -> str:
    cleaned = _clean_text(text).replace("“", "").replace("”", "").strip(" .\"")
    cleaned = re.sub(r"\s*\|?\s*(?:G|PG|PG-13|R|PS|P5)\s*$", "", cleaned).strip(" |")
    return cleaned


def _normalize_movie_schedule_text(text: str) -> str:
    if "|" not in text:
        return text
    location, time = [part.strip() for part in text.split("|", 1)]
    location, _ = _repair_location_text(location)
    return f"{location.title()} | {time}"


def _ocr_movie_day(text: str) -> str | None:
    compact = re.sub(r"[^A-Za-z]", "", text).upper()
    if compact.startswith(("SUNDAY", "SUNCAY", "SUNAY", "SUINCAY", "SUNGAY", "SUN")):
        return "sunday"
    if compact.startswith(("MONDAY", "MONAY", "MONCAY", "MON")):
        return "monday"
    if compact.startswith(("TUESDAY", "TUCSCAY", "TUCSAY", "TUCSCA", "TUCSA", "TUC", "TUE")):
        return "tuesday"
    if compact.startswith(("WEDNESDAY", "WENESDAY", "WENESAAY", "WENESCAY", "WEN")):
        return "wednesday"
    if compact.startswith(("THURSDAY", "THURSCAY", "THURSDA", "THUR", "THU")):
        return "thursday"
    if compact.startswith(("FRIDAY", "FRICLAY", "FICLAY", "FIICLAY", "FICAY", "FIICAY", "FRI")):
        return "friday"
    if compact.startswith(("SATURDAY", "SATURAY", "SATUPAY", "SATULCAY", "SATUAY", "SAT")):
        return "saturday"
    return None


def _repair_ocr_movie_title(text: str) -> str | None:
    compact = re.sub(r"[^A-Za-z0-9]", "", text).upper()
    raw = _clean_text(text)
    if re.search(r"M(?:OANA|OCNG|OGNG|OGNA)2\b", compact):
        return "Moana 2"
    if re.search(r"L(?:ILO|HLO).*STITCH.*2002|STITCH2002", compact):
        return "Lilo & Stitch (2002)"
    if re.search(r"L(?:ILO|HLO).*STITCH", compact):
        return "Lilo & Stitch"
    if "HIGHSCHOOLMUSICAL2" in compact:
        return "High School Musical 2"
    if re.search(r"B(?:EAU|EGU|ECU|ECUL)T?YANDTHEBEAST1991", compact):
        return "Beauty and the Beast (1991)"
    if "TEENBEACHMOVIE" in compact or "LEONBEACHMOVIE" in compact:
        return "Teen Beach Movie"
    if "TURNINGRED" in compact or "LUMINGREDD" in compact:
        return "Turning Red"
    toy_match = re.search(r"(?:TOY|LOY|JOY)ST(?:OR|OL)Y([234])?", compact)
    if toy_match:
        suffix = toy_match.group(1)
        return f"Toy Story {suffix}" if suffix else "Toy Story"
    if "PARENTTRAP1998" in compact:
        return "The Parent Trap (1998)"
    if "PARENTTRAP" in compact:
        return "The Parent Trap"
    if "PRINCESSANDTHEFROG" in compact:
        return "The Princess and the Frog"
    if "LITTLEMERMAID1989" in compact:
        return "The Little Mermaid (1989)"
    if "LITTLEMERMAID" in compact:
        return "The Little Mermaid"
    if "BIGHERO6" in compact:
        return "Big Hero 6"
    if "MUFASATHELIONKING" in compact:
        return "Mufasa: The Lion King"
    if re.search(r"(?:THE|DHE)?LIONKING1994", compact):
        return "The Lion King (1994)"
    if re.search(r"(?:THE|DHE)?LIONKING", compact):
        return "The Lion King"
    if re.search(r"F(?:IND|ING|NG)INGNEMO|FINGINGNEMO", compact):
        return "Finding Nemo"
    if re.search(r"F(?:IND|ING|NG)INGDORY|(?:DING|INING)DORY", compact):
        return "Finding Dory"
    if re.search(r"R(?:ATATOUILLE|ATATOUILE|ACATOUIILE|ACATOUII)", compact):
        return "Ratatouille"
    if "CINDERELLA1950" in compact:
        return "Cinderella (1950)"
    if "CINDERELLA" in compact:
        return "Cinderella"
    if "ZOOTOPIA2" in compact or "LOOCOPIC2" in compact:
        return "Zootopia 2"
    if re.search(r"F(?:ROZEN|TOZEN|FOZEN)2", compact):
        return "Frozen 2"
    if "FROZEN" in compact or "FFOZEN" in compact or "FTOZEN" in compact:
        return "Frozen"
    if "BAMBI" in compact or "BOIMDI" in compact or "BOMDI" in compact:
        return "Bambi"
    if "ALADDIN1992" in compact:
        return "Aladdin (1992)"
    if "ALADDIN" in compact:
        return "Aladdin"
    if re.search(r"\bCIS\b|\bCARS\b", raw, flags=re.I):
        return "Cars"
    if re.search(r"\b(?:UD|UP)\b", raw, flags=re.I):
        return "Up"
    if re.search(r"\bLUC[AD]?\b", raw, flags=re.I) or "LUCA" in compact or "LUCD" in compact:
        return "Luca"
    if "TANGLED" in compact or "FNGLED" in compact or "FNGLE" in compact or "JNGLEM" in compact:
        return "Tangled"
    if "MULAN1998" in compact:
        return "Mulan (1998)"
    if "MULAN" in compact:
        return "Mulan"
    if "INCREDIBLES" in compact:
        return "The Incredibles"
    if re.search(r"M(?:OANA|OGNG|OGNA|ONA)\b", compact):
        return "Moana"
    return None


def _movie_show_time_from_schedule(schedule_text: str) -> str:
    if "|" in schedule_text:
        return schedule_text.split("|", 1)[1].strip()
    start_time, _ = _parse_time_range(schedule_text)
    return start_time or ""


def _ocr_movie_table_rows(
    *,
    pdf_path: Path,
    title_span: dict[str, Any],
    schedule_text: str,
) -> list[dict[str, Any]]:
    if not shutil.which("tesseract"):
        return []

    try:
        doc = fitz.open(pdf_path)
        page_index = max(0, int(title_span.get("page", 1)) - 1)
        page = doc[page_index]
        bbox = title_span.get("bbox") if isinstance(title_span.get("bbox"), list) else []
        if len(bbox) != 4:
            return []
        clip = fitz.Rect(
            max(0, float(bbox[0]) - 50),
            max(0, float(bbox[1]) - 20),
            min(page.rect.width, float(bbox[2]) + 80),
            min(page.rect.height, float(bbox[1]) + 560),
        )
        tmp_root = Path.home() / "tmp"
        tmp_root.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=str(tmp_root)) as tmp_dir:
            image_path = Path(tmp_dir) / "movie-table.png"
            page.get_pixmap(
                matrix=fitz.Matrix(2.5, 2.5),
                clip=clip,
                alpha=False,
            ).save(image_path)
            result = subprocess.run(
                ["tesseract", str(image_path), "stdout", "--psm", "6"],
                check=False,
                capture_output=True,
                text=True,
                timeout=45,
            )
    except Exception:
        return []

    if result.returncode != 0:
        return []

    rows: list[dict[str, Any]] = []
    seen_days: set[str] = set()
    show_time = _movie_show_time_from_schedule(schedule_text)
    for raw_line in result.stdout.splitlines():
        text = _clean_text(raw_line)
        if not text:
            continue
        day = _ocr_movie_day(text)
        if not day or day in seen_days:
            continue
        movie_title = _repair_ocr_movie_title(text)
        if not movie_title:
            continue
        seen_days.add(day)
        rows.append(
            {
                "day_of_week": day,
                "movie_title": movie_title,
                "show_time": show_time,
                "source_span": {
                    "page": title_span.get("page", 1),
                    "line": title_span.get("line", 1),
                    "bbox": [round(clip.x0, 3), round(clip.y0, 3), round(clip.x1, 3), round(clip.y1, 3)],
                    "text": text,
                    "source": "ocr_movie_table",
                },
            }
        )
    return rows


def _movie_nights_look_incomplete(movie_nights: list[dict[str, Any]]) -> bool:
    if len(movie_nights) < 2:
        return True
    for row in movie_nights:
        title = _clean_text(str(row.get("movie_title") or ""))
        if not title or re.search(r"\b(?:at|from)\s+\d{1,2}:\d{2}\s*(?:am|pm)", title, flags=re.I):
            return True
    return False


def _can_prefix_movie_schedule_location(text: str) -> bool:
    key = activity_title_repair_key(text)
    return bool(
        text
        and not _looks_like_schedule(text)
        and (not _is_section_heading(text) or key in {"MOVIELAWNNEAR", "NEAR"})
    )


def _same_column(line: dict[str, Any], anchor: dict[str, Any]) -> bool:
    line_x0, _, line_x1, _ = line["bbox"]
    anchor_x0, _, anchor_x1, _ = anchor["bbox"]
    line_center = (line_x0 + line_x1) / 2
    left_edges_align = abs(line_x0 - anchor_x0) <= 80
    center_within_anchor_band = anchor_x0 - 40 <= line_center <= anchor_x1 + 80
    return left_edges_align or center_within_anchor_band


def _looks_like_next_heading(text: str) -> bool:
    key = activity_title_repair_key(text)
    if key in {
        "POOLSIDEACTIVITIES",
        "FINDAFRIEND",
        "REELFUNARCADE",
        "NOTEABLEGAMESARCADE",
        "GAMEPOINTARCADE",
        "ARTSCRAFTS",
    }:
        return True
    if re.fullmatch(r"[A-Z0-9 &'\-()$]+", text) and len(text) < 40:
        return key not in {"DISNEYSALLSTARRESORTS"}
    return False


def _find_title_line(lines: list[dict[str, Any]], title_key: str) -> tuple[int, dict[str, Any]] | None:
    for index, line in enumerate(lines, start=1):
        if activity_title_repair_key(line["text"]) == title_key:
            return index, line
    return None


def _arts_crafts_table_option_lines(
    lines_with_numbers: list[tuple[int, dict[str, Any]]],
) -> set[int]:
    option_lines: set[int] = set()
    for position, (line_number, line) in enumerate(lines_with_numbers):
        if activity_title_repair_key(line["text"]) not in {"ARTSCRAFTS", "ARTSANDCRAFTS"}:
            continue
        table_top = line["bbox"][1]
        left_edge = line["bbox"][0]
        for later_number, later_line in lines_with_numbers[position + 1 :]:
            text = _clean_text(later_line["text"])
            if later_line["bbox"][1] - table_top > 170:
                break
            if activity_title_repair_key(text) in {"DISNEYTRIVIA", "EXPLORERSCAMPFIRE"}:
                break
            if not _title_text(text):
                continue
            option_x0, _, option_x1, _ = later_line["bbox"]
            if left_edge + 350 <= option_x0 and option_x1 <= left_edge + 760:
                option_lines.add(later_number)
    return option_lines


def _collect_title_parts(
    lines_with_numbers: list[tuple[int, dict[str, Any]]],
    title_position: int,
) -> list[tuple[int, dict[str, Any]]]:
    title_index, title_line = lines_with_numbers[title_position]
    parts = [(title_index, title_line)]
    current_bottom = title_line["bbox"][3]

    for later_position in range(title_position + 1, len(lines_with_numbers)):
        later_index, later_line = lines_with_numbers[later_position]
        if later_line["bbox"][1] - current_bottom > 90:
            break
        if not _same_column(later_line, title_line):
            continue
        later_title = _title_text(later_line["text"])
        later_key = activity_title_repair_key(later_line["text"])
        title_key = activity_title_repair_key(title_line["text"])
        stacked_title_pair = (
            len(parts) == 1
            and (title_key, later_key) in STACKED_TITLE_PAIR_KEYS
        )
        stacked_fee_title = bool(
            later_title
            and len(parts) == 1
            and _title_is_fee_based(later_line["text"])
            and not _title_is_fee_based(title_line["text"])
        )
        explicit_continuation = later_key in TITLE_CONTINUATION_KEYS or stacked_fee_title or stacked_title_pair
        if not later_title and not explicit_continuation:
            break
        allowed_gap = 24 if explicit_continuation else 10
        if later_line["bbox"][1] - current_bottom > allowed_gap:
            break
        parts.append((later_index, later_line))
        current_bottom = max(current_bottom, later_line["bbox"][3])

    return parts


def extract_wellness_candidate(
    *,
    pdf_path: Path,
    calendar_group_key: str,
) -> dict[str, Any] | None:
    snapshot = build_layout_snapshot(pdf_path)
    document_key_legends = extract_document_key_legends(snapshot)
    page = snapshot["pages"][0]
    lines = page["lines"]
    found = _find_title_line(lines, "WELLNESSSCAVENGERHUNT")
    if not found:
        return None

    title_index, title_line = found
    title_raw = _clean_text(title_line["text"])
    title_normalized = repair_known_activity_title(title_raw) or title_raw.title()
    title_span = _line_span(title_line, title_index)

    field_lines = [
        (index, line)
        for index, line in enumerate(lines[title_index:], start=title_index + 1)
        if _same_column(line, title_line)
    ]

    location_index, location_line = field_lines[0]
    schedule_index, schedule_line = next(
        (item for item in field_lines if re.search(r"\d{1,2}:\d{2}", item[1]["text"])),
        field_lines[1],
    )

    description_lines: list[tuple[int, dict[str, Any]]] = []
    saw_prize_location = False
    for index, line in field_lines:
        if index <= schedule_index:
            continue
        text = _clean_text(line["text"])
        if _looks_like_next_heading(text):
            break
        if not text:
            continue
        description_lines.append((index, line))
        lower = text.lower()
        if "any merchandise location" in lower:
            saw_prize_location = True
        if saw_prize_location and "all-star resorts" in lower:
            break

    schedule_text = _clean_text(schedule_line["text"])
    start_time, end_time = _parse_time_range(schedule_text)
    description = _clean_text(" ".join(line["text"] for _, line in description_lines))
    description_spans = [_line_span(line, index) for index, line in description_lines]
    location_text = _clean_text(location_line["text"])
    location_span = _line_span(location_line, location_index)
    schedule_span = _line_span(schedule_line, schedule_index)

    warnings: list[str] = []
    if not description_spans:
        warnings.append("description:missing_source_span")
    if not end_time:
        warnings.append("schedule:end_time_missing")
    warnings.extend(_field_quality_warnings("description", description))

    slug = _slugify(title_normalized)
    return {
        "candidate_id": f"{snapshot['content_sha256']}:{calendar_group_key}:{slug}",
        "calendar_group_key": calendar_group_key,
        "source_pdf": str(pdf_path),
        "content_sha256": snapshot["content_sha256"],
        "parser_version": PARSER_VERSION,
        "profile_key": "aframe_layout_v2",
        "raw_fields": {
            "title": {"value": title_raw, "source": "pdf_layout", "spans": [title_span]},
            "location": {"value": location_text, "source": "pdf_layout", "spans": [location_span]},
            "schedule": {"text": schedule_text, "source": "pdf_layout", "spans": [schedule_span]},
            "description": {
                "value": description,
                "source": "pdf_layout",
                "spans": description_spans,
            },
        },
        "normalized_fields": {
            "title": {"value": title_normalized, "source": "title_repair", "spans": [title_span]},
            "slug": slug,
            "category": "fitness_wellness",
            "location": {"value": location_text, "source": "pdf_layout", "spans": [location_span]},
            "schedule": {
                "text": schedule_text,
                "start_time": start_time,
                "end_time": end_time,
                "source": "pdf_layout",
                "spans": [schedule_span],
            },
            "description": {
                "value": description,
                "source": "pdf_layout",
                "spans": description_spans,
            },
            "is_fee_based": False,
            "fee_evidence": [],
            "document_key_legends": document_key_legends,
        },
        "confidence": 1.0 if not warnings else 0.6,
        "warnings": warnings,
    }


def _candidate_from_title(
    *,
    snapshot: dict[str, Any],
    lines_with_numbers: list[tuple[int, dict[str, Any]]],
    title_position: int,
    calendar_group_key: str,
    pdf_path: Path,
) -> dict[str, Any]:
    document_key_legends = extract_document_key_legends(snapshot)
    title_parts = _collect_title_parts(lines_with_numbers, title_position)
    continuation_indices = {index for index, _ in title_parts[1:]}
    title_index, title_line = title_parts[0]
    title_raw = _clean_text(" ".join(line["text"] for _, line in title_parts))
    context_title_repair = repair_known_context_activity_title(
        calendar_group_key=calendar_group_key,
        raw=title_raw,
    )
    title_normalized = context_title_repair or _title_text(title_raw) or title_raw.title()
    title_source = "reviewed_title_repair" if context_title_repair else "title_repair"
    slug = _slugify(title_normalized)
    title_spans = [_line_span(line, index) for index, line in title_parts]
    title_span = title_spans[0]

    next_title_y = None
    if slug != "movie-under-the-stars":
        for later_position in range(title_position + 1, len(lines_with_numbers)):
            later_index, later_line = lines_with_numbers[later_position]
            if later_index in continuation_indices:
                continue
            if _title_text(later_line["text"]) and _same_column(later_line, title_line):
                next_title_y = later_line["bbox"][1]
                break

    field_lines = [
        (index, line)
        for index, line in lines_with_numbers[title_position + 1 :]
        if index not in continuation_indices
        if _same_column(line, title_line)
        and (next_title_y is None or line["bbox"][1] < next_title_y)
    ]

    if slug == "movie-under-the-stars":
        return _movie_candidate(
            snapshot=snapshot,
            title_index=title_index,
            title_raw=title_raw,
            title_normalized=title_normalized,
            title_span=title_span,
            field_lines=field_lines,
            calendar_group_key=calendar_group_key,
            pdf_path=pdf_path,
            document_key_legends=document_key_legends,
        )

    warnings: list[str] = []
    schedule_item = next(
        (item for item in field_lines if _looks_like_schedule(item[1]["text"])),
        None,
    )
    schedule_position = field_lines.index(schedule_item) if schedule_item else -1
    if schedule_item:
        location_search_lines = field_lines[:schedule_position]
    else:
        location_search_lines = [
            item
            for item in field_lines
            if _clean_text(item[1]["text"])
            and not _is_decorative_fragment(item[1]["text"])
        ][:1]
    location_item = next(
        (
            item
            for item in location_search_lines
            if _looks_like_location_line(item[1]["text"])
            and not _is_footer_or_notice_line(item[1]["text"])
        ),
        None,
    )

    if schedule_item:
        schedule_index, schedule_line = schedule_item
    else:
        schedule_index = -1
        schedule_line = {"text": "", "bbox": []}
        warnings.append("schedule:missing_source_span")
    schedule_lines = [(schedule_index, schedule_line)]
    schedule_text = _clean_text(schedule_line["text"])
    pipe_schedule_location = _split_pipe_schedule_location(schedule_text)
    if pipe_schedule_location:
        schedule_text = pipe_schedule_location[0]
    combined_schedule_location = _split_combined_schedule_location(schedule_text)
    if combined_schedule_location:
        schedule_text = combined_schedule_location[0]
    needs_schedule_continuation = (
        not _parse_time_range(schedule_text)[0]
        or schedule_text.endswith(",")
        or schedule_text.endswith(";")
        or bool(re.search(r"\b(and|or)$", schedule_text, flags=re.I))
    )
    if schedule_item and needs_schedule_continuation:
        for continuation_index, continuation_line in field_lines[schedule_position + 1 :]:
            continuation_text = _clean_text(continuation_line["text"])
            if not continuation_text:
                continue
            if _title_text(continuation_text) or _is_section_heading(continuation_text):
                break
            if not _looks_like_schedule_continuation(continuation_text):
                break
            schedule_lines.append((continuation_index, continuation_line))
            schedule_text = _clean_text(f"{schedule_text} {continuation_text}")
    prefixed_schedule_location: tuple[str, list[tuple[int, dict[str, Any]]]] | None = None
    if location_item:
        prefixed = _split_location_prefixed_schedule(location_item[1]["text"])
        if prefixed and schedule_item:
            location_prefix, first_schedule_fragment = prefixed
            prefix_lines = [location_item]
            schedule_lines = [location_item, *schedule_lines]
            schedule_text = _clean_text(
                f"{first_schedule_fragment} {schedule_text}"
            )
            for continuation_index, continuation_line in field_lines[schedule_position + 1 :]:
                continuation_text = _clean_text(continuation_line["text"])
                continuation_prefixed = _split_location_prefixed_schedule(continuation_text)
                if not continuation_prefixed:
                    continue
                continuation_location, continuation_schedule = continuation_prefixed
                if _clean_text(continuation_location).lower() != _clean_text(location_prefix).lower():
                    continue
                schedule_lines.append((continuation_index, continuation_line))
                prefix_lines.append((continuation_index, continuation_line))
                schedule_text = _clean_text(f"{schedule_text}; {continuation_schedule}")
            prefixed_schedule_location = (location_prefix, prefix_lines)
    last_schedule_index = schedule_lines[-1][0]
    location_index = location_item[0] if location_item else -1
    description_start_index = max(last_schedule_index, location_index)
    description_lines: list[tuple[int, dict[str, Any]]] = []
    for position, (index, line) in enumerate(field_lines):
        if index <= description_start_index:
            continue
        text = _clean_text(line["text"])
        if not text:
            continue
        if _is_section_heading(text):
            break
        if _is_footer_or_notice_line(text):
            continue
        if _is_decorative_fragment(text):
            continue
        if description_lines and _looks_like_orphan_activity_schedule_block(text):
            break
        next_text = ""
        for _, later_line in field_lines[position + 1 :]:
            next_text = _clean_text(later_line["text"])
            if next_text and not _is_decorative_fragment(next_text):
                break
        if (
            description_lines
            and _looks_like_location_line(text)
            and _looks_like_schedule(next_text)
        ):
            break
        description_lines.append((index, line))

    if prefixed_schedule_location:
        location_text = prefixed_schedule_location[0]
        location_spans = [
            _line_span(line, index)
            for index, line in prefixed_schedule_location[1]
        ]
        location_source = "schedule_line_location"
    elif location_item:
        location_parts = _collect_location_parts(location_item, location_search_lines)
        location_index, _ = location_parts[-1]
        location_text = _clean_text(" ".join(line["text"] for _, line in location_parts))
        location_spans = [_line_span(line, index) for index, line in location_parts]
        location_source = "pdf_layout"
    elif pipe_schedule_location and schedule_item:
        location_text = pipe_schedule_location[1]
        location_spans = [_line_span(schedule_line, schedule_index)]
        location_source = "schedule_line_location"
    elif combined_schedule_location and schedule_item:
        location_text = combined_schedule_location[1]
        location_spans = [_line_span(schedule_line, schedule_index)]
        location_source = "schedule_line_location"
    elif _title_can_serve_as_location(title_normalized):
        location_text = title_normalized
        location_spans = title_spans
        location_source = "title_as_location"
    else:
        location_text = ""
        location_spans = []
        location_source = "pdf_layout"
        warnings.append("location:missing_source_span")
    raw_schedule_text = schedule_text
    schedule_source = "pdf_layout"
    reviewed_schedule_repair = repair_known_activity_field(
        calendar_group_key=calendar_group_key,
        slug=slug,
        field="schedule",
        raw_value=schedule_text,
    )
    if reviewed_schedule_repair:
        schedule_text = reviewed_schedule_repair
        schedule_source = "reviewed_field_repair"
    location_text, location_repaired = _repair_location_text(location_text)
    if location_repaired:
        location_source = "location_repair"
    reviewed_location_repair = repair_known_activity_field(
        calendar_group_key=calendar_group_key,
        slug=slug,
        field="location",
        raw_value=location_text,
    )
    if reviewed_location_repair:
        location_text = reviewed_location_repair
        location_source = "reviewed_field_repair"
    raw_description = _clean_text(" ".join(line["text"] for _, line in description_lines))
    description, description_repaired = _repair_description_text(raw_description)
    description_source = "description_text_repair" if description_repaired else "pdf_layout"
    reviewed_description_repair = repair_known_activity_field(
        calendar_group_key=calendar_group_key,
        slug=slug,
        field="description",
        raw_value=description,
    )
    if reviewed_description_repair:
        description = reviewed_description_repair
        description_source = "reviewed_field_repair"
    description_spans = [_line_span(line, index) for index, line in description_lines]
    warnings.extend(_field_quality_warnings("location", location_text))
    warnings.extend(_field_quality_warnings("description", description))
    start_time, end_time = _parse_time_range(schedule_text)
    warnings.extend(_schedule_quality_warnings(schedule_text))
    reviewed_fee_repair = repair_known_activity_field(
        calendar_group_key=calendar_group_key,
        slug=slug,
        field="is_fee_based",
        raw_value=title_raw,
    )
    body_fee_evidence = _body_fee_claim_evidence(description, description_spans)
    is_fee_based = (
        _title_is_fee_based(title_raw)
        or (reviewed_fee_repair or "").lower() == "true"
        or bool(body_fee_evidence)
    )
    fee_legend_spans = [
        span
        for legend in document_key_legends
        if legend.get("kind") == "fee"
        for span in legend.get("spans", [])
        if isinstance(span, dict)
    ]
    fee_evidence = body_fee_evidence or _fee_claim_evidence(
        title_spans,
        is_fee_based=is_fee_based,
        fee_legend_spans=fee_legend_spans,
    )
    schedule_spans = (
        [_line_span(line, index) for index, line in schedule_lines]
        if schedule_item
        else []
    )

    return {
        "candidate_id": f"{snapshot['content_sha256']}:{calendar_group_key}:{slug}",
        "calendar_group_key": calendar_group_key,
        "source_pdf": str(pdf_path),
        "content_sha256": snapshot["content_sha256"],
        "parser_version": PARSER_VERSION,
        "profile_key": "aframe_layout_v2",
        "raw_fields": {
            "title": {"value": title_raw, "source": "pdf_layout", "spans": title_spans},
            "location": {
                "value": location_text,
                "source": location_source,
                "spans": location_spans,
            },
            "schedule": {
                "text": raw_schedule_text,
                "source": "pdf_layout",
                "spans": schedule_spans,
            },
            "description": {
                "value": raw_description,
                "source": "pdf_layout",
                "spans": description_spans,
            },
        },
        "normalized_fields": {
            "title": {"value": title_normalized, "source": title_source, "spans": title_spans},
            "slug": slug,
            "category": _category_for_title(title_normalized),
            "section": "Resort Activities",
            "location": {
                "value": location_text,
                "source": location_source,
                "spans": location_spans,
            },
            "schedule": {
                "text": schedule_text,
                "start_time": start_time,
                "end_time": end_time,
                "source": schedule_source,
                "spans": schedule_spans,
            },
            "description": {
                "value": description,
                "source": description_source,
                "spans": description_spans,
            },
            "is_fee_based": is_fee_based,
            "fee_evidence": fee_evidence,
            "document_key_legends": document_key_legends,
        },
        "confidence": 1.0,
        "warnings": warnings,
    }


def _movie_candidate(
    *,
    snapshot: dict[str, Any],
    title_index: int,
    title_raw: str,
    title_normalized: str,
    title_span: dict[str, Any],
    field_lines: list[tuple[int, dict[str, Any]]],
    calendar_group_key: str,
    pdf_path: Path,
    document_key_legends: list[dict[str, Any]],
) -> dict[str, Any]:
    slug = _slugify(title_normalized)
    warnings: list[str] = []
    schedule_item = next(
        (
            item
            for item in field_lines
            if "|" in item[1]["text"] and re.search(r"\d{1,2}:\d{2}", item[1]["text"])
        ),
        None,
    )
    if schedule_item:
        schedule_index, schedule_line = schedule_item
        schedule_text = _clean_text(schedule_line["text"])
        schedule_position = field_lines.index(schedule_item)
        schedule_lines = [(schedule_index, schedule_line)]
        if schedule_position > 0:
            previous_index, previous_line = field_lines[schedule_position - 1]
            previous_text = _clean_text(previous_line["text"])
            if _can_prefix_movie_schedule_location(previous_text):
                schedule_text = _clean_text(f"{previous_text} {schedule_text}")
                schedule_lines = [(previous_index, previous_line), (schedule_index, schedule_line)]
        schedule_text = _normalize_movie_schedule_text(schedule_text)
        location_text = _clean_text(schedule_text.split("|", 1)[0])
        schedule_spans = [_line_span(line, index) for index, line in schedule_lines]
    else:
        schedule_index = -1
        schedule_line = {"text": "", "bbox": []}
        schedule_text = ""
        location_text = ""
        schedule_spans = []
        warnings.extend(["schedule:missing_source_span", "location:missing_source_span"])
    movie_nights = []
    movie_spans = []
    movie_context_spans = []
    for index, line in field_lines:
        parsed = _movie_title_from_line(_clean_text(line["text"]))
        if not parsed:
            continue
        day, movie_title = parsed
        movie_title = _clean_movie_title(movie_title)
        movie_nights.append(
            {
                "day_of_week": day,
                "movie_title": movie_title,
                "show_time": schedule_text.split("|", 1)[1].strip() if "|" in schedule_text else "",
                "source_span": _line_span(line, index),
            }
        )
        movie_spans.append(_line_span(line, index))
    if not movie_nights:
        day_rows = [
            (index, line, _clean_text(line["text"]))
            for index, line in field_lines
            if re.fullmatch(
                r"Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday",
                _clean_text(line["text"]),
                flags=re.I,
            )
        ]
        for day_index, day_line, day_text in day_rows:
            day_y0, day_y1 = day_line["bbox"][1], day_line["bbox"][3]
            day_mid = (day_y0 + day_y1) / 2
            movie_line_item = next(
                (
                    (movie_index, movie_line)
                    for movie_index, movie_line in field_lines
                    if movie_index != day_index
                    and movie_line["bbox"][0] > day_line["bbox"][2]
                    and abs(((movie_line["bbox"][1] + movie_line["bbox"][3]) / 2) - day_mid) <= 18
                    and _clean_movie_title(movie_line["text"])
                    and not _is_decorative_fragment(movie_line["text"])
                ),
                None,
            )
            if not movie_line_item:
                continue
            movie_index, movie_line = movie_line_item
            movie_title = _clean_movie_title(movie_line["text"])
            if not movie_title:
                continue
            movie_nights.append(
                {
                    "day_of_week": day_text.lower(),
                    "movie_title": movie_title,
                    "show_time": schedule_text.split("|", 1)[1].strip() if "|" in schedule_text else "",
                    "source_span": _line_span(movie_line, movie_index),
                }
            )
            movie_spans.extend(
                [
                    _line_span(day_line, day_index),
                    _line_span(movie_line, movie_index),
                ]
            )
    ocr_movie_nights = _ocr_movie_table_rows(
        pdf_path=pdf_path,
        title_span=title_span,
        schedule_text=schedule_text,
    )
    if ocr_movie_nights and (
        len(ocr_movie_nights) > len(movie_nights)
        or _movie_nights_look_incomplete(movie_nights)
    ):
        movie_nights = ocr_movie_nights
        movie_spans = [
            dict(row["source_span"])
            for row in ocr_movie_nights
            if isinstance(row.get("source_span"), dict)
        ]
    for index, line in field_lines:
        if schedule_index != -1 and index <= schedule_index:
            continue
        text = _clean_text(line["text"])
        if not text or _is_decorative_fragment(text) or _is_footer_or_notice_line(text):
            continue
        movie_context_spans.append(_line_span(line, index))

    start_time, end_time = _parse_time_range(schedule_text)
    return {
        "candidate_id": f"{snapshot['content_sha256']}:{calendar_group_key}:{slug}",
        "calendar_group_key": calendar_group_key,
        "source_pdf": str(pdf_path),
        "content_sha256": snapshot["content_sha256"],
        "parser_version": PARSER_VERSION,
        "profile_key": "aframe_layout_v2",
        "raw_fields": {
            "title": {"value": title_raw, "source": "pdf_layout", "spans": [title_span]},
            "location": {"value": location_text, "source": "pdf_layout", "spans": schedule_spans},
            "schedule": {"text": schedule_text, "source": "pdf_layout", "spans": schedule_spans},
            "description": {"value": "", "source": "pdf_layout", "spans": []},
        },
        "normalized_fields": {
            "title": {"value": title_normalized, "source": "title_repair", "spans": [title_span]},
            "slug": slug,
            "category": "movies_under_stars",
            "section": "Movie Under the Stars",
            "location": {"value": location_text, "source": "pdf_layout", "spans": schedule_spans},
            "schedule": {
                "text": schedule_text,
                "start_time": start_time,
                "end_time": end_time,
                "source": "pdf_layout",
                "spans": schedule_spans,
            },
            "description": {"value": "", "source": "pdf_layout", "spans": []},
            "movie_nights": movie_nights,
            "movie_night_spans": movie_spans,
            "movie_context_spans": movie_context_spans,
            "is_fee_based": False,
            "fee_evidence": _fee_claim_evidence(
                [title_span],
                is_fee_based=False,
                fee_legend_spans=_fee_legend_spans(snapshot),
            ),
            "document_key_legends": document_key_legends,
        },
        "confidence": 1.0 if not warnings else 0.6,
        "warnings": warnings,
    }


def extract_candidates_for_pdf(
    *,
    pdf_path: Path,
    calendar_group_key: str,
) -> list[dict[str, Any]]:
    snapshot = build_layout_snapshot(pdf_path)
    lines = snapshot["pages"][0]["lines"]
    lines_with_numbers = list(enumerate(lines, start=1))
    raw_title_positions = [
        position
        for position, (_, line) in enumerate(lines_with_numbers)
        if _title_text(line["text"])
        or repair_known_context_activity_title(
            calendar_group_key=calendar_group_key,
            raw=line["text"],
        )
    ]
    title_positions: list[int] = []
    continuation_line_numbers: set[int] = set()
    for position in raw_title_positions:
        line_number, _ = lines_with_numbers[position]
        if line_number in continuation_line_numbers:
            continue
        title_positions.append(position)
        continuation_line_numbers.update(
            index for index, _ in _collect_title_parts(lines_with_numbers, position)[1:]
        )

    candidates = [
        _candidate_from_title(
            snapshot=snapshot,
            lines_with_numbers=lines_with_numbers,
            title_position=position,
            calendar_group_key=calendar_group_key,
            pdf_path=pdf_path,
        )
        for position in title_positions
    ]
    arts_crafts_option_lines = _arts_crafts_table_option_lines(lines_with_numbers)
    candidates = [
        candidate
        for candidate in candidates
        if not (
            candidate["normalized_fields"]["title"].get("spans", [{}])[0].get("line")
            in arts_crafts_option_lines
            and not candidate["normalized_fields"]["schedule"].get("spans")
        )
    ]
    movie_schedule_lines = {
        span["line"]
        for candidate in candidates
        if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        for span in candidate["normalized_fields"]["schedule"].get("spans", [])
        if isinstance(span, dict)
    }
    movie_context_lines = {
        span["line"]
        for candidate in candidates
        if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        for span in candidate["normalized_fields"].get("movie_context_spans", [])
        if isinstance(span, dict)
    }
    candidates = [
        candidate
        for candidate in candidates
        if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        or not any(
            span.get("line") in movie_schedule_lines
            for span in candidate["normalized_fields"]["title"].get("spans", [])
            if isinstance(span, dict)
        )
    ]
    candidates = [
        candidate
        for candidate in candidates
        if candidate["normalized_fields"]["slug"] == "movie-under-the-stars"
        or not (
            not candidate["normalized_fields"]["schedule"].get("spans")
            and not candidate["normalized_fields"]["location"].get("spans")
            and any(
                span.get("line") in movie_context_lines
                for span in candidate["normalized_fields"]["title"].get("spans", [])
                if isinstance(span, dict)
            )
        )
    ]

    return sorted(
        candidates,
        key=lambda candidate: candidate["normalized_fields"]["title"]["spans"][0]["line"],
    )


def _reviewed_manual_records_for_fixture(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    records = fixture.get("reviewed_manual_records")
    if not isinstance(records, list):
        return []
    return [record for record in records if isinstance(record, dict)]


def _span_list(record: dict[str, Any], field_name: str) -> list[dict[str, Any]]:
    required_spans = record.get("required_spans")
    if not isinstance(required_spans, dict):
        return []
    spans = required_spans.get(field_name)
    if not isinstance(spans, list):
        return []
    return [dict(span) for span in spans if isinstance(span, dict)]


def _reviewed_price_evidence(record: dict[str, Any]) -> list[dict[str, Any]]:
    evidence = _span_list(record, "price")
    allowed_fields = {
        "source_pdf_fee_marker",
        "source_pdf_fee_marker_absent",
        "source_pdf_body_fee_language",
        "source_pdf_complimentary_language",
        "source_disney_image_fee_marker",
        "source_disney_image_fee_marker_absent",
    }
    return [
        span
        for span in evidence
        if span.get("field") in allowed_fields
        and span.get("source") in {"pdf_layout", "disney_visual_image"}
    ]


def _manual_field(record: dict[str, Any], field_name: str, value: str) -> dict[str, Any]:
    return {
        "value": value,
        "source": "reviewed_manual_visual",
        "spans": _span_list(record, field_name),
    }


def _reviewed_manual_candidate(
    *,
    fixture: dict[str, Any],
    record: dict[str, Any],
    snapshot: dict[str, Any],
    source_pdf: Path,
) -> dict[str, Any]:
    calendar_group_key = str(fixture["calendar_group_key"])
    slug = str(record["slug"])
    schedule_text = _clean_text(str(record.get("schedule_text", "")))
    start_time = record.get("start_time")
    end_time = record.get("end_time")
    if start_time is None or end_time is None:
        parsed_start, parsed_end = _parse_time_range(schedule_text)
        start_time = start_time or parsed_start
        end_time = end_time or parsed_end

    title_spans = _span_list(record, "title")
    fee_legend_spans = _fee_legend_spans(snapshot)
    is_fee_based = bool(record.get("is_fee_based"))
    fee_evidence = _fee_claim_evidence(
        title_spans,
        is_fee_based=is_fee_based,
        fee_legend_spans=fee_legend_spans,
    )
    reviewed_price_evidence = _reviewed_price_evidence(record)
    if reviewed_price_evidence:
        fee_evidence = reviewed_price_evidence
    document_key_legends = extract_document_key_legends(snapshot)
    normalized_fields = {
        "title": _manual_field(record, "title", str(record["title"])),
        "slug": slug,
        "category": str(record.get("category") or _category_for_title(str(record["title"]))),
        "section": str(record.get("section") or "Resort Activities"),
        "location": _manual_field(record, "location", str(record["location"])),
        "schedule": {
            "text": schedule_text,
            "start_time": start_time,
            "end_time": end_time,
            "source": "reviewed_manual_visual",
            "spans": _span_list(record, "schedule"),
        },
        "description": _manual_field(record, "description", str(record.get("description") or "")),
        "is_fee_based": is_fee_based,
        "fee_evidence": fee_evidence,
        "document_key_legends": document_key_legends,
        "manual_review": record.get("manual_review"),
    }
    if isinstance(record.get("movie_nights"), list):
        normalized_fields["movie_nights"] = [
            dict(row) for row in record["movie_nights"] if isinstance(row, dict)
        ]
        normalized_fields["movie_night_spans"] = _span_list(record, "movie_nights")
    return {
        "candidate_id": f"{snapshot['content_sha256']}:{calendar_group_key}:{slug}:reviewed_manual",
        "calendar_group_key": calendar_group_key,
        "source_pdf": str(source_pdf),
        "content_sha256": snapshot["content_sha256"],
        "parser_version": PARSER_VERSION,
        "profile_key": "reviewed_manual_visual",
        "raw_fields": {
            "title": normalized_fields["title"],
            "location": normalized_fields["location"],
            "schedule": normalized_fields["schedule"],
            "description": normalized_fields["description"],
        },
        "normalized_fields": normalized_fields,
        "confidence": 1.0,
        "warnings": [],
    }


def extract_reviewed_manual_candidates_for_fixture(fixture_path: Path) -> list[dict[str, Any]]:
    fixture = json.loads(fixture_path.read_text())
    records = _reviewed_manual_records_for_fixture(fixture)
    if not records or fixture.get("source_kind") == "official_web":
        return []
    source_pdf = Path(fixture["source_pdf"])
    snapshot = build_layout_snapshot(source_pdf)
    return [
        _reviewed_manual_candidate(
            fixture=fixture,
            record=record,
            snapshot=snapshot,
            source_pdf=source_pdf,
        )
        for record in records
    ]


def extract_candidates_for_fixture(fixture_path: Path) -> list[dict[str, Any]]:
    fixture = json.loads(fixture_path.read_text())
    group = fixture["calendar_group_key"]
    if fixture.get("source_kind") == "official_web":
        return extract_candidates_for_official_web_fixture(fixture)

    source_pdf = Path(fixture["source_pdf"])
    if isinstance(fixture.get("expected_records"), list):
        candidates = extract_candidates_for_pdf(
            pdf_path=source_pdf,
            calendar_group_key=group,
        )
        return [*candidates, *extract_reviewed_manual_candidates_for_fixture(fixture_path)]

    expected_slug = fixture["expected"]["slug"]
    candidate = extract_wellness_candidate(
        pdf_path=source_pdf,
        calendar_group_key=group,
    )
    if not candidate:
        return []
    if candidate["normalized_fields"]["slug"] != expected_slug:
        return []
    return [candidate]


def _official_web_title_from_line(text: str) -> str | None:
    cleaned = _clean_text(text)
    match = re.match(r"^(?:\*\s*)?##\s+(.+)$", cleaned)
    if not match:
        return None
    title = _clean_text(match.group(1))
    if title.lower() in {"recreation", "view rooms and prices"}:
        return None
    return title


def _official_web_lines(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    snapshot_path = Path(str(fixture["source_web_snapshot"]))
    snapshot = json.loads(snapshot_path.read_text())
    lines = snapshot.get("lines") if isinstance(snapshot, dict) else []
    return [
        line
        for line in lines
        if isinstance(line, dict)
        and isinstance(line.get("line"), int)
        and isinstance(line.get("text"), str)
    ]


def _official_web_title_key(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "", text).upper()


def _field_has_spans(field: Any) -> bool:
    return isinstance(field, dict) and bool(field.get("spans"))


def _load_official_web_lines(snapshot_path: str | Path) -> list[dict[str, Any]]:
    snapshot = json.loads(Path(str(snapshot_path)).read_text())
    lines = snapshot.get("lines") if isinstance(snapshot, dict) else []
    return [
        line
        for line in lines
        if isinstance(line, dict)
        and isinstance(line.get("line"), int)
        and isinstance(line.get("text"), str)
    ]


def _official_web_detail_pages_by_slug(fixture: dict[str, Any]) -> dict[str, dict[str, Any]]:
    detail_pages = fixture.get("source_detail_pages")
    if not isinstance(detail_pages, list):
        return {}

    by_slug: dict[str, dict[str, Any]] = {}
    for page in detail_pages:
        if not isinstance(page, dict):
            continue
        slug = page.get("slug")
        snapshot_path = page.get("source_web_snapshot")
        if not isinstance(slug, str) or not slug.strip() or not snapshot_path:
            continue
        by_slug[slug] = {
            "source_url": str(page.get("source_url") or fixture.get("source_url") or ""),
            "source_path": str(snapshot_path),
            "content_sha256": str(page.get("source_web_sha256") or fixture.get("source_web_sha256") or ""),
            "lines": _load_official_web_lines(str(snapshot_path)),
        }
    return by_slug


def _official_web_detail_title(title: str, lines: list[dict[str, Any]]) -> dict[str, Any] | None:
    expected_key = _official_web_title_key(title)
    for line in lines:
        candidate = _official_web_title_from_line(line["text"])
        if not candidate and _official_web_title_key(_clean_text(line["text"])) == expected_key:
            candidate = _clean_text(line["text"])
        if candidate and _official_web_title_key(candidate) == expected_key:
            return {"value": candidate, "source": "official_web_detail", "spans": [_web_line_span(line)]}
    return None


def _official_web_detail_description(title: str, lines: list[dict[str, Any]]) -> dict[str, Any] | None:
    expected_key = _official_web_title_key(title)
    for index, line in enumerate(lines):
        candidate = _official_web_title_from_line(line["text"])
        if not candidate and _official_web_title_key(_clean_text(line["text"])) == expected_key:
            candidate = _clean_text(line["text"])
        if candidate and _official_web_title_key(candidate) == expected_key:
            for later in lines[index + 1 :]:
                text = _clean_text(later["text"])
                if not text:
                    continue
                if text.lower().startswith("locatedin"):
                    continue
                if (
                    ":" in text
                    or text.lower() in {"important details", "related activities"}
                    or text.lower().startswith("times for ")
                ):
                    break
                return {
                    "value": text,
                    "source": "official_web_detail",
                    "spans": [_web_line_span(later)],
                }
            for previous in reversed(lines[:index]):
                text = _clean_text(previous["text"])
                if text and not text.startswith("#") and ":" not in text:
                    return {
                        "value": text,
                        "source": "official_web_detail",
                        "spans": [_web_line_span(previous)],
                    }
            break
    for index, line in enumerate(lines):
        text = _clean_text(line["text"])
        if not text.lower().startswith("locatedin"):
            continue
        for later in lines[index + 1 :]:
            later_text = _clean_text(later["text"])
            if not later_text:
                continue
            if later_text.lower() in {
                "all ages",
                "kids",
                "tweens",
                "teens",
                "adults",
                "show safety, accessibility and guest policies",
                "schedule & pricing",
            }:
                continue
            if later_text.lower().startswith("operating hours"):
                break
            return {
                "value": later_text,
                "source": "official_web_detail",
                "spans": [_web_line_span(later)],
            }
    return None


def _official_web_detail_location(lines: list[dict[str, Any]]) -> dict[str, Any] | None:
    for line in lines:
        text = _clean_text(line["text"])
        match = re.match(r"^Rental location:\s*(.+)$", text, flags=re.I)
        if match:
            return {
                "value": _clean_text(match.group(1)),
                "source": "official_web_detail",
                "spans": [_web_line_span(line)],
            }
        match = re.match(r"^.+?\s+are available at\s+(.+?)\s+on\s+a\s+walk-in\b.*$", text, flags=re.I)
        if match:
            return {
                "value": _clean_text(match.group(1)),
                "source": "official_web_detail",
                "spans": [_web_line_span(line)],
            }
        match = re.match(r"^At\s+the\s+([^,]+),\s+.+$", text, flags=re.I)
        if match:
            return {
                "value": _clean_text(match.group(1)),
                "source": "official_web_detail",
                "spans": [_web_line_span(line)],
            }
        match = re.match(r"^The\s+ride\s+departs\s+across\s+from\s+(.+?)\s+at\s+.+$", text, flags=re.I)
        if match:
            return {
                "value": _clean_text(match.group(1)),
                "source": "official_web_detail",
                "spans": [_web_line_span(line)],
            }
    return None


def _official_web_detail_schedule(lines: list[dict[str, Any]]) -> dict[str, Any] | None:
    for line in lines:
        text = _clean_text(line["text"])
        match = re.match(
            r"^Hours:\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*(?:and|to|[-–—])\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*daily$",
            text,
            flags=re.I,
        )
        if not match:
            continue
        start_time = _clean_text(match.group(1))
        end_time = _clean_text(match.group(2))
        return {
            "text": f"Daily from {start_time}–{end_time}",
            "start_time": start_time,
            "end_time": end_time,
            "source": "official_web_detail",
            "spans": [_web_line_span(line)],
        }
    for index, line in enumerate(lines):
        text = _clean_text(line["text"])
        if not re.match(r"^Operating Hours\s*[–-]?$", text, flags=re.I):
            continue
        time_lines: list[dict[str, Any]] = []
        for later in lines[index + 1 :]:
            later_text = _clean_text(later["text"])
            if not later_text or later_text == ",":
                continue
            if re.fullmatch(r"\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)", later_text):
                time_lines.append(later)
                continue
            break
        if not time_lines:
            continue
        times = [_clean_text(time_line["text"]) for time_line in time_lines]
        return {
            "text": f"Operating Hours: {', '.join(times)}",
            "start_time": times[0],
            "end_time": None,
            "source": "official_web_detail",
            "spans": [_web_line_span(line), *[_web_line_span(time_line) for time_line in time_lines]],
        }
    for line in lines:
        text = _clean_text(line["text"])
        match = re.match(r"^(.+?\bare offered daily\b.+?\bprior to close\.)\s*.*$", text, flags=re.I)
        if not match:
            continue
        return {
            "text": _clean_text(match.group(1)),
            "start_time": None,
            "end_time": None,
            "source": "official_web_detail",
            "spans": [_web_line_span(line)],
        }
    for line in lines:
        text = _clean_text(line["text"])
        match = re.match(r"^(.+?\bdepart\b.+?\bfrom\b.+?)\.\s*.*$", text, flags=re.I)
        if not match:
            continue
        schedule_text = _clean_text(match.group(1)) + "."
        time_match = re.search(r"\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)", schedule_text)
        return {
            "text": schedule_text,
            "start_time": _clean_text(time_match.group(0)) if time_match else None,
            "end_time": None,
            "source": "official_web_detail",
            "spans": [_web_line_span(line)],
        }
    return None


def _official_web_detail_fee(lines: list[dict[str, Any]]) -> tuple[bool, list[dict[str, Any]]]:
    for line in lines:
        text = _clean_text(line["text"])
        if re.match(r"^(?:Price:\s*)?\$", text, flags=re.I) or re.search(r"\bcosts?\s+\$", text, flags=re.I):
            return True, [_web_line_span(line)]
    return False, []


def _apply_official_web_detail_page(
    normalized_fields: dict[str, Any],
    detail_page: dict[str, Any] | None,
) -> tuple[str | None, str | None, str | None]:
    if not detail_page:
        return None, None, None

    lines = detail_page["lines"]
    title_value = str(normalized_fields["title"]["value"])
    title = _official_web_detail_title(title_value, lines)
    description = _official_web_detail_description(title_value, lines)
    location = _official_web_detail_location(lines)
    schedule = _official_web_detail_schedule(lines)
    is_fee_based, fee_evidence = _official_web_detail_fee(lines)

    if title:
        normalized_fields["title"] = title
    if description:
        normalized_fields["description"] = description
    if location:
        normalized_fields["location"] = location
    if schedule:
        normalized_fields["schedule"] = schedule
    if is_fee_based:
        normalized_fields["is_fee_based"] = True
        normalized_fields["fee_evidence"] = fee_evidence

    return (
        str(detail_page.get("source_path") or "") or None,
        str(detail_page.get("source_url") or "") or None,
        str(detail_page.get("content_sha256") or "") or None,
    )


def _apply_official_web_overview_evidence(normalized_fields: dict[str, Any]) -> None:
    title = str(normalized_fields["title"]["value"])
    if _official_web_title_key(title) not in {"MOVIEUNDERTHESTARS", "MOVIESUNDERTHESTARS"}:
        return

    description = normalized_fields.get("description")
    if not isinstance(description, dict):
        return
    description_text = _clean_text(str(description.get("value") or ""))
    description_spans = description.get("spans") if isinstance(description.get("spans"), list) else []
    if not description_text or not description_spans:
        return

    if re.search(r"\boffered\s+nightly\b|\bavailable\s+nightly\b", description_text, flags=re.I):
        normalized_fields["schedule"] = {
            "text": "Nightly",
            "start_time": None,
            "end_time": None,
            "source": "official_web",
            "spans": description_spans,
        }

    location_match = re.search(r"\bat\s+the\s+([^,.]+)", description_text, flags=re.I)
    if location_match:
        normalized_fields["location"] = {
            "value": _clean_text(location_match.group(1)),
            "source": "official_web",
            "spans": description_spans,
        }


def extract_candidates_for_official_web_fixture(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    calendar_group_key = str(fixture["calendar_group_key"])
    source_hash = str(fixture["source_web_sha256"])
    source_url = str(fixture["source_url"])
    snapshot_path = str(fixture["source_web_snapshot"])
    lines = _official_web_lines(fixture)
    detail_pages_by_slug = _official_web_detail_pages_by_slug(fixture)
    candidates: list[dict[str, Any]] = []
    seen_slugs: set[str] = set()

    for position, line in enumerate(lines):
        title = _official_web_title_from_line(line["text"])
        if not title:
            continue
        slug = _canonical_web_slug(title)
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        description_lines: list[dict[str, Any]] = []
        for later_line in lines[position + 1 :]:
            if _official_web_title_from_line(later_line["text"]):
                break
            if _clean_text(later_line["text"]).startswith("###"):
                break
            description_text = _clean_text(later_line["text"])
            if not description_text or description_text.startswith("## "):
                continue
            description_lines.append(later_line)

        title_span = _web_line_span(line)
        description_spans = [_web_line_span(description_line) for description_line in description_lines]
        description = _clean_text(" ".join(description_line["text"] for description_line in description_lines))
        warnings = ["location:missing_source_span", "schedule:missing_source_span"]
        candidate_id = f"{source_hash}:{calendar_group_key}:{slug}"
        normalized_fields = {
            "title": {"value": title, "source": "official_web", "spans": [title_span]},
            "slug": slug,
            "category": _category_for_title(title),
            "section": "Resort Activities",
            "location": {"value": "", "source": "official_web", "spans": []},
            "schedule": {
                "text": "",
                "start_time": None,
                "end_time": None,
                "source": "official_web",
                "spans": [],
            },
            "description": {
                "value": description,
                "source": "official_web",
                "spans": description_spans,
            },
            "is_fee_based": False,
            "fee_evidence": [],
            "document_key_legends": [],
        }
        _apply_official_web_overview_evidence(normalized_fields)
        detail_path, detail_url, detail_hash = _apply_official_web_detail_page(
            normalized_fields,
            detail_pages_by_slug.get(slug),
        )
        warnings = []
        if not _field_has_spans(normalized_fields["location"]):
            warnings.append("location:missing_source_span")
        if not _field_has_spans(normalized_fields["schedule"]):
            warnings.append("schedule:missing_source_span")
        candidates.append(
            {
                "candidate_id": f"{detail_hash or source_hash}:{calendar_group_key}:{slug}",
                "calendar_group_key": calendar_group_key,
                "source_pdf": None,
                "source_path": detail_path or snapshot_path,
                "source_url": detail_url or source_url,
                "content_sha256": detail_hash or source_hash,
                "parser_version": PARSER_VERSION,
                "profile_key": "official_web_recreation",
                "raw_fields": {
                    "title": normalized_fields["title"],
                    "location": normalized_fields["location"],
                    "schedule": normalized_fields["schedule"],
                    "description": normalized_fields["description"],
                },
                "normalized_fields": normalized_fields,
                "confidence": 0.4,
                "warnings": warnings,
            }
        )

    return candidates


def expected_public_slugs_for_fixture(fixture: dict[str, Any]) -> set[str]:
    slugs = {
        str(record.get("slug"))
        for record in _reviewed_manual_records_for_fixture(fixture)
        if record.get("slug")
    }
    expected_records = fixture.get("expected_records")
    if isinstance(expected_records, list):
        slugs.update({
            str(record.get("slug"))
            for record in expected_records
            if isinstance(record, dict) and record.get("slug")
        })
        return slugs
    expected = fixture.get("expected")
    if isinstance(expected, dict) and expected.get("slug"):
        slugs.add(str(expected["slug"]))
    return slugs


def expected_quarantine_slugs_for_fixture(fixture: dict[str, Any]) -> set[str]:
    expected_records = fixture.get("expected_quarantine_records")
    if not isinstance(expected_records, list):
        return set()
    return {
        str(record.get("slug"))
        for record in expected_records
        if isinstance(record, dict) and record.get("slug")
    }


def expected_unextractable_slugs_for_fixture(fixture: dict[str, Any]) -> set[str]:
    expected_records = fixture.get("expected_unextractable_records")
    if not isinstance(expected_records, list):
        return set()
    return {
        str(record.get("slug"))
        for record in expected_records
        if isinstance(record, dict) and record.get("slug")
    }


def extract_publishable_candidates_for_fixture(fixture_path: Path) -> list[dict[str, Any]]:
    fixture = json.loads(fixture_path.read_text())
    if str(fixture.get("publication_scope") or "").strip() == "historical_regression":
        return []
    if not isinstance(fixture.get("expected_records"), list):
        return extract_candidates_for_fixture(fixture_path)

    expected_slugs = expected_public_slugs_for_fixture(fixture)
    candidates = extract_candidates_for_fixture(fixture_path)
    reviewed_manual_slugs = {
        candidate["normalized_fields"]["slug"]
        for candidate in candidates
        if candidate.get("profile_key") == "reviewed_manual_visual"
    }
    return [
        candidate
        for candidate in candidates
        if candidate["normalized_fields"]["slug"] in expected_slugs
        and not (
            candidate["normalized_fields"]["slug"] in reviewed_manual_slugs
            and candidate.get("profile_key") != "reviewed_manual_visual"
        )
    ]


def _compare_candidate_to_expected(candidate: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    normalized = candidate.get("normalized_fields", {})
    title = normalized.get("title") if isinstance(normalized.get("title"), dict) else {}
    schedule = normalized.get("schedule") if isinstance(normalized.get("schedule"), dict) else {}
    location = normalized.get("location") if isinstance(normalized.get("location"), dict) else {}
    description = normalized.get("description") if isinstance(normalized.get("description"), dict) else {}
    errors: list[str] = []
    checks = {
        "title": title.get("value"),
        "slug": normalized.get("slug"),
        "schedule_text": schedule.get("text"),
        "start_time": schedule.get("start_time"),
        "end_time": schedule.get("end_time"),
        "location": location.get("value"),
        "description": description.get("value"),
        "is_fee_based": normalized.get("is_fee_based"),
    }
    if "category" in expected:
        checks["category"] = normalized.get("category")
    if "movie_nights" in expected:
        actual_movie_nights = [
            {
                "day_of_week": row["day_of_week"],
                "movie_title": row["movie_title"],
                "show_time": row["show_time"],
            }
            for row in normalized.get("movie_nights", [])
        ]
        checks["movie_nights"] = actual_movie_nights

    for field, actual in checks.items():
        if field in expected and actual != expected[field]:
            errors.append(
                f"fixture_drift:{field}: expected {expected[field]!r}, got {actual!r}"
            )
    errors.extend(_compare_required_spans(normalized, expected))
    return errors


def _span_signature(span: dict[str, Any], keys: set[str] | None = None) -> dict[str, Any]:
    keys = keys or {"page", "line", "text"}
    return {
        key: span.get(key)
        for key in ("page", "line", "text")
        if key in span
        and key in keys
    }


def _compare_required_spans(normalized: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    required_spans = expected.get("required_spans")
    if not isinstance(required_spans, dict):
        return []

    errors: list[str] = []
    for field_name, expected_spans in required_spans.items():
        if field_name == "movie_nights":
            actual_spans = normalized.get("movie_night_spans", [])
        else:
            field = normalized.get(field_name)
            actual_spans = field.get("spans", []) if isinstance(field, dict) else []
        expected_span_dicts = [
            span for span in expected_spans if isinstance(span, dict)
        ]
        expected_keys = {
            key
            for span in expected_span_dicts
            for key in ("page", "line", "text")
            if key in span
        }
        expected_signature = [
            _span_signature(span, expected_keys)
            for span in expected_span_dicts
        ]
        actual_signature = [
            _span_signature(span, expected_keys)
            for span in actual_spans
            if isinstance(span, dict)
        ]
        if actual_signature != expected_signature:
            errors.append(
                f"fixture_drift:required_spans:{field_name}: "
                f"expected {expected_signature!r}, got {actual_signature!r}"
            )
    return errors


def compare_candidate_to_fixture(candidate: dict[str, Any], fixture: dict[str, Any]) -> list[str]:
    return _compare_candidate_to_expected(candidate, fixture["expected"])


def compare_candidates_to_fixture(
    candidates: list[dict[str, Any]],
    fixture: dict[str, Any],
) -> list[str]:
    if not isinstance(fixture.get("expected_records"), list):
        if not candidates:
            return ["candidate_missing"]
        return compare_candidate_to_fixture(candidates[0], fixture)

    errors: list[str] = []
    by_slug = {
        candidate["normalized_fields"]["slug"]: candidate
        for candidate in candidates
    }
    expected_public_slugs = expected_public_slugs_for_fixture(fixture)
    expected_quarantine_records = fixture.get("expected_quarantine_records")
    expected_quarantine_records = (
        expected_quarantine_records if isinstance(expected_quarantine_records, list) else []
    )
    expected_unextractable_records = fixture.get("expected_unextractable_records")
    expected_unextractable_records = (
        expected_unextractable_records if isinstance(expected_unextractable_records, list) else []
    )
    reviewed_manual_records = _reviewed_manual_records_for_fixture(fixture)
    expected_quarantine_slugs = expected_quarantine_slugs_for_fixture(fixture)
    expected_unextractable_slugs = expected_unextractable_slugs_for_fixture(fixture)

    for expected in fixture["expected_records"]:
        slug = expected["slug"]
        candidate = by_slug.get(slug)
        if not candidate:
            errors.append(f"candidate_missing:{slug}")
            continue
        errors.extend(_compare_candidate_to_expected(candidate, expected))

    for expected in reviewed_manual_records:
        slug = expected["slug"]
        candidate = by_slug.get(slug)
        if not candidate:
            errors.append(f"candidate_manual_missing:{slug}")
            continue
        errors.extend(_compare_candidate_to_expected(candidate, expected))

    for expected in expected_quarantine_records:
        if not isinstance(expected, dict):
            continue
        slug = expected.get("slug")
        if not slug:
            errors.append("fixture_quarantine_missing:slug")
            continue
        candidate = by_slug.get(slug)
        if not candidate:
            errors.append(f"candidate_quarantine_missing:{slug}")
            continue
        errors.extend(_compare_candidate_to_expected(candidate, expected))

        expected_warnings = expected.get("warnings")
        if isinstance(expected_warnings, list):
            actual_warnings = candidate.get("warnings") or []
            if sorted(actual_warnings) != sorted(expected_warnings):
                errors.append(
                    f"fixture_drift:warnings:{slug}: "
                    f"expected {sorted(expected_warnings)!r}, got {sorted(actual_warnings)!r}"
                )

    expected_unextractable_by_slug = {
        str(expected.get("slug")): expected
        for expected in expected_unextractable_records
        if isinstance(expected, dict) and expected.get("slug")
    }
    for slug in sorted(expected_unextractable_slugs):
        candidate = by_slug.get(slug)
        if not candidate:
            continue
        expected = expected_unextractable_by_slug.get(slug, {})
        errors.extend(_compare_required_spans(candidate.get("normalized_fields", {}), expected))
        expected_warnings = expected.get("warnings")
        actual_warnings = candidate.get("warnings") or []
        if isinstance(expected_warnings, list) and sorted(actual_warnings) != sorted(expected_warnings):
            errors.append(
                f"fixture_drift:warnings:{slug}: "
                f"expected {sorted(expected_warnings)!r}, got {sorted(actual_warnings)!r}"
            )
        if not actual_warnings:
            errors.append(f"candidate_unextractable_became_extractable:{slug}")

    unexpected = sorted(
        set(by_slug)
        - expected_public_slugs
        - expected_quarantine_slugs
        - expected_unextractable_slugs
    )
    for slug in unexpected:
        errors.append(f"candidate_unexpected:{slug}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Silver v2 candidates from PDF layout")
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--group")
    args = parser.parse_args()

    fixture = json.loads(args.fixture.read_text())
    candidates = extract_candidates_for_fixture(args.fixture)
    if args.group and args.group != fixture["calendar_group_key"]:
        raise SystemExit(f"Fixture group is {fixture['calendar_group_key']}, not {args.group}")
    if not candidates:
        raise SystemExit("No matching candidates extracted")

    errors = compare_candidates_to_fixture(candidates, fixture)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}")
        raise SystemExit(1)

    print(json.dumps({"candidates": candidates}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
