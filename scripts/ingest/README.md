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
| Validate | `python validate.py --strict` plus `python validate_v2.py` and `python audit_coverage.py` | Fail-closed quality, provenance, fixture, and coverage gates |
| Third-party facts | `python magical_resort_guide.py` | MRG factual enrichment artifact: prices/options, booking details, age/access rules, exact venues, program families, and calendar validity |
| Promote | `python promote_gold.py --fail-on-review` | Gold v2 preview plus review quarantine; widens matched Gold records with MRG facts without replacing official Disney source provenance |
| Review | `python review_queue.py list` / `approve` / `reject` | Durable human decisions for quarantined candidates |
| Publish Gold v2 | `python publish_gold_v2.py` | Publishes source-backed Gold preview to Supabase `public_activity_gold`, with source documents, stable catalog ids, and DB health check |
| Publish | `python publish.py` | Legacy temporal editions in Supabase, blocked unless gates pass |
| Enrich | `python enrichment.py` | Seasonal overlays, booking metadata, pools, MRG fact tables, and MRG calendar validity on current editions |

Full pipeline:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python run_pipeline.py
```

`run_pipeline.py` now stops before publish unless strict legacy validation, v2 fixture validation, Gold v2 promotion, and the required coverage audit all pass. Production runs `audit_coverage.py --require-production-ready`; local-only runs the partial audit so gaps are visible without pretending the catalog is cut over.

Gold v2 publish is separate from the legacy temporal publisher. After applying `activity_pipeline_v2` and `magical_resort_guide_facts` migrations, run `python publish_gold_v2.py` or `npm run publish:gold-v2` from the repo root. The publisher upserts `source_documents`, stable `activity_catalog` UUIDs, and current `public_activity_gold` rows, then fails if `check_activity_pipeline_v2_health()` returns any issue.

Coverage audits prefer reviewed full-calendar fixtures over legacy parser counts. If a fixture-backed group has fewer real source records than legacy output, the audit reports a `legacy_overcount_groups` warning instead of treating contaminated legacy rows as missing source data.

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
