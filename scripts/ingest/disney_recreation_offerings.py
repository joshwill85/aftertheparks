"""Extract source-backed official Disney recreation offerings.

This module is intentionally separate from the calendar/PDF occurrence extractor.
Official recreation pages often describe evergreen offerings, reservation-based
rentals, and activities available at many resorts. Those records should be joined
to resorts without inventing dated occurrences.
"""

from __future__ import annotations

import re
import hashlib
import json
from typing import Any

try:
    from .source_manifest import ALL_RESORT_SLUGS
except ImportError:  # pragma: no cover - supports direct script execution
    from source_manifest import ALL_RESORT_SLUGS


KNOWN_PROGRAM_TITLES = {
    "Arcades",
    "Bike Rentals",
    "Cabanas",
    "Campfire Activities",
    "Community Halls",
    "Fishing",
    "Golf Cart Rental",
    "Jogging Trails",
    "Motorized Boat Rentals",
    "Movies Under the Stars",
    "Playgrounds",
    "Pools",
    "Running Trails",
    "Surrey Bike Rentals",
    "Tennis",
    "Volleyball",
}

TITLE_REPAIRS = {
    "Arcades & Video Games": "Arcades",
    "Canoes": "Canoe Rentals",
    "Cabana Rentals": "Cabanas",
    "Motorized Boats": "Motorized Boat Rentals",
}

RESORT_ALIASES: dict[str, tuple[str, ...]] = {
    "all-star-movies-resort": ("Disney's All-Star Movies Resort",),
    "all-star-music-resort": ("Disney's All-Star Music Resort",),
    "all-star-sports-resort": ("Disney's All-Star Sports Resort",),
    "animal-kingdom-lodge": ("Disney's Animal Kingdom Lodge",),
    "animal-kingdom-villas-jambo-house": (
        "Disney's Animal Kingdom Villas - Jambo House",
        "Jambo House",
    ),
    "animal-kingdom-villas-kidani-village": (
        "Disney's Animal Kingdom Villas - Kidani Village",
        "Kidani Village",
    ),
    "art-of-animation-resort": ("Disney's Art of Animation Resort",),
    "bay-lake-tower-at-contemporary-resort": (
        "Bay Lake Tower at Disney's Contemporary Resort",
        "Bay Lake Tower",
    ),
    "beach-club-resort": (
        "Disney's Beach Club Resort",
        "Disney's Yacht and Beach Club Resorts",
        "Disney's Yacht & Beach Club Resorts",
        "Disney's Yacht Club Resort and Beach Club Resort",
        "Disney's Yacht Club Resort and Disney's Beach Club Resort",
    ),
    "beach-club-villas": ("Disney's Beach Club Villas",),
    "boardwalk-inn": (
        "Disney's BoardWalk Inn",
        "Disney's Boardwalk Inn and Villas",
    ),
    "boardwalk-villas": (
        "Disney's BoardWalk Villas",
        "Disney's Boardwalk Inn and Villas",
    ),
    "boulder-ridge-villas-at-wilderness-lodge": (
        "Boulder Ridge Villas at Disney's Wilderness Lodge",
    ),
    "cabins-at-fort-wilderness-resort": (
        "The Cabins at Disney's Fort Wilderness Resort",
        "The Cabins of Disney's Fort Wilderness Resort",
        "The Campsites and Cabins at Disney's Fort Wilderness Resort",
    ),
    "campsites-at-fort-wilderness-resort": (
        "The Campsites at Disney's Fort Wilderness Resort",
        "The Campsites and Cabins at Disney's Fort Wilderness Resort",
        "Disney's Fort Wilderness Resort & Campground",
        "Disney's Fort Wilderness Resort and Campground",
        "Disney's Fort Wilderness Resort",
    ),
    "caribbean-beach-resort": ("Disney's Caribbean Beach Resort",),
    "contemporary-resort": ("Disney's Contemporary Resort",),
    "copper-creek-villas-and-cabins-at-wilderness-lodge": (
        "Copper Creek Villas & Cabins at Disney's Wilderness Lodge",
        "Copper Creek Villas and Cabins at Disney's Wilderness Lodge",
    ),
    "coronado-springs-resort": ("Disney's Coronado Springs Resort",),
    "grand-floridian-resort-and-spa": (
        "Disney's Grand Floridian Resort & Spa",
        "Disney's Grand Floridian Resort and Spa",
    ),
    "old-key-west-resort": ("Disney's Old Key West Resort",),
    "polynesian-village-resort": ("Disney's Polynesian Village Resort",),
    "polynesian-villas-and-bungalows": (
        "Disney's Polynesian Villas & Bungalows",
        "Disney's Polynesian Villas and Bungalows",
    ),
    "pop-century-resort": ("Disney's Pop Century Resort",),
    "port-orleans-resort-french-quarter": (
        "Disney's Port Orleans Resort - French Quarter",
        "Disney's Port Orleans Resort French Quarter",
    ),
    "port-orleans-resort-riverside": (
        "Disney's Port Orleans Resort - Riverside",
        "Disney's Port Orleans Resort Riverside",
    ),
    "riviera-resort": ("Disney's Riviera Resort",),
    "saratoga-springs-resort-and-spa": (
        "Disney's Saratoga Springs Resort & Spa",
        "Disney's Saratoga Springs Resort and Spa",
        "Disney's Saratoga Springs Resort",
    ),
    "villas-at-grand-floridian-resort-and-spa": (
        "The Villas at Disney's Grand Floridian Resort & Spa",
        "The Villas at Disney's Grand Floridian Resort and Spa",
    ),
    "wilderness-lodge": ("Disney's Wilderness Lodge",),
    "yacht-club-resort": (
        "Disney's Yacht Club Resort",
        "Disney's Yacht and Beach Club Resorts",
        "Disney's Yacht & Beach Club Resorts",
        "Disney's Yacht Club Resort and Beach Club Resort",
        "Disney's Yacht Club Resort and Disney's Beach Club Resort",
    ),
}

UNSUPPORTED_LOCATION_ALIASES = {
    "Walt Disney World Dolphin Hotel": "walt-disney-world-dolphin-hotel",
    "Walt Disney World Swan Hotel": "walt-disney-world-swan-hotel",
    "Walt Disney World Swan and Dolphin": "walt-disney-world-swan-and-dolphin",
    "Walt Disney World Swan & Dolphin": "walt-disney-world-swan-and-dolphin",
}

