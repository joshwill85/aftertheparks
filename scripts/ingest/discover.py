"""Discover official Disney recreation PDF URLs and detect changes."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

try:
    from config import DISNEY_USER_AGENT, PROCESSED_DIR
    from disney_recreation_offerings import DISNEY_RESORT_ID_TO_SLUG
    from fetch import head_metadata, latest_document_for_url, sha256_bytes
    from source_manifest import (
        ACTIVITY_SOURCES,
        RESORT_RECREATION_SOURCES,
        ActivitySource,
        ResortRecreationSource,
        filter_activity_sources_for_quarter,
        resort_recreation_sources_for,
    )
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import DISNEY_USER_AGENT, PROCESSED_DIR
    from .disney_recreation_offerings import DISNEY_RESORT_ID_TO_SLUG
    from .fetch import head_metadata, latest_document_for_url, sha256_bytes
    from .source_manifest import (
        ACTIVITY_SOURCES,
        RESORT_RECREATION_SOURCES,
        ActivitySource,
        ResortRecreationSource,
        filter_activity_sources_for_quarter,
        resort_recreation_sources_for,
    )

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None  # type: ignore

PDF_RE = re.compile(
    r"https://cdn\d*\.parksmedia\.wdprapps\.disney\.com/[^\s\"'<>]+\.pdf",
    re.I,
)
SCHEDULE_DOCUMENT_RE = re.compile(
    r"https://cdn\d*\.parksmedia\.wdprapps\.disney\.com/[^\s\"'<>]+\.(?:pdf|jpg|jpeg|png)",
    re.I,
)

CDN_COLLATERAL = (
    "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/"
    "parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation"
)

RESORT_SLUG_TO_ID: dict[str, str] = {
    slug: resort_id.split(";", 1)[0]
    for resort_id, slug in DISNEY_RESORT_ID_TO_SLUG.items()
}

# Resort code → calendar group for CDN probing
RESORT_CODES: dict[str, str] = {
    "All-Star-Movies": "all-star-movies",
    "All-Star-Music": "all-star-music",
    "All-Star-Sports": "all-star-sports",
    "DAAR": "art-of-animation",
    "POP": "pop-century",
    "CBR": "caribbean-beach",
    "CSR": "coronado-springs",
    "POFQ": "port-orleans-french-quarter",
    "PORS": "port-orleans-riverside",
    "DAKL_JAMBO": "animal-kingdom-jambo",
    "DAKL_KIDANI": "animal-kingdom-kidani",
    "YB": "beach-yacht-club",
    "BW": "boardwalk",
    "CTR": "contemporary",
    "GF": "grand-floridian",
    "Polynesian": "polynesian",
    "WL": "wilderness-lodge",
    "OKWR": "old-key-west",
    "DRR": "riviera",
    "SSR": "saratoga-springs",
}


class RecreationPdfLinkParser(HTMLParser):
    def __init__(self, parent_url: str):
        super().__init__()
        self.parent_url = parent_url
        self._active_href: str | None = None
        self._active_text: list[str] = []
        self.links: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attrs_dict = {key.lower(): value for key, value in attrs if value}
        href = attrs_dict.get("href")
        if href and SCHEDULE_DOCUMENT_RE.search(href):
            self._active_href = urljoin(self.parent_url, href)
            self._active_text = []

    def handle_data(self, data: str) -> None:
        if self._active_href:
            self._active_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._active_href:
            return
        href = self._active_href
        anchor_text = " ".join(" ".join(self._active_text).split())
        self.links.append(_pdf_link_record(href, anchor_text, self.parent_url))
        self._active_href = None
        self._active_text = []


def _pdf_link_record(href: str, anchor_text: str, parent_url: str) -> dict:
    edition_match = re.search(r"/(fy\d+-q\d+)/", href, flags=re.I)
    mmddyy_match = re.search(r"(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)", href)
    mmyy_match = re.search(r"(?<!\d)(\d{2})(\d{2})(?!\d)", href)
    filename_date = (
        f"{mmddyy_match.group(1)}{mmddyy_match.group(3)}"
        if mmddyy_match
        else f"{mmyy_match.group(1)}{mmyy_match.group(2)}"
        if mmyy_match
        else None
    )
    return {
        "url": href,
        "anchor_text": anchor_text,
        "parent_url": parent_url,
        "edition_folder": edition_match.group(1).lower() if edition_match else None,
        "filename_date": filename_date,
        "evidence_kind": "official_resort_recreation_page",
    }


def extract_recreation_pdf_links_from_html(html: str, *, parent_url: str) -> list[dict]:
    parser = RecreationPdfLinkParser(parent_url)
    parser.feed(html)
    if parser.links:
        return parser.links
    return [
        _pdf_link_record(match.group(0), "", parent_url)
        for match in SCHEDULE_DOCUMENT_RE.finditer(html)
    ]


def _walk_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        strings: list[str] = []
        for item in value:
            strings.extend(_walk_strings(item))
        return strings
    if isinstance(value, dict):
        strings = []
        for item in value.values():
            strings.extend(_walk_strings(item))
        return strings
    return []


def extract_recreation_pdf_links_from_marketing_info(
    payload: dict[str, Any],
    *,
    parent_url: str,
    api_url: str | None = None,
) -> list[dict]:
    recreation_tab = (
        payload.get("tabs", {}).get("recreation")
        if isinstance(payload.get("tabs"), dict)
        else None
    )
    if not isinstance(recreation_tab, dict):
        return []

    links: list[dict] = []
    for html in _walk_strings(recreation_tab):
        if not SCHEDULE_DOCUMENT_RE.search(html):
            continue
        for link in extract_recreation_pdf_links_from_html(html, parent_url=parent_url):
            link["source_api_url"] = api_url
            link["evidence_detail"] = "resort_marketing_info.tabs.recreation"
            links.append(link)

    deduped: dict[str, dict] = {}
    for link in links:
        deduped.setdefault(link["url"], link)
    return list(deduped.values())


def resort_marketing_info_api_url(slug: str) -> str | None:
    resort_id = RESORT_SLUG_TO_ID.get(slug)
    if not resort_id:
        return None
    return (
        "https://disneyworld.disney.go.com/"
        f"wdw-resorts-details-api/api/v1/resort/{resort_id}/marketing-info/?storeId=wdw"
    )


def fetch_resort_marketing_info(slug: str) -> tuple[dict[str, Any] | None, str | None, str | None]:
    api_url = resort_marketing_info_api_url(slug)
    if not api_url:
        return None, None, f"missing Disney numeric resort id for {slug}"
    try:
        request = urllib.request.Request(
            api_url,
            headers={
                "User-Agent": DISNEY_USER_AGENT,
                "Accept": "application/json,text/plain,*/*",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
        return payload, api_url, None
    except Exception as exc:
        return None, api_url, str(exc)


def scrape_recreation_pdf_from_marketing_info(slug: str) -> tuple[dict | None, str | None]:
    parent_url = f"https://disneyworld.disney.go.com/resorts/{slug}/recreation/"
    payload, api_url, error = fetch_resort_marketing_info(slug)
    if payload is None:
        return None, error

    links = extract_recreation_pdf_links_from_marketing_info(
        payload,
        parent_url=parent_url,
        api_url=api_url,
    )
    if not links:
        return None, None
    activity_links = [
        link
        for link in links
        if "recreation" in link["url"].lower()
        or "schedule" in link["anchor_text"].lower()
    ]
    return (activity_links or links)[0], None


def probe_cdn_candidates(group_key: str, months: list[str]) -> list[str]:
    code = next((c for c, g in RESORT_CODES.items() if g == group_key), None)
    if not code:
        return []
    urls: list[str] = []
    for folder in ("fy26-q3", "fy26-q2", "fy26-q1"):
        for mmyy in months:
            if code == "DAKL_JAMBO":
                urls.extend(
                    [
                        f"{CDN_COLLATERAL}/{folder}/DAKL_Aframe_Recreation-{mmyy}_Jambo_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/DAKL_Aframe_Recreation_{mmyy}_Jambo.pdf",
                    ]
                )
            elif code == "DAKL_KIDANI":
                urls.extend(
                    [
                        f"{CDN_COLLATERAL}/{folder}/DAKL_Aframe_Recreation-{mmyy}_Kidani_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/DAKL_Aframe_Recreation_{mmyy}_Kidani.pdf",
                    ]
                )
            elif code.startswith("All-Star"):
                urls.extend(
                    [
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}.pdf",
                    ]
                )
            else:
                urls.extend(
                    [
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}_DIGITAL.pdf",
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation_{mmyy}.pdf",
                    ]
                )
    return urls


def scrape_recreation_pdf(slug: str) -> tuple[dict | None, str | None]:
    api_scraped, api_error = scrape_recreation_pdf_from_marketing_info(slug)
    if api_scraped:
        return api_scraped, None
    if sync_playwright is None:
        return None, api_error or "playwright not installed"
    url = f"https://disneyworld.disney.go.com/resorts/{slug}/recreation/"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=DISNEY_USER_AGENT,
                extra_http_headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
            )
            page = context.new_page()
            page.set_default_timeout(60000)
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3000)
            html = page.content()
            browser.close()
        links = extract_recreation_pdf_links_from_html(html, parent_url=url)
        if not links:
            return None, None
        activity_links = [
            link
            for link in links
            if "recreation" in link["url"].lower()
            or "schedule" in link["anchor_text"].lower()
        ]
        return (activity_links or links)[0], None
    except Exception as exc:
        if api_error:
            return None, f"{api_error}; {exc}"
        return None, str(exc)


def check_url_exists(url: str) -> bool:
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": DISNEY_USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except urllib.error.HTTPError:
        return False
    except Exception:
        return False


def discover_source(source: ActivitySource, *, use_playwright: bool = True) -> dict:
    manifest_url = source.pdf_url
    discovered_url = manifest_url
    scrape_error = None

    if use_playwright and source.resort_slugs and source.calendar_group_key != "fort-wilderness":
        slug = source.resort_slugs[0]
        scraped, scrape_error = scrape_recreation_pdf(slug)
        if scraped:
            discovered_url = scraped["url"]
            discovery_evidence = scraped
        else:
            discovery_evidence = None
    else:
        discovery_evidence = None

    head = head_metadata(discovered_url) if discovered_url else {}
    # Pattern probes are review hints only. They must never replace an official
    # resort-page/API link because that recreates the stale-source failure mode.
    if not discovery_evidence:
        for candidate in probe_cdn_candidates(source.calendar_group_key, ["0526", "0426", "0326", "0126", "1125"]):
            if candidate == discovered_url:
                break
            if check_url_exists(candidate):
                discovered_url = candidate
                head = head_metadata(candidate)
                discovery_evidence = {
                    "url": candidate,
                    "anchor_text": "",
                    "parent_url": source.recreation_page_url,
                    "edition_folder": re.search(r"/(fy\d+-q\d+)/", candidate, flags=re.I).group(1).lower()
                    if re.search(r"/(fy\d+-q\d+)/", candidate, flags=re.I)
                    else None,
                    "filename_date": re.search(r"(?<!\d)(\d{4})(?!\d)", candidate).group(1)
                    if re.search(r"(?<!\d)(\d{4})(?!\d)", candidate)
                    else None,
                    "evidence_kind": "cdn_pattern_probe",
                }
                break

    status = "unchanged"
    if not discovered_url:
        status = "missing"
    elif discovered_url != manifest_url:
        status = "url_changed"
    elif manifest_url:
        meta = head_metadata(manifest_url)
        if meta.get("http_status") == 200:
            status = "unchanged"
        else:
            status = "unreachable"

    return {
        "calendar_group_key": source.calendar_group_key,
        "manifest_url": manifest_url,
        "discovered_url": discovered_url,
        "status": status,
        "head": head if discovered_url else {},
        "scrape_error": scrape_error,
        "resort_slugs": list(source.resort_slugs),
        "discovery_evidence": discovery_evidence,
    }


def discover_resort_source(
    source: ResortRecreationSource,
    *,
    use_playwright: bool = True,
) -> dict:
    manifest_url = source.pdf_url
    discovered_url = manifest_url
    scrape_error = None

    if use_playwright:
        scraped, scrape_error = scrape_recreation_pdf(source.disney_recreation_slug)
        if scraped:
            discovered_url = scraped["url"]
            discovery_evidence = scraped
        else:
            discovery_evidence = None
    else:
        discovery_evidence = None

    head = head_metadata(discovered_url) if discovered_url else {}
    status = "unchanged"
    if not discovered_url:
        status = "html_only"
    elif discovered_url != manifest_url:
        status = "url_changed"
    elif manifest_url:
        meta = head_metadata(manifest_url)
        status = "unchanged" if meta.get("http_status") == 200 else "unreachable"

    return {
        "resort_slug": source.resort_slug,
        "calendar_group_key": source.calendar_group_key,
        "disney_recreation_slug": source.disney_recreation_slug,
        "recreation_page_url": source.recreation_page_url,
        "manifest_url": manifest_url,
        "discovered_url": discovered_url,
        "source_kind": source.source_kind,
        "status": status,
        "head": head if discovered_url else {},
        "scrape_error": scrape_error,
        "discovery_evidence": discovery_evidence,
    }


def select_sources_for_discovery(
    sources: list[ActivitySource],
    *,
    quarter: str | None = None,
) -> list[ActivitySource]:
    return filter_activity_sources_for_quarter(sources, quarter)


def select_resort_sources_for_discovery(
    sources: list[ActivitySource],
    *,
    quarter: str | None = None,
) -> list[ResortRecreationSource]:
    selected = select_sources_for_discovery(sources, quarter=quarter)
    return resort_recreation_sources_for(selected)


def discover_all_resort_sources(
    *,
    use_playwright: bool = True,
    activity_sources: list[ActivitySource] | None = None,
    quarter: str | None = None,
) -> list[dict]:
    resort_sources = (
        RESORT_RECREATION_SOURCES
        if activity_sources is None and not quarter
        else select_resort_sources_for_discovery(activity_sources or ACTIVITY_SOURCES, quarter=quarter)
    )
    return [
        discover_resort_source(source, use_playwright=use_playwright)
        for source in resort_sources
    ]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Discover recreation source document URLs")
    parser.add_argument("--no-playwright", action="store_true", help="HEAD/manifest only")
    parser.add_argument("--compare-db", action="store_true", help="Compare against source_documents")
    parser.add_argument("--quarter", help="Discover only source editions in this quarter, e.g. fy26-q4")
    args = parser.parse_args()

    db = None
    if args.compare_db:
        try:
            from db import SupabaseClient
            db = SupabaseClient()
        except RuntimeError:
            print("Warning: Supabase not configured, skipping DB compare")

    entries: list[dict] = []
    sources = select_sources_for_discovery(ACTIVITY_SOURCES, quarter=args.quarter)
    for source in sources:
        print(f"Discovering {source.calendar_group_key}...")
        entry = discover_source(source, use_playwright=not args.no_playwright)
        if db and entry.get("discovered_url"):
            existing = latest_document_for_url(db, entry["discovered_url"])
            entry["db_document"] = existing
            if existing and entry.get("head", {}).get("etag"):
                if existing.get("etag") != entry["head"]["etag"]:
                    entry["status"] = "content_changed"
        entries.append(entry)
        print(f"  -> {entry['status']}: {entry.get('discovered_url', 'none')}")

    resort_entries = discover_all_resort_sources(
        use_playwright=not args.no_playwright,
        activity_sources=sources,
    )

    report = {
        "discovered_at": datetime.now(timezone.utc).isoformat(),
        "quarter": args.quarter,
        "entries": entries,
        "resort_entries": resort_entries,
        "summary": {
            "unchanged": sum(1 for e in entries if e["status"] == "unchanged"),
            "url_changed": sum(1 for e in entries if e["status"] == "url_changed"),
            "content_changed": sum(1 for e in entries if e["status"] == "content_changed"),
            "missing": sum(1 for e in entries if e["status"] == "missing"),
            "resort_sources": len(resort_entries),
            "resort_html_only": sum(1 for e in resort_entries if e["status"] == "html_only"),
        },
    }

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / "discovery_report.json"
    out.write_text(json.dumps(report, indent=2))
    print(f"Wrote {out}")
    print(f"Summary: {report['summary']}")


if __name__ == "__main__":
    main()
