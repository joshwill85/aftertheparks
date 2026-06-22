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
    "beach-club-resort": ("Disney's Beach Club Resort",),
    "beach-club-villas": ("Disney's Beach Club Villas",),
    "boardwalk-inn": ("Disney's BoardWalk Inn",),
    "boardwalk-villas": ("Disney's BoardWalk Villas",),
    "boulder-ridge-villas-at-wilderness-lodge": (
        "Boulder Ridge Villas at Disney's Wilderness Lodge",
    ),
    "cabins-at-fort-wilderness-resort": (
        "The Cabins at Disney's Fort Wilderness Resort",
        "The Cabins of Disney's Fort Wilderness Resort",
    ),
    "campsites-at-fort-wilderness-resort": (
        "The Campsites at Disney's Fort Wilderness Resort",
        "Disney's Fort Wilderness Resort & Campground",
        "Disney's Fort Wilderness Resort and Campground",
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
    ),
    "villas-at-grand-floridian-resort-and-spa": (
        "The Villas at Disney's Grand Floridian Resort & Spa",
        "The Villas at Disney's Grand Floridian Resort and Spa",
    ),
    "wilderness-lodge": ("Disney's Wilderness Lodge",),
    "yacht-club-resort": ("Disney's Yacht Club Resort",),
}

UNSUPPORTED_LOCATION_ALIASES = {
    "Walt Disney World Dolphin Hotel": "walt-disney-world-dolphin-hotel",
    "Walt Disney World Swan Hotel": "walt-disney-world-swan-hotel",
    "Walt Disney World Swan and Dolphin": "walt-disney-world-swan-and-dolphin",
    "Walt Disney World Swan & Dolphin": "walt-disney-world-swan-and-dolphin",
}


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


def _title_from_slug(slug: str) -> str:
    return " ".join(part.capitalize() for part in slug.split("-"))


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


def _line_mentions_slug(line: dict[str, Any], slug: str) -> bool:
    text = str(line.get("text", ""))
    slugs, _ = resolve_official_resort_slugs(text)
    return slug in slugs


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

    for line in program_lines:
        text = _clean_heading(str(line.get("text", "")))
        if not text:
            continue
        if text in KNOWN_PROGRAM_TITLES or (fallback and _normalize(text) == _normalize(fallback)):
            return text, [_span(line)]
        if str(line.get("text", "")).lstrip().startswith("#"):
            return text, [_span(line)]

    if fallback:
        return fallback, []
    first = _clean_heading(str(program_lines[0].get("text", ""))) if program_lines else "Official Recreation"
    return first, [_span(program_lines[0])] if program_lines else []


def _programs_from_resort_page(payload: dict[str, Any]) -> list[list[dict[str, Any]]]:
    lines = _lines(payload)
    groups: list[list[dict[str, Any]]] = []
    for idx, line in enumerate(lines):
        title = _clean_heading(str(line.get("text", "")))
        if title not in KNOWN_PROGRAM_TITLES and not str(line.get("text", "")).lstrip().startswith("* ##"):
            continue
        group = [line]
        if idx + 1 < len(lines):
            group.append(lines[idx + 1])
        groups.append(group)
    return groups


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
    if "cabana" in program_key or "reservation" in text:
        return {
            "kind": "reservation_based",
            "hours_state": "source_unspecified",
            "label": "Reservations recommended",
        }
    if "check the recreation calendar" in text or "select nights" in text:
        return {
            "kind": "calendar_dependent",
            "hours_state": "calendar_varies",
            "label": "Schedule varies by resort calendar",
        }
    return {
        "kind": "evergreen_all_day",
        "hours_state": "varies",
        "label": "Available daily; hours vary",
    }


