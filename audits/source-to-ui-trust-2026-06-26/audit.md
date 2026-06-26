# Source-To-UI Trust Completion Audit

Date: 2026-06-26

## Scope

This audit covers the user-reported trust failure where `WELLNESS SCAVENGER HUNT`
was rendered as `Wellnessscav Engerhunt`, plus the broader source-to-ingest,
normalization, enrichment, official Disney recreation, database, and public UI
requirements raised in the thread.

## Requirements And Current Evidence

| Requirement | Current evidence | Status |
| --- | --- | --- |
| PDF titles must not be OCR-smashed or camel-case smashed in public UI. | `scripts/validate-trust.mjs` scans public activity payloads for known title breaks, OCR title patterns, and camel-case smashed tokens. `scripts/test-title-fidelity.ts` has a regression for the Wellness title repair. | Proven by validation gates |
| Wellness Scavenger Hunt must have the canonical title, canonical slug, legacy redirect, source-backed schedule range including end time, description, and provenance. | `scripts/validate-trust.mjs` checks `/api/activities/wellness-scavenger-hunt`, the legacy `/activities/wellnessscav-engerhunt` redirect, the 7:00am-11:00pm schedule, description text, source URL/hash, and field provenance. | Proven by validation gates |
| Public UI must not invent "walkable", "no transportation needed", indoor/outdoor, or weather claims. | `scripts/test-title-fidelity.ts`, `scripts/validate-trust.mjs`, and `scripts/validate-db-trust.mjs` reject unsupported claims and known bad public text. `lib/api/publicActivities.ts` only exposes enrichment claims with evidence. | Proven by validation gates |
| If there is no source time, public pages must not show a time field or internal schedule helper text. | `scripts/validate-trust.mjs` checks untimed detail pages, resort pages, search payloads, and public API payloads for omitted time fields and hidden internal normalization text. Plan snapshots and ICS export are covered by `scripts/test-plan-system.ts`. | Proven by validation gates |
| PDF footer/key legends must be preserved as source evidence. | `scripts/validate-db-trust.mjs` compares live Gold source legends against `data/processed/activity_gold_v2_preview.json`. Current trust report shows 220 rows with document key legends. | Proven by DB trust audit |
| The scheduled PDF pipeline must be fail-closed and production-ready. | `scripts/ingest/audit_coverage.py` reports 20 cached PDF sources, 240 fixtures, 237 coverage-required Gold records, 237 Gold records, 0 blocking fixture quarantine, and `production_ready: true`. | Proven by coverage audit |
| Review/quarantine must not publish unsafe rows. | `scripts/ingest/promote_gold.py --fail-on-review` reports review queue 0. `scripts/ingest/trust_report.py` reports no blockers. Three source-visible records are explicitly non-publishable because required public fields are not source-visible. | Proven by promotion and trust report |
| Official Disney recreation ingest from `/recreation/#/sort=alpha/` must only publish offerings joined to at least one resort. | `scripts/ingest/audit_official_recreation_coverage.py` reports 224 offerings, 0 official quarantine, 0 published offerings missing resort join, 180/180 parent resort pairs covered, and 190/190 downstream resort pairs covered. | Proven by official coverage audit |
| Multi-resort downstream official pages must populate all supported resort relationships. | `scripts/ingest/audit_official_recreation_coverage.py` checks parent index pairs and downstream detail/resort-page pairs. Current summary: 61/61 downstream items and 190/190 downstream resort pairs covered. | Proven by official coverage audit |
| Official recreation fields like availability, price, booking, eligibility, amenities, and specific location must not be public without source provenance. | `scripts/ingest/audit_official_recreation_coverage.py`, `scripts/validate-db-trust.mjs`, and `scripts/validate-trust.mjs` reject unsourced availability labels and unsourced specific fields. | Proven by validation gates |
| Official recreation source drift must be caught before trusting stale snapshots. | `npm run audit:official-recreation-live` compares the captured Disney parent source to the live parent API and fails on added, removed, or materially changed joinable items. | Proven by live drift audit |
| Database-facing public views must match the source contracts. | `npm run validate:db-trust` audits live `v_public_activity_gold` and `v_public_activity_offerings` for source URLs, hashes, provenance, source legends, bad public text, resort joins, and DB health RPC issues. | Proven by DB trust audit |
| Public activity/search/resort/detail routes must expose clean source-backed data. | `npm run validate:trust -- http://localhost:3000` checks live local pages and APIs for title fidelity, provenance, enrichment evidence, official offerings, Wellness fidelity, untimed behavior, legacy redirect, search suppression, and internal text suppression. | Proven by live UI trust audit |

## Non-Published Records

The current trust report intentionally withholds these three source-visible PDF
records because publishing them would require inventing missing public fields:

- Art of Animation: `Nighttime Pool Party`
- Contemporary: `Sports Courts`
- Coronado Springs: `Resort Scavenger Hunt`

This is the expected fail-closed outcome. They are not published Gold records
until an authoritative source provides the missing schedule/location/description
fields or a reviewed manual source span can prove them.

## Retained Fixture Quarantine

The trust report currently retains 34 Fort Wilderness fixture quarantine rows as
audit evidence. They are not blockers because all 34 are represented by the
normalized official recreation offering path, including 13 alias-covered rows.
Official recreation ingest itself has 0 quarantine records.

## Verification Gates

The following commands are the required gates for this audit:

```bash
npx tsc --noEmit --pretty false
npm run validate:contracts
npm run validate:db-trust
npm run audit:official-recreation-live
npm run trust:report
npm run validate:trust -- http://localhost:3000
```
