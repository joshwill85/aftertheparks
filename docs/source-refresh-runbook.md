# Resort Recreation Source Refresh Runbook

This flow refreshes Disney resort recreation schedule sources as a replacement publish, not an incremental append.

## Source Rule

Use each official Disney resort recreation page as the entry point. The current schedule document must be linked from the resort page or from the resort `marketing-info` recreation tab evidence. Do not publish a CDN URL found only by filename guessing.

## Refresh Flow

1. Discover and audit current resort schedule links:

```bash
npm run audit:resort-pdf-dates -- --allow-stale
```

2. Generate replacement overrides for stale groups:

```bash
python3 scripts/ingest/replace_resort_pdf_sources.py
```

3. Fetch replacement documents and preserve replacement metadata:

```bash
python3 scripts/ingest/fetch.py --local-only --force --source-overrides data/processed/resort_pdf_source_overrides.json
```

4. Re-run the date audit against the replacement publish set:

```bash
npm run audit:resort-pdf-dates -- --source-overrides data/processed/resort_pdf_source_overrides.json
```

5. Build reviewed visual payloads that are not PDFs:

```bash
python3 scripts/ingest/fort_wilderness_visual_sources.py
```

Official JPG schedules require reviewed transcription before publish. If no reviewed transcription exists, the replacement promotion path must withhold the group instead of falling back to the stale PDF.

6. Regenerate Gold from current replacement sources:

```bash
python3 scripts/ingest/promote_gold.py
```

7. Verify source freshness, Gold source URLs, and UI answer coverage:

```bash
npm run audit:sources
npx tsx scripts/audit-activity-answer-coverage.ts --fail-on-incomplete
```

8. Run broader trust validation before publish:

```bash
npm run validate:source-trust
```

## Required Checks

- `data/processed/resort_pdf_source_overrides.json` must explain every stale replacement with official parent-page evidence.
- `data/processed/activity_gold_v2_preview.json` must contain zero stale `fy26-q1`, old `fy26-q2`, `_DRAFT`, `0126`, or `0326` resort schedule URLs.
- `data/processed/source_freshness_report.json` must have no missing used source URLs.
- Reviewed visual schedules must have a visible validity window. Expired visual schedules are blocking.
- Review queues are not guest-facing truth. A row with unsafe OCR, missing time, missing location, or unclear title must be corrected with reviewed evidence or withheld from Gold.
