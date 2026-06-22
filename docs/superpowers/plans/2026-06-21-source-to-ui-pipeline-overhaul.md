# Source-To-UI Pipeline Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Disney PDF-to-UI pipeline so public activity data is source-backed, provenance-rich, fail-closed, and flexible when Disney changes PDF layouts.

**Architecture:** Keep the current app, but replace the loose ingest-to-public path with strict Bronze, Bronze+ layout, Silver candidate, validation, Gold public, review, and display-safe API contracts. Current production can remain on the existing pipeline while Silver v2 and Gold v2 run in parallel until fixture coverage and validation prove safe migration.

**Tech Stack:** Python ingest scripts, PyMuPDF/pdfplumber layout extraction, Supabase/Postgres temporal tables, Next.js/TypeScript public API/UI, JSON fixture gates, local CI scripts.

---

## File Map

- Create `scripts/ingest/layout_snapshot.py`: deterministic PDF word/line geometry snapshots keyed by SHA-256.
- Create `scripts/ingest/contracts.py`: strict Python contract validators for source spans, candidate fields, and public promotion readiness.
- Create `scripts/ingest/extract_v2.py`: Silver v2 candidate extraction output that references layout snapshots and source spans.
- Create `scripts/ingest/validate_v2.py`: strict validation gate that blocks publication on missing provenance, missing required fields, OCR bleed, cross-activity bleed, fixture drift, and unsupported claims.
- Create `scripts/ingest/review_queue.py`: service-only CLI for durable approve/reject decisions before a staff UI exists.
- Create `data/golden/activities/all-star-movies-wellness-scavenger-hunt.json`: first golden fixture for the known trust failure.
- Create `supabase/migrations/<generated>_activity_pipeline_v2.sql`: tables for layout snapshots, candidates, field provenance, review queue, claims, and Gold public projection.
- Modify `scripts/ingest/publish.py`: publish only validation-passing Gold v2 records; quarantine failures.
- Modify `lib/data/activities.ts`: read from Gold/display-safe API fields only after v2 cutover.
- Modify `lib/activityDisplay.ts` and `lib/magic/nearby.ts`: remove fallback claims that do not have evidence in the public model.
- Create `docs/source-to-ui-pipeline-overhaul.md`: architecture decision and non-negotiable invariants.
- Create `scripts/test_layout_snapshot.py`: layout evidence regression tests.
- Create `scripts/test_pipeline_contracts.py`: contract and fail-closed regression tests.
- Update `package.json`: add trust/ingest validation scripts that run layout, contract, fixture, build, and API checks.

## Task 1: Evidence Layer

**Files:**
- Create: `scripts/ingest/layout_snapshot.py`
- Test: `scripts/test_layout_snapshot.py`

- [x] **Step 1: Write the failing layout snapshot test**

Run:

```bash
python3 scripts/test_layout_snapshot.py
```

Expected first failure:

```text
ModuleNotFoundError: No module named 'scripts.ingest.layout_snapshot'
```

- [x] **Step 2: Implement deterministic layout snapshots**

The implementation must return:

```json
{
  "source_path": "data/raw/pdfs/All-Star-Movies_Aframe_Recreation_1125.pdf",
  "content_sha256": "<64-char sha>",
  "page_count": 1,
  "pages": [
    {
      "page_number": 1,
      "width": 1728.0,
      "height": 2592.0,
      "words": [{ "text": "Daily", "bbox": [0, 0, 1, 1], "block_no": 0, "line_no": 0, "word_no": 0 }],
      "lines": [{ "text": "Daily from 7:00am–11:00pm", "bbox": [0, 0, 1, 1], "block_no": 0, "line_no": 0, "word_count": 3 }]
    }
  ]
}
```

- [x] **Step 3: Verify green**

Run:

```bash
python3 scripts/test_layout_snapshot.py
```

Expected:

```text
Ran 2 tests
OK
```

## Task 2: Contract Model

**Files:**
- Create: `scripts/ingest/contracts.py`
- Test: `scripts/test_pipeline_contracts.py`

- [x] **Step 1: Write failing tests for source spans and fail-closed public promotion**

Test cases:

```python
def test_public_field_without_source_span_is_blocked():
    record = {
        "title": {"value": "Wellness Scavenger Hunt", "source": "pdf", "spans": []},
        "slug": "wellness-scavenger-hunt",
        "schedule": {"text": "Daily from 7:00am–11:00pm", "spans": [{"page": 1, "line": 3}]},
        "location": {"value": "Throughout Disney’s All-Star Resorts", "spans": [{"page": 1, "line": 2}]},
    }
    result = validate_public_record(record)
    assert "title:missing_source_span" in result.errors
    assert not result.publishable

def test_unsupported_walkability_claim_is_blocked():
    record = {
        "claims": [{"kind": "walkability", "value": "walkable", "evidence": []}]
    }
    result = validate_claims(record)
    assert "walkability:missing_evidence" in result.errors
```

