# Activity Ingest Pipeline

Official Disney resort recreation data ingestion (medallion architecture).

## Pipeline stages

```bash
cd scripts/ingest
pip install -r requirements.txt
# System: tesseract-ocr (brew install tesseract / apt install tesseract-ocr)
playwright install chromium  # optional, for discovery
```

| Stage | Script | Layer |
|-------|--------|-------|
| Discover | `python discover.py` | Find PDF URLs, detect changes |
| Fetch | `python fetch.py` | Bronze — download PDFs, sha256, storage |
| Extract | `python extract.py` | Silver — parse PDFs to JSON |
| Validate | `python validate.py --strict` plus `python validate_v2.py`, `python audit_coverage.py`, and `python trust_report.py` | Fail-closed quality, provenance, fixture, coverage, and monitoring gates |
| Third-party facts | `python magical_resort_guide.py` | MRG factual enrichment artifact: prices/options, booking details, age/access rules, exact venues, program families, and calendar validity |
| Promote | `python promote_gold.py --fail-on-review` | Gold v2 preview plus review quarantine; widens matched Gold records with MRG facts without replacing official Disney source provenance |
| Review | `python review_queue.py list` / `approve` / `reject` | Durable human decisions for quarantined candidates |
| Trust report | `python trust_report.py` or `npm run trust:report` | Operator-facing source-to-UI report with coverage, Gold source-key-legend, official offering, quarantine, and cutover blocker counts |
| Live DB trust audit | `npm run validate:db-trust` | Read-only Supabase audit of public Gold and official-offering views after publish, including Gold source-key-legend parity against the processed artifact |
| Live Disney recreation parent drift | `npm run audit:official-recreation-live` | Fetches Disney's current recreation parent API without overwriting snapshots and fails if joinable parent items were added, removed, or materially changed |
| Publish Gold v2 | `python publish_gold_v2.py` | Publishes source-backed Gold preview to Supabase `public_activity_gold`, with source documents, stable catalog ids, and DB health check |
| Publish official offerings | `python publish_official_offerings.py` | Publishes normalized Disney recreation offerings only when each public offering is joined to at least one resort |
| Publish legacy temporal | `python publish.py` | Historical temporal-edition writer; disabled by default and only available with explicit operator opt-in |
| Enrich | `python enrichment.py` | Seasonal overlays, booking metadata, pools, MRG fact tables, and MRG calendar validity on current editions |