DISNEY_RESORT_ID_TO_SLUG = {
    "1;entityType=resort": "bay-lake-tower-at-contemporary-resort",
    "5;entityType=resort": "animal-kingdom-villas-jambo-house",
    "273239;entityType=resort": "animal-kingdom-villas-kidani-village",
    "18995875;entityType=resort": "riviera-resort",
    "80010383;entityType=resort": "saratoga-springs-resort-and-spa",
    "80010384;entityType=resort": "grand-floridian-resort-and-spa",
    "80010385;entityType=resort": "contemporary-resort",
    "80010386;entityType=resort": "boardwalk-inn",
    "80010387;entityType=resort": "old-key-west-resort",
    "80010388;entityType=resort": "polynesian-village-resort",
    "80010389;entityType=resort": "beach-club-resort",
    "80010390;entityType=resort": "yacht-club-resort",
    "80010391;entityType=resort": "boardwalk-villas",
    "80010392;entityType=resort": "campsites-at-fort-wilderness-resort",
    "80010394;entityType=resort": "wilderness-lodge",
    "80010395;entityType=resort": "animal-kingdom-lodge",
    "80010396;entityType=resort": "coronado-springs-resort",
    "80010397;entityType=resort": "port-orleans-resort-riverside",
    "80010398;entityType=resort": "port-orleans-resort-french-quarter",
    "80010399;entityType=resort": "caribbean-beach-resort",
    "80010400;entityType=resort": "all-star-music-resort",
    "80010401;entityType=resort": "all-star-sports-resort",
    "80010402;entityType=resort": "all-star-movies-resort",
    "80010403;entityType=resort": "pop-century-resort",
    "80010404;entityType=resort": "art-of-animation-resort",
    "80010407;entityType=resort": "beach-club-villas",
    "80010408;entityType=resort": "cabins-at-fort-wilderness-resort",
}

INDEX_SOURCE = "official_recreation_index_api"


def _slugify(value: str) -> str:
    value = value.replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _normalize(value: str) -> str:
    value = (
        value.lower()
        .replace("’", "'")
        .replace("&", " and ")
        .replace("disney's", "disneys")
    )
    value = value.replace("'", "")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _clean_heading(value: str) -> str:
    value = re.sub(r"^[*\s#-]+", "", value).strip()
    value = re.sub(r"\s*\|\s*Walt Disney World Resort.*$", "", value).strip()
    return _clean_text(value)


def _repair_title(value: str) -> str:
    return TITLE_REPAIRS.get(value, value)


def _title_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-"))


def _canonical_program_title(title: str) -> str:
    normalized = _normalize(title)
    if normalized.startswith("pools at "):
        return "Pools"
    rental_match = re.match(r"^(Canoe Rentals|Kayak Rentals|Bike Rentals|Surrey Bikes?)\s+at\b", title, flags=re.I)
    if rental_match:
        value = rental_match.group(1)
        return "Surrey Bikes" if _normalize(value) == "surrey bikes" else value
    carriage_match = re.match(r"^(Horse-Drawn Carriage Rides)\s+at\b", title, flags=re.I)
    if carriage_match:
        return carriage_match.group(1)
    return title


def _program_key_for_title(title: str) -> str:
    return _slugify(_canonical_program_title(_repair_title(title)))


def _span(line: dict[str, Any], *, source: str | None = None) -> dict[str, Any]:
    span = {
        "page": 1,
        "line": line.get("line"),
        "text": line.get("text", ""),
    }
    if source:
        span["source"] = source
    return span


def _lines(payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        line
        for line in payload.get("lines", [])
        if isinstance(line, dict) and str(line.get("text", "")).strip()
    ]


def resolve_official_resort_slugs(text: str) -> tuple[list[str], list[str]]:
    """Return supported Disney resort slugs plus known unsupported location ids."""

    normalized = _normalize(text)
    matches: list[tuple[int, str]] = []
    for slug, aliases in RESORT_ALIASES.items():
        if slug not in ALL_RESORT_SLUGS:
            continue
        positions = [
            normalized.find(_normalize(alias))
            for alias in aliases
            if normalized.find(_normalize(alias)) >= 0
        ]
        if positions:
            matches.append((min(positions), slug))

    slugs: list[str] = []
    for _, slug in sorted(matches):
        if slug not in slugs:
            slugs.append(slug)

    unsupported_matches: list[tuple[int, str]] = []
    for alias, unsupported_slug in UNSUPPORTED_LOCATION_ALIASES.items():
        pos = normalized.find(_normalize(alias))
        if pos >= 0:
            unsupported_matches.append((pos, unsupported_slug))

    unresolved: list[str] = []
    for _, unsupported_slug in sorted(unsupported_matches):
        if unsupported_slug not in unresolved:
            unresolved.append(unsupported_slug)
    return slugs, unresolved


def _append_unique_slug(slugs: list[str], slug: str) -> None:
    if slug in ALL_RESORT_SLUGS and slug not in slugs:
        slugs.append(slug)


def _slugs_from_disney_resort_id(resort_id: str) -> list[str]:
    slug = DISNEY_RESORT_ID_TO_SLUG.get(resort_id)
    return [slug] if slug in ALL_RESORT_SLUGS else []


