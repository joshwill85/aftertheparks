# Resort PDF Source Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace stale hardcoded recreation PDF sources with live resort-page-derived Disney PDF URLs, re-ingest every stale calendar group, and block production whenever OCR/source/UI data is not current and source-backed.

**Architecture:** The resort recreation page is the source-of-truth entry point. The pipeline discovers each resort's current "Activities Schedule" PDF from its official Disney recreation page, builds a replacement source manifest from those live links, fetches and validates each replacement PDF, regenerates Gold/public data from only current sources, and fails closed if any stale source remains in the publish set. Existing extraction, visual layout snapshot, Gold v2, and UI mapping layers stay in place, but source freshness becomes date-aware and parent-page-backed instead of "URL still returns 200."

**Tech Stack:** Python ingestion scripts, Playwright for official Disney SPA page extraction, PDF layout/OCR utilities already used by `scripts/ingest/extract_v2.py`, TypeScript/Next.js UI tests with `npx tsx`, existing Gold v2 contracts.

---

## Non-Negotiable Rules

- Official Disney resort recreation pages are the source entry point for resort PDFs.
- A reachable old PDF is stale if a newer official PDF is linked from the resort page or discoverable from the current linked page evidence.
- This is replacement, not incremental load. For each stale calendar group, old public rows, old Gold preview rows, old source inventory entries, and old production source URLs must be replaced.
- Do not publish any PDF calendar group whose current source URL was inferred only from a filename pattern. Pattern probing can suggest review candidates, but production input must be backed by the official resort page link or captured page evidence.
- Do not silently publish OCR-mangled movie titles, dates, locations, or times. Visual/PDF layout evidence must support fields that appear in the UI.
- Fort Wilderness remains official-web sourced unless its resort page exposes a current official PDF.

## Files And Responsibilities

- Modify `scripts/ingest/discover.py`: replace single-regex HTML scraping with official resort-page link extraction that captures anchor text, href, page URL, timestamp, and source evidence.
- Create `scripts/ingest/audit_resort_pdf_dates.py`: date-aware source audit showing manifest date, live resort-page PDF date, CDN `Last-Modified`, stale status, and replacement requirement.
- Create `scripts/ingest/replace_resort_pdf_sources.py`: controlled replacement runner that writes a generated replacement manifest/report and refuses partial stale publish.
- Modify `scripts/ingest/source_manifest.py`: remove "prefer fy26-q2" policy; support generated overrides from live discovery without hand-editing each URL.
- Modify `scripts/ingest/fetch.py`: support replacement-mode fetching for all stale groups and include `last_modified`, parent recreation page URL, and discovery evidence in reports.
- Modify `scripts/ingest/extract_v2.py`: preserve manual reviewed `movie_nights`, continue known OCR repairs, and expose validation hooks for movie-night/date/time blocks.
- Modify `scripts/ingest/promote_gold.py`: ensure replacement output carries `movie_nights` and current source metadata into `activity_gold_v2_preview.json`.
- Modify `scripts/ingest/audit_source_freshness.py`: fail if a production Gold row uses a stale PDF date or a source URL not matching live parent-page evidence.
- Modify `scripts/ingest/audit_coverage.py`: include stale-source counts in production-ready mode.
- Modify `scripts/test_pipeline_contracts.py`: add date/source replacement contracts and fixture expectations for current PDFs.
- Modify `scripts/test-gold-v2-mapping.ts`, `scripts/test-activity-answer-coverage.ts`, `scripts/test-event-card-layout.ts`: assert cards/details expose current source-backed what/when/where.
- Update `data/golden/activities/*.json`: replace stale fixtures with current official PDF hashes/fields after validation.
- Regenerate `data/processed/activity_gold_v2_preview.json`, `data/processed/source_inventory.json`, `data/processed/source_freshness_report.json`, `data/processed/source_trust_summary.json`, and any visual layout snapshots for current PDFs.
- Add `docs/source-refresh-runbook.md`: exact operator flow for future refreshes.

---

### Task 1: Add Live Resort Page PDF Discovery Evidence