Run:

```bash
python3 scripts/test_pipeline_contracts.py
```

Expected: import failure for `scripts.ingest.contracts`.

- [x] **Step 2: Implement strict contract validators**

Create functions:

```python
def validate_source_spans(field_name: str, spans: list[dict]) -> list[str]: ...
def validate_public_record(record: dict) -> ValidationResult: ...
def validate_claims(record: dict) -> ValidationResult: ...
```

`ValidationResult` must expose:

```python
@dataclass
class ValidationResult:
    publishable: bool
    errors: list[str]
    warnings: list[str]
```

- [x] **Step 3: Verify green**

Run:

```bash
python3 scripts/test_pipeline_contracts.py
```

Expected:

```text
OK
```

## Task 3: Silver V2 Candidate Output

**Files:**
- Create: `scripts/ingest/extract_v2.py`
- Modify: `scripts/ingest/extract.py` only to optionally call v2 behind a flag
- Test: `scripts/test_pipeline_contracts.py`

- [x] **Step 1: Add failing test for Wellness candidate provenance**

The test must assert that the candidate includes raw and normalized fields:

```python
candidate["raw_fields"]["title"]["value"] == "W E L L N E S S S C AV E N G E R H U NT"
candidate["normalized_fields"]["title"]["value"] == "Wellness Scavenger Hunt"
candidate["normalized_fields"]["schedule"]["end_time"] == "11:00pm"
candidate["normalized_fields"]["description"]["value"].endswith("Disney’s All-Star Resorts.")
candidate["normalized_fields"]["description"]["spans"] != []
candidate["warnings"] == []
```

- [x] **Step 2: Implement candidate extraction from layout snapshots**

Use layout `lines` and source-span references. Do not read from `activities_ingest.json`.

- [x] **Step 3: Verify the Wellness fixture**

Run:

```bash
python3 scripts/ingest/extract_v2.py --group all-star-movies --fixture data/golden/activities/all-star-movies-wellness-scavenger-hunt.json
```

Expected: exit 0 and fixture match.

Current status: `extract_candidates_for_pdf()` also extracts the full All-Star Movies A-frame calendar from layout lines. Contract coverage asserts 11 real source-spanned activity candidates, 7 movie-night rows, no synthetic `resort-scavenger-hunt`, and no legacy duplicate `arcade`/`campfire` records. The reviewed full-calendar fixture promotes the 11 All-Star Movies rows to Gold preview.

## Task 4: Golden Fixtures

**Files:**
- Create: `data/golden/activities/all-star-movies-wellness-scavenger-hunt.json`
- Create: `data/golden/activities/all-star-music-wellness-scavenger-hunt.json`
- Create: `data/golden/activities/all-star-sports-wellness-scavenger-hunt.json`
- Modify: `scripts/ingest/validate_v2.py`

Progress:
- [x] Added the All-Star Movies Wellness Scavenger Hunt fixture.
- [x] Added fixture validation to `scripts/ingest/contracts.py`.
- [x] Added `scripts/ingest/validate_v2.py`.
- [x] Add All-Star Music and All-Star Sports fixtures.
- [x] Compare Silver v2 candidate output against all fixtures.
- [x] Added reviewed full-calendar All-Star Movies fixture with 11 expected records and 7 movie-night rows.
- [x] Added reviewed full-calendar All-Star Music and All-Star Sports fixtures, including split schedule lines, movie-night rows, and Sports `Touchdown! Campfire`.
- [x] Added reviewed full-calendar Beach/Yacht Club fixture, including title-as-location venue cases, split schedule continuation, 24-hour schedule normalization, long same-column descriptions, and footer/key legend exclusion from activity descriptions.
- [x] Added reviewed full-calendar Animal Kingdom Jambo House and Kidani Village fixtures, including combined schedule-location lines, stacked title lines, 24-hour fitness schedules, movie-night rows, and legacy parser undercounts.
- [x] Added reviewed full-calendar Grand Floridian fixture, including service/venue titles used as locations, split service titles, 24-hour health club schedule, movie-night rows, and a legacy parser undercount.

- [x] **Step 1: Add fixture schema**

Each fixture must include:

