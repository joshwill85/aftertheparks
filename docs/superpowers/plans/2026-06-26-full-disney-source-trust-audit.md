# Full Disney Source Trust Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an accuracy-first audit system that proves every public Disney recreation activity field is current, source-backed, correctly extracted, accurately priced, correctly joined, and safely displayed.

**Architecture:** Use a source-ledger version of the medallion pipeline: live Disney sources and approved secondary sources enter as immutable Bronze artifacts, deterministic extraction and independent GPT/Codex visual review create Silver observations, audited merge rules create Gold records, and DB/UI validators prove the published experience matches the audited Gold data. Every public field must have a source URL, content hash, field provenance, confidence state, and clear fallback behavior.

**Tech Stack:** Python ingest pipeline, Disney HTML/PDF snapshots, local PDF layout snapshots, rendered PDF page images, vision-capable GPT audit pass configurable by `OPENAI_ACTIVITY_AUDIT_MODEL`, TypeScript mappers, Supabase source ledger tables, Next.js API/UI, Playwright/API validation, existing commands `npm run validate:contracts`, `npm run validate:trust`, `npm run validate:db-trust`, `python3 scripts/ingest/audit_coverage.py`, and `python3 scripts/ingest/audit_official_recreation_coverage.py`.

---

## Plain-Language Promise

This plan makes the system behave like a careful researcher:

1. It looks at Disney's current live pages, not whatever happens to be sitting in the repo.
2. It saves exactly what it saw, including URL, final fetched URL, HTTP status, timestamp, and hash.
3. It extracts facts with deterministic code, then independently checks the source visually with GPT/Codex where OCR or layout can fail.
4. It publishes only facts that can be traced back to a current source.
5. It labels uncertainty honestly. Unknown is better than invented.
6. It treats Disney as the source of record and third-party sites only as secondary enrichment.
7. It makes free activities with optional paid supplies show as free activities with optional add-ons, not as paid events.
8. It blocks publication when stale, unsupported, or conflicting evidence is detected.

## Current Facts From The Repo On 2026-06-26

These are the latest local audit facts from this workspace, not permanent guarantees:

- `python3 scripts/ingest/audit_coverage.py --require-production-ready --json` passes.
- The local calendar pipeline has 20 PDF sources, 20 cached PDFs, 228 fixture records, 227 Gold v2 rows, and 17 explicit non-publishable records retained for audit.
- The local Gold price states are 139 `free`, 78 `fee`, and 10 `unknown`.
- `python3 scripts/ingest/audit_official_recreation_coverage.py` passes.
- The official recreation audit sees 82 parent items, 60 joinable parent items, 60 covered joinable parent items, 180 joinable parent-resort pairs, and 0 missing joinable parent-resort pairs.
- `python3 scripts/ingest/trust_report.py` reports production cutover as ready, with 227 Gold v2 records, 210 rows carrying PDF fee-key legends, 40 official recreation programs, and 224 official resort offerings.
- `data/raw/web` currently contains 62 saved official web snapshots.
- The current trust posture is strong for the existing Gold v2 source-backed contracts, medium for exhaustive independent visual verification of every source, and not acceptable long-term until live freshness monitoring and independent re-audit are automated.

## Gaps This Plan Closes

- Stale source prevention: local PDFs, fixtures, and DB source rows must be proven against the live parent pages and current linked PDF/menu URLs.
- Full source inventory: main recreation index, parent activity detail pages, resort recreation pages, linked PDFs, menu pages, and secondary enrichment pages must all be recorded.
- Currentness proof: every cached PDF and HTML snapshot must have a live-discovery record and a content hash comparison.
- Independent OCR/vision audit: every PDF and important HTML page must be checked by deterministic extraction plus independent GPT/Codex visual review.
- Manual override discipline: manual records must include source hash, visual bounding box or line evidence, reviewer reason, and scope.
- Parent activity reconciliation: the 82 Disney recreation index items need explicit classification, including the 22 non-joinable/general items.
- Jogging/running trails: all running/jogging trail entries must be audited from their parent and resort pages, not inferred.
- Price precision: Disney PDF `($)` markers, Disney page price language, optional add-ons, MRG enrichment, and "unknown" states must have separate rules and tests.
- DB documentation: every source URL and relationship must be persisted, including parent page to PDF, recreation index to detail page, resort page to detail page, and third-party enrichment page to Disney row.
- UI trust: labels, optional prices, source display, and duplicate chips must be tested from published data, not only local artifacts.
- Monitoring: source changes, missing PDFs, hash drift, extraction regressions, and unsupported UI fields must create actionable reports.

## Trust Policy

These rules are mandatory:

1. Disney guest-facing pages, PDFs, and menus are primary sources.
2. Current Disney resort PDFs are the primary source for dated resort-calendar activities.
3. Disney official recreation detail pages are the primary source for evergreen offerings.
4. Disney menu pages are primary for menu-priced optional supplies.
5. The Disney finder/index API is discovery and join evidence only. Its broad price facets do not set public price.
6. Magical Resort Guide and editorial sources are secondary enrichment only.
7. Third-party sources cannot override a Disney-free activity.
8. A Disney-free activity with optional paid supplies remains `Free`; paid supplies are modeled as optional add-ons.
9. A Disney PDF `($)` title marker means `Paid`.
10. A missing Disney PDF `($)` marker under a fee legend means `Free`, unless the activity body says fees apply.
11. A fee/price/public amount without price provenance is a blocker.
12. A stale source is not publishable until refreshed or explicitly retained as historical evidence outside the public current path.
13. A low-quality OCR row is not publishable unless independently reviewed against the source image.
14. If evidence conflicts, show `Price unclear` or withhold the specific detail. Do not guess.

## Confidence Targets

- `High confidence`: the field is supported by current Disney source URL, content hash, field span or visual bounding box, deterministic extraction, and either low-risk parser agreement or independent review.
- `Medium confidence`: the field is source-backed but has layout/OCR ambiguity, secondary enrichment, or no independent visual audit yet. It can publish only if the ambiguity does not change guest-facing meaning.
- `Low confidence`: the field is source-visible but parsing is unreliable, source text is incomplete, or evidence conflicts. It goes to review or stays non-publishable.
- `Unknown`: no reliable source evidence. The UI may say `Price unclear` or omit the field, depending on context.

## File Structure

