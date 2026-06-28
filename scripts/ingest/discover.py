"""Discover official Disney recreation PDF URLs and detect changes."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    from config import DISNEY_USER_AGENT, PROCESSED_DIR
    from fetch import head_metadata, latest_document_for_url, sha256_bytes
    from source_manifest import (
        ACTIVITY_SOURCES,
        RESORT_RECREATION_SOURCES,
        ActivitySource,
        ResortRecreationSource,
    )
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import DISNEY_USER_AGENT, PROCESSED_DIR
    from .fetch import head_metadata, latest_document_for_url, sha256_bytes
    from .source_manifest import (
        ACTIVITY_SOURCES,
        RESORT_RECREATION_SOURCES,
        ActivitySource,
        ResortRecreationSource,
    )

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None  # type: ignore

PDF_RE = re.compile(
    r"https://cdn\d*\.parksmedia\.wdprapps\.disney\.com/[^\s\"'<>]+\.pdf",
    re.I,
)

CDN_COLLATERAL = (
    "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/"
    "parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation"
)

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
                        f"{CDN_COLLATERAL}/{folder}/{code}_Aframe_Recreation-{mmyy}.pdf",
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


def scrape_recreation_pdf(slug: str) -> tuple[str | None, str | None]:
    if sync_playwright is None:
        return None, "playwright not installed"
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
        pdfs = sorted(set(PDF_RE.findall(html)))
        return (pdfs[0] if pdfs else None), None
    except Exception as exc:
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
            discovered_url = scraped

    # Probe CDN for the newest known collateral even when the manifest URL is still reachable.
    head = head_metadata(discovered_url) if discovered_url else {}
    for candidate in probe_cdn_candidates(source.calendar_group_key, ["0526", "0426", "0326", "0126", "1125"]):
        if candidate == discovered_url:
            break
        if check_url_exists(candidate):
            discovered_url = candidate
            head = head_metadata(candidate)
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
            discovered_url = scraped

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
    }


def discover_all_resort_sources(*, use_playwright: bool = True) -> list[dict]:
    return [
        discover_resort_source(source, use_playwright=use_playwright)
        for source in RESORT_RECREATION_SOURCES
    ]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Discover recreation PDF URLs")
    parser.add_argument("--no-playwright", action="store_true", help="HEAD/manifest only")
    parser.add_argument("--compare-db", action="store_true", help="Compare against source_documents")
    args = parser.parse_args()

    db = None
    if args.compare_db:
        try:
            from db import SupabaseClient
            db = SupabaseClient()
        except RuntimeError:
            print("Warning: Supabase not configured, skipping DB compare")

    entries: list[dict] = []
    for source in ACTIVITY_SOURCES:
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

    resort_entries = discover_all_resort_sources(use_playwright=not args.no_playwright)

    report = {
        "discovered_at": datetime.now(timezone.utc).isoformat(),
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