```json
{
  "calendar_group_key": "all-star-movies",
  "source_pdf_sha256": "<sha>",
  "expected": {
    "title": "Wellness Scavenger Hunt",
    "slug": "wellness-scavenger-hunt",
    "schedule_text": "Daily from 7:00am–11:00pm",
    "start_time": "7:00am",
    "end_time": "11:00pm",
    "location": "Throughout Disney’s All-Star Resorts",
    "description_contains": [
      "Find hidden wellness challenges",
      "Pick up a map",
      "any merchandise location"
    ],
    "is_fee_based": false
  },
  "required_spans": ["title", "schedule", "location", "description"]
}
```

- [x] **Step 2: Implement fixture validator**

`validate_v2.py` must load fixtures and compare exact fields plus required spans.

- [x] **Step 3: Verify failure on drift**

Temporarily pass `--fixture data/golden/activities/all-star-movies-wellness-scavenger-hunt.json --override-title Broken`.

Expected: exit 1 with `fixture_drift:title`.

## Task 5: Supabase V2 Schema

**Files:**
- Create with Supabase CLI: `supabase/migrations/<timestamp>_activity_pipeline_v2.sql`

- [x] **Step 1: Discover current CLI syntax**

Run:

```bash
supabase --help
supabase migration --help
```

- [x] **Step 2: Create migration through CLI**

Run:

```bash
supabase migration new activity_pipeline_v2
```

- [x] **Step 3: Add tables**

Migration must add:
- `activity_layout_snapshots`
- `activity_extraction_candidates`
- `activity_field_provenance`
- `activity_review_queue`
- `activity_claims`
- `public_activity_gold`
- `activity_slug_redirects`

- [x] **Step 4: Add access controls**

Public roles may read `public_activity_gold` and `activity_slug_redirects`.
Review/candidate/provenance tables are service-role only until a staff UI exists.
Enable RLS on all tables in exposed schemas.

- [ ] **Step 5: Verify schema locally or against Supabase**

Run available project command:

```bash
supabase migration list --local
```

If local Supabase is unavailable, run SQL syntax checks through the project database before deploy.

Current status: blocked locally because Postgres on `127.0.0.1:54322` is not running. The migration file exists at `supabase/migrations/20260621125139_activity_pipeline_v2.sql`; it still needs to be applied against a running local or project database before deploy.

## Task 6: Gold Promotion

**Files:**
- Modify: `scripts/ingest/publish.py`
- Create: `scripts/ingest/promote_gold.py`
- Test: `scripts/test_pipeline_contracts.py`

- [x] **Step 1: Write failing test that invalid candidates are quarantined**

Given a candidate with missing description span, assert:

```python
promotion.publishable == []
promotion.review_queue[0]["reason"] == "description:missing_source_span"
```

- [x] **Step 2: Implement promotion**

Promotion must only write Gold rows after `validate_public_record` passes.

- [x] **Step 3: Verify no invalid publish**

Run:

```bash
python3 scripts/test_pipeline_contracts.py
```

Expected: invalid candidate never appears in Gold output.

Current status: `python3 scripts/test_pipeline_contracts.py` passes. `python3 scripts/ingest/promote_gold.py --dry-run --fail-on-review` promotes 80 Gold preview rows from 83 fixture records and sends 0 records to review. Duplicate Wellness coverage is deduped by candidate id. Fee claims use `($)` title-marker plus footer/key legend source evidence; unmarked activities remain `unknown`, not inferred free.

## Task 7: UI Contract Cutover

**Files:**
- Modify: `lib/data/activities.ts`
- Modify: `lib/api/publicActivities.ts`
- Modify: `lib/activityDisplay.ts`
- Modify: `lib/magic/nearby.ts`
- Test: `scripts/validate-trust.mjs`

- [x] **Step 1: Add API-level assertion**

`scripts/validate-trust.mjs` must fail if a public activity lacks:
- `source.url`
- `source.documentHash`
- field provenance for title, schedule, location, and description when present
- conservative claim state for walkability/transportation

Current status: `scripts/validate-trust.mjs` now checks source URL/hash, required field provenance, and unsupported claims. `ActivityOccurrence` now has optional `source`, `fieldProvenance`, `claims`, and `trustState` fields. Legacy rows map unsupported claims to `unknown`; verified freshness now requires source contract evidence.

- [ ] **Step 2: Switch data loader to Gold v2**

The loader should select only from `public_activity_gold` or a security-invoker view over it.

Current status: added `lib/data/goldActivities.ts` with a mapper for `v_public_activity_gold` rows and local preview rows. `getAllOccurrences()` can now read Gold v2 with `ACTIVITY_DATA_PIPELINE=gold-v2` or the local preview with `ACTIVITY_DATA_PIPELINE=gold-v2-preview`. Not complete until Gold v2 is the default public read path and fixture coverage spans the active catalog.

- [ ] **Step 3: Preserve legacy redirects**

Broken slugs must redirect to canonical slugs and never resolve as canonical identities.