def official_recreation_index_item_resort_slugs(item: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Resolve supported resort joins from an official recreation index API item."""

    slugs: list[str] = []
    unresolved: list[str] = []

    def absorb_text(text: object) -> None:
        if not isinstance(text, str) or not text.strip():
            return
        found, unsupported = resolve_official_resort_slugs(text)
        for slug in found:
            _append_unique_slug(slugs, slug)
        for unsupported_slug in unsupported:
            if unsupported_slug not in unresolved:
                unresolved.append(unsupported_slug)

    locations_list = item.get("locationsList")
    if isinstance(locations_list, dict):
        for resort_id, name in locations_list.items():
            id_slugs = _slugs_from_disney_resort_id(str(resort_id))
            for slug in id_slugs:
                _append_unique_slug(slugs, slug)
            if not id_slugs:
                absorb_text(name)

    park_ids = item.get("parkIds")
    if isinstance(park_ids, list):
        for resort_id in park_ids:
            for slug in _slugs_from_disney_resort_id(str(resort_id)):
                _append_unique_slug(slugs, slug)

    absorb_text(item.get("name"))
    absorb_text(item.get("locationName"))

    return slugs, unresolved


def official_recreation_index_item_program_key(item: dict[str, Any]) -> str:
    title = _repair_title(str(item.get("name") or item.get("urlFriendlyId") or "Official Recreation"))
    return _program_key_for_title(title)


def _starts_with_resort_alias(text: str, slug: str) -> bool:
    normalized = _normalize(text)
    return any(normalized.startswith(_normalize(alias)) for alias in RESORT_ALIASES.get(slug, ()))


def _starts_with_other_resort_alias(text: str, slug: str) -> bool:
    normalized = _normalize(text)
    for other_slug, aliases in RESORT_ALIASES.items():
        if other_slug == slug:
            continue
        if any(normalized.startswith(_normalize(alias)) for alias in aliases):
            return True
    return False


def _line_mentions_slug(line: dict[str, Any], slug: str) -> bool:
    text = str(line.get("text", ""))
    slugs, _ = resolve_official_resort_slugs(text)
    return slug in slugs


def _primary_program_lines(program_key: str, lines: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for line in lines:
        text = _clean_heading(str(line.get("text", "")))
        normalized = _normalize(text)
        if normalized in {"related activities", "safety accessibility and guest policies"}:
            break
        if normalized.startswith("times for "):
            break
        if program_key == "tennis" and normalized == "tennis lessons":
            break
        if program_key == "motorized-boat-rentals" and normalized.startswith("other boat rentals"):
            break
        result.append(line)
    return result or lines


def _source_sha(payload: dict[str, Any]) -> str:
    explicit = str(
        payload.get("source_web_sha256")
        or payload.get("source_sha256")
        or payload.get("content_sha256")
        or payload.get("raw_html_sha256")
        or ""
    )
    if explicit:
        return explicit
    source_basis = {
        "source_url": payload.get("source_url"),
        "lines": payload.get("lines", []),
    }
    return hashlib.sha256(
        json.dumps(source_basis, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _program_title(payload: dict[str, Any], program_lines: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
    explicit_slug = str(payload.get("slug") or "").strip()
    if explicit_slug:
        fallback = _title_from_slug(explicit_slug)
    else:
        fallback = ""

    first_raw = str(program_lines[0].get("text", "")) if program_lines else ""
    if len(program_lines) > 1 and "|" in first_raw:
        second_text = _clean_heading(str(program_lines[1].get("text", "")))
        second_slugs, _ = resolve_official_resort_slugs(second_text)
        if second_text and not second_slugs and not _is_boilerplate_line(second_text):
            return _repair_title(second_text), [_span(program_lines[1])]

    for line in program_lines:
        text = _clean_heading(str(line.get("text", "")))
        if not text:
            continue
        if text in KNOWN_PROGRAM_TITLES or (fallback and _normalize(text) == _normalize(fallback)):
            return _repair_title(text), [_span(line)]
        if str(line.get("text", "")).lstrip().startswith("#"):
            return _repair_title(text), [_span(line)]
        if "|" in str(line.get("text", "")):
            return _repair_title(text), [_span(line)]

    if fallback:
        return _repair_title(fallback), []
    first = _clean_heading(str(program_lines[0].get("text", ""))) if program_lines else "Official Recreation"
    return _repair_title(first), [_span(program_lines[0])] if program_lines else []


def _programs_from_resort_page(payload: dict[str, Any]) -> list[list[dict[str, Any]]]:
    lines = _lines(payload)
    include_program_keys = {
        str(program_key)
        for program_key in payload.get("include_program_keys", [])
        if str(program_key).strip()
    }
    groups: list[list[dict[str, Any]]] = []
    for idx, line in enumerate(lines):
        title = _clean_heading(str(line.get("text", "")))
        if title not in KNOWN_PROGRAM_TITLES and not str(line.get("text", "")).lstrip().startswith("* ##"):
            continue
        if include_program_keys:
            program_key = _program_key_for_title(_repair_title(title))
            if program_key not in include_program_keys:
                continue
        group = [line]
        if idx + 1 < len(lines):
            group.append(lines[idx + 1])
        groups.append(group)
    return groups


def _is_boilerplate_line(text: str) -> bool:
    normalized = _normalize(text)
    if not normalized:
        return True
    if normalized.startswith("presented by "):
        return True
    if normalized.startswith("locatedin"):
        return True
    if normalized.startswith("multiplewalt disney world resortlocations"):
        return True
    if normalized in {
        "all ages",
        "kids",
        "tweens",
        "teens",
        "adults",
        "show safety accessibility and guest policies",
        "safety accessibility and guest policies",
        "check available days",
        "important details",
        "know before you go",
        "related activities",
        "locations",
        "arcade locations",
        "marina locations",
        "rentals",
        "reservations",
        "cabana amenities",
        "tennis lessons",
    }:
        return True
    if normalized.startswith("times for "):
        return True
    if normalized.startswith("no times available"):
        return True
    if re.match(r"^\$[\d,]", text):
        return True
    if re.match(r"^call for reservations\b", text, re.I):
        return True
    return False


def _description_title_equivalent(text: str, title: str) -> bool:
    text_normalized = _normalize(_repair_title(text))
    title_normalized = _normalize(_repair_title(title))
    if text_normalized == title_normalized:
        return True

    def singular_words(value: str) -> list[str]:
        words = value.split()
        return [word[:-1] if len(word) > 3 and word.endswith("s") else word for word in words]

    text_words = singular_words(text_normalized)
    title_words = singular_words(title_normalized)
    return len(text_words) <= 5 and text_words == title_words


def _description(program_lines: list[dict[str, Any]], title: str) -> tuple[str | None, list[dict[str, Any]]]:
    skipped = {
        _normalize(title),
        "multiple locations",
        "ways to play",
    }
    for line in program_lines:
        text = _clean_heading(str(line.get("text", "")))
        if not text or _normalize(text) in skipped:
            continue
        if _description_title_equivalent(text, title):
            continue
        if _is_boilerplate_line(text):
            continue
        if re.match(r"^\d+\s+ways to play$", text, re.I):
            continue
        slugs, unresolved = resolve_official_resort_slugs(text)
        if slugs and not unresolved and len(text.split()) <= 12:
            continue
        if text in KNOWN_PROGRAM_TITLES:
            continue
        return text, [_span(line)]
    return None, []


def _category(program_key: str, title: str, tags: list[str]) -> str:
    haystack = " ".join([program_key, title, *tags]).lower()
    if "arcade" in haystack:
        return "arcade"
    if "bike" in haystack or "boat" in haystack or "rental" in haystack or "cabana" in haystack:
        return "rental"
    if "pool" in haystack:
        return "poolside"
    if "campfire" in haystack:
        return "campfire"
    if "movie" in haystack:
        return "movies_under_stars"
    if "run" in haystack or "jog" in haystack or "tennis" in haystack or "volleyball" in haystack:
        return "fitness_wellness"
    return "resort_activity"


def _availability(program_key: str, all_text: str) -> dict[str, Any]:
    text = all_text.lower()
    hours_match = re.search(
        r"(?:Hours:|open from|accessible from)[^.]*?(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\s+(?:and|to|-|–)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))",
        all_text,
        flags=re.I,
    )
    generally_match = re.search(
        r"generally accessible from\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))\s+to\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))",
        all_text,
        flags=re.I,
    )
    if (
        "currently unavailable" in text
        or "offering has concluded" in text
        or "scheduled to return" in text
    ):
        return {
            "kind": "calendar_dependent",
            "hours_state": "currently_unavailable",
            "label": "Currently unavailable; check source for return window",
        }
    if "cabana" in program_key or "advance reservations are highly recommended" in text:
        return {
            "kind": "reservation_based",
            "hours_state": "source_unspecified",
            "label": "Reservations recommended",
        }
    if "make a reservation" in text or "check available days" in text or "check available cruise days" in text:
        return {
            "kind": "reservation_based",
            "hours_state": "calendar_varies",
            "label": "Reservation-based; available days vary",
        }
    if "open 24 hours a day" in text or "open 24 hours" in text:
        return {
            "kind": "evergreen_hours",
            "hours_state": "source_hours",
            "label": "Open 24 hours",
        }
    if "hours and lifeguard availability vary by pool" in text:
        return {
            "kind": "evergreen_hours",
            "hours_state": "hours_vary_by_pool",
            "label": "Hours and lifeguard availability vary by pool",
        }
    if "depart friday" in text or "rides are only available" in text:
        return {
            "kind": "calendar_dependent",
            "hours_state": "calendar_varies",
            "label": "Schedule varies; confirm operating days and times",
        }
    if generally_match:
        return {
            "kind": "evergreen_hours",
            "hours_state": "generally_accessible",
            "label": f"Generally {generally_match.group(1)}-{generally_match.group(2)}; hours may vary",
        }
    if hours_match:
        return {
            "kind": "evergreen_hours",
            "hours_state": "source_hours",
            "label": f"Daily {hours_match.group(1)}-{hours_match.group(2)}",
        }
    if (
        "check the recreation calendar" in text
        or "select nights" in text
        or "for movie schedules" in text
        or "subject to cancellation or change without notice" in text
    ):
        return {
            "kind": "calendar_dependent",
            "hours_state": "calendar_varies",
            "label": "Schedule varies by resort calendar",
        }
    return {
        "kind": "evergreen_all_day",
        "hours_state": "source_unspecified",
        "label": "Hours not specified by Disney",
    }


def _booking(program_key: str, program_lines: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    text = " ".join(str(line.get("text", "")) for line in program_lines)
    lower = text.lower()
    booking: dict[str, Any] = {}
    provenance: dict[str, list[dict[str, Any]]] = {}

    if "reservation" in lower or "cabana" in program_key:
        booking["reservation_recommended"] = "advance reservations are highly recommended" in lower or (
            "recommended" in lower and "not required" not in lower
        )
        if "reservations are not required" in lower or "reservations are not accepted" in lower:
            booking["reservation_required"] = False
        elif re.search(r"\breservations?\s+(?:are|is)\s+required\b|\breservation required\b", lower):
            booking["reservation_required"] = True
        for line in program_lines:
            line_lower = str(line.get("text", "")).lower()
            if "reservation" in line_lower and "dining or recreation reservations" not in line_lower:
                provenance.setdefault("booking", []).append(_span(line))

    match = re.search(r"(\d+)\s*-?\s*hours?\s+notice", lower)
    if match:
        booking["cancellation_notice_hours"] = int(match.group(1))
        for line in program_lines:
            if "notice" in str(line.get("text", "")).lower():
                provenance.setdefault("booking", []).append(_span(line))

    return booking, provenance


def _eligibility(program_lines: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    eligibility: dict[str, Any] = {}
    provenance: dict[str, list[dict[str, Any]]] = {}
    for line in program_lines:
        text = str(line.get("text", ""))
        lower = text.lower()
        if (
            "only to guests staying" in lower
            or "guests who are staying" in lower
            or "available to guests of those resorts only" in lower
            or "can only be booked by guests" in lower
        ):
            eligibility["resort_guest_only"] = True
            provenance.setdefault("eligibility", []).append(_span(line))
        if "any guest of a walt disney world resort hotel may access" in lower:
            eligibility["resort_guest_only"] = True
            provenance.setdefault("eligibility", []).append(_span(line))
    return eligibility, provenance


def _amenities_for_slug(
    program_key: str,
    program_lines: list[dict[str, Any]],
    resort_slug: str,
) -> tuple[list[str], list[dict[str, Any]]]:
    amenities: list[str] = []
    spans: list[dict[str, Any]] = []
    cabana_heading_active = False
    for line in program_lines:
        text = str(line.get("text", ""))
        slugs, _ = resolve_official_resort_slugs(text)
        if "cabana amenities" in text.lower() or text.lower().startswith("know before you go"):
            cabana_heading_active = False
        if program_key == "cabanas" and slugs and len(text.split()) <= 10:
            cabana_heading_active = resort_slug in slugs
            continue
        if program_key == "cabanas" and cabana_heading_active and not slugs and not _is_boilerplate_line(text):
            item = _clean_text(text)
            if item and item not in amenities:
                amenities.append(item)
                spans.append(_span(line))
            continue
        if "amenities" not in text.lower() or "include" not in text.lower():
            continue
        if not _line_mentions_slug(line, resort_slug):
            continue
        raw = re.split(r"\binclude\b", text, flags=re.I, maxsplit=1)[-1]
        raw = raw.rstrip(".")
        parts = re.split(r",|\band\b", raw)
        for part in parts:
            item = re.sub(r"^(a|an)\s+", "", _clean_text(part), flags=re.I)
            if item and item not in amenities:
                amenities.append(item)
        spans.append(_span(line))
    return amenities, spans


def _price(program_lines: list[dict[str, Any]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    for line in program_lines:
        text = _clean_text(str(line.get("text", "")))
        if "$" not in text:
            continue
        if "no-shows" in text.lower() or "same-day cancellations" in text.lower():
            continue
        return {"state": "fee", "notes": text}, [_span(line)]
    return {"state": "unknown"}, []


def _variant_key(program_key: str, resort_slug: str, program_lines: list[dict[str, Any]]) -> str:
    if program_key == "cabanas" and resort_slug in {"beach-club-resort", "yacht-club-resort"}:
        for line in program_lines:
            slugs, _ = resolve_official_resort_slugs(str(line.get("text", "")))
            if {"beach-club-resort", "yacht-club-resort"}.issubset(set(slugs)):
                return "shared-beach-yacht-club"
    return resort_slug


def _location_from_line_text(text: str) -> str | None:
    cleaned = _clean_heading(text)
    rental = re.search(r"Rental location:\s*(.+)$", cleaned, flags=re.I)
    if rental:
        return rental.group(1).strip()
    sail_from = re.search(r"\bSail from the\s+(.+?)\s+at\b", cleaned, flags=re.I)
    if sail_from:
        return sail_from.group(1).strip()
    depart_from = re.search(r"\bDepart on your cruise from the\s+(.+?)\s+at\b", cleaned, flags=re.I)
    if depart_from:
        return depart_from.group(1).strip()
    board_at = re.search(r"\bboard(?: your)? .*?\bat the\s+(.+?)\s+at\b", cleaned, flags=re.I)
    if board_at:
        return board_at.group(1).strip()
    board_near = re.search(r"\bboard(?: your)? .*?\bnear\s+(.+?)(?:\.|,)", cleaned, flags=re.I)
    if board_near:
        return board_near.group(1).strip()
    check_in_building = re.search(r"\bcheck in at the\s+(.+?\bbuilding)\b", cleaned, flags=re.I)
    if check_in_building:
        return check_in_building.group(1).strip()
    check_in_at = re.search(r"\bcheck in at the\s+(.+?)\s+at\b", cleaned, flags=re.I)
    if check_in_at:
        return check_in_at.group(1).strip()
    check_in_across = re.search(
        r"\bcheck in across from the main entrance to\s+(.+?)\s+near\b",
        cleaned,
        flags=re.I,
    )
    if check_in_across:
        return check_in_across.group(1).strip()
    arrive_at = re.search(r"\barrive at the\s+(.+?)\s+\d", cleaned, flags=re.I)
    if arrive_at:
        return arrive_at.group(1).strip()
    at_venue = re.search(r"^At the\s+(.+?)\s+at\s+Disney", cleaned, flags=re.I)
    if at_venue:
        return at_venue.group(1).strip()
    stable = re.search(r"available at\s+(.+?)\s+on a walk-in", cleaned, flags=re.I)
    if stable:
        return stable.group(1).strip()
    departs = re.search(r"departs across from\s+(.+?)(?:\s+at|\.)", cleaned, flags=re.I)
    if departs:
        return departs.group(1).strip()
    reception = re.search(r"available from\s+(.+?)(?:\.|,)", cleaned, flags=re.I)
    if reception:
        return reception.group(1).strip()
    if cleaned.lower().startswith("locatedin"):
        return _clean_text(re.sub(r"^Locatedin", "", cleaned, flags=re.I))
    return None


SPECIFIC_LOCATION_KEYWORDS = {
    "arcade",
    "area",
    "barn",
    "building",
    "court",
    "depot",
    "hall",
    "marina",
    "outpost",
    "pool",
    "ranch",
    "tavern",
}


def _is_generic_location_label(label: str, resort_slug: str) -> bool:
    normalized = _normalize(label)
    if normalized in {"walt disney world resort", "walt disney world"}:
        return True
    if any(keyword in normalized.split() for keyword in SPECIFIC_LOCATION_KEYWORDS):
        return False
    slugs, _ = resolve_official_resort_slugs(label)
    return bool(slugs) and resort_slug in slugs


def _specific_location_quality(label: str) -> int:
    normalized = _normalize(label)
    for keyword in ("marina", "barn", "ranch", "tavern", "outpost", "hall", "arcade", "pool"):
        if keyword in normalized.split():
            return 95
    if any(keyword in normalized.split() for keyword in SPECIFIC_LOCATION_KEYWORDS):
        return 90
    return 70


def _location_line_quality(line: dict[str, Any], resort_slug: str) -> int:
    text = _clean_heading(str(line.get("text", "")))
    lower = text.lower()
    if _is_boilerplate_line(text):
        return -100
    if lower.startswith("learn about ") or lower.startswith("recreation at "):
        return -100
    if lower.startswith("take ") or "available at select resort" in lower:
        return -100
    if "related activities" in lower or "available throughout" in lower:
        return -100
    if lower.startswith("for movie schedules") or "please check with the front desk" in lower:
        return -100
    if "guests younger than 18 years of age must have parent or guardian permission to call" in lower:
        return -100
    if "can only be booked" in lower or "available to guests" in lower:
        return -100
    bonus = 20 if _starts_with_resort_alias(text, resort_slug) else 0
    if _starts_with_other_resort_alias(text, resort_slug):
        bonus -= 30
    if "—" in text or "–" in text:
        return 80 + bonus
    if len(text.split()) <= 10:
        return 70 + bonus
    if text.startswith(("Disney", "The ", "Bay Lake Tower")):
        return 60 + bonus
    return 10 + bonus


def _location_for_slug(title: str, resort_slug: str, program_lines: list[dict[str, Any]]) -> dict[str, Any]:
    best_extracted: tuple[int, str] | None = None
    for line in program_lines:
        extracted = _location_from_line_text(str(line.get("text", "")))
        if not extracted or _is_generic_location_label(extracted, resort_slug):
            continue
        slugs, _ = resolve_official_resort_slugs(str(line.get("text", "")))
        if slugs and resort_slug not in slugs:
            continue
        quality = _specific_location_quality(extracted)
        if best_extracted is None or quality > best_extracted[0]:
            best_extracted = (quality, extracted)
    if best_extracted:
        return {"label": best_extracted[1]}

    best: tuple[int, dict[str, Any]] | None = None
    for line in program_lines:
        if _line_mentions_slug(line, resort_slug):
            quality = _location_line_quality(line, resort_slug)
            if quality < 0:
                continue
            if best is None or quality > best[0]:
                best = (quality, line)
    if best:
        return {"label": _clean_heading(str(best[1].get("text", "")))}
    return {"label": title}


def _source_documentish(payload: dict[str, Any]) -> dict[str, str]:
    return {
        "source_url": str(payload.get("source_url") or ""),
        "source_sha256": _source_sha(payload),
    }


def _index_detail_url(item: dict[str, Any], fallback_url: str) -> str:
    web_links = item.get("webLinks")
    if isinstance(web_links, dict):
        detail = web_links.get("wdwDetail")
        if isinstance(detail, dict):
            href = str(detail.get("href") or "").strip()
            if href:
                return href.replace("http://", "https://")
    url = str(item.get("url") or "").strip()
    if url:
        return f"https://disneyworld.disney.go.com{url}" if url.startswith("/") else url
    return fallback_url


def _index_span(index: int, field_name: str, text: object) -> dict[str, Any]:
    return {
        "page": 1,
        "line": index + 1,
        "text": str(text or ""),
        "source": INDEX_SOURCE,
        "json_path": f"$.results[{index}].{field_name}",
    }


def _index_tags(item: dict[str, Any]) -> list[str]:
    tags: set[str] = set()
    facets = item.get("facets")
    if isinstance(facets, dict):
        for values in facets.values():
            if not isinstance(values, list):
                continue
            for value in values:
                if isinstance(value, str) and value.strip():
                    tags.add(_slugify(value).replace("-", "_"))
    return sorted(tags)


def _index_description(item: dict[str, Any]) -> str | None:
    descriptions = item.get("descriptions")
    if isinstance(descriptions, dict):
        for key in ("short", "brief", "description", "summary"):
            value = descriptions.get(key)
            if isinstance(value, str) and value.strip():
                return _clean_text(value)
    return None


def _index_location_label(item: dict[str, Any], resort_id: str | None, resort_slug: str, title: str) -> str:
    park_locations = item.get("parkLocations")
    if resort_id and isinstance(park_locations, dict):
        location = park_locations.get(resort_id)
        if isinstance(location, dict) and isinstance(location.get("name"), str) and location["name"].strip():
            return _clean_text(location["name"])

    locations_list = item.get("locationsList")
    if resort_id and isinstance(locations_list, dict):
        value = locations_list.get(resort_id)
        if isinstance(value, str) and value.strip() and not _starts_with_resort_alias(value, resort_slug):
            return _clean_text(value)

    marker = item.get("marker")
    if isinstance(marker, dict) and isinstance(marker.get("name"), str) and marker["name"].strip():
        marker_name = _clean_text(marker["name"])
        slugs, _ = resolve_official_resort_slugs(marker_name)
        if not slugs or resort_slug in slugs:
            return marker_name

    location_name = item.get("locationName")
    if isinstance(location_name, str) and location_name.strip() and location_name != "Multiple Locations":
        return _clean_text(location_name)
    return title


def _index_resort_sources(item: dict[str, Any], item_index: int) -> tuple[list[dict[str, Any]], list[str]]:
    resort_sources: list[dict[str, Any]] = []
    unresolved: list[str] = []

    def add(slug: str, *, resort_id: str | None, text: str, field: str) -> None:
        if slug not in ALL_RESORT_SLUGS:
            return
        if any(existing["slug"] == slug for existing in resort_sources):
            return
        resort_sources.append(
            {
                "slug": slug,
                "resort_id": resort_id,
                "span": _index_span(item_index, field, text),
            }
        )

    locations_list = item.get("locationsList")
    if isinstance(locations_list, dict):
        for resort_id, name in locations_list.items():
            text = str(name or resort_id)
            id_slugs = _slugs_from_disney_resort_id(str(resort_id))
            for slug in id_slugs:
                add(slug, resort_id=str(resort_id), text=text, field=f"locationsList.{resort_id}")
            if id_slugs:
                continue
            slugs, unsupported = resolve_official_resort_slugs(text)
            for slug in slugs:
                add(slug, resort_id=str(resort_id), text=text, field=f"locationsList.{resort_id}")
            for unsupported_slug in unsupported:
                if unsupported_slug not in unresolved:
                    unresolved.append(unsupported_slug)

    park_ids = item.get("parkIds")
    if isinstance(park_ids, list):
        for resort_id in park_ids:
            for slug in _slugs_from_disney_resort_id(str(resort_id)):
                add(slug, resort_id=str(resort_id), text=str(resort_id), field="parkIds")

    for field in ("name", "locationName"):
        text = str(item.get(field) or "")
        slugs, unsupported = resolve_official_resort_slugs(text)
        for slug in slugs:
            add(slug, resort_id=None, text=text, field=field)
        for unsupported_slug in unsupported:
            if unsupported_slug not in unresolved:
                unresolved.append(unsupported_slug)

    return resort_sources, unresolved


def _extract_index_payload(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    source_url = str(payload.get("source_url") or "https://disneyworld.disney.go.com/recreation/")
    source_sha = _source_sha(payload)
    result: dict[str, list[dict[str, Any]]] = {"programs": [], "offerings": [], "quarantine": []}

    results = payload.get("results")
    if not isinstance(results, list):
        return result

    for item_index, item in enumerate(results):
        if not isinstance(item, dict):
            continue
        title = _repair_title(str(item.get("name") or item.get("urlFriendlyId") or "").strip())
        if not title:
            continue
        program_key = official_recreation_index_item_program_key(item)
        program_title = _canonical_program_title(title)
        detail_url = _index_detail_url(item, source_url)
        tags = _index_tags(item)
        description = _index_description(item)
        category = _category(program_key, title, tags)
        availability = _availability(program_key, json.dumps(item, ensure_ascii=False))
        title_span = _index_span(item_index, "name", title)
        description_spans = [_index_span(item_index, "descriptions", description)] if description else []
        program = {
            "program_key": program_key,
            "title": program_title,
            "description": description,
            "category": category,
            "tags": tags,
            "availability": availability,
            "field_provenance": {
                "title": [title_span],
                **({"description": description_spans} if description_spans else {}),
            },
            "trust_state": "source_backed",
            "source_url": detail_url,
            "source_sha256": source_sha,
        }

        resort_sources, _unresolved = _index_resort_sources(item, item_index)
        if not resort_sources:
            continue

        result["programs"].append(program)
        base_claims = {
            "walkability": {"value": "unknown", "evidence": []},
            "transportation": {"value": "unknown", "evidence": []},
        }
        for resort_source in resort_sources:
            resort_slug = resort_source["slug"]
            variant_key = resort_slug
            resort_join_spans = [resort_source["span"]]
            location = {
                "label": _index_location_label(
                    item,
                    resort_source.get("resort_id"),
                    resort_slug,
                    title,
                )
            }
            field_provenance = {
                "title": [title_span],
                "resort_join": resort_join_spans,
                "location": resort_join_spans,
                **({"description": description_spans} if description_spans else {}),
            }
            result["offerings"].append(
                {
                    "program_key": program_key,
                    "offering_key": f"{program_key}:{resort_slug}:{variant_key}",
                    "resort_slug": resort_slug,
                    "variant_key": variant_key,
                    "title": title,
                    "description": description,
                    "category": category,
                    "tags": tags,
                    "location": location,
                    "availability": availability,
                    "price": {"state": "unknown"},
                    "booking": {},
                    "eligibility": {},
                    "amenities": [],
                    "claims": base_claims,
                    "field_provenance": field_provenance,
                    "trust_state": "source_backed",
                    "source_url": detail_url,
                    "source_sha256": source_sha,
                }
            )

    return result


def _extract_one(payload: dict[str, Any], program_lines: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    source = _source_documentish(payload)
    title, title_spans = _program_title(payload, program_lines)
    program_key = _program_key_for_title(title)
    program_lines = _primary_program_lines(program_key, program_lines)
    title, title_spans = _program_title(payload, program_lines)
    program_key = _program_key_for_title(title)
    program_title = _canonical_program_title(title)
    tags = sorted({_slugify(str(tag)).replace("-", "_") for tag in payload.get("tags", []) if str(tag).strip()})
    description, description_spans = _description(program_lines, title)
    all_text = " ".join(str(line.get("text", "")) for line in program_lines)
    category = _category(program_key, title, tags)
    availability = _availability(program_key, all_text)

    program = {
        "program_key": program_key,
        "title": program_title,
        "description": description,
        "category": category,
        "tags": tags,
        "availability": availability,
        "field_provenance": {
            "title": title_spans,
            **({"description": description_spans} if description_spans else {}),
        },
        "trust_state": "source_backed",
        **source,
    }

    context_resort_slug = str(payload.get("resort_slug") or "").strip()
    if context_resort_slug:
        resort_slugs = [context_resort_slug]
        unresolved: list[str] = []
        resort_join_spans = [
            {
                "page": 1,
                "line": None,
                "text": context_resort_slug,
                "source": "resort_page_context",
            }
        ]
    else:
        located_lines = [
            line
            for line in program_lines
            if _clean_heading(str(line.get("text", ""))).lower().startswith("locatedin")
        ]
        located_slugs: list[str] = []
        located_spans: list[dict[str, Any]] = []
        for line in located_lines:
            slugs, _ = resolve_official_resort_slugs(str(line.get("text", "")))
            for slug in slugs:
                if slug not in located_slugs:
                    located_slugs.append(slug)
            if slugs:
                located_spans.append(_span(line))
        source_says_multiple = any(
            "multiplewalt disney world" in _normalize(str(line.get("text", "")))
            for line in program_lines
        )
        if located_slugs and not source_says_multiple:
            resort_slugs = located_slugs
            unresolved = []
            resort_join_spans = located_spans
        else:
            resort_slugs, unresolved = resolve_official_resort_slugs(all_text)
            resort_join_spans = [
                _span(line)
                for line in program_lines
                if resolve_official_resort_slugs(str(line.get("text", "")))[0]
            ]

    if not resort_slugs:
        source_spans = [_span(line) for line in program_lines]
        return {
            "programs": [program],
            "offerings": [],
            "quarantine": [
                {
                    "program_key": program_key,
                    "source_url": source["source_url"],
                    "source_sha256": source["source_sha256"],
                    "reason_code": "unresolved_resort_join",
                    "detail": "No supported Disney-owned resort names were found in the source text.",
                    "source_spans": source_spans,
                    **({"unresolved_locations": unresolved} if unresolved else {}),
                }
            ],
        }

    booking, booking_provenance = _booking(program_key, program_lines)
    eligibility, eligibility_provenance = _eligibility(program_lines)
    price, price_spans = _price(program_lines)
    base_claims = {
        "walkability": {"value": "unknown", "evidence": []},
        "transportation": {"value": "unknown", "evidence": []},
    }

    offerings: list[dict[str, Any]] = []
    for resort_slug in resort_slugs:
        variant_key = _variant_key(program_key, resort_slug, program_lines)
        amenities, amenity_spans = _amenities_for_slug(program_key, program_lines, resort_slug)
        field_provenance = {
            "title": title_spans,
            "resort_join": resort_join_spans,
            **({"description": description_spans} if description_spans else {}),
            **({"price": price_spans} if price_spans else {}),
            **booking_provenance,
            **eligibility_provenance,
            **({"amenities": amenity_spans} if amenity_spans else {}),
        }
        offering_key = f"{program_key}:{resort_slug}:{variant_key}"
        offerings.append(
            {
                "program_key": program_key,
                "offering_key": offering_key,
                "resort_slug": resort_slug,
                "variant_key": variant_key,
                "title": title,
                "description": description,
                "category": category,
                "tags": tags,
                "location": _location_for_slug(title, resort_slug, program_lines),
                "availability": availability,
                "price": price,
                "booking": booking,
                "eligibility": eligibility,
                "amenities": amenities,
                "claims": base_claims,
                "field_provenance": field_provenance,
                "trust_state": "source_backed",
                **source,
            }
        )

    return {"programs": [program], "offerings": offerings, "quarantine": []}


def _availability_quality(availability: dict[str, Any] | None) -> int:
    if not isinstance(availability, dict):
        return 0
    kind = availability.get("kind")
    hours_state = availability.get("hours_state")
    if kind == "evergreen_all_day" and hours_state in {"varies", "source_unspecified"}:
        return 1
    if kind or hours_state:
        return 2
    return 0


def _spans_with_source_metadata(spans: object, source_row: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(spans, list):
        return []
    source_url = source_row.get("source_url")
    source_sha256 = source_row.get("source_sha256")
    enriched: list[dict[str, Any]] = []
    for span in spans:
        if not isinstance(span, dict):
            continue
        copy = dict(span)
        if source_url and "source_url" not in copy:
            copy["source_url"] = source_url
        if source_sha256 and "source_sha256" not in copy:
            copy["source_sha256"] = source_sha256
        enriched.append(copy)
    return enriched


def _merge_field_provenance(
    target: dict[str, Any],
    source: dict[str, Any],
    field_name: str,
) -> None:
    source_provenance = source.get("field_provenance")
    if not isinstance(source_provenance, dict):
        return
    source_spans = _spans_with_source_metadata(source_provenance.get(field_name), source)
    if not source_spans:
        return
    target_provenance = target.setdefault("field_provenance", {})
    if not isinstance(target_provenance, dict):
        target_provenance = {}
        target["field_provenance"] = target_provenance
    existing = target_provenance.get(field_name)
    if not isinstance(existing, list) or not existing:
        target_provenance[field_name] = source_spans


def _merge_program_metadata(target: dict[str, Any], source: dict[str, Any]) -> None:
    if not target.get("description") and source.get("description"):
        target["description"] = source["description"]
        _merge_field_provenance(target, source, "description")
        target["source_url"] = source.get("source_url") or target.get("source_url")
        target["source_sha256"] = source.get("source_sha256") or target.get("source_sha256")
    elif target.get("description") and source.get("description"):
        _merge_field_provenance(target, source, "description")

    if _availability_quality(source.get("availability")) > _availability_quality(target.get("availability")):
        target["availability"] = source["availability"]
        target["source_url"] = source.get("source_url") or target.get("source_url")
        target["source_sha256"] = source.get("source_sha256") or target.get("source_sha256")

    if source.get("category") and not target.get("category"):
        target["category"] = source["category"]

    tags = []
    for tag in [*(target.get("tags") or []), *(source.get("tags") or [])]:
        if isinstance(tag, str) and tag not in tags:
            tags.append(tag)
    if tags:
        target["tags"] = tags


def _enrich_offering_from_program(offering: dict[str, Any], program: dict[str, Any]) -> None:
    if not offering.get("description") and program.get("description"):
        offering["description"] = program["description"]
        _merge_field_provenance(offering, program, "description")
    if _availability_quality(program.get("availability")) > _availability_quality(offering.get("availability")):
        offering["availability"] = program["availability"]
    if program.get("category") and not offering.get("category"):
        offering["category"] = program["category"]
    if not offering.get("tags") and program.get("tags"):
        offering["tags"] = program["tags"]


def _offering_source_priority(offering: dict[str, Any]) -> int:
    provenance = offering.get("field_provenance")
    resort_join = provenance.get("resort_join") if isinstance(provenance, dict) else None
    span_sources = {
        str(span.get("source"))
        for span in resort_join or []
        if isinstance(span, dict) and span.get("source")
    }
    if span_sources and span_sources.issubset({INDEX_SOURCE}):
        return 10
    if "resort_page_context" in span_sources:
        return 20
    return 30


def _prefer_best_source_offerings(offerings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best_priority_by_pair: dict[tuple[str, str], int] = {}
    for offering in offerings:
        pair = (str(offering.get("program_key") or ""), str(offering.get("resort_slug") or ""))
        best_priority_by_pair[pair] = max(
            best_priority_by_pair.get(pair, 0),
            _offering_source_priority(offering),
        )

    return [
        offering
        for offering in offerings
        if _offering_source_priority(offering)
        == best_priority_by_pair[(str(offering.get("program_key") or ""), str(offering.get("resort_slug") or ""))]
    ]


def extract_official_recreation_offerings(payload: dict[str, Any] | list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Extract normalized official recreation programs and resort offerings."""

    payloads = payload if isinstance(payload, list) else [payload]
    result: dict[str, list[dict[str, Any]]] = {
        "programs": [],
        "offerings": [],
        "quarantine": [],
    }
    programs_by_key: dict[str, dict[str, Any]] = {}
    seen_offerings: set[str] = set()
    seen_quarantine: set[tuple[str, str]] = set()

    for item in payloads:
        if item.get("source_kind") == "official_recreation_index_api":
            groups_extracted = [_extract_index_payload(item)]
        elif item.get("source_kind") == "official_recreation_resort_page" and not item.get("slug"):
            groups = _programs_from_resort_page(item)
            groups_extracted = [_extract_one(item, group) for group in groups]
        else:
            groups = [_lines(item)]
            groups_extracted = [_extract_one(item, group) for group in groups]

        for extracted in groups_extracted:
            for program in extracted["programs"]:
                program_key = program["program_key"]
                if program_key in programs_by_key:
                    _merge_program_metadata(programs_by_key[program_key], program)
                    continue
                programs_by_key[program_key] = program
                result["programs"].append(program)
            for offering in extracted["offerings"]:
                if offering["offering_key"] in seen_offerings:
                    continue
                seen_offerings.add(offering["offering_key"])
                result["offerings"].append(offering)
            for quarantine in extracted["quarantine"]:
                key = (quarantine["program_key"], quarantine["reason_code"])
                if key in seen_quarantine:
                    continue
                seen_quarantine.add(key)
                result["quarantine"].append(quarantine)

    result["offerings"] = _prefer_best_source_offerings(result["offerings"])

    for offering in result["offerings"]:
        program = programs_by_key.get(offering["program_key"])
        if program:
            _enrich_offering_from_program(offering, program)

    joined_programs = {offering["program_key"] for offering in result["offerings"]}
    result["quarantine"] = [
        quarantine
        for quarantine in result["quarantine"]
        if quarantine["program_key"] not in joined_programs
    ]

    return result