**Files:**
- Modify: `scripts/ingest/discover.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Write failing tests for resort-page PDF extraction**

Add this test helper and test case to `scripts/test_pipeline_contracts.py` near existing discovery/source tests:

```python
def test_discover_extracts_activity_schedule_pdf_from_resort_page_html(self) -> None:
    from scripts.ingest.discover import extract_recreation_pdf_links_from_html

    html = """
    <html>
      <body>
        <a href="/resorts/boardwalk-inn/">Overview</a>
        <a href="https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf">
          View the full schedule of recreation and entertainment.
        </a>
      </body>
    </html>
    """

    links = extract_recreation_pdf_links_from_html(
        html,
        parent_url="https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
    )

    self.assertEqual(1, len(links))
    self.assertEqual("View the full schedule of recreation and entertainment.", links[0]["anchor_text"])
    self.assertEqual("fy26-q3", links[0]["edition_folder"])
    self.assertEqual("0526", links[0]["filename_date"])
    self.assertEqual("official_resort_recreation_page", links[0]["evidence_kind"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_discover_extracts_activity_schedule_pdf_from_resort_page_html
```

Expected: `ImportError` or `AttributeError` because `extract_recreation_pdf_links_from_html` does not exist.

- [ ] **Step 3: Implement structured PDF link extraction**

In `scripts/ingest/discover.py`, add:

```python
from html.parser import HTMLParser
from urllib.parse import urljoin


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
        if href and PDF_RE.search(href):
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
    date_match = re.search(r"(?<!\d)(\d{4})(?!\d)", href)
    return {
        "url": href,
        "anchor_text": anchor_text,
        "parent_url": parent_url,
        "edition_folder": edition_match.group(1).lower() if edition_match else None,
        "filename_date": date_match.group(1) if date_match else None,
        "evidence_kind": "official_resort_recreation_page",
    }


def extract_recreation_pdf_links_from_html(html: str, *, parent_url: str) -> list[dict]:
    parser = RecreationPdfLinkParser(parent_url)
    parser.feed(html)
    if parser.links:
        return parser.links
    return [
        _pdf_link_record(match.group(0), "", parent_url)
        for match in PDF_RE.finditer(html)
    ]
```

- [ ] **Step 4: Update `scrape_recreation_pdf` to return evidence**

Replace `scrape_recreation_pdf(slug: str) -> tuple[str | None, str | None]` with:

```python
def scrape_recreation_pdf(slug: str) -> tuple[dict | None, str | None]:
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
        links = extract_recreation_pdf_links_from_html(html, parent_url=url)
        if not links:
            return None, None
        activity_links = [
            link for link in links
            if "recreation" in link["url"].lower() or "schedule" in link["anchor_text"].lower()
        ]
        return (activity_links or links)[0], None
    except Exception as exc:
        return None, str(exc)
```

Update call sites so `discovered_url = scraped["url"]` and include `discovery_evidence: scraped`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_discover_extracts_activity_schedule_pdf_from_resort_page_html
python3 scripts/ingest/discover.py --no-playwright
```

Expected: unit test passes; discovery report still writes successfully.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest/discover.py scripts/test_pipeline_contracts.py
git commit -m "feat: capture resort page PDF discovery evidence"
```

---

### Task 2: Add Date-Aware Source Freshness Audit

**Files:**
- Create: `scripts/ingest/audit_resort_pdf_dates.py`
- Modify: `scripts/test_pipeline_contracts.py`
- Modify: `package.json`

- [ ] **Step 1: Write failing contract for stale manifest detection**

Add this test to `scripts/test_pipeline_contracts.py`:

```python
def test_resort_pdf_date_audit_flags_newer_live_pdf(self) -> None:
    from scripts.ingest.audit_resort_pdf_dates import build_resort_pdf_date_audit

    manifest_rows = [
        {
            "calendar_group_key": "boardwalk",
            "manifest_url": "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q2/BW_Aframe_Recreation-0326.pdf",
            "resort_slugs": ["boardwalk-inn"],
        }
    ]
    discovery_rows = [
        {
            "calendar_group_key": "boardwalk",
            "discovered_url": "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "discovery_evidence": {"evidence_kind": "official_resort_recreation_page"},
        }
    ]

    audit = build_resort_pdf_date_audit(
        manifest_rows=manifest_rows,
        discovery_rows=discovery_rows,
        head_by_url={},
    )

    self.assertFalse(audit["passed"])
    self.assertEqual(["boardwalk"], audit["summary"]["stale_groups"])
    self.assertEqual("fy26-q2 / 0326", audit["sources"][0]["manifest_edition"])
    self.assertEqual("fy26-q3 / 0526", audit["sources"][0]["live_edition"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_resort_pdf_date_audit_flags_newer_live_pdf
```

Expected: import failure because the audit script does not exist.

- [ ] **Step 3: Implement audit script**

Create `scripts/ingest/audit_resort_pdf_dates.py`:

```python
"""Date-aware audit for official Disney resort recreation PDF sources."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from discover import discover_source
    from fetch import head_metadata
    from source_manifest import ACTIVITY_SOURCES
except ImportError:  # pragma: no cover
    from .config import PROCESSED_DIR
    from .discover import discover_source
    from .fetch import head_metadata
    from .source_manifest import ACTIVITY_SOURCES


def pdf_edition(url: str | None) -> str | None:
    if not url:
        return None
    folder = re.search(r"/(fy\d+-q\d+)/", url, flags=re.I)
    date = re.search(r"(?<!\d)(\d{4})(?!\d)", url)
    folder_value = folder.group(1).lower() if folder else "?"
    date_value = date.group(1) if date else "?"
    return f"{folder_value} / {date_value}"


def edition_sort_key(url: str | None) -> tuple[int, int, int, int]:
    if not url:
        return (0, 0, 0, 0)
    folder = re.search(r"fy(\d+)-q(\d+)", url, flags=re.I)
    date = re.search(r"(?<!\d)(\d{2})(\d{2})(?!\d)", url)
    fy = int(folder.group(1)) if folder else 0
    quarter = int(folder.group(2)) if folder else 0
    year = int(date.group(2)) if date else 0
    month = int(date.group(1)) if date else 0
    return (fy, quarter, year, month)


def manifest_rows_from_sources() -> list[dict[str, Any]]:
    return [
        {
            "calendar_group_key": source.calendar_group_key,
            "manifest_url": source.pdf_url,
            "resort_slugs": list(source.resort_slugs),
        }
        for source in ACTIVITY_SOURCES
    ]


def build_resort_pdf_date_audit(
    *,
    manifest_rows: list[dict[str, Any]],
    discovery_rows: list[dict[str, Any]],
    head_by_url: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    discovery_by_group = {
        row["calendar_group_key"]: row
        for row in discovery_rows
        if row.get("calendar_group_key")
    }
    sources: list[dict[str, Any]] = []
    stale_groups: list[str] = []
    missing_live_evidence: list[str] = []

    for manifest in manifest_rows:
        group = manifest["calendar_group_key"]
        manifest_url = manifest.get("manifest_url")
        discovery = discovery_by_group.get(group, {})
        live_url = discovery.get("discovered_url") or discovery.get("url")
        source_kind = "official_web" if not manifest_url else "pdf"

        stale = False
        if source_kind == "pdf":
            if not live_url:
                missing_live_evidence.append(group)
            elif live_url != manifest_url and edition_sort_key(live_url) >= edition_sort_key(manifest_url):
                stale = True

        if stale:
            stale_groups.append(group)

        sources.append(
            {
                "calendar_group_key": group,
                "resort_slugs": manifest.get("resort_slugs", []),
                "manifest_url": manifest_url,
                "manifest_edition": pdf_edition(manifest_url),
                "manifest_last_modified": head_by_url.get(manifest_url or "", {}).get("last_modified"),
                "live_url": live_url,
                "live_edition": pdf_edition(live_url),
                "live_last_modified": head_by_url.get(live_url or "", {}).get("last_modified"),
                "stale": stale,
                "source_kind": source_kind,
                "discovery_evidence": discovery.get("discovery_evidence"),
            }
        )

    return {
        "passed": not stale_groups and not missing_live_evidence,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "sources_checked": len(sources),
            "stale_groups": stale_groups,
            "missing_live_evidence": missing_live_evidence,
        },
        "sources": sources,
    }


def live_discovery_rows(*, use_playwright: bool) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for source in ACTIVITY_SOURCES:
        row = discover_source(source, use_playwright=use_playwright)
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-playwright", action="store_true")
    parser.add_argument("--allow-stale", action="store_true")
    args = parser.parse_args()

    discovery_rows = live_discovery_rows(use_playwright=not args.no_playwright)
    urls = {
        url
        for row in discovery_rows
        for url in (row.get("manifest_url"), row.get("discovered_url"))
        if url
    }
    head_by_url = {url: head_metadata(url) for url in sorted(urls)}
    audit = build_resort_pdf_date_audit(
        manifest_rows=manifest_rows_from_sources(),
        discovery_rows=discovery_rows,
        head_by_url=head_by_url,
    )
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / "resort_pdf_date_audit.json"
    out.write_text(json.dumps(audit, indent=2))
    print(json.dumps(audit["summary"], indent=2))
    if not audit["passed"] and not args.allow_stale:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Add npm script**

In `package.json`, add:

```json
"audit:resort-pdf-dates": "python3 scripts/ingest/audit_resort_pdf_dates.py"
```

- [ ] **Step 5: Run audit**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_resort_pdf_date_audit_flags_newer_live_pdf
npm run audit:resort-pdf-dates -- --allow-stale
```

Expected: unit test passes; audit writes `data/processed/resort_pdf_date_audit.json` and lists stale groups before replacement.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest/audit_resort_pdf_dates.py scripts/test_pipeline_contracts.py package.json data/processed/resort_pdf_date_audit.json
git commit -m "feat: add date-aware resort PDF freshness audit"
```

---

### Task 3: Replace Manifest URLs From Official Resort Page Evidence

**Files:**
- Create: `scripts/ingest/replace_resort_pdf_sources.py`
- Modify: `scripts/ingest/source_manifest.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Write failing test for generated source overrides**

Add to `scripts/test_pipeline_contracts.py`:

```python
def test_generated_replacement_sources_override_stale_manifest(self) -> None:
    from scripts.ingest.replace_resort_pdf_sources import build_replacement_overrides

    audit = {
        "sources": [
            {
                "calendar_group_key": "boardwalk",
                "manifest_url": "https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
                "live_url": "https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                "live_edition": "fy26-q3 / 0526",
                "stale": True,
                "discovery_evidence": {"evidence_kind": "official_resort_recreation_page"},
            }
        ]
    }

    overrides = build_replacement_overrides(audit)

    self.assertEqual(
        {
            "boardwalk": {
                "pdf_url": "https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                "pdf_edition": "fy26-q3-0526",
                "replaced_stale_url": "https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
            }
        },
        overrides,
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_generated_replacement_sources_override_stale_manifest
```

Expected: import failure.

- [ ] **Step 3: Implement replacement override builder**

Create `scripts/ingest/replace_resort_pdf_sources.py`:

```python
"""Build replacement PDF source overrides from live official resort-page evidence."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover
    from .config import PROCESSED_DIR


OVERRIDES_PATH = PROCESSED_DIR / "resort_pdf_source_overrides.json"


def edition_id(live_edition: str | None, live_url: str) -> str:
    if live_edition:
        match = re.match(r"(fy\d+-q\d+)\s*/\s*(\d{4})", live_edition)
        if match:
            return f"{match.group(1)}-{match.group(2)}"
    folder = re.search(r"/(fy\d+-q\d+)/", live_url, flags=re.I)
    date = re.search(r"(?<!\d)(\d{4})(?!\d)", live_url)
    if folder and date:
        return f"{folder.group(1).lower()}-{date.group(1)}"
    raise ValueError(f"Cannot determine edition for {live_url}")


def build_replacement_overrides(audit: dict[str, Any]) -> dict[str, dict[str, str]]:
    overrides: dict[str, dict[str, str]] = {}
    for row in audit.get("sources", []):
        if not row.get("stale"):
            continue
        evidence = row.get("discovery_evidence") or {}
        if evidence.get("evidence_kind") != "official_resort_recreation_page":
            raise ValueError(f"{row['calendar_group_key']} replacement lacks official page evidence")
        live_url = row["live_url"]
        overrides[row["calendar_group_key"]] = {
            "pdf_url": live_url,
            "pdf_edition": edition_id(row.get("live_edition"), live_url),
            "replaced_stale_url": row.get("manifest_url"),
        }
    return overrides


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, default=PROCESSED_DIR / "resort_pdf_date_audit.json")
    parser.add_argument("--out", type=Path, default=OVERRIDES_PATH)
    args = parser.parse_args()

    audit = json.loads(args.audit.read_text())
    overrides = build_replacement_overrides(audit)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(overrides, indent=2))
    print(json.dumps({"overrides": len(overrides), "groups": sorted(overrides)}, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Modify manifest to apply generated overrides**

At the bottom of `scripts/ingest/source_manifest.py`, after `ACTIVITY_SOURCES`, add a pure helper:

```python
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
```

Do not auto-load overrides at import time yet. The replacement runner will pass explicit source lists to fetch/extract to keep the operation reviewable.

- [ ] **Step 5: Run tests**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.PipelineContractsTest.test_generated_replacement_sources_override_stale_manifest
python3 scripts/ingest/replace_resort_pdf_sources.py --audit data/processed/resort_pdf_date_audit.json
```

Expected: test passes; override JSON is created for stale groups.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest/replace_resort_pdf_sources.py scripts/ingest/source_manifest.py scripts/test_pipeline_contracts.py data/processed/resort_pdf_source_overrides.json
git commit -m "feat: build replacement source overrides from live Disney pages"
```

---

### Task 4: Fetch Replacement PDFs And Remove Stale Sources From Publish Inputs

**Files:**
- Modify: `scripts/ingest/fetch.py`
- Modify: `scripts/ingest/run_pipeline.py` if replacement pipeline orchestration exists there
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Add test for replacement-mode fetch report**

Add:

```python
def test_fetch_report_records_replacement_source_metadata(self) -> None:
    from scripts.ingest.fetch import fetch_report_row

    row = fetch_report_row(
        calendar_group_key="boardwalk",
        status="fetched",
        source_document_id=None,
        content_sha256="a" * 64,
        message="boardwalk/fy26-q3-0526/a.pdf",
        canonical_url="https://example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
        replaced_stale_url="https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf",
        last_modified="Wed, 20 May 2026 13:55:23 GMT",
        discovery_parent_url="https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
    )

    self.assertEqual("https://example.com/fy26-q2/BW_Aframe_Recreation-0326.pdf", row["replaced_stale_url"])
    self.assertEqual("Wed, 20 May 2026 13:55:23 GMT", row["last_modified"])
    self.assertEqual("https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/", row["discovery_parent_url"])
```

- [ ] **Step 2: Implement `fetch_report_row`**

In `scripts/ingest/fetch.py`, add:

```python
def fetch_report_row(
    *,
    calendar_group_key: str,
    status: str,
    source_document_id: str | None,
    content_sha256: str | None,
    message: str | None,
    canonical_url: str | None = None,
    replaced_stale_url: str | None = None,
    last_modified: str | None = None,
    discovery_parent_url: str | None = None,
) -> dict:
    return {
        "calendar_group_key": calendar_group_key,
        "status": status,
        "source_document_id": source_document_id,
        "content_sha256": content_sha256,
        "message": message,
        "canonical_url": canonical_url,
        "replaced_stale_url": replaced_stale_url,
        "last_modified": last_modified,
        "discovery_parent_url": discovery_parent_url,
    }
```

Use this helper where `results.append({...})` currently builds fetch report rows.

- [ ] **Step 3: Add replacement source argument**

Add a CLI option:

```python
parser.add_argument("--source-overrides", type=Path, help="JSON overrides from replace_resort_pdf_sources.py")
```

Before selecting sources:

```python
if args.source_overrides:
    from source_manifest import apply_pdf_source_overrides
    overrides = json.loads(args.source_overrides.read_text())
    sources = apply_pdf_source_overrides(ACTIVITY_SOURCES, overrides)
else:
    sources = ACTIVITY_SOURCES
```

When reporting each fetched source, include:

```python
override = overrides.get(source.calendar_group_key, {}) if args.source_overrides else {}
meta = head_metadata(source.pdf_url) if source.pdf_url else {}
```

Then pass `canonical_url=source.pdf_url`, `replaced_stale_url=override.get("replaced_stale_url")`, and `last_modified=meta.get("last_modified")`.

- [ ] **Step 4: Run replacement fetch locally**

Run:

```bash
python3 scripts/ingest/fetch.py --local-only --force --source-overrides data/processed/resort_pdf_source_overrides.json
```

Expected: every override group downloads the new PDF into `data/raw/pdfs/`; `data/processed/fetch_report.json` lists `replaced_stale_url` for stale groups.

- [ ] **Step 5: Confirm stale URLs are out of replacement fetch report**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path
report=json.loads(Path("data/processed/fetch_report.json").read_text())
bad=[r for r in report["results"] if r.get("canonical_url") and "/fy26-q1/" in r["canonical_url"] or r.get("canonical_url","").endswith("_DRAFT.pdf")]
print(bad)
raise SystemExit(1 if bad else 0)
PY
```

Expected: `[]`.

- [ ] **Step 6: Commit**

```bash
git add scripts/ingest/fetch.py scripts/test_pipeline_contracts.py data/raw/pdfs data/processed/fetch_report.json
git commit -m "feat: fetch replacement recreation PDFs with stale-source metadata"
```

---

### Task 5: Replace Golden Fixtures For Every Stale Calendar Group

**Files:**
- Modify: `data/golden/activities/*.json`
- Modify: `scripts/ingest/extract_v2.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Generate candidate extraction reports for replacement PDFs**

For each stale group from `data/processed/resort_pdf_source_overrides.json`, run:

```bash
python3 scripts/ingest/extract_v2.py --fixture data/golden/activities/<group>-full-calendar.json --group <group> > /tmp/<group>-extract.json
```

Expected: extraction either matches after fixture update or prints concrete drift errors. Do not hand-wave errors; each drift is either correct replacement data or an OCR/parser defect.

- [ ] **Step 2: Update each fixture source header**

For each replaced fixture, set:

```json
{
  "source_pdf": "data/raw/pdfs/<current-pdf-file>.pdf",
  "source_pdf_sha256": "<sha256 of current PDF>"
}
```

Use:

```bash
shasum -a 256 data/raw/pdfs/<current-pdf-file>.pdf
```

Expected: sha matches fetch report `content_sha256`.

- [ ] **Step 3: Replace expected records from current source only**

For each activity in the replacement PDF:

- Update `schedule_text`, `start_time`, `end_time`, `location`, `description`, `is_fee_based`.
- Replace old `required_spans` with current PDF line/bbox spans.
- If OCR is wrong but the rendered PDF is clear, move that record to `reviewed_manual_records` with `manual_review.notes` that names the current PDF and exact visible value.
- If a stale old activity is absent from the new PDF, remove it from `expected_records` unless official web evidence still supports it.
- If a new activity appears in the new PDF, add it with source spans or manual visual spans.

- [ ] **Step 4: Validate movie blocks visually**

For every `movies_under_stars` record:

Run:

```bash
python3 - <<'PY'
from pathlib import Path
from scripts.ingest.extract_v2 import extract_candidates_for_fixture
fixture=Path("data/golden/activities/<group>-full-calendar.json")
for c in extract_candidates_for_fixture(fixture):
    nf=c["normalized_fields"]
    if nf["slug"] == "movie-under-the-stars":
        print(nf["schedule"])
        print(nf.get("movie_nights"))
PY
```

Expected:

- `schedule.text` matches the visible PDF location/time.
- `movie_nights` is non-empty when the visible PDF lists daily movie titles.
- No title contains OCR junk such as isolated ratings (`PG`, `G`, `Ps`) or truncated fragments.

- [ ] **Step 5: Render visual crops for questionable OCR**

For each replacement PDF with parser warnings or movie OCR issues:

```bash
python3 - <<'PY'
from pathlib import Path
from scripts.ingest.extract_v2 import build_layout_snapshot
snapshot = build_layout_snapshot(Path("data/raw/pdfs/<current-pdf-file>.pdf"))
print(snapshot["content_sha256"])
for i,line in enumerate(snapshot["pages"][0]["lines"], start=1):
    if "MOVIE" in line["text"].upper() or "POOLSIDE" in line["text"].upper():
        print(i, line)
PY
```

Expected: questionable fields get either parser fixes or manual visual records. No questionable OCR goes public unreviewed.

- [ ] **Step 6: Run fixture validation after each group**

Run:

```bash
python3 scripts/ingest/validate_v2.py
```

Expected: `V2 validation PASSED`.

- [ ] **Step 7: Commit in small batches**

Commit every 3-5 resort groups:

```bash
git add data/golden/activities scripts/ingest/extract_v2.py
git commit -m "data: replace stale recreation fixtures batch 1"
```

---

### Task 6: Regenerate Gold Preview As A Replacement Publish Set

**Files:**
- Modify generated: `data/processed/activity_gold_v2_preview.json`
- Modify generated: `data/processed/manual_review_report.json`
- Modify generated: `data/processed/source_inventory.json`
- Modify generated: `data/processed/source_freshness_report.json`
- Modify generated: `data/processed/source_trust_summary.json`

- [ ] **Step 1: Run Gold promotion**

Run:

```bash
python3 scripts/ingest/promote_gold.py --fail-on-review
```

Expected:

```text
"review_queue": 0
```

- [ ] **Step 2: Assert no stale URLs remain in Gold**

Run:

```bash
python3 - <<'PY'
import json, re
from pathlib import Path
rows=json.loads(Path("data/processed/activity_gold_v2_preview.json").read_text())
stale=[]
for row in rows:
    url=row.get("source_url","")
    if row.get("calendar_group_key") != "fort-wilderness" and re.search(r"fy26-q1|_DRAFT|Recreation[-_](?:0126|0326)", url):
        stale.append((row["calendar_group_key"], row["canonical_slug"], url))
for item in stale[:50]:
    print(item)
raise SystemExit(1 if stale else 0)
PY
```

Expected: no output and exit `0`. If Art of Animation, Pop, Caribbean, or Riverside still have 0326 because no newer live page PDF exists, add an explicit allowlist file with official page evidence and a note; do not leave them silently stale.

- [ ] **Step 3: Rebuild source inventory and freshness**

Run:

```bash
npm run audit:sources
npm run audit:resort-pdf-dates
```

Expected: source freshness passes; resort PDF date audit passes with no stale groups or only documented official-page allowlisted groups.

- [ ] **Step 4: Run publication parity**

Run:

```bash
python3 scripts/ingest/audit_publication_parity.py
```

Expected: `passed: true`.

- [ ] **Step 5: Commit generated replacement publish set**

```bash
git add data/processed/activity_gold_v2_preview.json data/processed/manual_review_report.json data/processed/source_inventory.json data/processed/source_freshness_report.json data/processed/source_trust_summary.json
git commit -m "data: regenerate Gold preview from current recreation PDFs"
```

---

### Task 7: Validate OCR-To-UI What/When/Where Coverage

**Files:**
- Modify: `scripts/test-activity-answer-coverage.ts`
- Modify: `scripts/audit-activity-answer-coverage.ts`
- Modify: `scripts/test-event-card-layout.ts`
- Modify: `scripts/test-offering-card-display.ts`
- Modify: `components/events/event-ui.tsx` only if UI metadata labels regress

- [ ] **Step 1: Add stale-source check to activity answer audit**

In `scripts/audit-activity-answer-coverage.ts`, add:

```ts
function isStalePdfUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /fy26-q1|_DRAFT|Recreation[-_](?:0126|0326)/i.test(url);
}
```

When building issues, add:

```ts
if (isStalePdfUrl(sourceUrl)) {
  issues.push({
    field: "source",
    state: "stale",
    title: activity.title,
    resort: activity.resortName,
    category: activity.category,
    sourceUrl,
    detail: "Public activity uses a stale recreation PDF URL.",
  });
}
```

- [ ] **Step 2: Add failing fixture in test**

In `scripts/test-activity-answer-coverage.ts`, add a minimal stale URL row and assert it fails:

```ts
const staleIssue = auditRepresentativeActivities([
  {
    ...baseActivity,
    source_url: "https://cdn1.parksmedia.wdprapps.disney.com/example/fy26-q1/Example_Aframe_Recreation_0126_V3_DRAFT.pdf",
  },
]).issues.find((issue) => issue.field === "source");

assert.equal(staleIssue?.state, "stale");
```

- [ ] **Step 3: Run coverage tests**

Run:

```bash
npx tsx scripts/test-activity-answer-coverage.ts
npm run audit:activity-answers
```

Expected: tests pass; audit `passed: true`; no `source:stale` issues in real data.

- [ ] **Step 4: Verify rendered card/detail labels**

Run:

```bash
npx tsx scripts/test-event-card-layout.ts
npx tsx scripts/test-offering-card-display.ts
```

Expected: card/detail tests pass, including visible and accessible `When`, `Where`, and `Resort` labels.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-activity-answer-coverage.ts scripts/test-activity-answer-coverage.ts scripts/test-event-card-layout.ts scripts/test-offering-card-display.ts components/events/event-ui.tsx
git commit -m "test: block stale sources in activity UI coverage"
```

---

### Task 8: Production Replacement Publish

**Files:**
- Modify only generated migration/output files required by existing publish flow.
- Do not hand-edit production database rows.

- [ ] **Step 1: Dry-run publish payload**

Run:

```bash
python3 scripts/ingest/publish_gold_v2.py --dry-run
```

Expected:

- Dry run reports 225-ish current Gold rows or the new validated count.
- No row source URL contains stale `fy26-q1`, `_DRAFT`, or old 0326 URLs unless explicitly allowlisted with official page evidence.

- [ ] **Step 2: Backup current production source keys**

Run the existing read-only DB trust command:

```bash
npm run validate:db-trust
```

Expected: command passes before replacement publish. Save output in the terminal log; do not proceed if DB trust is already failing for unrelated reasons.

- [ ] **Step 3: Publish replacement Gold set**

Run the existing production publish command used by the project:

```bash
npm run publish:gold-v2
```

Expected:

- Publish completes without review queue.
- Replacement acts as a full current Gold set, not append-only stale data.

- [ ] **Step 4: Verify production no longer exposes stale source URLs**

Run:

```bash
npm run validate:db-trust
python3 scripts/ingest/audit_publication_parity.py
```

Expected: both pass. Parity must show live Gold rows match `data/processed/activity_gold_v2_preview.json`.

- [ ] **Step 5: Commit publish artifacts**

```bash
git add data/processed supabase/migrations
git commit -m "data: publish current recreation PDF replacement set"
```

---

### Task 9: Add CI Guardrails So This Cannot Recur

**Files:**
- Modify: `package.json`
- Modify: `scripts/ingest/audit_source_freshness.py`
- Modify: `scripts/ingest/README.md`
- Create: `docs/source-refresh-runbook.md`

- [ ] **Step 1: Add date audit to validation scripts**

In `package.json`, update:

```json
"validate:source-trust": "npm run audit:sources && npm run audit:resort-pdf-dates && npm run audit:visual-pdfs && npm run audit:official-recreation && npm run validate:contracts && npm run validate:trust && npm run validate:db-trust"
```

Also add `npm run audit:resort-pdf-dates` inside `validate:contracts` before `audit_coverage.py` if runtime is acceptable. If Playwright runtime is too slow for every contract run, add a `--from-report data/processed/resort_pdf_date_audit.json` mode and make contracts validate the committed report.

- [ ] **Step 2: Document source refresh runbook**

Create `docs/source-refresh-runbook.md`:

```markdown
# Recreation Source Refresh Runbook

1. Run `npm run audit:resort-pdf-dates -- --allow-stale`.
2. Review `data/processed/resort_pdf_date_audit.json`.
3. Run `python3 scripts/ingest/replace_resort_pdf_sources.py`.
4. Run `python3 scripts/ingest/fetch.py --local-only --force --source-overrides data/processed/resort_pdf_source_overrides.json`.
5. Update stale fixtures from current PDFs only.
6. Run `python3 scripts/ingest/validate_v2.py`.
7. Run `python3 scripts/ingest/promote_gold.py --fail-on-review`.
8. Run `npm run audit:activity-answers`.
9. Run `npm run validate:contracts`.
10. Run `npm run build`.
11. Publish with `npm run publish:gold-v2`.
12. Verify with `npm run validate:db-trust` and `python3 scripts/ingest/audit_publication_parity.py`.

No stale PDF URL may remain in production Gold unless it is explicitly allowlisted with captured official resort page evidence proving it is still the linked current PDF.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run validate:contracts
npm run build
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/ingest/audit_source_freshness.py scripts/ingest/README.md docs/source-refresh-runbook.md
git commit -m "chore: enforce live resort PDF source freshness"
```

---

## Execution Checklist

- [ ] Live resort recreation page extraction implemented.
- [ ] Date-aware audit created and failing on stale sources.
- [ ] Replacement overrides generated only from official page evidence.
- [ ] Current PDFs fetched for every stale group.
- [ ] Stale PDF fixtures replaced, not incrementally merged.
- [ ] OCR/manual visual validation completed for all movie/time/location fields.
- [ ] Gold preview regenerated from current sources only.
- [ ] UI activity cards/details audited for what/when/where and stale source URLs.
- [ ] Production Gold replacement published.
- [ ] DB trust and publication parity pass after publish.
- [ ] CI/source-trust flow fails on future stale reachable PDFs.

## Current Known Risk From June 28, 2026 Audit

The following groups had newer `fy26-q3 / 0526` candidates than the manifest source during the audit and must be treated as stale until replaced and validated:

- `all-star-movies`
- `all-star-music`
- `all-star-sports`
- `coronado-springs`
- `port-orleans-french-quarter`
- `beach-yacht-club`
- `contemporary`
- `grand-floridian`
- `polynesian`
- `wilderness-lodge`
- `old-key-west`
- `riviera`
- `saratoga-springs`

The following groups still need official-page confirmation because the broad CDN probe did not find a newer predictable PDF, but their March source date is suspicious for late June:

- `art-of-animation`
- `pop-century`
- `caribbean-beach`
- `port-orleans-riverside`

## Self-Review

- Spec coverage: The plan covers direct resort-page sourcing, full re-ingest, stale replacement, OCR validation, UI validation, production publish, and future guardrails.
- Placeholder scan: No task uses TBD or vague "add tests" without concrete commands/examples.
- Type consistency: New audit/override functions use `calendar_group_key`, `manifest_url`, `live_url`, `pdf_url`, and `pdf_edition` consistently across tasks.

