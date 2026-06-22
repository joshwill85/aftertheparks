"""Ingest factual activity enrichment from Magical Resort Guide public HTML.

This module deliberately treats Magical Resort Guide as third-party factual
enrichment. It does not replace official Disney source fields or provenance.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import unicodedata
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

try:
    from config import DISNEY_USER_AGENT, PROCESSED_DIR
    from source_manifest import ACTIVITY_SOURCES
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import DISNEY_USER_AGENT, PROCESSED_DIR
    from .source_manifest import ACTIVITY_SOURCES


MRG_BASE_URL = "https://www.magicalresortguide.com"
MRG_FACTS_OUTPUT = PROCESSED_DIR / "magical_resort_guide_facts.json"
MRG_VALIDITY_URL = f"{MRG_BASE_URL}/resort-activities-main"


MRG_PAGE_SLUG_BY_GROUP = {
    "all-star-movies": "all-star-movies",
    "all-star-music": "all-star-music",
    "all-star-sports": "all-star-sports",
    "caribbean-beach": "caribbean-beach",
    "art-of-animation": "art-of-animation",
    "pop-century": "pop-century",
    "port-orleans-french-quarter": "pofq",
    "port-orleans-riverside": "por",
    "coronado-springs": "coronado-springs",
    "fort-wilderness": "fort-wilderness",
    "polynesian": "polynesian",
    "grand-floridian": "grand-floridian",
    "beach-yacht-club": "yacht-beach-club",
    "wilderness-lodge": "wilderness-lodge",
    "riviera": "riviera",
    "animal-kingdom-jambo": "akl",
    "animal-kingdom-kidani": "akl",
    "contemporary": "contemporary",
    "boardwalk": "boardwalk-inn",
    "old-key-west": "old-key-west",
    "saratoga-springs": "saratoga-springs",
}


PROGRAM_PATTERNS: list[tuple[str, str]] = [
    (r"\bmickey\s+tie[- ]?dye\b", "mickey_tie_dye"),
    (r"\btie[- ]?dye\b", "tie_dye"),
    (r"\bmosaic\b", "mosaic"),
    (r"\bcanvas\b|\bpainting\b", "painting"),
    (r"\bwood\s*craft\b|\bwoodcraft\b", "woodcraft"),
    (r"\bfind\s+a\s+friend\b|\bhidden\s+character\b", "hidden_character_hunt"),
    (r"\bmovie\s+under\s+the\s+stars\b", "movies_under_stars"),
    (r"\barcade\b", "arcade"),
    (r"\bcaricature", "caricature"),
    (r"\byoga\b|\bmovement\b|\bfitness\b", "fitness_wellness"),
    (r"\bcampfire\b", "campfire"),
    (r"\bsangria\b", "sangria_class"),
    (r"\bsafari\b", "safari"),
    (r"\bcraft", "craft"),
]


MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


@dataclass(frozen=True)
class MRGPage:
    url: str
    calendar_group_key: str
    resort_slugs: list[str]
    page_kind: str


class BlockTextParser(HTMLParser):
    block_tags = {"h1", "h2", "h3", "h4", "p", "li"}

    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self._stack: list[str] = []
        self._current: list[str] = []
        self.blocks: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript", "svg"}:
            self._skip_depth += 1
        if tag in self.block_tags and not self._skip_depth:
            self._stack.append(tag)
            self._current = []
        elif tag == "br" and self._stack and not self._skip_depth:
            self._current.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1
        if tag not in self.block_tags or not self._stack:
            return

        text = _clean_text("".join(self._current))
        if text and not text.startswith(("Image", "Skip to Content")):
            self.blocks.append((tag, text))
        self._stack.pop()
        self._current = []

    def handle_data(self, data: str) -> None:
        if self._stack and not self._skip_depth:
            self._current.append(data)


def _clean_text(value: str) -> str:
    text = unescape(value).replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", " | ", text)
    text = re.sub(r"\|\s*\|+", "|", text)
    return text.strip(" |")


def text_blocks_from_html(html: str) -> list[tuple[str, str]]:
    parser = BlockTextParser()
    parser.feed(html)
    return parser.blocks


def normalize_mrg_title(title: str) -> str:
    return re.sub(r"\s*\(\$\)\s*", "", title).strip()


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"&", " and ", text)
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return re.sub(r"-+", "-", text)


def mrg_pages() -> list[MRGPage]:
    sources_by_group = {source.calendar_group_key: source for source in ACTIVITY_SOURCES}
    pages: list[MRGPage] = []
    for group, page_slug in MRG_PAGE_SLUG_BY_GROUP.items():
        source = sources_by_group.get(group)
        resort_slugs = list(source.resort_slugs) if source else []
        for page_kind, suffix in (
            ("paid_recreation", "paid-recreation-activities"),
            ("free_recreation", "free-recreation-activities"),
        ):
            pages.append(
                MRGPage(
                    url=f"{MRG_BASE_URL}/{page_slug}-{suffix}",
                    calendar_group_key=group,
                    resort_slugs=resort_slugs,
                    page_kind=page_kind,
                )
            )
    return pages


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": DISNEY_USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read().decode("utf-8", errors="replace")


def _extract_activity_blocks(
    blocks: list[tuple[str, str]],
    page_kind: str,
) -> tuple[list[dict[str, Any]], dict[str, Any], list[str]]:
    records: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    started = False
    page_access_rules = _empty_access_rules()
    page_access_evidence: list[str] = []

    for tag, text in blocks:
        lower = text.lower()
        if lower == "subscribe" or lower.startswith("sign up for"):
            break

        if not started and _is_page_start_heading(text, page_kind):
            started = True
            continue

        if not started:
            continue

        if current is None and tag in {"p", "li"}:
            parsed_access_rules = _access_rules_from_text(text)
            if any(value is not None for value in parsed_access_rules.values()):
                page_access_evidence.append(text)
            page_access_rules = _merge_access_rules(page_access_rules, parsed_access_rules)
            continue

        if tag in {"h1", "h2"}:
            if _is_page_furniture(text):
                break
            if current:
                records.append(current)
            current = {"title": text, "body": []}
        elif current:
            current["body"].append(text)

    if current:
        records.append(current)

    return records, page_access_rules, page_access_evidence


def _is_page_start_heading(text: str, page_kind: str) -> bool:
    lower = text.lower()
    if page_kind == "paid_recreation":
        return "paid recreation" in lower
    if page_kind == "free_recreation":
        return "free recreation" in lower
    return False


def _is_page_furniture(text: str) -> bool:
    return bool(re.search(r"^(subscribe|no results found|view fullsize)$", text, re.I))


def extract_facts_from_html(
    html: str,
    *,
    url: str,
    calendar_group_key: str,
    resort_slugs: list[str],
    page_kind: str,
    fetched_at: str | None = None,
) -> list[dict[str, Any]]:
    fetched_at = fetched_at or datetime.now(timezone.utc).isoformat()
    blocks = text_blocks_from_html(html)
    activity_blocks, page_access_rules, page_access_evidence = _extract_activity_blocks(blocks, page_kind)
    content_hash = hashlib.sha256(html.encode("utf-8")).hexdigest()

    facts: list[dict[str, Any]] = []
    for block in activity_blocks:
        title = normalize_mrg_title(str(block["title"]))
        if not title or _is_page_furniture(title):
            continue
        body = [line for line in block.get("body", []) if isinstance(line, str) and line.strip()]
        fields, evidence = _facts_from_body(
            title=title,
            raw_title=str(block["title"]),
            body=body,
            page_kind=page_kind,
            page_access_rules=page_access_rules,
            page_access_evidence=page_access_evidence,
        )
        if not any(value is not None and value != [] and value != {} for value in fields.values()):
            continue
        facts.append(
            {
                "source": "magical_resort_guide",
                "source_url": url,
                "source_page_kind": page_kind,
                "source_content_sha256": content_hash,
                "fetched_at": fetched_at,
                "calendar_group_key": calendar_group_key,
                "resort_slugs": resort_slugs,
                "activity_title": title,
                "activity_slug": slugify(title),
                "facts": fields,
                "evidence": evidence,
                "match": {"status": "unmatched"},
            }
        )
    return facts


def _facts_from_body(
    *,
    title: str,
    raw_title: str,
    body: list[str],
    page_kind: str,
    page_access_rules: dict[str, Any],
    page_access_evidence: list[str],
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    evidence: list[dict[str, str]] = []
    body_text = " ".join(body)
    schedule_text, exact_venue, host_area = _schedule_location_from_body(body)
    if schedule_text:
        evidence.append({"field": "schedule_location", "text": _schedule_evidence(body)})

    price_state, price_min, price_max, price_options, price_notes = _price_from_lines(raw_title, body, page_kind)
    if price_state == "fee":
        price_line = next((line for line in body if re.search(r"\bCOST\b|\$\d", line, re.I)), raw_title)
        evidence.append({"field": "price", "text": price_line})

    age_minimum = _age_minimum(body_text)
    adult_required = _adult_required(body_text)
    if age_minimum is not None or adult_required is not None:
        evidence.append({"field": "age_access", "text": _first_matching_line(body, r"age|adult|children|under 18|\d+\+")})

    reservation = _reservation_facts(body_text)
    if reservation["reservation_required"] is not None or reservation["reservation_method"]:
        evidence.append({"field": "reservation", "text": _first_matching_line(body, r"reservation|reserve|booking|calling|walk-up|walk-ins")})

    check_in_offset = _check_in_offset_minutes(body_text)
    if check_in_offset is not None:
        evidence.append({"field": "check_in", "text": _first_matching_line(body, r"arrive|check[- ]?in|prior")})

    body_access_rules = _access_rules_from_text(body_text)
    access_rules = _merge_access_rules(page_access_rules, body_access_rules)
    if adult_required is not None:
        access_rules["adult_required"] = adult_required
    if any(value is not None for value in access_rules.values()):
        body_access_text = _first_matching_line(
            body,
            r"exclusively|resort guests|gated pool|sister resort|adult|non-resort|visitors will not be permitted",
        )
        evidence_text = body_access_text
        if not any(value is not None for value in body_access_rules.values()) and adult_required is None:
            evidence_text = page_access_evidence[0] if page_access_evidence else ""
        evidence.append({"field": "access_rules", "text": evidence_text})

    hidden_character = _hidden_character_name(title, body_text)
    redemption_location = _redemption_location(body_text)
    prize_rule = _prize_or_completion_rule(body_text)
    if hidden_character:
        evidence.append({"field": "hidden_character", "text": _first_matching_line(body, r"hidden|photo prop|character")})
    if redemption_location:
        evidence.append({"field": "redemption", "text": _first_matching_line(body, r"head to|receive|prize|surprise")})

    fields = {
        "schedule_text": schedule_text,
        "exact_venue": exact_venue,
        "host_area_or_wing": host_area,
        "price_state": price_state,
        "price_cents_min": price_min,
        "price_cents_max": price_max,
        "price_options": price_options,
        "price_notes": price_notes,
        "age_minimum": age_minimum,
        "adult_required": adult_required,
        "duration_minutes": _duration_minutes(body_text),
        "check_in_offset_minutes": check_in_offset,
        "reservation_required": reservation["reservation_required"],
        "reservation_recommended": reservation["reservation_recommended"],
        "reservation_method": reservation["reservation_method"],
        "reservation_phone": reservation["reservation_phone"],
        "walk_ups_allowed": reservation["walk_ups_allowed"],
        "same_day_available": reservation["same_day_available"],
        "program_family": _program_family(title),
        "activity_variant": _activity_variant(title),
        "access_rules": access_rules,
        "weather_dependency": _weather_dependency(title, body_text, exact_venue),
        "hidden_character_name": hidden_character,
        "redemption_location": redemption_location,
        "prize_or_completion_rule": prize_rule,
    }
    return fields, [item for item in evidence if item.get("text")]


def _schedule_location_from_body(body: list[str]) -> tuple[str | None, str | None, str | None]:
    for line in body:
        parts = [part.strip() for part in line.split("|") if part.strip()]
        if len(parts) < 2:
            continue
        schedule_index = next(
            (
                index
                for index, part in enumerate(parts)
                if _looks_like_schedule(part)
            ),
            None,
        )
        if schedule_index is None:
            continue
        schedule = parts[schedule_index]
        venue = parts[schedule_index + 1] if schedule_index + 1 < len(parts) else None
        if venue is None and schedule_index > 0:
            venue = parts[schedule_index - 1]
        host = parts[0] if schedule_index > 0 else None
        return schedule, venue, host
    return None, None, None


def _schedule_evidence(body: list[str]) -> str:
    return next((line for line in body if "|" in line and any(_looks_like_schedule(part) for part in line.split("|"))), "")


def _looks_like_schedule(text: str) -> bool:
    return bool(
        re.search(
            r"\b(?:daily|nightly|sunday|monday|tuesday|wednesday|thursday|friday|saturday|weekdays|weekends)\b|"
            r"\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\b",
            text,
            re.I,
        )
    )


def _price_from_lines(
    raw_title: str,
    body: list[str],
    page_kind: str,
) -> tuple[str | None, int | None, int | None, list[dict[str, Any]], str | None]:
    joined = " ".join(body)
    cost_line = next((line for line in body if re.search(r"\bCOST\b|\$\d", line, re.I)), "")
    if "($)" in raw_title or cost_line:
        state = "fee"
    elif page_kind == "free_recreation":
        state = "free"
    else:
        state = None

    amounts = _price_amounts_from_text(cost_line or joined)
    price_min = min(amounts) if amounts else None
    price_max = max(amounts) if amounts else None
    options = _price_options(cost_line)
    notes = _price_notes(cost_line)
    return state, price_min, price_max, options, notes


def _price_amounts_from_text(text: str) -> list[int]:
    amounts: list[int] = []
    for match in re.finditer(
        r"\$\s*(\d+(?:\.\d{1,2})?)\s*(?:[-–]\s*\$?\s*(\d+(?:\.\d{1,2})?))?",
        text,
    ):
        for group in (match.group(1), match.group(2)):
            if group is None:
                continue
            cents = _amount_to_cents(group)
            if cents is not None:
                amounts.append(cents)
    return amounts


def _amount_to_cents(value: str) -> int | None:
    try:
        return int(round(float(value) * 100))
    except ValueError:
        return None


def _price_options(line: str) -> list[dict[str, Any]]:
    if not line:
        return []
    options: list[dict[str, Any]] = []
    for match in re.finditer(
        r"\$\s*(\d+(?:\.\d{1,2})?)\s*(?:[-–]\s*\$?\s*(\d+(?:\.\d{1,2})?))?\s*\(([^)]+)\)",
        line,
    ):
        cents_min = _amount_to_cents(match.group(1))
        cents_max = _amount_to_cents(match.group(2) or match.group(1))
        if cents_min is None or cents_max is None:
            continue
        options.append(
            {
                "option_name": match.group(3).strip(),
                "price_cents_min": cents_min,
                "price_cents_max": cents_max,
                "price_basis": "per_item",
            }
        )
    return options


def _price_notes(line: str) -> str | None:
    if not line:
        return None
    notes = re.sub(r"^\s*COST\s*:?\s*", "", line, flags=re.I).strip()
    return notes or None


def _age_minimum(text: str) -> int | None:
    match = re.search(r"\bages?\s+(\d+)\s*(?:and up|\+|or older)?", text, re.I)
    if not match:
        match = re.search(r"\b(\d+)\s*\+\b", text)
    return int(match.group(1)) if match else None


def _adult_required(text: str) -> bool | None:
    if re.search(r"adult.*(?:required|must accompany)|under 18.*adult|children.*adult", text, re.I):
        return True
    return None


def _reservation_facts(text: str) -> dict[str, Any]:
    reservation_required: bool | None = None
    reservation_recommended: bool | None = None
    if re.search(r"reservations?\s+(?:are\s+)?required|required reservation", text, re.I):
        reservation_required = True
    elif re.search(r"reservations?\s+(?:are\s+)?recommended|advance reservations?", text, re.I):
        reservation_recommended = True
    elif re.search(r"walk[- ]?ups?|walk[- ]?ins?", text, re.I):
        reservation_required = False

    method = None
    if re.search(r"my disney experience|mde|app", text, re.I):
        method = "my_disney_experience"
    elif re.search(r"call|calling|\(\d{3}\)|\b\d{3}[-.]", text, re.I):
        method = "phone"
    elif re.search(r"front desk|concierge|community hall|activity center|sign[- ]?up|register", text, re.I):
        method = "in_person"

    return {
        "reservation_required": reservation_required,
        "reservation_recommended": reservation_recommended,
        "reservation_method": method,
        "reservation_phone": _phone_number(text),
        "walk_ups_allowed": bool(re.search(r"walk[- ]?ups?|walk[- ]?ins?", text, re.I)) or None,
        "same_day_available": bool(re.search(r"same[- ]day", text, re.I)) or None,
    }


def _phone_number(text: str) -> str | None:
    match = re.search(r"\(?(\d{3})\)?[-.\s]*(?:WDW|(\d{3}))[-.\s]*([A-Z0-9]{4})", text, re.I)
    if not match:
        return None
    area = match.group(1)
    middle = "WDW" if re.search(r"WDW", match.group(0), re.I) else match.group(2)
    return f"{area}-{middle}-{match.group(3).upper()}"


def _check_in_offset_minutes(text: str) -> int | None:
    match = re.search(r"(?:arrive|check[- ]?in).{0,30}?(\d+)\s+minutes?\s+(?:prior|early|before)", text, re.I)
    return int(match.group(1)) if match else None


def _duration_minutes(text: str) -> int | None:
    match = re.search(r"\b(\d+)[- ]?minute\b|\b(\d+)\s+minutes\b", text, re.I)
    if match:
        return int(match.group(1) or match.group(2))
    hour = re.search(r"\b(\d+(?:\.\d+)?)\s+hours?\b", text, re.I)
    return int(float(hour.group(1)) * 60) if hour else None


def _program_family(title: str) -> str | None:
    for pattern, family in PROGRAM_PATTERNS:
        if re.search(pattern, title, re.I):
            return family
    return None


def _activity_variant(title: str) -> str | None:
    family = _program_family(title)
    if family in {None, slugify(title).replace("-", "_")}:
        return None
    return title


def _empty_access_rules() -> dict[str, Any]:
    return {
        "resort_guest_only": None,
        "pool_gated": None,
        "open_to_non_resort_guests": None,
        "sister_resort_access": None,
        "adult_required": None,
    }


def _access_rules_from_text(text: str) -> dict[str, Any]:
    rules = _empty_access_rules()
    if re.search(r"exclusively for guests staying at this resort|resort guests only|visitors will not be permitted", text, re.I):
        rules["resort_guest_only"] = True
    if re.search(r"gated pool|inside the gated pool|pools? are for resort guests only", text, re.I):
        rules["pool_gated"] = True
    if re.search(r"open to all guests|all guests at walt disney world|open to non[- ]?resort", text, re.I):
        rules["open_to_non_resort_guests"] = True
    if re.search(r"sister resorts?", text, re.I) or re.search(
        r"guests staying at (?!this resort\b)[^.]{0,100}\b(?:and|or)\b[^.]{0,100}\b(?:resort|lodge|villas?|inn|quarter|riverside)\b",
        text,
        re.I,
    ):
        rules["sister_resort_access"] = True
    return rules


def _merge_access_rules(*rulesets: dict[str, Any]) -> dict[str, Any]:
    merged = _empty_access_rules()
    for rules in rulesets:
        for key, value in rules.items():
            if value is not None:
                merged[key] = value
    return merged


def _weather_dependency(title: str, body_text: str, venue: str | None) -> str | None:
    text = " ".join([title, body_text, venue or ""])
    if re.search(r"weather|rain|inclement", text, re.I):
        return "weather_dependent"
    if re.search(r"pool\s+deck|lawn|campfire|beach|courtyard|outside|outdoor", text, re.I):
        return "outdoor"
    if re.search(
        r"inside|indoor|lobby|community hall|activity center|restaurant|lounge|food court|cooking place|arcade",
        text,
        re.I,
    ):
        return "indoor"
    return None


def _hidden_character_name(title: str, body_text: str) -> str | None:
    title_match = re.search(r"hidden character hunt\s*:\s*([A-Za-z][A-Za-z '\-]+)", title, re.I)
    if title_match:
        return title_match.group(1).strip()
    body_match = re.search(r"hidden\s+([A-Z][A-Za-z '\-]+?)\s+photo prop", body_text)
    return body_match.group(1).strip() if body_match else None


def _redemption_location(text: str) -> str | None:
    match = re.search(r"head to (?:the )?(.{2,80}?) to receive", text, re.I)
    if not match:
        return None
    return match.group(1).strip(" .")


def _prize_or_completion_rule(text: str) -> str | None:
    if re.search(r"receive a surprise", text, re.I):
        return "receive_surprise"
    if re.search(r"pick up a prize|receive a prize", text, re.I):
        return "receive_prize"
    return None


def _first_matching_line(lines: list[str], pattern: str) -> str:
    return next((line for line in lines if re.search(pattern, line, re.I)), "")


def parse_validity_window(html: str) -> dict[str, str | None]:
    text = " ".join(block for _tag, block in text_blocks_from_html(html))
    expected_match = re.search(
        r"(?:expected|available|beginning)(?:\s+on)?\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        text,
        re.I,
    )
    valid_match = re.search(
        r"(?:valid|good)\s+from\s+([A-Za-z]+)\s+(\d{1,2})\s*(?:[-–]|through|to)\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        text,
        re.I,
    )
    if not valid_match:
        valid_match = re.search(
            r"\b([A-Za-z]+)\s+(\d{1,2})\s*(?:[-–]|through|to)\s*([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?",
            text,
            re.I,
        )
    valid_from = valid_until = next_expected = None
    expected_year = None
    if expected_match:
        expected_year = int(expected_match.group(3))
        next_expected = _iso_date(expected_match.group(1), expected_match.group(2), expected_year)
    if valid_match:
        end_year = int(valid_match.group(5)) if valid_match.group(5) else expected_year
        if end_year is not None:
            start_year = end_year
            if MONTHS[valid_match.group(1).lower()] > MONTHS[valid_match.group(3).lower()]:
                start_year -= 1
            valid_from = _iso_date(valid_match.group(1), valid_match.group(2), start_year)
            valid_until = _iso_date(valid_match.group(3), valid_match.group(4), end_year)
    return {
        "valid_from": valid_from,
        "valid_until": valid_until,
        "next_expected_schedule_date": next_expected,
        "source_url": MRG_VALIDITY_URL,
    }


def _iso_date(month: str, day: str, year: int) -> str:
    return f"{year:04d}-{MONTHS[month.lower()]:02d}-{int(day):02d}"


def merge_mrg_facts_into_gold(
    gold_records: list[dict[str, Any]],
    facts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    records = [copy.deepcopy(record) for record in gold_records]
    by_key = {
        (str(record.get("calendar_group_key")), str(record.get("canonical_slug"))): record
        for record in records
    }

    for fact in facts:
        key = (str(fact.get("calendar_group_key")), str(fact.get("activity_slug")))
        record = by_key.get(key)
        if not record:
            continue

        matched_fact = copy.deepcopy(fact)
        matched_fact["match"] = {
            "status": "matched",
            "match_type": "calendar_group_slug",
            "confidence": 1.0,
        }
        matched_fact["activity_catalog_id"] = record.get("activity_catalog_id")

        record.setdefault("external_facts", []).append(matched_fact)
        _merge_price(record, matched_fact["facts"])
        _merge_enrichment(record, matched_fact["facts"])
        _append_external_fact_claim(record, matched_fact)

    return records


def merge_mrg_validity_into_gold(
    gold_records: list[dict[str, Any]],
    validity: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    records = [copy.deepcopy(record) for record in gold_records]
    if not isinstance(validity, dict):
        return records

    valid_from = validity.get("valid_from")
    valid_until = validity.get("valid_until")
    next_expected = validity.get("next_expected_schedule_date")
    if not valid_from and not valid_until and not next_expected:
        return records

    for record in records:
        if valid_from and not record.get("valid_from"):
            record["valid_from"] = valid_from
        if valid_until and not record.get("valid_until"):
            record["valid_until"] = valid_until

        enrichment = dict(record.get("enrichment") or {})
        if valid_from:
            enrichment["schedule_valid_from"] = valid_from
        if valid_until:
            enrichment["schedule_valid_until"] = valid_until
        if next_expected:
            enrichment["next_schedule_expected_date"] = next_expected
        record["enrichment"] = enrichment

        _append_schedule_validity_claim(record, validity)

    return records


def _merge_price(record: dict[str, Any], fields: dict[str, Any]) -> None:
    price = dict(record.get("price") or {})
    state = fields.get("price_state")
    if state:
        price["state"] = state

    price_min = fields.get("price_cents_min")
    price_max = fields.get("price_cents_max")
    if isinstance(price_min, int):
        price["amountCents"] = price_min
        price["minAmountCents"] = price_min
    if isinstance(price_max, int):
        price["maxAmountCents"] = price_max

    notes = fields.get("price_notes")
    if notes:
        price["notes"] = notes

    options = fields.get("price_options")
    if isinstance(options, list) and options:
        price["options"] = options
        if not price.get("notes") and len(options) == 1:
            option = options[0]
            amount = option.get("price_cents_min")
            label = option.get("option_name")
            if isinstance(amount, int) and label:
                price["notes"] = f"${amount / 100:.0f} ({label})"

    record["price"] = price


def _merge_enrichment(record: dict[str, Any], fields: dict[str, Any]) -> None:
    enrichment = dict(record.get("enrichment") or {})
    mapping = {
        "exact_venue": "exact_venue",
        "host_area_or_wing": "host_area_or_wing",
        "age_minimum": "age_minimum",
        "adult_required": "adult_required",
        "duration_minutes": "duration_minutes",
        "check_in_offset_minutes": "check_in_offset_minutes",
        "reservation_required": "reservation_required",
        "reservation_recommended": "reservation_recommended",
        "reservation_method": "reservation_method",
        "reservation_phone": "reservation_phone",
        "walk_ups_allowed": "walk_ups_allowed",
        "same_day_available": "same_day_available",
        "program_family": "program_family",
        "activity_variant": "activity_variant",
        "weather_dependency": "weather_dependency",
        "hidden_character_name": "hidden_character_name",
        "redemption_location": "redemption_location",
        "prize_or_completion_rule": "prize_or_completion_rule",
    }
    for source_key, target_key in mapping.items():
        value = fields.get(source_key)
        if value is not None and value != [] and value != {}:
            enrichment[target_key] = value

    access_rules = fields.get("access_rules")
    if isinstance(access_rules, dict):
        for key, value in access_rules.items():
            if value is not None:
                enrichment[key] = value

    if enrichment:
        record["enrichment"] = enrichment


def _append_external_fact_claim(record: dict[str, Any], fact: dict[str, Any]) -> None:
    claim = {
        "kind": "external_factual_enrichment",
        "value": "available",
        "evidence": [
            {
                "source": "magical_resort_guide",
                "url": fact.get("source_url"),
                "fields": [e.get("field") for e in fact.get("evidence", []) if e.get("field")],
            }
        ],
        "confidence": fact.get("match", {}).get("confidence", 0.8),
        "status": "active",
    }
    claims = record.get("claims")
    if isinstance(claims, list):
        claims.append(claim)
    elif isinstance(claims, dict):
        claims["external_factual_enrichment"] = claim
    else:
        record["claims"] = [claim]


def _append_schedule_validity_claim(record: dict[str, Any], validity: dict[str, Any]) -> None:
    claim = {
        "kind": "external_schedule_validity",
        "value": "available",
        "evidence": [
            {
                "source": "magical_resort_guide",
                "url": validity.get("source_url"),
                "contentHash": validity.get("source_content_sha256"),
                "fields": [
                    field
                    for field in ("valid_from", "valid_until", "next_expected_schedule_date")
                    if validity.get(field)
                ],
            }
        ],
        "confidence": 0.9,
        "status": "active",
    }
    claims = record.get("claims")
    if isinstance(claims, list):
        if not any(item.get("kind") == claim["kind"] for item in claims if isinstance(item, dict)):
            claims.append(claim)
    elif isinstance(claims, dict):
        claims["external_schedule_validity"] = claim
    else:
        record["claims"] = [claim]


def build_db_rows_for_fact(
    fact: dict[str, Any],
    *,
    activity_catalog_id: str | None = None,
    source_document_id: str | None = None,
    source_fact_id: str | None = None,
) -> dict[str, Any]:
    fields = fact.get("facts") if isinstance(fact.get("facts"), dict) else {}
    evidence = fact.get("evidence") if isinstance(fact.get("evidence"), list) else []
    access_rules = fields.get("access_rules") if isinstance(fields.get("access_rules"), dict) else {}
    matched = bool(activity_catalog_id)

    external_fact = {
        "id": source_fact_id,
        "source_document_id": source_document_id,
        "source_provider": fact.get("source", "magical_resort_guide"),
        "source_url": fact.get("source_url"),
        "source_page_kind": fact.get("source_page_kind"),
        "source_content_sha256": fact.get("source_content_sha256"),
        "fetched_at": fact.get("fetched_at"),
        "calendar_group_key": fact.get("calendar_group_key"),
        "resort_slugs": fact.get("resort_slugs") or [],
        "activity_catalog_id": activity_catalog_id,
        "activity_slug": fact.get("activity_slug"),
        "activity_title": fact.get("activity_title"),
        "match_status": "matched" if matched else "unmatched",
        "match_type": "calendar_group_slug" if matched else None,
        "match_confidence": 1.0 if matched else None,
        "facts_json": fields,
        "evidence_json": evidence,
        "review_status": "applied" if matched else "pending",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    external_fact = {key: value for key, value in external_fact.items() if value is not None}

    rows: dict[str, Any] = {"external_activity_fact": external_fact}
    if not activity_catalog_id:
        return rows

    price_options = fields.get("price_options")
    booking = {
        "activity_catalog_id": activity_catalog_id,
        "source_document_id": source_document_id,
        "price_cents_min": fields.get("price_cents_min"),
        "price_cents_max": fields.get("price_cents_max"),
        "price_basis": fields.get("price_basis"),
        "price_options_json": price_options if isinstance(price_options, list) else [],
        "age_minimum": fields.get("age_minimum"),
        "duration_minutes": fields.get("duration_minutes"),
        "reservation_required": fields.get("reservation_required"),
        "reservation_recommended": fields.get("reservation_recommended"),
        "reservation_method": fields.get("reservation_method"),
        "reservation_phone": fields.get("reservation_phone"),
        "walk_ups_allowed": fields.get("walk_ups_allowed"),
        "same_day_available": fields.get("same_day_available"),
        "check_in_offset_minutes": fields.get("check_in_offset_minutes"),
        "source_url": fact.get("source_url"),
        "evidence": evidence,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    rows["activity_booking_metadata"] = {
        key: value for key, value in booking.items() if value is not None
    }

    enrichment = {
        "activity_catalog_id": activity_catalog_id,
        "program_family": fields.get("program_family"),
        "activity_variant": fields.get("activity_variant"),
        "exact_venue": fields.get("exact_venue"),
        "host_area_or_wing": fields.get("host_area_or_wing"),
        "hidden_character_name": fields.get("hidden_character_name"),
        "redemption_location": fields.get("redemption_location"),
        "prize_or_completion_rule": fields.get("prize_or_completion_rule"),
        "resort_guest_only": access_rules.get("resort_guest_only"),
        "pool_gated": access_rules.get("pool_gated"),
        "open_to_non_resort_guests": access_rules.get("open_to_non_resort_guests"),
        "sister_resort_access": access_rules.get("sister_resort_access"),
        "weather_dependency": fields.get("weather_dependency"),
        "reservation_required": fields.get("reservation_required"),
        "meeting_location_detail": fields.get("exact_venue"),
        "source_facts": fields,
        "verification_source_url": fact.get("source_url"),
        "verification_last_checked": fact.get("fetched_at") or datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    rows["activity_enrichment"] = {
        key: value for key, value in enrichment.items() if value is not None
    }

    if isinstance(price_options, list) and price_options:
        rows["activity_price_options"] = [
            {
                "activity_catalog_id": activity_catalog_id,
                "source_fact_id": source_fact_id,
                "source_document_id": source_document_id,
                "option_key": slugify(str(option.get("option_name") or "standard")),
                "option_name": option.get("option_name"),
                "price_cents_min": option.get("price_cents_min"),
                "price_cents_max": option.get("price_cents_max"),
                "price_basis": option.get("price_basis"),
                "notes": option.get("notes"),
                "evidence": evidence,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            for option in price_options
            if isinstance(option, dict)
        ]
    else:
        rows["activity_price_options"] = []

    program_family = fields.get("program_family")
    if isinstance(program_family, str) and program_family:
        rows["activity_program_link"] = {
            "activity_catalog_id": activity_catalog_id,
            "program_key": program_family,
            "source_fact_id": source_fact_id,
            "variant_name": fields.get("activity_variant"),
        }

    if any(value is not None for value in access_rules.values()):
        rows["activity_access_rule"] = {
            "activity_catalog_id": activity_catalog_id,
            "source_fact_id": source_fact_id,
            "source_document_id": source_document_id,
            "resort_guest_only": access_rules.get("resort_guest_only"),
            "pool_gated": access_rules.get("pool_gated"),
            "open_to_non_resort_guests": access_rules.get("open_to_non_resort_guests"),
            "sister_resort_access": access_rules.get("sister_resort_access"),
            "adult_required": access_rules.get("adult_required") or fields.get("adult_required"),
            "evidence": evidence,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    return rows


def load_mrg_payload(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text())
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, list):
        return {"facts": payload}
    return {"facts": []}


def load_mrg_facts(path: Path) -> list[dict[str, Any]]:
    payload = load_mrg_payload(path)
    if isinstance(payload, list):
        return payload
    facts = payload.get("facts") if isinstance(payload, dict) else None
    return facts if isinstance(facts, list) else []


def publish_mrg_facts(db: Any, facts: list[dict[str, Any]]) -> dict[str, int]:
    catalog_rows = db.select("activity_catalog", columns="id,calendar_group_key,normalized_name")
    catalog_by_key = {
        (row["calendar_group_key"], row["normalized_name"]): row["id"]
        for row in catalog_rows
    }

    summary = {
        "facts": 0,
        "matched": 0,
        "booking_metadata": 0,
        "enrichment": 0,
        "price_options": 0,
        "program_links": 0,
        "access_rules": 0,
    }

    for fact in facts:
        summary["facts"] += 1
        activity_catalog_id = catalog_by_key.get(
            (fact.get("calendar_group_key"), fact.get("activity_slug"))
        )
        if activity_catalog_id:
            summary["matched"] += 1

        source_document_id = _upsert_mrg_source_document(db, fact)
        base_rows = build_db_rows_for_fact(
            fact,
            activity_catalog_id=activity_catalog_id,
            source_document_id=source_document_id,
        )
        external = db.upsert(
            "external_activity_facts",
            base_rows["external_activity_fact"],
            on_conflict="source_provider,source_url,calendar_group_key,activity_slug,source_content_sha256",
        )
        source_fact_id = external[0]["id"] if external else None
        rows = build_db_rows_for_fact(
            fact,
            activity_catalog_id=activity_catalog_id,
            source_document_id=source_document_id,
            source_fact_id=source_fact_id,
        )

        if not activity_catalog_id:
            continue

        db.upsert(
            "activity_booking_metadata",
            rows["activity_booking_metadata"],
            on_conflict="activity_catalog_id",
        )
        summary["booking_metadata"] += 1

        db.upsert(
            "activity_enrichment",
            rows["activity_enrichment"],
            on_conflict="activity_catalog_id",
        )
        summary["enrichment"] += 1

        price_options = rows.get("activity_price_options") or []
        if price_options:
            db.upsert(
                "activity_price_options",
                price_options,
                on_conflict="source_fact_id,option_key",
            )
            summary["price_options"] += len(price_options)

        program_link = rows.get("activity_program_link")
        if program_link:
            db.upsert(
                "activity_program_links",
                program_link,
                on_conflict="activity_catalog_id,program_key",
            )
            summary["program_links"] += 1

        access_rule = rows.get("activity_access_rule")
        if access_rule:
            db.upsert(
                "activity_access_rules",
                access_rule,
                on_conflict="activity_catalog_id",
            )
            summary["access_rules"] += 1

    return summary


def publish_mrg_validity(db: Any, validity: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(validity, dict):
        return None
    valid_from = validity.get("valid_from")
    valid_until = validity.get("valid_until")
    if not valid_from and not valid_until:
        return None

    updates = {
        key: value
        for key, value in {
            "valid_from": valid_from,
            "valid_until": valid_until,
        }.items()
        if value
    }
    editions = db.select(
        "calendar_editions",
        columns="id",
        filters={"is_current": "eq.true"},
    )
    for edition in editions:
        edition_id = edition.get("id")
        if not edition_id:
            continue
        db.update("calendar_editions", {"id": f"eq.{edition_id}"}, updates)

    return {
        "calendar_editions": len([edition for edition in editions if edition.get("id")]),
        "valid_from": valid_from,
        "valid_until": valid_until,
    }


def _upsert_mrg_source_document(db: Any, fact: dict[str, Any]) -> str | None:
    content_hash = fact.get("source_content_sha256")
    if not content_hash:
        return None
    rows = db.upsert(
        "source_documents",
        {
            "source_type": "html",
            "canonical_url": fact.get("source_url"),
            "content_sha256": content_hash,
            "http_status": 200,
            "calendar_group_key": fact.get("calendar_group_key"),
            "fetched_at": fact.get("fetched_at") or datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="content_sha256",
    )
    return rows[0]["id"] if rows else None


def build_mrg_facts(*, fetched_at: str | None = None) -> dict[str, Any]:
    fetched_at = fetched_at or datetime.now(timezone.utc).isoformat()
    facts: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    try:
        validity_html = fetch_html(MRG_VALIDITY_URL)
        validity = parse_validity_window(validity_html)
        validity["source_content_sha256"] = hashlib.sha256(validity_html.encode("utf-8")).hexdigest()
    except Exception as exc:  # pragma: no cover - network failure path
        validity = {"source_url": MRG_VALIDITY_URL, "error": str(exc)}

    for page in mrg_pages():
        try:
            html = fetch_html(page.url)
            facts.extend(
                extract_facts_from_html(
                    html,
                    url=page.url,
                    calendar_group_key=page.calendar_group_key,
                    resort_slugs=page.resort_slugs,
                    page_kind=page.page_kind,
                    fetched_at=fetched_at,
                )
            )
        except Exception as exc:  # pragma: no cover - network failure path
            errors.append({"url": page.url, "error": str(exc)})

    return {
        "schema": "magical_resort_guide_facts.v1",
        "generated_at": fetched_at,
        "source": "magical_resort_guide",
        "validity": validity,
        "summary": {
            "facts": len(facts),
            "errors": len(errors),
            "pages": len(mrg_pages()),
        },
        "facts": facts,
        "errors": errors,
    }


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Magical Resort Guide factual enrichment")
    parser.add_argument("--output", type=Path, default=MRG_FACTS_OUTPUT)
    parser.add_argument("--gold-input", type=Path)
    parser.add_argument("--gold-output", type=Path)
    args = parser.parse_args()

    payload = build_mrg_facts()
    _write_json(args.output, payload)

    if args.gold_input and args.gold_output:
        gold = json.loads(args.gold_input.read_text())
        enriched = merge_mrg_facts_into_gold(gold, payload["facts"])
        _write_json(args.gold_output, enriched)

    print(json.dumps(payload["summary"], indent=2))


if __name__ == "__main__":
    main()