- Create `docs/source-trust-audit-runbook.md`: plain-language operating guide for source refresh, audits, review, publish, rollback, and incident response.
- Create `data/quality/source_authority_policy.json`: machine-readable source precedence and field rules.
- Create `data/quality/official_recreation_parent_classification.json`: classification for all Disney recreation index parent items.
- Create `data/quality/jogging_trail_audit_scope.json`: expected trail source scope and join rules.
- Create `data/processed/source_inventory.json`: latest live source inventory, including source relationships.
- Create `data/processed/source_freshness_report.json`: live URL/hash comparison report.
- Create `data/processed/pdf_visual_audit_report.json`: deterministic PDF extraction versus independent visual review results.
- Create `data/processed/field_audit_report.json`: field-level confidence, conflicts, and manual-review requirements.
- Create `scripts/ingest/source_authority.py`: shared source precedence and field trust helpers.
- Create `scripts/ingest/build_source_inventory.py`: capture source graph from Disney index, resort pages, PDFs, menus, and approved secondary pages.
- Create `scripts/ingest/audit_source_freshness.py`: compare live discovered URLs and hashes against manifest, cached files, fixtures, and DB rows.
- Create `scripts/ingest/render_pdf_pages.py`: render PDFs to images for independent visual audit.
- Create `scripts/ingest/gpt_visual_pdf_audit.py`: request structured visual extraction from a configured vision-capable GPT model.
- Create `scripts/ingest/compare_extraction_audits.py`: compare deterministic extraction, GPT visual extraction, fixtures, and Gold rows field by field.
- Create `scripts/ingest/audit_jogging_trails.py`: prove running/jogging trail coverage from official parent and resort pages.
- Create `scripts/ingest/audit_publication_parity.py`: compare processed artifacts, Supabase rows, and public API payloads.
- Modify `scripts/ingest/discover.py`: emit source graph edges and live parent-page PDF matches.
- Modify `scripts/ingest/source_manifest.py`: remove static assumptions that are not backed by live source inventory.
- Modify `scripts/ingest/fetch.py`: store immutable fetch metadata for PDFs and HTML, including redirect/fetched URL and HTTP status.
- Modify `scripts/ingest/capture_official_recreation_index.py`: write normalized parent-item classification input.
- Modify `scripts/ingest/capture_web_snapshot.py`: preserve raw hash, normalized text hash, final URL, status, and capture metadata.
- Modify `scripts/ingest/disney_recreation_offerings.py`: consume source authority policy and parent classification.
- Modify `scripts/ingest/extract_v2.py`: emit field confidence and OCR ambiguity flags consistently for title, date, schedule, location, description, and price.
- Modify `scripts/ingest/promote_gold.py`: refuse unsupported fields, stale hashes, and unsafe secondary price overrides.
- Modify `scripts/ingest/magical_resort_guide.py`: emit exact evidence spans and match confidence for price facts.
- Modify `scripts/ingest/audit_coverage.py`: include source freshness and manual-review coverage in production readiness.
- Modify `scripts/ingest/audit_official_recreation_coverage.py`: add JSON flag, parent classification coverage, and jogging/running trail assertions.
- Modify `scripts/ingest/trust_report.py`: include confidence level, source freshness, OCR visual-audit status, and unresolved gaps.
- Modify `scripts/validate-trust.mjs`: enforce UI/API source-chain, price-label, optional-add-on, and no-duplicate-chip contracts.
- Modify `scripts/validate-db-trust.mjs`: enforce source ledger, currentness, and publication parity against Supabase.
- Modify `scripts/test_pipeline_contracts.py`: Python contracts for source inventory, freshness, visual audit comparison, price policy, parent reconciliation, jogging trails, and DB source rows.
- Modify `scripts/test-gold-v2-mapping.ts`: TypeScript contracts for price labels, source display, and optional add-ons.
- Modify `scripts/test-official-offerings.ts`: TypeScript contracts for official offerings, parent classification, and finder-price rejection.
- Modify `lib/types/occurrence.ts`: expose source-chain and confidence metadata where UI needs it.
- Modify `lib/data/goldActivities.ts`: preserve source-chain, price provenance, and optional add-ons from Gold rows.
- Modify `lib/data/officialOfferings.ts`: preserve parent/detail/resort source chain for official offerings.
- Modify `components/atlas/ActivityDetailClient.tsx`: show public source and optional add-on prices without conflating activity price.
- Modify `lib/events/mapToEventCard.ts`: keep labels to `Free`, `Paid`, or `Price unclear` and prevent redundant chips.
- Create a Supabase migration `supabase/migrations/20260626160000_source_trust_audit_ledger.sql`: extend source ledger and add audit observation tables.

---

### Task 1: Write The Source Authority Policy

**Plain language:** Decide, in code and documentation, which source wins when sources disagree. Disney wins. Third-party pages can enrich only after Disney confirms the activity exists and the price state is compatible.

**Files:**
- Create: `data/quality/source_authority_policy.json`
- Create: `scripts/ingest/source_authority.py`
- Modify: `scripts/test_pipeline_contracts.py`
- Modify: `docs/price-source-trust.md`

- [ ] **Step 1: Add source authority policy JSON**

Create `data/quality/source_authority_policy.json`:

```json
{
  "version": "2026-06-26",
  "defaultUnknownBehavior": "withhold_or_label_unknown",
  "sourcePrecedence": [
    {
      "sourceKind": "disney_resort_recreation_pdf",
      "authority": "primary",
      "appliesTo": ["dated_resort_calendar_activity"]
    },
    {
      "sourceKind": "disney_official_recreation_detail_page",
      "authority": "primary",
      "appliesTo": ["evergreen_official_offering"]
    },
    {
      "sourceKind": "disney_resort_recreation_page",
      "authority": "primary",
      "appliesTo": ["resort_join", "source_discovery", "linked_pdf"]
    },
    {
      "sourceKind": "disney_menu_page",
      "authority": "primary",
      "appliesTo": ["menu_priced_optional_add_on"]
    },
    {
      "sourceKind": "disney_recreation_index_api",
      "authority": "discovery_only",
      "appliesTo": ["parent_activity_discovery", "resort_join"],
      "forbiddenFields": ["public_price_state", "public_price_amount"]
    },
    {
      "sourceKind": "magical_resort_guide",
      "authority": "secondary_enrichment",
      "appliesTo": ["amount_enrichment", "schedule_validity_hint"],
      "cannotOverride": ["disney_free_price_state", "disney_activity_existence"]
    },
    {
      "sourceKind": "editorial_third_party",
      "authority": "secondary_context",
      "appliesTo": ["approximate_optional_add_on_note"],
      "cannotOverride": ["disney_price_state", "disney_activity_existence", "disney_schedule"]
    }
  ],
  "priceRules": {
    "pdfDollarMarker": {
      "evidence": "($) next to Disney PDF activity title",
      "state": "fee",
      "publicLabel": "Paid"
    },
    "pdfDollarMarkerAbsentUnderLegend": {
      "evidence": "Disney PDF includes ($) fee legend and title lacks marker",
      "state": "free",
      "publicLabel": "Free"
    },
    "pdfBodyFeeLanguage": {
      "evidencePhrases": ["fees may apply", "available for purchase", "for an additional fee"],
      "state": "fee_or_optional_add_on_by_context"
    },
    "freeActivityWithOptionalPurchase": {
      "activityState": "free",
      "optionPriceBasis": "optional_add_on"
    },
    "finderPriceFacet": {
      "state": "ignored_for_public_price"
    }
  }
}
```

- [ ] **Step 2: Implement policy loader**

Add `scripts/ingest/source_authority.py`:

```python
"""Shared source authority rules for Disney activity trust audits."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


POLICY_PATH = Path("data/quality/source_authority_policy.json")


@lru_cache(maxsize=1)
def load_source_authority_policy(path: Path = POLICY_PATH) -> dict[str, Any]:
    policy = json.loads(path.read_text())
    if not isinstance(policy.get("sourcePrecedence"), list):
        raise ValueError("source_authority_policy_missing_sourcePrecedence")
    if not isinstance(policy.get("priceRules"), dict):
        raise ValueError("source_authority_policy_missing_priceRules")
    return policy


def source_kind_authority(source_kind: str) -> str:
    for row in load_source_authority_policy()["sourcePrecedence"]:
        if row.get("sourceKind") == source_kind:
            return str(row.get("authority") or "")
    return "unknown"


def can_source_set_public_price(source_kind: str) -> bool:
    for row in load_source_authority_policy()["sourcePrecedence"]:
        if row.get("sourceKind") != source_kind:
            continue
        forbidden = set(row.get("forbiddenFields") or [])
        return "public_price_state" not in forbidden and "public_price_amount" not in forbidden
    return False


def third_party_can_override_disney_free(source_kind: str) -> bool:
    for row in load_source_authority_policy()["sourcePrecedence"]:
        if row.get("sourceKind") != source_kind:
            continue
        return "disney_free_price_state" not in set(row.get("cannotOverride") or [])
    return False
```

- [ ] **Step 3: Add policy tests**

Add tests to `scripts/test_pipeline_contracts.py`:

```python
class SourceAuthorityPolicyTest(unittest.TestCase):
    def test_finder_api_cannot_set_public_price(self) -> None:
        from scripts.ingest.source_authority import can_source_set_public_price

        self.assertFalse(can_source_set_public_price("disney_recreation_index_api"))

    def test_mrg_cannot_override_disney_free(self) -> None:
        from scripts.ingest.source_authority import third_party_can_override_disney_free

        self.assertFalse(third_party_can_override_disney_free("magical_resort_guide"))

    def test_disney_pdf_is_primary(self) -> None:
        from scripts.ingest.source_authority import source_kind_authority

        self.assertEqual("primary", source_kind_authority("disney_resort_recreation_pdf"))
```

