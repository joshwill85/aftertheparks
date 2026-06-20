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
| Validate | `python validate.py` | Quality gates |
| Publish | `python publish.py` | Gold — temporal editions in Supabase |
| Enrich | `python enrichment.py` | Seasonal overlays, booking metadata, pools |

Full pipeline:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python run_pipeline.py
```

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
- `data/processed/discovery_report.json` — URL change detection
- `data/processed/fetch_report.json` — fetch status
- `data/processed/validation_report.json` — validation results

## Database

Schema in `supabase/migrations/20260620220000_activity_data_platform.sql`.

App query view: `v_resort_activities_today`

Health check: `select * from check_activity_data_health();`
