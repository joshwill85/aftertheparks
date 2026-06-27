# Source Trust Audit Runbook

This runbook is the operating guide for keeping Disney recreation data trustworthy. The rule is simple: publish only current, source-backed facts, and label uncertainty plainly when source evidence is not enough.

## What We Trust

Disney guest-facing pages, resort recreation pages, PDFs, and Disney menu pages are primary sources. Magical Resort Guide and other editorial pages may enrich a Disney-confirmed activity, but they cannot override Disney on activity existence, schedule, location, or free/paid state.

The machine-readable policy lives in `data/quality/source_authority_policy.json`.

## What We Do Not Trust

Do not trust old PDFs, parser guesses, inferred price ranges, third-party prices, or OCR-only text unless the row keeps source URL, source hash, field provenance, and audit evidence. Seeded visual audit files are provenance checks, not independent GPT vision review.

## Daily Source Refresh

Run these in order when checking or refreshing the source-trust pipeline:

```bash
npm run audit:sources
python3 scripts/ingest/audit_official_recreation_coverage.py --json
python3 scripts/ingest/audit_jogging_trails.py
python3 scripts/ingest/trust_report.py
```

Failure means withhold publish, inspect `data/processed/source_trust_monitoring_report.json`, and classify source drift before changing public rows.

## Full Monthly Audit

Run the full source-to-UI suite:

```bash
npm run audit:sources
python3 scripts/ingest/magical_resort_guide.py
python3 scripts/ingest/promote_gold.py --fail-on-review
npm run audit:visual-pdfs
npm run audit:official-recreation
npm run validate:contracts
```

For UI validation, start the app first:

```bash
npm run dev
npm run validate:trust
npm run validate:db-trust
```

`npm run validate:source-trust` runs the complete chain, but it expects the local app to be available for `validate:trust`.

## Manual Review Rules

Manual records are allowed only when they make source-visible data more truthful. Each reviewed row must have source hash and source text or bounding-box evidence, either directly on the manual review record or through its required spans. Review output is audited in `data/processed/manual_review_report.json`.

## Price Rules

Use Disney terminology in public labels:

- `free` displays as `Free`.
- `fee` displays as `Paid`.
- `unknown` displays as `Price unclear` only when source evidence is genuinely insufficient or conflicting.

Campfires, movies, and similar activities without a Disney `($)` marker are free unless Disney activity text says otherwise. Optional supplies, such as s'mores kits, must be modeled as optional add-ons, not as the activity price.

## Jogging And Running Trails

Jogging/running trail rows must come from Disney recreation parent pages or documented resort joins. Run `python3 scripts/ingest/audit_jogging_trails.py`; the report must show source URL, source hash, resort-join provenance, and no sourced price contradiction.

## Publish Checklist

Before publishing, require:

1. `npm run validate:source-trust` passes.
2. `data/processed/source_trust_summary.json` has `overall_status: pass`.
3. `data/processed/source_trust_monitoring_report.json` has `recommended_action: none`.
4. DB ledger tables exist and `npm run validate:db-trust` passes.
5. UI trust validation passes against the target app URL.

## Rollback Checklist

Use publisher rollback commands with an explicit source hash or row key. Never run a broad rollback.

1. Identify affected public rows by source hash and canonical slug or offering key.
2. Retire affected rows with `publish_gold_v2.py --rollback-source-sha256 ...` or `publish_official_offerings.py --rollback-source-sha256 ...`.
3. Publish corrected rows or withhold unsupported rows.
4. Regenerate `trust_report.py`.
5. Re-run source freshness, field audit, DB trust, and UI trust checks.

## Publication Blockers

Do not publish if any of these happen:

- A live/current source URL is missing, unreachable, or hash-mismatched.
- A current Gold row has no source URL or source hash.
- A title, schedule, location, description, or price lacks field provenance.
- Current Gold contains duplicate resort/activity identities.
- A historical regression fixture is promoted into current Gold.
- A Disney-free activity is overridden by a third-party paid price.
- A free activity with optional paid supplies is modeled as a paid activity.
- Visual/field audit reports contain blocking mismatches or field errors.
- Public API/UI validation exposes internal parser placeholders.

## Historical Fixtures

Old PDFs may remain in `data/golden/activities` only as regression evidence. They must be marked:

```json
{
  "publication_scope": "historical_regression"
}
```

Historical regression fixtures may still be used to validate OCR/span extraction, but `promote_gold.py` must not publish them or create review blockers for them.

## Visual Audit Status

`scripts/ingest/gpt_visual_pdf_audit.py --seed-from-gold` creates source-provenance visual seed files. These prove schema, field provenance, comparison, and stale-file cleanup. They are not independent GPT vision review.

Independent visual review remains a stricter future/live-model mode. When enabled, it must write the same JSON shape without the `seeded_from_gold_field_provenance_not_independent_gpt_visual_review` warning and should use a configured vision model such as `OPENAI_ACTIVITY_AUDIT_MODEL`.

## Current Baseline

As of the current local audit, the production-ready baseline is:

- 225 current Gold rows.
- 20 current cached resort PDF sources.
- 226 current fixture records after excluding historical regression fixtures.
- 208 Gold rows with Disney PDF fee-key legends.
- 224 official recreation resort offerings.
- 20 current PDF visual seed files.
- 0 duplicate current Gold identities.

These numbers are allowed to change when Disney changes the source set, but the validation commands must explain every change.

## Incident Response

If trust fails:

1. Stop publish or rollback the public data path.
2. Save the failing command output and affected source URLs/hashes.
3. Re-run `npm run audit:sources` to confirm currentness.
4. If a Disney source changed, refresh the cached artifact and regenerate Gold.
5. If extraction changed, fix the parser or add a reviewed manual record with source span or visual bounding box evidence.
6. Re-run `npm run validate:contracts`, `npm run validate:trust`, and `npm run validate:db-trust`.
7. Document the cause and the corrected source evidence before publishing again.

Severity levels:

- P0: unsafe or materially misleading guest-facing data, such as paid/free inversion or wrong date/location for an active event.
- P1: source stale or unsupported for visible rows, with no known guest-harmful field inversion.
- P2: audit or reporting gap, no known public data issue.
- P3: documentation or confidence-labeling improvement.

## User-Facing Trust Language

Use direct language:

- `Free` when Disney shows no fee marker and no activity-level charge.
- `Paid` when Disney shows a fee marker or direct activity price.
- `Optional add-ons available` when the event is free but supplies are sold.
- `Price unclear` only when official source evidence is missing or conflicting.