Full pipeline:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python scripts/ingest/run_pipeline.py
```

`scripts/ingest/run_pipeline.py` now stops before publish unless strict legacy validation, v2 fixture validation, Gold v2 promotion, the required coverage audit, and the trust/monitoring report all pass. Production runs `audit_coverage.py --require-production-ready`; local-only runs the partial audit so gaps are visible without pretending the catalog is cut over. When publish is enabled, the pipeline writes Gold v2, official recreation offerings, and enrichment tables. It does not call the legacy temporal publisher.

Vision v3 can be run alongside the default path in report-only mode:

```bash
pip install -r scripts/ingest/requirements.txt
# Optional parallel structural snapshot engine:
# pip install -r scripts/ingest/requirements-vision-v3-optional.txt
python scripts/ingest/run_pipeline.py --vision-v3 --quarter fy26-q4
```

That lane renders source pages, builds vision snapshots, extracts and validates v3 candidates, generates source status/metrics, writes the quarterly source drift report, builds the v3 review queue, promotes a v3 preview, generates the dual-run report, refreshes the trust/monitoring report, and runs the guarded v3 readiness check. It does not publish v3 rows; public v3 writes still require `python publish_gold_v3.py --require-clean-preview --publish` after all gates pass.

The v3 vision lane uses `pypdfium2` for deterministic PDF page renders, `PaddleOCR` as the primary OCR/layout engine, and `RapidOCR` as the secondary comparator. `Docling` is supported as an optional parallel structural snapshot via `requirements-vision-v3-optional.txt`; it can pull platform-specific OCR dependencies, so keep it out of the default install unless that runtime is validated. If any OCR package is missing or fails, the v3 snapshot records a structured unavailable/error result and downstream publish gates fail closed instead of silently publishing guessed data.

Gold v2 publish is the trusted scheduled-activity publisher. After applying `activity_pipeline_v2`, `magical_resort_guide_facts`, and `preserve_gold_source_evidence` migrations, run `python publish_gold_v2.py` or `npm run publish:gold-v2` from the repo root. The publisher verifies the processed Gold artifact matches regeneration from current fixtures, review decisions, and MRG facts, then runs the production coverage preflight, then upserts `source_documents`, stable `activity_catalog` UUIDs, and current `public_activity_gold` rows, including structured `source` JSON with PDF footer/key legends, then fails if `check_activity_pipeline_v2_health()` returns any issue.

The public UI defaults to `ACTIVITY_DATA_PIPELINE=gold-v2`. Unknown pipeline values also fail closed to Gold v2. The legacy temporal UI reader is available only as `ACTIVITY_DATA_PIPELINE=legacy-temporal` with `ALLOW_LEGACY_ACTIVITY_UI_PIPELINE=1`, and it should be used only for historical diagnostics.

`publish.py` is retained only for historical temporal-model recovery. It fails by default with `legacy_activity_publish_disabled`; an operator must set `ALLOW_LEGACY_ACTIVITY_TEMPORAL_PUBLISH=1` for an intentional backfill. Normal pipeline and backfill runs use Gold v2 plus official offerings instead.

Legacy temporal repair scripts such as `backfill_all_times.py` and `backfill_movie_times.py` use the same opt-in guard. Public time fixes should be made by correcting source-backed fixtures/review decisions and republishing Gold v2, not by directly mutating legacy schedule tables.

Coverage audits prefer reviewed full-calendar fixtures over legacy parser counts. If a fixture-backed group has fewer real source records than legacy output, the audit reports a `legacy_overcount_groups` warning instead of treating contaminated legacy rows as missing source data.

Official recreation offerings are modeled separately from timed Gold records. Parent recreation index rows can seed resort joins, but downstream official detail pages and resort recreation pages are preferred when they provide richer resort evidence. The official recreation coverage audit checks both parent-index resort pairs and downstream detail/resort-page resort pairs; missing downstream pairs fail the audit. When an official-web fixture quarantine is an exact source-backed match, or a reviewed alias match, for an official offering joined to the same calendar group, the audit keeps the quarantine visible but excludes it from the blocking quarantine count. This prevents non-calendar evergreen recreation from blocking scheduled-Gold cutover after it has been represented by the normalized official-offering path. Official offerings that Disney marks as currently unavailable are mapped to paused UI status rather than shown as available daily.

Official recreation publish is also fail-closed: `publish_official_offerings.py` verifies the processed offering artifact matches regeneration from the captured official snapshots, then runs the official recreation coverage preflight before opening the Supabase client or writing program/offering rows.

Because Disney's recreation parent API can change independently of PDF calendars, run `npm run audit:official-recreation-live` before refreshing official recreation snapshots or after a suspected Disney recreation-page change. The audit ignores noisy request-date/hash changes and compares stable parent item fields, so it fails only when the saved parent snapshot no longer matches the current joinable source shape.

After a production publish, run `npm run validate:db-trust`. It loads `.env.local` when present and performs a read-only audit against `v_public_activity_gold` and `v_public_activity_offerings`, including required source URL/hash fields, required provenance spans, known OCR/helper text contamination, resort joins, DB health RPCs, and parity between `data/processed/activity_gold_v2_preview.json` source-key legends and live Gold `source.documentKeyLegends`.

Full-calendar fixtures must account for every extracted source candidate. Publishable records belong in `expected_records`; source-visible candidates that are intentionally withheld from Gold belong in `expected_quarantine_records` with source spans and exact expected warnings. If OCR misses visible text but the activity can be fully verified against the rendered PDF, use `reviewed_manual_records` with complete public fields, source locators, and manual review metadata; those records are promoted only after the same fixture drift and Gold validation gates pass. Use `expected_unextractable_records` only for source-visible records that are not yet safely extracted or manually reviewed.

Magical Resort Guide is treated as third-party factual enrichment, not a source of record for which activities exist. `magical_resort_guide.py` reads public HTML pages and writes `data/processed/magical_resort_guide_facts.json`. `promote_gold.py` only joins those facts to existing Gold rows by calendar group and normalized activity slug, then preserves the official Disney `source_url`/`source_sha256` while adding `external_facts`, `enrichment`, price options, and `valid_from`/`valid_until` where available.

Review queue:

```bash
npm run review:activities
python scripts/ingest/review_queue.py approve <candidate_id> --reviewer <name>
python scripts/ingest/review_queue.py reject <candidate_id> --reviewer <name>
```

Approvals can clear parser warnings only. They cannot override missing required source spans, fixture drift, or unsupported public claims.

Bootstrap backfill (local extract without DB):

```bash
python backfill.py --local-only
```

## Environment

- `SUPABASE_URL` — project API URL
- `SUPABASE_SERVICE_ROLE_KEY` — required for fetch/publish/enrichment

## Outputs

- `data/raw/pdfs/` — cached PDFs
- `data/processed/activities_ingest.json` — extracted activities
- `data/processed/activity_gold_v2_preview.json` — source-backed Gold v2 promotion preview
- `data/processed/activity_review_queue_v2_preview.json` — local review queue for blocked v2 candidates
- `data/processed/activity_review_decisions_v2.json` — durable local approve/reject decisions
- `data/processed/magical_resort_guide_facts.json` — third-party factual enrichment facts and current schedule-validity window
- `data/processed/discovery_report.json` — URL change detection
- `data/processed/fetch_report.json` — fetch status
- `data/processed/validation_report.json` — validation results

## Database

Schema in `supabase/migrations/20260620220000_activity_data_platform.sql`.

Legacy app query view: `v_resort_activities_today`
Gold v2 app query view: `v_public_activity_gold`

Health check: `select * from check_activity_data_health();`