- [ ] **Step 4: Run the policy tests**

Run:

```bash
python3 -m unittest scripts.test_pipeline_contracts.SourceAuthorityPolicyTest
```

Expected: pass.

- [ ] **Step 5: Update docs**

Update `docs/price-source-trust.md` with:

```markdown
## Source Authority

Disney guest-facing PDFs, official recreation pages, resort pages, and menus are primary sources. The Disney recreation finder/index API is discovery-only for public price labels. Magical Resort Guide is secondary enrichment only and cannot override a Disney-free activity.
```

### Task 2: Build A Complete Live Source Inventory

**Plain language:** Before trusting data, prove we know every source we are using: main Disney recreation index, all parent detail pages, all resort recreation pages, all linked PDFs, Disney menus used for prices, and secondary enrichment pages.

**Files:**
- Create: `scripts/ingest/build_source_inventory.py`
- Create: `data/processed/source_inventory.json`
- Modify: `scripts/ingest/discover.py`
- Modify: `scripts/ingest/capture_official_recreation_index.py`
- Modify: `scripts/ingest/capture_web_snapshot.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Add inventory schema**

Every `data/processed/source_inventory.json` record must use this shape:

```json
{
  "source_id": "stable sha256 of role + canonical_url",
  "source_role": "main_recreation_index|parent_activity_detail|resort_recreation_page|resort_pdf|disney_menu|secondary_enrichment",
  "source_kind": "official_html|official_pdf|official_api|secondary_html",
  "canonical_url": "https://...",
  "fetched_url": "https://...",
  "http_status": 200,
  "content_sha256": "64 hex chars",
  "captured_at": "2026-06-26T00:00:00+00:00",
  "calendar_group_key": "all-star-movies",
  "resort_slug": "all-star-movies-resort",
  "program_key": "running-trails",
  "parent_source_id": "stable source id or null",
  "discovered_from_url": "https://...",
  "storage_path": "data/raw/...",
  "parser_version": "source-inventory-v1",
  "currentness": "current|changed|missing|unreachable|unknown",
  "notes": "short reason when needed"
}
```

- [ ] **Step 2: Implement source inventory builder**

Create `scripts/ingest/build_source_inventory.py` that:

```python
"""Build a complete source inventory for Disney recreation data."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from capture_official_recreation_index import build_official_recreation_index_snapshot
    from source_manifest import RESORT_RECREATION_SOURCES
except ImportError:  # pragma: no cover
    from .capture_official_recreation_index import build_official_recreation_index_snapshot
    from .source_manifest import RESORT_RECREATION_SOURCES


DEFAULT_OUTPUT = Path("data/processed/source_inventory.json")


def _source_id(source_role: str, canonical_url: str) -> str:
    return hashlib.sha256(f"{source_role}:{canonical_url}".encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _record(
    *,
    source_role: str,
    source_kind: str,
    canonical_url: str,
    fetched_url: str | None = None,
    http_status: int | None = None,
    content_sha256: str | None = None,
    calendar_group_key: str | None = None,
    resort_slug: str | None = None,
    program_key: str | None = None,
    parent_source_id: str | None = None,
    discovered_from_url: str | None = None,
    storage_path: str | None = None,
    currentness: str = "unknown",
    notes: str | None = None,
) -> dict[str, Any]:
    return {
        "source_id": _source_id(source_role, canonical_url),
        "source_role": source_role,
        "source_kind": source_kind,
        "canonical_url": canonical_url,
        "fetched_url": fetched_url or canonical_url,
        "http_status": http_status,
        "content_sha256": content_sha256,
        "captured_at": _now(),
        "calendar_group_key": calendar_group_key,
        "resort_slug": resort_slug,
        "program_key": program_key,
        "parent_source_id": parent_source_id,
        "discovered_from_url": discovered_from_url,
        "storage_path": storage_path,
        "parser_version": "source-inventory-v1",
        "currentness": currentness,
        "notes": notes,
    }


def build_source_inventory() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    index_url = "https://disneyworld.disney.go.com/recreation/"
    index_snapshot = build_official_recreation_index_snapshot(datetime.now(timezone.utc).date())
    index_row = _record(
        source_role="main_recreation_index",
        source_kind="official_api",
        canonical_url=index_url,
        fetched_url=index_snapshot["api_url"],
        http_status=200,
        content_sha256=index_snapshot["content_sha256"],
        storage_path="data/raw/web/official-recreation-index-api.snapshot.json",
        currentness="current",
    )
    rows.append(index_row)

    seen_resort_pages: set[str] = set()
    seen_pdfs: set[str] = set()
    for source in RESORT_RECREATION_SOURCES:
        if source.recreation_page_url not in seen_resort_pages:
            seen_resort_pages.add(source.recreation_page_url)
            rows.append(
                _record(
                    source_role="resort_recreation_page",
                    source_kind="official_html",
                    canonical_url=source.recreation_page_url,
                    calendar_group_key=source.calendar_group_key,
                    resort_slug=source.resort_slug,
                    parent_source_id=index_row["source_id"],
                    discovered_from_url=index_url,
                    currentness="unknown",
                )
            )
        if source.pdf_url and source.pdf_url not in seen_pdfs:
            seen_pdfs.add(source.pdf_url)
            rows.append(
                _record(
                    source_role="resort_pdf",
                    source_kind="official_pdf",
                    canonical_url=source.pdf_url,
                    calendar_group_key=source.calendar_group_key,
                    resort_slug=source.resort_slug,
                    discovered_from_url=source.recreation_page_url,
                    currentness="unknown",
                )
            )
    return rows


def write_source_inventory(output: Path = DEFAULT_OUTPUT) -> Path:
    rows = build_source_inventory()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Disney activity source inventory")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    output = write_source_inventory(args.output)
    rows = json.loads(output.read_text())
    print(json.dumps({"output": str(output), "sources": len(rows)}, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Add inventory contract test**

Add to `scripts/test_pipeline_contracts.py`:

```python
class SourceInventoryTest(unittest.TestCase):
    def test_inventory_includes_all_resort_pages_and_pdf_sources(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory
        from scripts.ingest.source_manifest import RESORT_RECREATION_SOURCES

        inventory = build_source_inventory()
        urls = {row["canonical_url"] for row in inventory}
        for source in RESORT_RECREATION_SOURCES:
            self.assertIn(source.recreation_page_url, urls)
            if source.pdf_url:
                self.assertIn(source.pdf_url, urls)

    def test_inventory_records_have_traceability_fields(self) -> None:
        from scripts.ingest.build_source_inventory import build_source_inventory

        for row in build_source_inventory():
            self.assertRegex(row["source_id"], r"^[a-f0-9]{64}$")
            self.assertTrue(row["source_role"])
            self.assertTrue(row["source_kind"])
            self.assertTrue(row["canonical_url"].startswith("https://"))
            self.assertTrue(row["parser_version"])
```

- [ ] **Step 4: Run inventory generation and tests**

Run:

```bash
python3 scripts/ingest/build_source_inventory.py
python3 -m unittest scripts.test_pipeline_contracts.SourceInventoryTest
```

Expected: `data/processed/source_inventory.json` exists, includes the Disney recreation index, every resort recreation page from `RESORT_RECREATION_SOURCES`, and every known PDF URL.

### Task 3: Prove Source Freshness Against Live Disney URLs

**Plain language:** A cached PDF is not current just because it exists. We must re-check the live resort page, confirm the linked PDF URL, fetch it, hash it, and compare that hash to the fixture and Gold source hash.

**Files:**
- Create: `scripts/ingest/audit_source_freshness.py`
- Create: `data/processed/source_freshness_report.json`
- Modify: `scripts/ingest/discover.py`
- Modify: `scripts/ingest/audit_coverage.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Define freshness states**

Use these exact states:

```python
FRESHNESS_STATES = {
    "current": "Live URL and content hash match the cached/published source.",
    "url_changed": "Live parent page links a different PDF or detail URL.",
    "hash_changed": "Live URL is the same but content hash changed.",
    "missing_from_parent": "Expected source is no longer discoverable from parent page.",
    "unreachable": "Live request failed or returned non-200.",
    "unchecked": "Source has not been checked in this run."
}
```

- [ ] **Step 2: Implement source freshness report**

Create `scripts/ingest/audit_source_freshness.py` with a report shape:

```json
{
  "passed": true,
  "generated_at": "2026-06-26T00:00:00+00:00",
  "summary": {
    "sources_checked": 0,
    "current": 0,
    "url_changed": 0,
    "hash_changed": 0,
    "missing_from_parent": 0,
    "unreachable": 0
  },
  "errors": [],
  "warnings": [],
  "sources": []
}
```

The implementation must:

```python
def audit_source_freshness(inventory_path: Path = Path("data/processed/source_inventory.json")) -> dict[str, Any]:
    inventory = json.loads(inventory_path.read_text())
    # For each resort_recreation_page, fetch live HTML and discover linked PDF URLs.
    # For each resort_pdf, fetch live bytes, compute sha256, compare cached file and fixture hashes.
    # For each official_html or secondary_html, fetch live HTML and compare normalized snapshot hash when available.
    # Return blocker errors for url_changed, hash_changed, missing_from_parent, and unreachable on publish-required sources.
```

Do not publish stale rows. If a source changes, the report must fail until fixtures, Gold artifacts, and DB source rows are regenerated from the new artifact.

- [ ] **Step 3: Add coverage gate integration**

Modify `scripts/ingest/audit_coverage.py` so `--require-production-ready` loads `data/processed/source_freshness_report.json` when present and fails on:

```text
source_freshness:url_changed
source_freshness:hash_changed
source_freshness:missing_from_parent
source_freshness:unreachable
```

for any source used by a current Gold row.

- [ ] **Step 4: Add freshness tests**

Add to `scripts/test_pipeline_contracts.py`:

```python
class SourceFreshnessAuditTest(unittest.TestCase):
    def test_hash_change_blocks_publish_required_source(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/current.pdf",
                    "source_role": "resort_pdf",
                    "used_by_current_gold": True,
                    "currentness": "hash_changed",
                }
            ]
        }
        self.assertEqual(
            ["source_freshness:hash_changed:https://example.test/current.pdf"],
            source_freshness_errors(report),
        )

    def test_unpublished_secondary_hash_change_warns_only(self) -> None:
        from scripts.ingest.audit_source_freshness import source_freshness_errors

        report = {
            "sources": [
                {
                    "canonical_url": "https://example.test/secondary.html",
                    "source_role": "secondary_enrichment",
                    "used_by_current_gold": False,
                    "currentness": "hash_changed",
                }
            ]
        }
        self.assertEqual([], source_freshness_errors(report))
```

- [ ] **Step 5: Run freshness audit before every publish**

Run:

```bash
python3 scripts/ingest/build_source_inventory.py
python3 scripts/ingest/audit_source_freshness.py
python3 scripts/ingest/audit_coverage.py --require-production-ready
```

Expected: all current Gold source rows are backed by live-discovered current artifacts.

### Task 4: Store The Full Source Ledger In Supabase

**Plain language:** The database must not only store the PDF URL used by a row. It must store the whole source chain: main index, parent detail page, resort page, PDF/menu/secondary page, hashes, and relationships.

**Files:**
- Create: `supabase/migrations/20260626160000_source_trust_audit_ledger.sql`
- Modify: `scripts/ingest/publish_gold_v2.py`
- Modify: `scripts/ingest/publish_official_offerings.py`
- Modify: `scripts/validate-db-trust.mjs`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Add source relationship and audit tables**

Create a migration with:

```sql
create table if not exists public.source_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_source_document_id uuid references public.source_documents(id) on delete cascade,
  child_source_document_id uuid not null references public.source_documents(id) on delete cascade,
  relationship_type text not null check (
    relationship_type in (
      'index_links_parent_detail',
      'index_lists_resort_join',
      'resort_page_links_pdf',
      'resort_page_links_detail',
      'detail_page_links_menu',
      'secondary_enriches_disney_row'
    )
  ),
  relationship_evidence jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  unique (parent_source_document_id, child_source_document_id, relationship_type)
);

create table if not exists public.source_currentness_checks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid references public.source_documents(id) on delete cascade,
  canonical_url text not null,
  fetched_url text,
  live_content_sha256 text,
  stored_content_sha256 text,
  http_status smallint,
  currentness text not null check (
    currentness in ('current', 'url_changed', 'hash_changed', 'missing_from_parent', 'unreachable', 'unchecked')
  ),
  checked_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

create table if not exists public.field_audit_observations (
  id uuid primary key default gen_random_uuid(),
  published_row_id uuid,
  source_document_id uuid references public.source_documents(id) on delete set null,
  row_kind text not null check (row_kind in ('gold_activity', 'official_offering')),
  row_key text not null,
  field_name text not null,
  observed_value text,
  method text not null check (method in ('deterministic_parser', 'gpt_visual_audit', 'manual_visual_review', 'db_publication_audit', 'ui_api_audit')),
  confidence text not null check (confidence in ('high', 'medium', 'low', 'unknown')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.source_relationships enable row level security;
alter table public.source_currentness_checks enable row level security;
alter table public.field_audit_observations enable row level security;

grant all on public.source_relationships to service_role;
grant all on public.source_currentness_checks to service_role;
grant all on public.field_audit_observations to service_role;
```

- [ ] **Step 2: Extend source document upsert metadata**

Modify publisher source rows to include:

```python
{
    "source_type": _source_type(row),
    "canonical_url": source_url,
    "fetched_url": source.get("fetchedUrl") or source_url,
    "content_sha256": row["source_sha256"],
    "etag": source.get("etag"),
    "content_length": source.get("contentLength"),
    "storage_path": source.get("path"),
    "http_status": source.get("httpStatus") or 200,
    "calendar_group_key": row["calendar_group_key"],
    "fetched_at": source.get("fetchedAt") or datetime.now(timezone.utc).isoformat(),
}
```

- [ ] **Step 3: Add DB trust checks**

Modify `scripts/validate-db-trust.mjs` to fail when:

```text
source_document_missing_currentness_check
source_document_missing_relationship_for_pdf
gold_row_missing_source_chain
official_offering_missing_source_chain
field_audit_observation_missing_for_required_field
```

Required fields for Gold: `title`, `schedule`, `location`, `price` when `price.state` is `free` or `fee`, and `description` when present.

Required fields for official offerings: `title`, `resort_join`, `price` when specific, `booking` when specific, `availability` when not source-unspecified, and `description` when present.

- [ ] **Step 4: Add migration contract test**

Add to `scripts/test_pipeline_contracts.py`:

```python
class SourceTrustLedgerMigrationTest(unittest.TestCase):
    def test_source_trust_ledger_migration_defines_relationships_and_observations(self) -> None:
        migration_text = "\n".join(path.read_text() for path in Path("supabase/migrations").glob("*source_trust_audit_ledger.sql"))
        self.assertIn("create table if not exists public.source_relationships", migration_text)
        self.assertIn("create table if not exists public.source_currentness_checks", migration_text)
        self.assertIn("create table if not exists public.field_audit_observations", migration_text)
        self.assertIn("secondary_enriches_disney_row", migration_text)
        self.assertIn("gpt_visual_audit", migration_text)
```

- [ ] **Step 5: Run DB trust validation**

Run after migration and publish:

```bash
npm run validate:db-trust
```

Expected: all current rows have source URL/hash, required provenance, source-chain relationships, and field audit observations.

### Task 5: Add Independent GPT/Codex Visual PDF Audit

**Plain language:** Python OCR and layout parsing are not enough for PDFs that visually split words, lose titles, or place price markers near titles. Render the PDF and ask an independent visual pass to extract the same fields, then compare the results.

**Files:**
- Create: `scripts/ingest/render_pdf_pages.py`
- Create: `scripts/ingest/gpt_visual_pdf_audit.py`
- Create: `scripts/ingest/compare_extraction_audits.py`
- Create: `data/processed/pdf_visual_audit_report.json`
- Modify: `scripts/ingest/extract_v2.py`
- Modify: `scripts/ingest/audit_coverage.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Render PDF pages to deterministic images**

Create `scripts/ingest/render_pdf_pages.py`:

```python
"""Render cached Disney PDFs to images for visual audit."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