def _booking(program_key: str, program_lines: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    text = " ".join(str(line.get("text", "")) for line in program_lines)
    lower = text.lower()
    booking: dict[str, Any] = {}
    provenance: dict[str, list[dict[str, Any]]] = {}

    if "reservation" in lower or "cabana" in program_key:
        booking["reservation_recommended"] = "recommended" in lower
        if "required" in lower:
            booking["reservation_required"] = True
        for line in program_lines:
            if "reservation" in str(line.get("text", "")).lower():
                provenance.setdefault("booking", []).append(_span(line))

    match = re.search(r"(\d+)\s+hours?\s+notice", lower)
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
        if "only to guests staying" in lower or "guests who are staying" in lower:
            eligibility["resort_guest_only"] = True
            provenance.setdefault("eligibility", []).append(_span(line))
    return eligibility, provenance


def _amenities_for_slug(program_lines: list[dict[str, Any]], resort_slug: str) -> tuple[list[str], list[dict[str, Any]]]:
    amenities: list[str] = []
    spans: list[dict[str, Any]] = []
    for line in program_lines:
        text = str(line.get("text", ""))
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


def _variant_key(program_key: str, resort_slug: str, program_lines: list[dict[str, Any]]) -> str:
    if program_key == "cabanas" and resort_slug in {"beach-club-resort", "yacht-club-resort"}:
        for line in program_lines:
            slugs, _ = resolve_official_resort_slugs(str(line.get("text", "")))
            if {"beach-club-resort", "yacht-club-resort"}.issubset(set(slugs)):
                return "shared-beach-yacht-club"
    return resort_slug


def _location_for_slug(title: str, resort_slug: str, program_lines: list[dict[str, Any]]) -> dict[str, Any]:
    for line in program_lines:
        if _line_mentions_slug(line, resort_slug):
            return {"label": _clean_heading(str(line.get("text", "")))}
    return {"label": title}


def _source_documentish(payload: dict[str, Any]) -> dict[str, str]:
    return {
        "source_url": str(payload.get("source_url") or ""),
        "source_sha256": _source_sha(payload),
    }


def _extract_one(payload: dict[str, Any], program_lines: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    source = _source_documentish(payload)
    title, title_spans = _program_title(payload, program_lines)
    program_key = _slugify(str(payload.get("slug") or title))
    tags = sorted({_slugify(str(tag)).replace("-", "_") for tag in payload.get("tags", []) if str(tag).strip()})
    description, description_spans = _description(program_lines, title)
    all_text = " ".join(str(line.get("text", "")) for line in program_lines)
    category = _category(program_key, title, tags)
    availability = _availability(program_key, all_text)

    program = {
        "program_key": program_key,
        "title": title,
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
    base_claims = {
        "walkability": {"value": "unknown", "evidence": []},
        "transportation": {"value": "unknown", "evidence": []},
    }

    offerings: list[dict[str, Any]] = []
    for resort_slug in resort_slugs:
        variant_key = _variant_key(program_key, resort_slug, program_lines)
        amenities, amenity_spans = _amenities_for_slug(program_lines, resort_slug)
        field_provenance = {
            "title": title_spans,
            "resort_join": resort_join_spans,
            **({"description": description_spans} if description_spans else {}),
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
                "price": {"state": "unknown"},
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


def extract_official_recreation_offerings(payload: dict[str, Any] | list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Extract normalized official recreation programs and resort offerings."""

    payloads = payload if isinstance(payload, list) else [payload]
    result: dict[str, list[dict[str, Any]]] = {
        "programs": [],
        "offerings": [],
        "quarantine": [],
    }
    seen_programs: set[str] = set()
    seen_offerings: set[str] = set()
    seen_quarantine: set[tuple[str, str]] = set()

    for item in payloads:
        if item.get("source_kind") == "official_recreation_resort_page" and not item.get("slug"):
            groups = _programs_from_resort_page(item)
        else:
            groups = [_lines(item)]

        for group in groups:
            extracted = _extract_one(item, group)
            for program in extracted["programs"]:
                if program["program_key"] in seen_programs:
                    continue
                seen_programs.add(program["program_key"])
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

    return result
