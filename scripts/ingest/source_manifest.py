"""Official Disney recreation source manifest for all 31 Walt Disney World resorts."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ActivitySource:
    calendar_group_key: str
    resort_slugs: tuple[str, ...]
    recreation_page_url: str
    pdf_url: str | None
    pdf_edition: str | None
    notes: str | None = None


@dataclass(frozen=True)
class ResortRecreationSource:
    resort_slug: str
    calendar_group_key: str
    disney_recreation_slug: str
    recreation_page_url: str
    pdf_url: str | None
    pdf_edition: str | None
    source_kind: str
    notes: str | None = None


@dataclass(frozen=True)
class ActivityCalendarGroup:
    calendar_group_key: str
    resort_slugs: tuple[str, ...]
    aggregation_rule: str = "shared_calendar"
    notes: str | None = None


# Resort recreation pages are the source-of-truth entry points for PDF calendars.
# Do not treat old reachable CDN URLs as current without page-backed evidence.
CDN_COLLATERAL = (
    "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/"
    "parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation"
)
CDN_GUIDE = (
    "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/"
    "parks-platform/parks-global-assets/disney-world/recreation/guide"
)
CDN_AOA = (
    "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/"
    "parks-platform/parks-global-assets/disney-world/resorts/art-of-animation/experience"
)

DISNEY_RESORT_BASE = "https://disneyworld.disney.go.com/resorts"


def recreation_url(slug: str) -> str:
    return f"{DISNEY_RESORT_BASE}/{slug}/recreation/"


ACTIVITY_SOURCES: list[ActivitySource] = [
  ActivitySource(
    "all-star-movies",
    ("all-star-movies-resort",),
    recreation_url("all-star-movies-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/All-Star-Movies_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "all-star-music",
    ("all-star-music-resort",),
    recreation_url("all-star-music-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/All-Star-Music_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "all-star-sports",
    ("all-star-sports-resort",),
    recreation_url("all-star-sports-resort"),
    f"{CDN_COLLATERAL}/fy26-q1/All-Star-Sports_Aframe_Recreation_0126_V3_DRAFT.pdf",
    "fy26-q1-0126",
  ),
  ActivitySource(
    "art-of-animation",
    ("art-of-animation-resort",),
    recreation_url("art-of-animation-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/DAAR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "pop-century",
    ("pop-century-resort",),
    recreation_url("pop-century-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/POP_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "caribbean-beach",
    ("caribbean-beach-resort",),
    recreation_url("caribbean-beach-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/CBR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "coronado-springs",
    ("coronado-springs-resort",),
    recreation_url("coronado-springs-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/CSR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "port-orleans-french-quarter",
    ("port-orleans-resort-french-quarter",),
    recreation_url("port-orleans-resort-french-quarter"),
    f"{CDN_COLLATERAL}/fy26-q2/POFQ_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
    "Guests may participate in activities at Riverside and French Quarter.",
  ),
  ActivitySource(
    "port-orleans-riverside",
    ("port-orleans-resort-riverside",),
    recreation_url("port-orleans-resort-riverside"),
    f"{CDN_COLLATERAL}/fy26-q2/PORS_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
    "Guests may participate in activities at Riverside and French Quarter.",
  ),
  ActivitySource(
    "animal-kingdom-jambo",
    ("animal-kingdom-lodge", "animal-kingdom-villas-jambo-house"),
    recreation_url("animal-kingdom-lodge"),
    f"{CDN_COLLATERAL}/fy26-q3/DAKL_Aframe_Recreation-0526_Jambo_DIGITAL.pdf",
    "fy26-q3-0526-jambo",
    "Jambo House calendar; Kidani Village has a separate calendar.",
  ),
  ActivitySource(
    "animal-kingdom-kidani",
    ("animal-kingdom-villas-kidani-village",),
    recreation_url("animal-kingdom-villas-kidani-village"),
    f"{CDN_COLLATERAL}/fy26-q3/DAKL_Aframe_Recreation-0526_Kidani_DIGITAL.pdf",
    "fy26-q3-0526-kidani",
    "Kidani Village calendar; Jambo House has a separate calendar.",
  ),
  ActivitySource(
    "beach-yacht-club",
    (
      "beach-club-resort",
      "yacht-club-resort",
      "beach-club-villas",
    ),
    recreation_url("beach-club-resort"),
    f"{CDN_COLLATERAL}/fy26-q1/YB_Aframe_Recreation-0126.pdf",
    "fy26-q1-0126",
    "Shared calendar for Disney's Beach Club and Yacht Club Resorts.",
  ),
  ActivitySource(
    "boardwalk",
    ("boardwalk-inn", "boardwalk-villas"),
    recreation_url("boardwalk-inn"),
    f"{CDN_COLLATERAL}/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
    "fy26-q3-0526",
    "Shared calendar for Disney's BoardWalk Inn and BoardWalk Villas.",
  ),
  ActivitySource(
    "contemporary",
    ("contemporary-resort", "bay-lake-tower-at-contemporary-resort"),
    recreation_url("contemporary-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/CTR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
    "Shared calendar for Contemporary Resort and Bay Lake Tower.",
  ),
  ActivitySource(
    "grand-floridian",
    ("grand-floridian-resort-and-spa", "villas-at-grand-floridian-resort-and-spa"),
    recreation_url("grand-floridian-resort-and-spa"),
    f"{CDN_COLLATERAL}/fy26-q2/GF_Aframe_Recreation-0526.pdf",
    "fy26-q2-0526",
    "Shared calendar for Grand Floridian Resort & Spa and Villas.",
  ),
  ActivitySource(
    "polynesian",
    ("polynesian-village-resort", "polynesian-villas-and-bungalows"),
    recreation_url("polynesian-village-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/Polynesian_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
    "Shared calendar for Polynesian Village Resort and Polynesian Villas & Bungalows.",
  ),
  ActivitySource(
    "wilderness-lodge",
    (
      "wilderness-lodge",
      "boulder-ridge-villas-at-wilderness-lodge",
      "copper-creek-villas-and-cabins-at-wilderness-lodge",
    ),
    recreation_url("wilderness-lodge"),
    f"{CDN_COLLATERAL}/fy26-q2/WL_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
    "Shared calendar for Wilderness Lodge and DVC villa wings.",
  ),
  ActivitySource(
    "old-key-west",
    ("old-key-west-resort",),
    recreation_url("old-key-west-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/OKWR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "riviera",
    ("riviera-resort",),
    recreation_url("riviera-resort"),
    f"{CDN_COLLATERAL}/fy26-q2/DRR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "saratoga-springs",
    ("saratoga-springs-resort-and-spa",),
    recreation_url("saratoga-springs-resort-and-spa"),
    f"{CDN_COLLATERAL}/fy26-q2/SSR_Aframe_Recreation-0326.pdf",
    "fy26-q2-0326",
  ),
  ActivitySource(
    "fort-wilderness",
    ("campsites-at-fort-wilderness-resort", "cabins-at-fort-wilderness-resort"),
    recreation_url("campsites-at-fort-wilderness-resort"),
    None,
    None,
    "No A-frame recreation PDF found; activities sourced from official recreation page.",
  ),
]


def apply_pdf_source_overrides(
  sources: list[ActivitySource],
  overrides: dict[str, dict[str, str]],
) -> list[ActivitySource]:
  replaced: list[ActivitySource] = []
  for source in sources:
    override = overrides.get(source.calendar_group_key)
    if not override:
      replaced.append(source)
      continue
    replaced.append(
      ActivitySource(
        source.calendar_group_key,
        source.resort_slugs,
        source.recreation_page_url,
        override["pdf_url"],
        override["pdf_edition"],
        source.notes,
      )
    )
  return replaced


ACTIVITY_CALENDAR_GROUPS: list[ActivityCalendarGroup] = [
  ActivityCalendarGroup(
    source.calendar_group_key,
    source.resort_slugs,
    notes=source.notes,
  )
  for source in ACTIVITY_SOURCES
]


_DISNEY_RECREATION_SLUG_OVERRIDES = {
  "cabins-at-fort-wilderness-resort": "dvc-cabins-at-fort-wilderness-resort",
}


def _source_kind_for(source: ActivitySource) -> str:
  return "pdf" if source.pdf_url else "official_web"


def resort_recreation_sources_for(
  activity_sources: list[ActivitySource],
) -> list[ResortRecreationSource]:
  return [
    ResortRecreationSource(
      resort_slug=resort_slug,
      calendar_group_key=source.calendar_group_key,
      disney_recreation_slug=_DISNEY_RECREATION_SLUG_OVERRIDES.get(
        resort_slug,
        resort_slug,
      ),
      recreation_page_url=recreation_url(
        _DISNEY_RECREATION_SLUG_OVERRIDES.get(resort_slug, resort_slug)
      ),
      pdf_url=source.pdf_url,
      pdf_edition=source.pdf_edition,
      source_kind=_source_kind_for(source),
      notes=source.notes,
    )
    for source in activity_sources
    for resort_slug in source.resort_slugs
  ]


RESORT_RECREATION_SOURCES: list[ResortRecreationSource] = resort_recreation_sources_for(
  ACTIVITY_SOURCES
)

# Verify coverage of all 31 resorts
ALL_RESORT_SLUGS = {
  "pop-century-resort", "caribbean-beach-resort", "animal-kingdom-lodge",
  "saratoga-springs-resort-and-spa", "port-orleans-resort-riverside",
  "all-star-music-resort", "all-star-movies-resort", "coronado-springs-resort",
  "port-orleans-resort-french-quarter", "all-star-sports-resort",
  "art-of-animation-resort", "polynesian-village-resort",
  "grand-floridian-resort-and-spa", "wilderness-lodge", "beach-club-resort",
  "contemporary-resort", "yacht-club-resort", "boardwalk-inn",
  "old-key-west-resort", "polynesian-villas-and-bungalows",
  "bay-lake-tower-at-contemporary-resort", "villas-at-grand-floridian-resort-and-spa",
  "animal-kingdom-villas-kidani-village", "boardwalk-villas", "beach-club-villas",
  "boulder-ridge-villas-at-wilderness-lodge", "animal-kingdom-villas-jambo-house",
  "campsites-at-fort-wilderness-resort",
  "copper-creek-villas-and-cabins-at-wilderness-lodge", "riviera-resort",
  "cabins-at-fort-wilderness-resort",
}

_manifest_slugs = {slug for src in ACTIVITY_SOURCES for slug in src.resort_slugs}
assert _manifest_slugs == ALL_RESORT_SLUGS, (
  f"Manifest slug mismatch. Missing: {_manifest_slugs ^ ALL_RESORT_SLUGS}"
)

_resort_source_slugs = {source.resort_slug for source in RESORT_RECREATION_SOURCES}
assert _resort_source_slugs == ALL_RESORT_SLUGS, (
  f"Resort recreation source mismatch. Missing: {_resort_source_slugs ^ ALL_RESORT_SLUGS}"
)