DEFAULT_PDF_DIR = Path("data/raw/pdfs")
DEFAULT_OUTPUT_DIR = Path("data/processed/pdf_page_images")


def render_pdf_pages(pdf_path: Path, output_dir: Path = DEFAULT_OUTPUT_DIR) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem
    output_prefix = output_dir / stem
    subprocess.run(
        ["pdftoppm", "-png", "-r", "180", str(pdf_path), str(output_prefix)],
        check=True,
    )
    return sorted(output_dir.glob(f"{stem}-*.png"))


def render_all_pdf_pages(pdf_dir: Path = DEFAULT_PDF_DIR, output_dir: Path = DEFAULT_OUTPUT_DIR) -> list[str]:
    paths: list[str] = []
    for pdf_path in sorted(pdf_dir.glob("*.pdf")):
        paths.extend(str(path) for path in render_pdf_pages(pdf_path, output_dir))
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description="Render PDFs for visual audit")
    parser.add_argument("--pdf-dir", type=Path, default=DEFAULT_PDF_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    paths = render_all_pdf_pages(args.pdf_dir, args.output_dir)
    print("\n".join(paths))


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Define GPT visual audit JSON schema**

Every visual audit result must use this shape:

```json
{
  "source_pdf_sha256": "64 hex chars",
  "source_pdf_path": "data/raw/pdfs/example.pdf",
  "model": "configured model name",
  "audited_at": "2026-06-26T00:00:00+00:00",
  "activities": [
    {
      "title": "Movie Under the Stars",
      "section": "Movie Under the Stars",
      "date_text": "June 2026",
      "schedule_text": "8:30pm nightly",
      "location": "Pool Deck",
      "description": "short extracted text",
      "price_state": "free|fee|unknown",
      "price_evidence": "dollar_marker|marker_absent_under_legend|body_fee_language|complimentary_language|none",
      "optional_price_options": [
        {
          "name": "Mickey S'mores Kit",
          "price_text": "available for purchase",
          "price_basis": "optional_add_on",
          "source_text": "S'mores kits available for purchase"
        }
      ],
      "bbox": {
        "page": 1,
        "x": 0,
        "y": 0,
        "width": 0,
        "height": 0
      },
      "confidence": "high|medium|low"
    }
  ],
  "warnings": []
}
```

- [ ] **Step 3: Implement visual audit runner**

Create `scripts/ingest/gpt_visual_pdf_audit.py` so it:

1. Reads rendered page images.
2. Sends the source image and a strict JSON schema prompt to `OPENAI_ACTIVITY_AUDIT_MODEL`.
3. Saves raw model JSON output under `data/processed/pdf_visual_audits/`, named by the source SHA-256, for example `data/processed/pdf_visual_audits/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json`.
4. Refuses to overwrite a manual reviewed output unless `--force` is supplied.
5. Emits no public data directly. It only emits audit observations.

Prompt requirements:

```text
Extract only text and price evidence visible in the provided Disney recreation PDF image. Do not infer prices. Treat a title-level ($) marker as paid. Treat a missing title-level ($) marker under a visible fee legend as free unless the body text says fees apply. If an activity is free but supplies are available for purchase, keep the activity free and list supplies as optional add-ons. Return JSON only.
```

- [ ] **Step 4: Compare deterministic extraction and visual audit**

Create `scripts/ingest/compare_extraction_audits.py` with mismatch categories:

```python
BLOCKING_MISMATCHES = {
    "title_missing_in_one_extractor",
    "title_disagrees",
    "price_state_disagrees",
    "fee_marker_disagrees",
    "schedule_time_disagrees",
    "location_disagrees",
    "date_or_validity_disagrees",
    "optional_add_on_disagrees",
}

REVIEW_MISMATCHES = {
    "description_low_similarity",
    "bbox_missing",
    "low_visual_confidence",
    "low_parser_confidence",
}
```

Report shape:

```json
{
  "passed": true,
  "summary": {
    "pdfs_audited": 20,
    "activities_compared": 227,
    "blocking_mismatches": 0,
    "review_mismatches": 0
  },
  "blocking_mismatches": [],
  "review_mismatches": []
}
```

- [ ] **Step 5: Gate production readiness on visual audit**

Modify `scripts/ingest/audit_coverage.py --require-production-ready` so rows with OCR/layout warning categories require one of:

```text
manual_visual_review
gpt_visual_audit_agreement
explicit_expected_unextractable_record
```

No row with low parser confidence can publish just because it appears in a fixture.

- [ ] **Step 6: Run visual audit workflow**

Run:

```bash
python3 scripts/ingest/render_pdf_pages.py
python3 scripts/ingest/gpt_visual_pdf_audit.py
python3 scripts/ingest/compare_extraction_audits.py
python3 scripts/ingest/audit_coverage.py --require-production-ready
```

Expected: every current PDF row is either parser/visual-agreed, manually reviewed, or explicitly non-publishable with reason.

### Task 6: Make Manual Review Auditable And Bounded

**Plain language:** Manual fixes are allowed only when they make the system more truthful, and only when they point back to the exact source evidence.

**Files:**
- Modify: `data/quality/activity_field_repairs.json`
- Modify: `data/quality/activity_title_repairs.json`
- Modify: `data/golden/activities/*.json`
- Create: `data/processed/manual_review_report.json`
- Modify: `scripts/ingest/review_queue.py`
- Modify: `scripts/ingest/audit_coverage.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Require manual review schema**

Every manual record must include:

```json
{
  "review_id": "stable key",
  "reviewed_at": "2026-06-26T00:00:00+00:00",
  "reviewer": "human|codex|gpt_visual_audit",
  "source_url": "https://...",
  "source_sha256": "64 hex chars",
  "field": "title|schedule|location|description|price",
  "source_text": "exact short source text",
  "bbox": {
    "page": 1,
    "x": 0,
    "y": 0,
    "width": 0,
    "height": 0
  },
  "decision": "publish|withhold|repair_field|repair_title",
  "reason": "specific reason"
}
```

- [ ] **Step 2: Add audit for manual records**

Modify `scripts/ingest/audit_coverage.py` to fail when a published row uses a repair/manual record but lacks:

```text
manual_review:source_sha256
manual_review:source_text_or_bbox
manual_review:decision
manual_review:reason
```

- [ ] **Step 3: Add manual review tests**

Add to `scripts/test_pipeline_contracts.py`:

```python
class ManualReviewAuditTest(unittest.TestCase):
    def test_manual_review_requires_source_hash_and_evidence(self) -> None:
        from scripts.ingest.audit_coverage import manual_review_errors

        review = {
            "review_id": "akl-campfire",
            "field": "price",
            "decision": "publish",
            "reason": "Visible complimentary marshmallows text",
        }
        self.assertIn("manual_review:source_sha256", manual_review_errors(review))
        self.assertIn("manual_review:source_text_or_bbox", manual_review_errors(review))
```

- [ ] **Step 4: Run manual review audit**

Run:

```bash
python3 scripts/ingest/review_queue.py list
python3 scripts/ingest/audit_coverage.py --require-production-ready
```

Expected: no blocker review items, and every manual review used by published data has source hash and visual/text evidence.

### Task 7: Reconcile All 82 Official Recreation Parent Items

**Plain language:** The main Disney recreation page is the top of the tree. Every item on that page must be classified: joinable to resorts, not relevant to resort activities, destination-wide, park-only, third-party/non-Disney-hotel, seasonal, or unsupported.

**Files:**
- Create: `data/quality/official_recreation_parent_classification.json`
- Modify: `scripts/ingest/audit_official_recreation_coverage.py`
- Modify: `scripts/ingest/disney_recreation_offerings.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Create classification schema**

`data/quality/official_recreation_parent_classification.json` must use:

```json
{
  "source_url": "https://disneyworld.disney.go.com/recreation/",
  "classification_version": "2026-06-26",
  "items": [
    {
      "program_key": "running-trails",
      "title": "Running Trails",
      "classification": "joinable_resort_offering",
      "expected_resort_join": "multiple_locations",
      "publish_behavior": "publish_official_offerings",
      "reason": "Disney lists resort locations; parent/detail pages support resort joins.",
      "required_detail_source": "https://disneyworld.disney.go.com/recreation/running-trails/"
    }
  ]
}
```

Allowed `classification` values:

```text
joinable_resort_offering
destination_wide_not_resort_specific
park_or_ticketed_experience
transportation_or_service_not_activity
third_party_or_unsupported_location
seasonal_or_inactive
duplicate_or_alias
requires_manual_classification
```

- [ ] **Step 2: Add classification coverage gate**

Modify `scripts/ingest/audit_official_recreation_coverage.py` to fail if:

```text
parent_item_missing_classification
joinable_parent_item_missing_offering
joinable_parent_resort_pair_missing
classification_requires_manual_review
classification_unknown_publish_behavior
```

- [ ] **Step 3: Add JSON output**

Add `--json` to `scripts/ingest/audit_official_recreation_coverage.py`, while preserving the current default JSON-like stdout. The command:

```bash
python3 scripts/ingest/audit_official_recreation_coverage.py --json
```

must emit a parseable JSON object with `passed`, `summary`, `errors`, `warnings`, and `missing_items`.

- [ ] **Step 4: Add classification tests**

Add to `scripts/test_pipeline_contracts.py`:

```python
class OfficialParentClassificationTest(unittest.TestCase):
    def test_every_parent_item_has_classification(self) -> None:
        index = json.loads(Path("data/raw/web/official-recreation-index-api.snapshot.json").read_text())
        classification = json.loads(Path("data/quality/official_recreation_parent_classification.json").read_text())
        classified = {item["program_key"] for item in classification["items"]}
        from scripts.ingest.disney_recreation_offerings import official_recreation_index_item_program_key

        index_keys = {
            official_recreation_index_item_program_key(item)
            for item in index.get("results", [])
            if isinstance(item, dict)
        }
        self.assertEqual(index_keys, classified)
```

- [ ] **Step 5: Run parent reconciliation**

Run:

```bash
python3 scripts/ingest/capture_official_recreation_index.py --date 2026-06-26
python3 scripts/ingest/generate_official_recreation_offerings.py
python3 scripts/ingest/audit_official_recreation_coverage.py --json
```

Expected: 82 parent items classified, all joinable parent items covered, all non-joinable items explicitly explained.

### Task 8: Audit Jogging And Running Trails Explicitly

**Plain language:** Running/jogging trails are easy to miss because they often live on parent pages and resort recreation pages rather than PDF schedules. They get their own audit.

**Files:**
- Create: `data/quality/jogging_trail_audit_scope.json`
- Create: `scripts/ingest/audit_jogging_trails.py`
- Modify: `scripts/ingest/disney_recreation_offerings.py`
- Modify: `scripts/ingest/audit_official_recreation_coverage.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Define trail audit scope**

Create `data/quality/jogging_trail_audit_scope.json`:

```json
{
  "program_keys": ["running-trails", "jogging-trails"],
  "source_urls": [
    "https://disneyworld.disney.go.com/recreation/running-trails/"
  ],
  "required_fields": ["title", "resort_join", "location", "description"],
  "price_policy": {
    "default_state": "free",
    "requires_source_text": true,
    "fallback_state": "unknown"
  }
}
```

- [ ] **Step 2: Implement jogging trail audit**

Create `scripts/ingest/audit_jogging_trails.py` that reports:

```json
{
  "passed": true,
  "summary": {
    "parent_trail_items": 1,
    "resort_trail_offerings": 0,
    "missing_resort_join_provenance": 0,
    "missing_source_url": 0,
    "missing_source_hash": 0
  },
  "errors": [],
  "warnings": [],
  "offerings": []
}
```

It must fail on:

```text
jogging_trail_missing_parent_source
jogging_trail_missing_resort_join
jogging_trail_missing_source_hash
jogging_trail_price_without_source
```

- [ ] **Step 3: Add trail tests**

Add to `scripts/test_pipeline_contracts.py`:

```python
class JoggingTrailAuditTest(unittest.TestCase):
    def test_running_trails_are_present_in_official_offerings(self) -> None:
        offerings = json.loads(Path("data/processed/official_recreation_offerings.json").read_text())
        trail_rows = [
            row for row in offerings.get("offerings", [])
            if row.get("program_key") in {"running-trails", "jogging-trails"}
        ]
        self.assertTrue(trail_rows)
        for row in trail_rows:
            self.assertTrue(row.get("source_url"))
            self.assertRegex(row.get("source_sha256", ""), r"^[a-f0-9]{64}$")
            self.assertTrue(row.get("field_provenance", {}).get("resort_join"))
```

- [ ] **Step 4: Run trail audit**

Run:

```bash
python3 scripts/ingest/audit_jogging_trails.py
python3 -m unittest scripts.test_pipeline_contracts.JoggingTrailAuditTest
```

Expected: every published running/jogging trail offering has official source URL, hash, resort join provenance, and truthful price handling.

### Task 9: Harden Price Extraction And Enrichment

**Plain language:** Prices are where trust is easiest to lose. The system must distinguish activity price, optional add-on price, exact amount, approximate amount, and unknown.

**Files:**
- Modify: `scripts/ingest/extract_v2.py`
- Modify: `scripts/ingest/promote_gold.py`
- Modify: `scripts/ingest/magical_resort_guide.py`
- Modify: `scripts/ingest/disney_recreation_offerings.py`
- Modify: `data/quality/campfire_price_matrix.json`
- Modify: `scripts/test_pipeline_contracts.py`
- Modify: `scripts/test-gold-v2-mapping.ts`
- Modify: `scripts/test-official-offerings.ts`

- [ ] **Step 1: Enforce price object shape**

Every public price object must use:

```json
{
  "state": "free|fee|unknown",
  "label": "Free|Paid|Price unclear",
  "amountCents": null,
  "minAmountCents": null,
  "maxAmountCents": null,
  "currency": "USD",
  "confidence": "high|medium|low|unknown",
  "sourceKind": "disney_pdf_marker|disney_pdf_body|disney_official_page|disney_menu|secondary_enrichment|none",
  "options": [
    {
      "optionName": "Mickey S'mores Kit",
      "priceBasis": "optional_add_on",
      "amountCents": 700,
      "currency": "USD",
      "confidence": "secondary_verified",
      "sourceLabel": "Magical Resort Guide or Disney menu",
      "sourceUrl": "https://...",
      "notes": "Public amount shown only with source and confidence."
    }
  ]
}
```

- [ ] **Step 2: Add price blocker rules**

Block publish when:

```text
price_state_free_or_fee_without_fee_claim_evidence
price_amount_without_price_provenance
third_party_price_overrides_disney_free
finder_price_sets_public_price
optional_add_on_promoted_to_activity_fee
campfire_marked_paid_due_to_smore_kit
```

- [ ] **Step 3: Add MRG match rules**

`scripts/ingest/magical_resort_guide.py` may enrich exact amounts only when all are true:

```text
calendar_group_key matches
normalized title or approved alias matches
activity family matches
Disney row exists
Disney row price.state is fee, or Disney row has optional-purchase language for an optional add-on
MRG evidence span includes the amount
```

- [ ] **Step 4: Add price tests**

Add tests that assert:

```python
self.assertEqual("free", animal_kingdom_jambo_campfire["price"]["state"])
self.assertEqual("free", animal_kingdom_jambo_movie["price"]["state"])
self.assertEqual("fee", pumbaa_arcade["price"]["state"])
self.assertEqual("fee", simba_activity_center["price"]["state"])
self.assertNotEqual("fee", chip_and_dale_campfire["price"]["state"])
self.assertEqual("optional_add_on", chip_and_dale_campfire["price"]["options"][0]["priceBasis"])
```

- [ ] **Step 5: Run price validation**

Run:

```bash
python3 scripts/test_pipeline_contracts.py
python3 scripts/ingest/promote_gold.py --fail-on-review
jq '[.[] | .price.state] | group_by(.) | map({state: .[0], count:length})' data/processed/activity_gold_v2_preview.json
npx tsx scripts/test-gold-v2-mapping.ts
npx tsx scripts/test-official-offerings.ts
```

Expected: no unsupported price labels, no third-party override of Disney-free rows, and no campfire/movie rows marked paid because of optional supplies or finder facets.

### Task 10: Verify Field-Level Extraction For Dates, Locations, Schedules, Titles, And Descriptions

**Plain language:** Price is not the only risk. Dates, times, locations, and activity titles must be just as source-backed.

**Files:**
- Create: `data/processed/field_audit_report.json`
- Modify: `scripts/ingest/extract_v2.py`
- Modify: `scripts/ingest/compare_extraction_audits.py`
- Modify: `scripts/ingest/audit_coverage.py`
- Test: `scripts/test_pipeline_contracts.py`

- [ ] **Step 1: Define required field provenance**

Gold rows require source support for:

```text
title
schedule
location
price when state is free or fee
description when present
valid_from or source edition when inferred from PDF edition
```

Official offering rows require source support for:

```text
title
resort_join
availability when specified
price when specified
booking when specified
eligibility when specified
location when more specific than resort name
description when present
```

- [ ] **Step 2: Add field audit report**

Report each field as:

```json
{
  "row_key": "animal-kingdom-jambo:campfire",
  "field": "location",
  "published_value": "Jambo House Fire Pit",
  "source_url": "https://...",
  "source_sha256": "64 hex chars",
  "deterministic_support": true,
  "visual_support": true,
  "manual_support": false,
  "confidence": "high",
  "errors": []
}
```

- [ ] **Step 3: Fail unsafe fields**

Fail production readiness on:

```text
field_missing_source_url
field_missing_source_hash
field_missing_provenance
field_value_not_supported_by_span
field_value_not_supported_by_visual_audit_for_low_quality_ocr
schedule_explicit_range_mismatch
location_bleed_from_neighboring_activity
title_ocr_fragment_published
```

- [ ] **Step 4: Run field audit**

Run:

```bash
python3 scripts/ingest/compare_extraction_audits.py
python3 scripts/ingest/audit_coverage.py --require-production-ready
python3 scripts/ingest/trust_report.py
```

Expected: every published field is source-backed, and every unsafe source-visible record is either manually reviewed or listed as non-publishable.

### Task 11: Rebuild The Gold And Official Offering Publication Gates

**Plain language:** Publishing must be impossible when the processed artifact is stale, the DB rows are missing evidence, or the UI would show unsupported facts.

**Files:**
- Modify: `scripts/ingest/promote_gold.py`
- Modify: `scripts/ingest/publish_gold_v2.py`
- Modify: `scripts/ingest/generate_official_recreation_offerings.py`
- Modify: `scripts/ingest/publish_official_offerings.py`
- Modify: `scripts/validate-db-trust.mjs`
- Modify: `scripts/validate-trust.mjs`
- Modify: `package.json`

- [ ] **Step 1: Define publish preflight order**

Gold publish must run:

```bash
python3 scripts/ingest/build_source_inventory.py
python3 scripts/ingest/audit_source_freshness.py
python3 scripts/ingest/render_pdf_pages.py
python3 scripts/ingest/gpt_visual_pdf_audit.py
python3 scripts/ingest/compare_extraction_audits.py
python3 scripts/ingest/promote_gold.py --fail-on-review
python3 scripts/ingest/audit_coverage.py --require-production-ready
npm run validate:trust
python3 scripts/ingest/publish_gold_v2.py
npm run validate:db-trust
```

Official offerings publish must run:

```bash
python3 scripts/ingest/capture_official_recreation_index.py
python3 scripts/ingest/generate_official_recreation_offerings.py
python3 scripts/ingest/audit_official_recreation_coverage.py --json
python3 scripts/ingest/audit_jogging_trails.py
python3 scripts/ingest/publish_official_offerings.py
npm run validate:db-trust
```

- [ ] **Step 2: Add package scripts**

Update `package.json`:

```json
{
  "scripts": {
    "audit:sources": "python3 scripts/ingest/build_source_inventory.py && python3 scripts/ingest/audit_source_freshness.py",
    "audit:visual-pdfs": "python3 scripts/ingest/render_pdf_pages.py && python3 scripts/ingest/gpt_visual_pdf_audit.py && python3 scripts/ingest/compare_extraction_audits.py",
    "audit:official-recreation": "python3 scripts/ingest/capture_official_recreation_index.py && python3 scripts/ingest/generate_official_recreation_offerings.py && python3 scripts/ingest/audit_official_recreation_coverage.py --json && python3 scripts/ingest/audit_jogging_trails.py",
    "validate:source-trust": "npm run audit:sources && npm run audit:visual-pdfs && npm run audit:official-recreation && npm run validate:contracts && npm run validate:trust && npm run validate:db-trust"
  }
}
```

If exact script names already exist, keep existing names and add the missing source-trust pieces without removing working scripts.

- [ ] **Step 3: Add stale artifact protection**

Modify publishers so they raise:

```text
publish_preflight_failed:source_inventory_stale
publish_preflight_failed:source_freshness_failed
publish_preflight_failed:visual_audit_missing
publish_preflight_failed:field_audit_failed
publish_preflight_failed:processed_artifact_stale
publish_preflight_failed:db_health_failed
```

- [ ] **Step 4: Run full validation**

Run:

```bash
npm run validate:source-trust
```

Expected: all local, DB, and public API trust checks pass before and after publish.

### Task 12: Verify UI Labels, Source Display, And Optional Add-Ons

**Plain language:** A correct database is not enough. The UI must show the right label: `Free`, `Paid`, or `Price unclear`; optional add-ons must be separate; duplicate chips must not appear.

**Files:**
- Modify: `lib/types/occurrence.ts`
- Modify: `lib/data/goldActivities.ts`
- Modify: `lib/data/officialOfferings.ts`
- Modify: `lib/events/mapToEventCard.ts`
- Modify: `components/atlas/ActivityDetailClient.tsx`
- Modify: `scripts/validate-trust.mjs`
- Modify: `scripts/test-gold-v2-mapping.ts`
- Modify: `scripts/test-official-offerings.ts`

- [ ] **Step 1: Enforce public price labels**

Use:

```ts
export function priceLabelForState(state: "free" | "fee" | "unknown"): "Free" | "Paid" | "Price unclear" {
  if (state === "free") return "Free";
  if (state === "fee") return "Paid";
  return "Price unclear";
}
```

Do not use `Price unclear` for rows where source evidence says free or paid.

- [ ] **Step 2: Show optional add-ons separately**

UI rendering rule:

```text
Primary price chip: Free
Optional add-on row: Mickey S'mores Kit - usually $7 plus tax, source/confidence shown
```

Never render:

```text
Primary price chip: Paid
Reason: S'mores kit available for purchase
```

for a Disney-free campfire.

- [ ] **Step 3: Add UI trust assertions**

Add to `scripts/validate-trust.mjs`:

```text
duplicate_price_chip
price_unclear_with_free_or_fee_evidence
paid_label_from_optional_add_on_only
optional_add_on_missing_source
activity_detail_missing_source_link
```

- [ ] **Step 4: Run UI/API trust validation**

Run with the local or production base URL:

```bash
npm run validate:trust
node scripts/validate-trust.mjs http://localhost:3000
```

Expected: no duplicate `Price unclear` labels, no optional add-on promoted to primary paid state, and source links remain visible in detail responses.

### Task 13: Build Reports For Humans And Machines

**Plain language:** Trust work needs reports people can read and machines can block on.

**Files:**
- Modify: `scripts/ingest/trust_report.py`
- Create: `data/processed/source_trust_summary.json`
- Create: `docs/source-trust-audit-runbook.md`

- [ ] **Step 1: Extend trust report**

`scripts/ingest/trust_report.py` must include:

```text
source inventory counts
source freshness state counts
PDF visual audit coverage
manual review coverage
Gold field confidence counts
price state counts
official recreation parent classification counts
jogging/running trail audit status
DB publication parity status
UI/API validation status
remaining gaps with owners
```

- [ ] **Step 2: Write machine-readable summary**

Create `data/processed/source_trust_summary.json`:

```json
{
  "generated_at": "2026-06-26T00:00:00+00:00",
  "overall_status": "pass|blocked|degraded",
  "confidence": {
    "current_gold_price_labels": "high",
    "current_pdf_freshness": "high",
    "official_recreation_joinable_coverage": "high",
    "independent_visual_ocr_coverage": "high|medium|low",
    "all_parent_item_classification": "high|medium|low"
  },
  "counts": {},
  "blockers": [],
  "warnings": [],
  "next_actions": []
}
```

- [ ] **Step 3: Write runbook**

Create `docs/source-trust-audit-runbook.md` with these sections:

```markdown
# Source Trust Audit Runbook

## What We Trust
## What We Do Not Trust
## Daily Source Refresh
## Full Monthly Audit
## Manual Review Rules
## Price Rules
## Jogging And Running Trails
## Publish Checklist
## Rollback Checklist
## Incident Response
## User-Facing Trust Language
```

- [ ] **Step 4: Run report**

Run:

```bash
python3 scripts/ingest/trust_report.py
cat data/processed/source_trust_summary.json
```

Expected: the report tells a truthful confidence story, including any remaining gaps.

### Task 14: Add Scheduled Monitoring And Alerts

**Plain language:** Disney changes sources without asking us. The system has to wake up, check, and tell us before users see stale data.

**Files:**
- Create: `.github/workflows/source-trust-audit.yml` or equivalent scheduler for the deployment stack
- Modify: `scripts/ingest/audit_source_freshness.py`
- Modify: `scripts/ingest/trust_report.py`
- Create: `docs/source-trust-audit-runbook.md`

- [ ] **Step 1: Add daily light audit**

Daily audit command:

```bash
npm run audit:sources
python3 scripts/ingest/audit_official_recreation_coverage.py --json
python3 scripts/ingest/audit_jogging_trails.py
```

Failure means:

```text
Do not publish new data automatically.
Create a source-change report.
Mark affected current rows as stale in internal reporting.
Keep public rows only if the previous source is still acceptable under stale-data policy.
```

- [ ] **Step 2: Add weekly full audit**

Weekly audit command:

```bash
npm run validate:source-trust
python3 scripts/ingest/trust_report.py
```

Failure means a human/Codex review must classify the issue before publish.

- [ ] **Step 3: Alert thresholds**

Alert when:

```text
any current PDF URL changes
any current PDF hash changes
any parent recreation item appears or disappears
any joinable parent-resort pair disappears
any published price state changes
any visual audit disagrees with deterministic extraction
any source-visible row enters non-publishable status
any public API row loses source URL/hash/provenance
```

- [ ] **Step 4: Add monitoring report**

The monitor output must include:

```json
{
  "status": "pass|attention|blocked",
  "changed_sources": [],
  "affected_rows": [],
  "recommended_action": "none|refresh_fixtures|manual_review|rollback|withhold_publish"
}
```

### Task 15: Rollback And Incident Response

**Plain language:** If we discover bad data, the system needs a calm, specific recovery path.

**Files:**
- Modify: `docs/source-trust-audit-runbook.md`
- Modify: `scripts/ingest/publish_gold_v2.py`
- Modify: `scripts/ingest/publish_official_offerings.py`
- Modify: `scripts/validate-db-trust.mjs`

- [ ] **Step 1: Define incident severity**

Use:

```text
P0: unsafe or materially misleading guest-facing data, such as paid/free inversion or wrong date/location for active event
P1: source stale or unsupported for visible rows, but no known guest-harmful field inversion
P2: audit/reporting gap, no known public data issue
P3: documentation or confidence labeling improvement
```

- [ ] **Step 2: Add rollback behavior**

Rollback must support:

```text
retire affected public_activity_gold rows
restore previous known-good source hash edition
mark affected source as stale
publish corrected unknown/withheld price state
regenerate trust report
run validate:db-trust and validate:trust
```

- [ ] **Step 3: Add incident checklist**

Runbook checklist:

```markdown
1. Identify affected public rows by source hash and canonical slug.
2. Compare live source, cached source, fixture, Gold row, DB row, and UI payload.
3. If public value is unsupported, retire or correct the row before adding enrichment.
4. Add regression test for the failed field.
5. Re-run source freshness, field audit, DB trust, and UI trust checks.
6. Write a short incident note with root cause, fix, and prevention.
```

### Task 16: Final Acceptance Gate

**Plain language:** The work is done only when the system can prove currentness, extraction accuracy, price accuracy, source joins, database publication, and UI display.

**Files:**
- Modify all files above as needed.

- [ ] **Step 1: Run full source trust suite**

Run:

```bash
npm run validate:source-trust
```

Expected:

```text
All source inventory, freshness, visual PDF audit, official recreation, jogging trail, contract, UI, and DB trust checks pass.
```

- [ ] **Step 2: Run current contract suite**

Run:

```bash
npm run validate:contracts
npm run validate:trust
npm run validate:db-trust
python3 scripts/ingest/audit_coverage.py --require-production-ready --json
python3 scripts/ingest/audit_official_recreation_coverage.py --json
python3 scripts/ingest/trust_report.py
```

Expected:

```text
0 blockers
0 stale current source rows
0 unsupported free/paid labels
0 unsupported price amounts
0 missing source URL/hash rows
0 missing required field provenance rows
0 missing joinable parent recreation items
0 missing jogging/running trail source rows
0 visual-audit blocking mismatches
all explicit non-publishable rows documented with source-backed reasons
```

- [ ] **Step 3: Publish only after passing**

Run:

```bash
set -a; source .env.local; set +a
python3 scripts/ingest/publish_gold_v2.py
python3 scripts/ingest/publish_official_offerings.py
npm run validate:db-trust
npm run validate:trust
```

Expected: Supabase rows match processed artifacts, public API/UI labels match source-backed Gold data, and the trust report remains clean.

---

## Industry-Standard Pattern This Implements

This plan follows the standard used in high-trust data systems:

- Source of record registry.
- Immutable raw source snapshots.
- Content hashing and freshness checks.
- Reproducible deterministic extraction.
- Independent model/vision review for high-risk OCR/layout data.
- Field-level provenance, not just row-level provenance.
- Confidence states and explicit unknown handling.
- Human review queue with auditable evidence.
- Contract tests before publish.
- Database health checks after publish.
- Public API/UI parity tests.
- Scheduled source-drift monitoring.
- Incident response and rollback.

## How GPT/Codex Should Be Used

GPT/Codex should be an independent reviewer and workflow accelerator, not an untraceable source of truth.

- Use deterministic Python extraction as the first pass.
- Use a vision-capable GPT model to independently read rendered PDFs and identify mismatches.
- Use Codex to inspect source diffs, generate regression tests, and execute the runbook.
- Require JSON-schema model outputs.
- Store model name, prompt version, source hash, image path, output hash, and timestamp.
- Never let model output publish directly without comparison against source policy.
- Treat model disagreement as a review signal, not as automatic truth.

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-26-full-disney-source-trust-audit.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