- [x] **Step 4: Verify local API**

Run:

```bash
npm run build
node scripts/validate-trust.mjs http://localhost:3000
```

Expected: trust validation passes and Wellness has title, canonical slug, end time, description, and provenance.

Current status: `ACTIVITY_DATA_PIPELINE=gold-v2-preview npm run dev -- --port 3007` plus `node scripts/validate-trust.mjs http://localhost:3007` passed 5/5. The Wellness detail API returned canonical slug, 7:00am-11:00pm range, full source description, PDF URL/hash, field provenance, and unknown walkability/transportation claims.

## Task 8: Review Queue

**Files:**
- Create: `app/review-queue/page.tsx` or service-only CLI first
- Create: `scripts/ingest/review_queue.py`

- [x] **Step 1: CLI first**

Implement:

```bash
python3 scripts/ingest/review_queue.py list
python3 scripts/ingest/review_queue.py approve <candidate_id>
python3 scripts/ingest/review_queue.py reject <candidate_id>
```

- [x] **Step 2: Approval writes reviewed provenance**

Approval must write reviewer, timestamp, field decisions, and candidate id.

- [x] **Step 3: Re-run promotion**

Approved records can promote only after all required validations pass.

Current status: `scripts/ingest/review_queue.py` stores durable decisions in `data/processed/activity_review_decisions_v2.json`. `promote_gold.py` can consume those decisions; an approval clears parser warnings only, while missing required source spans and other validation errors remain hard blockers. A rejected decision keeps the candidate out of Gold.

## Task 9: Operational Gates

**Files:**
- Modify: `package.json`
- Modify: `scripts/ingest/run_pipeline.py`
- Create: `.github/workflows/activity-ingest-quality.yml` if GitHub Actions is used

- [x] **Step 1: Add commands**

Add:

```json
{
  "validate:ingest": "python3 scripts/test_layout_snapshot.py && python3 scripts/test_pipeline_contracts.py && python3 scripts/ingest/validate_v2.py",
  "validate:trust": "node scripts/validate-trust.mjs"
}
```

Current status: `validate:contracts` runs layout snapshot tests, pipeline contract tests, v2 fixture validation, Gold promotion dry-run, coverage audit, and TypeScript trust regressions. `validate:cutover` is the hard production gate and currently fails until coverage is complete. The coverage audit now reports per-group undercoverage, missing groups, fixture-backed legacy overcounts, and fixture-backed legacy undercounts, so partial groups cannot masquerade as covered and contaminated legacy rows cannot masquerade as missing or complete source records. `validate:ingest` intentionally still runs the legacy strict validator and currently fails on six cross-activity bleed issues, proving the old parser is not publishable. `review:activities` lists the current local review queue.

- [x] **Step 2: Pipeline fails closed**

`run_pipeline.py` must stop before publish if `validate_v2.py` exits nonzero.

Current status: `run_pipeline.py` runs `validate.py --strict`, `validate_v2.py`, `promote_gold.py --fail-on-review`, and a coverage audit before publish. Production runs `audit_coverage.py --require-production-ready`, so publish is blocked until Gold v2 coverage and UI mode are truly cut over. Local-only runs the partial audit. Child scripts run from the repo root so root-relative golden fixtures cannot be accidentally skipped.

- [ ] **Step 3: CI gates**

CI must run ingest contract tests, fixture tests, TypeScript build, and trust smoke tests before deployment.

Current status: `validate:contracts` runs layout tests, pipeline contract tests, v2 fixture validation, Gold promotion dry-run, coverage audit, and TypeScript trust regression tests. The coverage audit reports 80 Gold rows / 83 fixture records / 20 PDF sources and `production_ready=false`; coverage-required count is 248 after fixture-backed full-calendar groups separate legacy overcounts/undercounts from real gaps. Thirteen cached PDF-backed groups still lack fixture-backed Gold coverage. The scheduled ingest workflow uses the fail-closed pipeline and fails post-publish health checks on any issue. Still required: run the public API trust smoke against a started app or deployed preview after Gold v2 cutover.

## Completion Audit

The overhaul is complete only when current evidence proves:

- All PDFs are stored immutably with hashes.
- Layout snapshots exist for every active source document.
- Every source-derived public field has source spans.
- Golden fixtures cover every active PDF profile and high-risk activity.
- `npm run validate:cutover` passes with `production_ready=true`.
- Changed PDFs cannot publish without passing fixture and quality gates.
- UI reads Gold/display-safe fields only.
- Unsupported claims show unknown or are hidden.
- Broken slugs redirect and never become canonical identities.
- Health checks and CI fail on OCR title breaks, missing descriptions, collapsed time ranges, cross-activity bleed, and unproven claims.
