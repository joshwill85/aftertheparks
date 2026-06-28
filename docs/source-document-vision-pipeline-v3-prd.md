You’re asking for a **replacement path**, not a tweak. Here is the full gated PRD I would use.

# PRD: Source Document Vision Pipeline v3

## 0. Executive decision

Add a new **vision-first, source-span-backed v3 ingest mode** inside the existing `scripts/ingest/` pipeline.

Do not create a second pipeline universe. The v3 implementation must extend the repo's current ingest/provenance model, reuse existing review and Gold promotion concepts, and run side-by-side with v2 until the diffs are boring.

Keep your current bronze model, because it is correct:

```text
Bronze = exact official source bytes + hash + URL + metadata
```

Keep the current v2 path available:

```text
v2 mode:
  PyMuPDF embedded text
  → Tesseract fallback
  → line reconstruction
  → extract_v2
  → promote_gold.py
```

Add v3 mode:

```text
v3 mode:
  canonical source page image
  → layout-aware OCR
  → region segmentation
  → field extraction with evidence crops
  → multi-engine agreement / validation / review gates
  → extract_v3
  → promote_gold_v3
```

The goal is not “better OCR confidence.” The goal is:

> **No public Gold record is published unless every critical field is source-backed, normalized, validated, and either engine-agreed or human-reviewed.**

And the product rule is:

> **Wrong public data is worse than missing public data.**

That is how you get practical **100% precision for published data**. Automation can have imperfect recall, but it must abstain instead of guessing.

---

# 1. Context

Your sample sources are not conventional structured PDFs. The two PDF examples are one-page visual flyers, and the JPG is a long visual activity schedule. The PDF screenshots show designed poster layouts with QR codes, activity blocks, movie sections, mixed typography, colored headings, and photos; the JPG example is a dense vertical sign with repeated day/activity blocks. 

That explains your current failures:

```text
missing text
missing values
compressed words
bad spaces
wrong line joins
text crossing columns
fields attached to the wrong activity
```

Those are expected failure modes when a visual flyer is treated as a text PDF.

---

# 2. Goals

## Primary goals

1. Ingest PDF, JPG, PNG, and future image-like official Disney sources.
2. Preserve bronze exactly as official evidence.
3. Generate deterministic page images for every source.
4. Extract layout, text, regions, and bounding boxes from visual documents.
5. Map source evidence into normalized activity fields.
6. Prevent uncertain or ambiguous records from reaching public Gold.
7. Produce a review queue for anything below the public precision bar.
8. Make quarterly source drift detectable before publish.

## Non-goals

This project should **not** attempt to auto-publish every activity. It should auto-publish only records that pass strict gates.

This project should **not** let Codex decide OCR tools dynamically. Codex can write code, fixtures, tests, and adapters, but production routing must be fixed, config-driven, versioned, and logged.

This project should **not** treat OCR output as truth. OCR output is evidence that must be validated.

---

# 3. Success definition

## Product-level success

A user should never see a wrong activity time, location, fee marker, date/day, movie title, or resort assignment because of OCR or parser drift.

## Data-level success

For all public Gold rows:

```text
critical field precision = 100% on reviewed/golden validation set
critical field provenance = 100%
ambiguous critical fields published = 0
records with missing required evidence published = 0
```

## Automation-level success

Automation should improve coverage, but never at the expense of precision.

Suggested v1 targets:

```text
Measured auto-publish precision on reviewed/golden and production-audited rows: 100%; system fails closed when unverified
Auto-publish recall: 70–90% initially
Manual review capture of uncertain rows: 100%
No silent parser failures: 100%
```

Recall can improve over time. Precision is the gate.

---

# 4. Proposed technical stack

## Required baseline

### PDF rendering: `pypdfium2`

Use `pypdfium2` to render PDFs into deterministic page images before OCR. It is a Python binding to PDFium for rendering, inspection, manipulation, and creation, and its licensing is Apache-2.0 / BSD-3-Clause at the pypdfium2 layer, with PDFium under a BSD-style license. ([PyPI][1])

Use it for:

```text
PDF → canonical PNG page image
```

Do not use embedded PDF text as the primary source for these Disney flyers.

### Primary OCR/layout engine: PaddleOCR / PP-StructureV3

Use PaddleOCR as the primary document-vision engine. The current PaddleOCR project explicitly supports converting PDFs and images into structured JSON/Markdown, and PP-StructureV3 provides fine-grained coordinate information such as table-cell and text coordinates. ([GitHub][2])

PaddleOCR is Apache-2.0 licensed. ([GitHub][2])

Use it for:

```text
canonical page image
  → layout regions
  → text boxes
  → word/line boxes
  → confidence
  → structured OCR evidence
```

PaddleX’s document pipeline also includes layout region detection, text detection, text recognition, text image rectification, document orientation classification, and table structure recognition modules, which map well to your visual schedule problem. ([PaddlePaddle][3])

### Secondary comparator: RapidOCR

Use RapidOCR as the first free comparator/fallback because it is open-source, free, offline-deployable, cross-platform, and Apache-2.0 licensed. ([GitHub][4])

Use it for:

```text
critical field agreement
fast local development
CPU-friendly fallback
regression comparison
```

### Optional comparator: Surya OCR 2

Surya is technically attractive because it handles OCR, layout analysis, reading order, and table recognition through a single VLM, and it outputs detected text and bounding boxes. ([GitHub][5])

However, Surya must be optional because its code is Apache-2.0, but its model weights use a modified OpenRAIL-style license with commercial-use conditions. ([GitHub][5])

Use Surya only if your project qualifies under the model-weight terms or you approve licensing.

### Parallel structural snapshot: Docling

Use Docling as a parallel evidence generator, not the only extractor. Docling supports PDF plus image inputs including PNG, JPEG, TIFF, BMP, and WEBP, and it can export lossless JSON. ([Docling][6])

Use it for:

```text
comparison
reading-order experiments
future parser-family improvements
debug snapshots
```

## Demoted tools

These should no longer be primary for these assets:

```text
PyMuPDF text extraction
pdfplumber
Camelot
Tabula
Tesseract-only OCR
OCRmyPDF-only preprocessing
```

They can remain for diagnostics or simple future documents, but not as the main path for Disney recreation schedules.

---

# 5. Architecture

## Current architecture

```text
source_manifest.py
  → discover.py
  → fetch.py
  → source_documents / raw PDFs
  → layout_snapshot.py
  → extract_v2.py
  → promote_gold.py
  → publish_gold_v2.py
```

## Target architecture

```text
source_manifest.py
  → discover.py
  → fetch.py
  → source_documents / raw source bytes

scripts/ingest/render_source_pages.py
  → canonical page images

scripts/ingest/vision_snapshot.py
  → OCR/layout engine outputs
  → region crops
  → tokens/lines/boxes
  → QR targets
  → quality metrics

scripts/ingest/extract_v3.py
  → activity candidates
  → normalized schedules
  → source spans
  → field evidence

scripts/ingest/validate_v3.py
  → deterministic field gates
  → engine agreement gates
  → domain dictionary gates
  → review queue

scripts/ingest/promote_gold_v3.py
  → only accepted public records

scripts/ingest/publish_gold_v3.py
  → Supabase public Gold tables
```

The existing v2 scripts remain available throughout migration:

```text
layout_snapshot.py
extract_v2.py
promote_gold.py
publish_gold_v2.py
```

v3 must dual-run with v2 before any public cutover.

---

# 6. Layer definitions

## Bronze: unchanged source truth

Bronze remains:

```text
official source URL
fetched URL
HTTP metadata
exact bytes
SHA-256
storage path
calendar group
edition
fetch timestamp
```

Add support for images, but do not change the principle.

Bronze should store:

```text
source_type: pdf | image
mime_type
http_content_type
detected_content_type
file_extension
content_sha256
canonical_url
fetched_url
storage_path
calendar_group_key
edition
fetched_at
etag
content_length
http_status
```

For JPGs, bronze stores the exact JPG bytes. No rotation, cropping, deskewing, or OCR in bronze.

## Silver evidence: new vision snapshot

This is the v3 compatibility bridge for `layout_snapshot.py`, not an immediate deletion of it.

Represent v3 output as a new snapshot kind/version that can evolve alongside current layout snapshots:

```text
snapshot_kind:
  word_layout_v2
  vision_layout_v3

text_source:
  pdf_text
  tesseract_ocr
  paddleocr_region
  rapidocr_region
  docling_snapshot
```

Silver evidence stores:

```text
canonical page image
render parameters
OCR engine outputs
layout regions
word/line boxes
field crops
engine agreement
quality metrics
parser versions
config hash
git SHA
```

## Silver candidates: interpreted but not trusted

Candidates contain normalized fields and evidence, but they are not public truth.

## Gold: trusted public records

Gold is published only if critical field gates pass or a manual reviewer approves.

Every public field, not only every record, must carry field-level provenance:

```text
source_document_id
content_sha256
page_number
region_bbox
field_bbox
field_crop_path
field_crop_sha256
primary_engine_text
secondary_engine_text
normalized_value
validation_result
review_status
```

---

# 7. Data contracts

## 7.1 `source_documents`

Extend the existing `source_documents` table. This repo already has `public.source_type` as an enum and already adds `image`; do **not** replace it with a `text` column.

Add or confirm these columns:

```sql
alter table source_documents
add column if not exists mime_type text,
add column if not exists http_content_type text,
add column if not exists detected_content_type text,
add column if not exists file_extension text,
add column if not exists raw_page_count integer,
add column if not exists raw_width integer,
add column if not exists raw_height integer;
```

For PDFs:

```text
raw_page_count = PDF page count
raw_width/raw_height = null or first-page rendered dimensions
```

For JPGs:

```text
raw_page_count = 1
raw_width/raw_height = image dimensions
```

## 7.2 `source_document_pages`

Prefer extending the current provenance model before adding standalone tables. If canonical page images cannot be represented cleanly in `activity_layout_snapshots.snapshot_json`, introduce a narrow page table:

```sql
create table if not exists source_document_pages (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references source_documents(id),
  content_sha256 text not null,
  page_number integer not null,
  page_kind text not null, -- pdf_page | image_file
  canonical_image_storage_path text not null,
  canonical_image_sha256 text not null,
  width_px integer not null,
  height_px integer not null,
  render_engine text,
  render_engine_version text,
  render_dpi integer,
  render_scale numeric,
  image_orientation integer,
  image_quality jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_document_id, page_number, canonical_image_sha256)
);
```

## 7.3 `vision_runs`

Prefer storing this inside a v3 `activity_layout_snapshots.snapshot_json` envelope first:

```json
{
  "snapshot_kind": "vision_layout_v3",
  "pipeline_version": "vision_v3_001",
  "config_hash": "...",
  "source_pages": [],
  "engine_runs": [],
  "regions": [],
  "tokens": [],
  "quality": {}
}
```

Only introduce a separate `vision_runs` table if snapshot JSON becomes too large to operate safely.

```sql
create table if not exists vision_runs (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references source_documents(id),
  content_sha256 text not null,
  pipeline_version text not null,
  config_hash text not null,
  git_sha text,
  primary_engine text not null,
  secondary_engine text,
  optional_engines text[],
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  error text,
  metrics jsonb not null default '{}'::jsonb,
  unique(content_sha256, pipeline_version, config_hash)
);
```

## 7.4 `vision_regions`

Prefer storing regions inside the v3 snapshot envelope and field provenance objects first. Only introduce `vision_regions` if the review UI or audit queries need relational access.

```sql
create table if not exists vision_regions (
  id uuid primary key default gen_random_uuid(),
  vision_run_id uuid not null references vision_runs(id),
  source_document_page_id uuid not null references source_document_pages(id),
  region_type text not null,
  region_family text,
  bbox_px jsonb not null,
  crop_storage_path text,
  crop_sha256 text,
  reading_order integer,
  detection_method text not null,
  detection_confidence numeric,
  text_primary text,
  text_secondary text,
  engine_agreement jsonb not null default '{}'::jsonb,
  quality jsonb not null default '{}'::jsonb
);
```

Region types:

```text
header
qr_callout
wellness_section
resort_activities_section
movie_section
activity_block
movie_row
day_banner
vertical_activity_row
footer
photo
unknown
```

## 7.5 `vision_tokens`

Prefer storing normalized engine tokens inside the v3 snapshot envelope first. Only introduce `vision_tokens` if token-level relational queries become necessary.

```sql
create table if not exists vision_tokens (
  id uuid primary key default gen_random_uuid(),
  vision_run_id uuid not null references vision_runs(id),
  region_id uuid references vision_regions(id),
  page_number integer not null,
  engine text not null,
  token_text text not null,
  normalized_text text,
  bbox_px jsonb not null,
  confidence numeric,
  line_number integer,
  reading_order integer
);
```

## 7.6 `activity_candidates_v3`

Prefer extending `activity_extraction_candidates` with `parser_version = vision-v3.x`, v3 `profile_key`, v3 `raw_fields`, v3 `normalized_fields`, and richer `source_spans` / `field_evidence`. Only introduce `activity_candidates_v3` if the existing candidate table cannot represent the v3 state cleanly.

```sql
create table if not exists activity_candidates_v3 (
  id uuid primary key default gen_random_uuid(),
  vision_run_id uuid not null references vision_runs(id),
  source_document_id uuid not null references source_documents(id),
  content_sha256 text not null,
  calendar_group_key text not null,
  resort_slug text,
  document_family text not null,
  candidate_type text not null, -- activity | movie | note | legend
  source_title text,
  normalized_title text,
  category text,
  location_text text,
  normalized_location_id text,
  schedule_raw text,
  schedule_normalized jsonb,
  description text,
  fee_raw text,
  fee_required boolean,
  registration_required boolean,
  weather_note text,
  validation_status text not null,
  validation_findings jsonb not null default '[]'::jsonb,
  field_evidence jsonb not null,
  created_at timestamptz not null default now()
);
```

## 7.7 Field evidence object

Every critical field should carry evidence like this:

```json
{
  "field": "schedule",
  "raw_value": "Sunday, Monday, Wednesday and Friday from 3:30pm-4:30pm",
  "normalized_value": {
    "days_of_week": ["Sunday", "Monday", "Wednesday", "Friday"],
    "start_time": "15:30",
    "end_time": "16:30",
    "timezone": "America/New_York"
  },
  "source": {
    "content_sha256": "...",
    "page_number": 1,
    "region_id": "...",
    "bbox_px": [2120, 1542, 3310, 1622],
    "crop_sha256": "...",
    "crop_storage_path": "..."
  },
  "engines": [
    {
      "engine": "paddleocr_ppstructurev3",
      "text": "Sunday, Monday, Wednesday and Friday from 3:30pm-4:30pm",
      "confidence": 0.97
    },
    {
      "engine": "rapidocr",
      "text": "Sunday, Monday, Wednesday and Friday from 3:30pm-4:30pm",
      "confidence": 0.94
    }
  ],
  "agreement": "exact_after_normalization",
  "review_status": "not_required"
}
```

---

# 8. Document-family strategy

You should not rely on one generic OCR output. These Disney sources have repeatable design families.

## Family 1: A-frame recreation PDFs

Examples: BoardWalk and All-Star Sports one-page recreation flyers.

Expected regions:

```text
logo/header
QR callout
Disney Family Wellness box
Resort Activities column
Movie Under the Stars section
photo block
footer/fee legend
```

Parser:

```text
AframeRecreationParser
```

Responsibilities:

```text
detect major columns
extract wellness blocks
extract resort activity blocks
extract movie rows
detect fee legend
decode QR
attach fields to source crops
```

## Family 2: vertical digital recreation sign JPGs

Example: DAAR CKS digital recreation sign.

Expected regions:

```text
title/header
day banners
repeated activity rows
time/icon/title/location/description clusters
footer/legal note
```

Parser:

```text
VerticalDigitalRecSignParser
```

Responsibilities:

```text
detect day banners
group rows under day banners
extract activity row text
inherit day context
parse start/end times
map title/location/description
attach evidence crops
```

## Family 3: unknown visual schedule

Fallback parser:

```text
GenericVisualScheduleParser
```

This parser should never auto-publish. It should produce review candidates only.

## QR discovery

QR targets on Disney flyers are derived source links. They may point to a better official digital schedule or corroborating source, but they must not override visible flyer evidence without their own provenance and validation.

The QR step should:

```text
detect QR region
decode target URL
classify whether target is an official Disney property
store QR target as derived_source_link
optionally fetch as a separate source_document if it contains official schedule data
link the derived source back to the flyer source_document
never let QR-derived data override flyer data without field-level provenance and validation
```

---

# 9. OCR and routing rules

## Source routing

```text
if source_type == pdf:
  render PDF page to canonical PNG with pypdfium2
  run vision OCR on rendered page

if source_type == image:
  preserve original
  create canonical oriented PNG
  run vision OCR on canonical image

if unsupported source:
  store bronze only
  create review task
```

## Engine routing

```text
primary_engine = paddleocr_ppstructurev3
secondary_engine = rapidocr
optional_engine = surya_ocr2 when license-approved
parallel_snapshot = docling
```

## No dynamic engine switching

Codex may not decide engines. The config decides.

Example config:

```yaml
pipeline_version: vision_v3_001

render:
  pdf_engine: pypdfium2
  default_dpi: 450
  max_dpi: 600
  output_format: png
  color_mode: rgb

image:
  apply_exif_orientation: true
  preserve_original_bytes: true
  canonical_format: png

ocr:
  primary:
    engine: paddleocr
    mode: ppstructurev3
  secondary:
    engine: rapidocr
  optional:
    surya_enabled: false
  docling_snapshot_enabled: true

publish_gates:
  require_field_evidence: true
  require_engine_agreement_for_auto_publish: true
  require_manual_review_on_disagreement: true
  allow_generic_family_auto_publish: false
```

## Reproducibility contract

OCR/version pinning is not enough. v3 must pin and record the whole runtime/config surface that can change extracted text or bboxes:

```text
Python package versions pinned
OCR model versions pinned
OCR model asset hashes recorded
OCR engine configs recorded
preprocessing flags recorded
render DPI recorded
image format recorded
pipeline config hash recorded
render config hash recorded
git SHA recorded
Docker/container image digest recorded when available
```

Invariant:

```text
same source hash + same config hash
  → same page image hash
  → same normalized snapshot schema
```

If a package, model asset, render setting, preprocessing flag, config hash, or container image digest changes, the run is a new reproducibility lineage and must not silently replace prior evidence.

## Coordinate contract

Field crops, review approvals, and audit overlays depend on stable coordinate semantics.

```text
Page-image coordinates use pixel units.
Origin is top-left.
Bbox format is [x1, y1, x2, y2].
Coordinates are measured against canonical page image, not raw PDF points.
Every bbox must include page_image_sha256.
Every field crop must include crop_sha256.
Any render DPI/config change creates a new page_image_sha256.
Any page_image_sha256 change invalidates field crop approvals tied to the old page image.
Optional normalized bbox [0..1] may be stored for UI portability, but pixel bbox is canonical.
```

---

# 10. Normalization model

## Required normalized activity fields

```text
calendar_group_key
resort_slug
source_document_id
content_sha256
activity_type
source_title
normalized_title
location_text
normalized_location_id
schedule_raw
schedule_normalized
description
fee_required
registration_required
weather_dependency
source_spans
validation_status
```

## Schedule normalization

Input examples:

```text
Daily from 8:00am–11:00pm
Daily at 1:30pm
Nightly from 6:00pm–7:30pm
Monday, Wednesday and Friday from 4:00pm–5:00pm
Sunday, Monday, Wednesday and Friday from 3:30pm–4:30pm
Tuesday and Thursday at 8:30pm
Dawn to Dusk
```

Output shape:

```json
{
  "schedule_type": "recurring",
  "days_of_week": ["Monday", "Wednesday", "Friday"],
  "start_time": "16:00",
  "end_time": "17:00",
  "timezone": "America/New_York",
  "raw_text": "Monday, Wednesday and Friday from 4:00pm-5:00pm",
  "parser": "schedule_parser_v3",
  "confidence": "validated"
}
```

Special cases:

```text
Daily = all seven days
Nightly = all seven days unless source family overrides it
Dawn to Dusk = phrase schedule, not exact time
Movie rows = weekday-specific movie event
No end time = point-in-time event
```

## Fee normalization

Rules:

```text
title contains ($) → fee_required = true
fee legend present and title marker present → fee_required = true
explicit “fees may apply” text → fee_required = true
no marker and no fee phrase → fee_required = false only if section legend is understood
unclear → review
```

## Location normalization

Create a controlled dictionary:

```text
Village Green Lawn
Luna Park Pool Deck
Surfboard Bay Pool Deck
Inside Stadium Hall
Game Point Arcade
Community Hall
Croquet Lawn
BoardWalk Tennis and Pickleball Court
Touchdown! Football Field
Outside Stadium Hall near Touchdown! Buildings
```

Each raw location must map to either:

```text
known_location_id
manual_review_required
```

No fuzzy location should auto-publish unless the fuzzy match is exact after a controlled normalization rule.

---

# 11. Precision gates

## Gate categories

Every candidate gets one of these states:

```text
auto_publishable
needs_review
rejected
parser_error
source_error
```

## Critical fields

These fields require strict validation:

```text
title
resort/calendar group
location
schedule/date/day/time
fee marker
movie title when candidate_type = movie
source document hash
source crop
```

## Engine agreement policy

Critical fields must agree across primary and secondary OCR after deterministic normalization, but agreement is field-specific:

```text
title:
  exact after deterministic title normalization, including fee marker handling

schedule:
  exact normalized parse tree; raw strings may differ if the parsed days/times/phrase schedule match

location:
  exact known_location_id

fee:
  exact boolean plus supporting marker/legend evidence

movie title:
  exact after movie-title normalization

description:
  not required for auto-publish unless the description is used as a public, planning-critical field
```

If both engines agree on a value that fails the schedule parser, location dictionary, fee reconciliation, or fixture validation, agreement does not make it publishable.

## Auto-publish rule

A candidate can auto-publish only if all are true:

```text
1. Source document is official and fetched successfully.
2. Source hash exists.
3. Canonical page image exists.
4. Document family is recognized.
5. Activity region was detected.
6. Title evidence crop exists.
7. Schedule evidence crop exists.
8. Location evidence crop exists when required.
9. Critical fields agree across primary and secondary OCR after normalization.
10. Schedule parser returns a valid parse tree.
11. Location maps to known dictionary.
12. Fee marker is reconciled with title and legend.
13. No critical validation finding exists.
14. Candidate does not conflict with existing Gold for same source/edition.
```

If any item fails:

```text
needs_review
```

## Manual review rule

A reviewer can approve a candidate only if the review UI stores:

```text
reviewer
timestamp
original source hash
page image hash
field crop
approved normalized value
reason
```

Manual approvals must be invalidated if the source hash changes.

---

# 12. Review queue

## Review UI requirements

Each review task should show:

```text
full page image
detected region crop
field-level crop
primary OCR text
secondary OCR text
normalized field value
validation findings
existing Gold comparison
approve/edit/reject controls
```

## Review task types

```text
ocr_disagreement
missing_required_field
unknown_location
unparsed_schedule
low_quality_image
unknown_document_family
source_changed
gold_conflict
```

## Review output

A review decision creates:

```text
approved field value
rejected candidate
parser rule update request
new golden fixture
```

The important workflow is:

```text
review → fixture → regression test → parser improvement
```

Not:

```text
review → one-off manual patch only
```

---

# 13. Golden fixture strategy

## Fixture types

Create four fixture layers.

### 1. Source fixtures

```text
raw PDF/JPG
content_sha256
expected source_type
expected page count
expected dimensions
```

### 2. Page fixtures

```text
canonical page image hash
render DPI
render engine version
expected major regions
```

### 3. Candidate fixtures

```text
expected activity blocks
expected movie rows
expected source spans
expected raw field text
```

### 4. Gold fixtures

```text
expected normalized activity records
expected schedule parse
expected location ID
expected fee state
```

## Golden set composition

Start with:

```text
3 sample files from this thread for document-family coverage
current v2 review queue blockers from data/processed/activity_review_queue_v2_preview.json
manual-review fixtures from data/processed/manual_review_report.json
expected_unextractable_records from data/golden/activities/*.json
10 current A-frame PDFs
10 current vertical signs/images if available
5 known difficult OCR cases
5 historical quarterly variants
5 negative/unknown-family files
```

Prioritize known failures over neutral examples. The initial v3 bakeoff set should include:

```text
Known current-cache sample paths, before Gate 1 migration:
  data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf
  data/raw/pdfs/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg
  data/raw/pdfs/All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf

Target v3 bronze/source-document paths:
  data/raw/source_documents/<calendar_group>/<edition>/<sha256>.<ext>

Known v2 failure/manual-review coverage:
  boardwalk/movie-under-the-stars
    Fixture: data/golden/activities/boardwalk-full-calendar.json
    Failure: OCR mangles the movie list; validates region-first movie rows.

  coronado-springs/arts-crafts
  coronado-springs/sangria-university
  coronado-springs/colors-of-coronado-painting-experience
  coronado-springs/spanish-mosaic-art
    Fixture: data/golden/activities/coronado-springs-full-calendar.json
    Failure: OCR merges craft rows, drops location, corrupts time, and contaminates nearby regions.

  animal-kingdom-jambo/campfire
  animal-kingdom-kidani/campfire
    Fixtures:
      data/golden/activities/animal-kingdom-jambo-full-calendar.json
      data/golden/activities/animal-kingdom-kidani-full-calendar.json
    Failure: OCR drops title or splits description away from the campfire block.

  port-orleans-riverside/nighttime-trivia-challenge
  port-orleans-riverside/glow-with-the-flow
  port-orleans-riverside/arts-crafts
    Fixture: data/golden/activities/port-orleans-riverside-full-calendar.json
    Failure: OCR misses bottom-right blocks or truncates visual activity tables.

  old-key-west/bike-rentals
    Fixture: data/golden/activities/old-key-west-full-calendar.json
    Failure: OCR misses visible hours.

  polynesian/video-game-dance-party
  polynesian/campfire
  polynesian/aloha-after-dark
    Fixture: data/golden/activities/polynesian-full-calendar.json
    Failure: OCR misses visual title, location, or truncates time.
```

The spike should also sample active review queue records across these reason classes:

```text
schedule:missing
location:missing
candidate_warning:schedule:text_quality_low
candidate_warning:schedule:incomplete_time_phrase
candidate_warning:description:text_quality_low
```

Target initial set:

```text
30–50 documents
200–500 activity/movie candidates
```

## Fixture partitions

Do not tune every parser rule against every fixture. Split fixtures into:

```text
regression fixtures:
  always run in CI; protects known behavior and source-backed fixes

development fixtures:
  used while building parsers and region rules

holdout fixtures:
  not used for parser tuning; used before rollout gates to detect overfitting
```

The initial holdout should include at least:

```text
a few A-frame PDFs
a few vertical signs/images
a few historical quarterly variants
a few negative/unknown-family files
```

## Evaluation metrics

Do not optimize for whole-document OCR similarity.

Use field-level metrics:

```text
title exact normalized match
location exact normalized match
schedule raw exact match
schedule normalized exact match
fee exact match
description acceptable match
movie title exact match
source bbox present
source crop present
auto-publish precision
auto-publish recall
manual review rate
manual-review capture rate
critical-field conflict detection rate
abstention correctness
```

---

# 14. Gated implementation plan

## Gate 0 — Baseline freeze and evaluation harness

### Objective

Measure how bad the current pipeline is and lock fixtures before replacing it.

### Work

```text
- Freeze current extract_v2 behavior.
- Add evaluation command.
- Create initial evaluation fixtures from known v2 failures plus the three format-coverage samples.
- Score current pipeline field-by-field.
- Generate baseline report.
```

### Deliverables

```text
scripts/ingest/evaluate_activity_extraction.py
data/golden/source_documents/
data/golden/activity_expected/
data/processed/eval/baseline_v2_report.json
```

### Exit criteria

```text
- At least 3 format-coverage documents fixture-backed.
- At least 10 known v2 failure/manual-review candidates included.
- Current pipeline produces a measurable report.
- Field-level failures are visible by document, activity, and field.
- No new extraction work starts until this report exists.
```

---

## Gate 0.5 — Disposable render/OCR/region spike

### Objective

Validate the engine and region-first assumptions before overbuilding production code.

This spike must not touch Gold, Supabase publishing, current v2 artifacts, or public UI behavior. Its output is a short bakeoff report and throwaway/debug artifacts only.

### Work

```text
- Render the format-coverage samples and known-failure PDFs/images.
- Try 300, 450, and 600 DPI for PDF rendering.
- Run PaddleOCR primary and RapidOCR secondary on full pages.
- Manually crop obvious regions for the known-failure cases.
- Run OCR inside those crops.
- Compare crop-level results against current layout_snapshot.py output and fixture/manual-review truth.
- Record where engines disagree and where both engines agree on a wrong value.
```

### Evaluation questions

```text
Can pypdfium2 render these cleanly and deterministically?
Does PaddleOCR extract better evidence than current layout_snapshot.py for known failures?
Does region-first cropping improve title/location/schedule/movie-row extraction?
Where does RapidOCR disagree, especially on small text and English spacing?
Which DPI gives the best field evidence without unacceptable runtime/storage cost?
Which DPI gives the best publishable-field precision per runtime/storage dollar?
Which failure cases still require human review even with v3?
```

### Deliverables

```text
data/processed/eval/vision_v3_spike_report.md
data/processed/eval/vision_v3_spike_report.json
data/processed/eval/vision_v3_spike_debug/
```

The report must include:

```text
average render time per page
average OCR time per page
average page image size
average crop/debug artifact size
recommended retention policy for page images, crops, overlays, and OCR debug files
```

Default retention policy to validate:

```text
Keep:
  raw source forever
  canonical page image hash/metadata
  field crops needed for review/provenance
  final vision snapshot JSON

Optional/short retention:
  full debug overlays
  exploratory OCR dumps
  alternate DPI render artifacts
```

### Exit criteria

```text
- Spike report covers all format-coverage files.
- Spike report covers the known-failure set listed in Golden set composition.
- Report includes field-level comparison against v2 and fixture/manual-review truth.
- Report recommends DPI, engine config, storage/runtime budget, retention policy, and first production parser target.
- Any no-go finding is documented before Gate 2 production work proceeds.
```

---

## Gate 1 — Generalize source documents beyond PDFs

### Objective

Make JPG/PNG first-class bronze documents.

### Work

```text
- Update source_manifest.py to support source_type.
- Update discover.py to detect PDF/JPG/PNG links.
- Update fetch.py to preserve exact bytes for any source type.
- Add content-type sniffing from bytes.
- Change local raw cache path from pdf-specific to source-document-specific.
```

### Suggested paths

```text
data/raw/source_documents/<calendar_group>/<edition>/<sha256>.pdf
data/raw/source_documents/<calendar_group>/<edition>/<sha256>.jpg
```

### Exit criteria

```text
- Existing PDFs still fetch and hash identically.
- JPG source fetches into bronze without conversion.
- Supabase storage path uses actual extension.
- source_documents row records detected content type.
- fetch_report includes pdf/image counts.
```

---

## Gate 2 — Canonical page rendering

### Objective

Create deterministic page images for every source.

### Work

```text
- Add render_source_pages.py.
- Render PDFs using pypdfium2.
- Convert JPG/PNG to canonical oriented PNG.
- Record page image SHA-256.
- Store page metadata.
- Generate debug thumbnails.
```

### Render policy

```text
PDF default DPI: 450
PDF fallback evaluation DPI: 300 and 600
Image policy: preserve original, create oriented canonical PNG
```

### Deliverables

```text
data/processed/page_images/<sha256>/page_001.png
data/processed/page_images/<sha256>/page_001.thumb.png
data/processed/page_images/<sha256>/page_manifest.json
```

### Exit criteria

```text
- BoardWalk PDF renders deterministically.
- All-Star Sports PDF renders deterministically.
- DAAR JPG produces one canonical page image.
- Re-running render produces identical page image hashes.
- Page dimensions and render config are stored.
```

---

## Gate 3 — Vision snapshot v1

### Objective

Add a `vision_layout_v3` snapshot path alongside `layout_snapshot.py`; deprecate v2 only after dual-run acceptance.

### Work

```text
- Add vision_snapshot.py.
- Run PaddleOCR primary.
- Run RapidOCR secondary.
- Optionally run Docling parallel snapshot.
- Normalize engine outputs into one schema.
- Store tokens, lines, bboxes, regions, confidence, text.
```

### Deliverables

```text
data/processed/vision_snapshots/<sha256>.vision.json
data/processed/vision_debug/<sha256>/overlay_primary.png
data/processed/vision_debug/<sha256>/overlay_secondary.png
```

### Exit criteria

```text
- Every token has engine, text, bbox, confidence when available.
- Every page has quality metrics.
- Every run records engine versions and config hash.
- No Codex-driven dynamic engine choice exists.
- Failed OCR creates a structured error, not silent empty output.
```

---

## Gate 4 — Document family classifier and region segmentation

### Objective

Segment the document before field extraction.

### Work

```text
- Add family_classifier.py.
- Add AframeRecreationParser.
- Add VerticalDigitalRecSignParser.
- Add GenericVisualScheduleParser.
- Detect and crop major regions.
- Decode QR regions where present.
- Store region crops and bboxes.
```

### Family classification signals

```text
filename pattern
source dimensions/aspect ratio
detected header text
presence of QR callout
presence of “Resort Activities”
presence of day banners
presence of “Movie Under the Stars”
```

### Exit criteria

```text
- BoardWalk classified as aframe_recreation.
- All-Star Sports classified as aframe_recreation.
- DAAR JPG classified as vertical_digital_rec_sign.
- Each document has major region crops.
- Unknown-family documents cannot auto-publish.
```

---

## Gate 5 — Field extraction v3

### Objective

Map visual regions into activity candidates.

### Work

```text
- Add extract_v3.py.
- Extract activity blocks from A-frame regions.
- Extract movie rows.
- Extract vertical sign rows under day banners.
- Parse title/location/schedule/description/fee.
- Attach field evidence to every extracted value.
```

### Field extraction policy

```text
Do not create a field without a source span.
Do not infer a time from nearby text unless region grouping proves containment.
Do not use fuzzy title repair unless deterministic and fixture-tested.
Do not merge lines across region boundaries.
```

### Exit criteria

```text
- Every candidate has source_document_id and content_sha256.
- Every critical field has field_evidence.
- Every field has raw and normalized value.
- Failed parsing creates validation findings.
- extract_v2 and extract_v3 can run side-by-side.
```

---

## Gate 6 — Validation and public-publish gates

### Objective

Prevent bad data from reaching Gold.

### Work

```text
- Add validate_v3.py.
- Add schedule parser v3.
- Add location dictionary.
- Add fee/legend reconciliation.
- Add engine agreement checker.
- Add candidate status assignment.
```

### Validation output

```text
auto_publishable
needs_review
rejected
```

### Exit criteria

```text
- No candidate without schedule evidence can auto-publish.
- No unknown location can auto-publish.
- No OCR disagreement on critical fields can auto-publish.
- No unknown document family can auto-publish.
- All rejected/review candidates include reasons.
```

---

## Gate 7 — Review queue

### Objective

Turn low-confidence automation into safe human approval.

### Work

```text
- Add review task generator.
- Add review JSON output if no UI exists yet.
- Add minimal internal review UI later.
- Store approval decisions with source hash and crop hash.
```

### Minimum viable review artifact

```json
{
  "task_type": "unparsed_schedule",
  "source_document_id": "...",
  "content_sha256": "...",
  "page_image": "...",
  "field_crop": "...",
  "primary_text": "...",
  "secondary_text": "...",
  "candidate_value": "...",
  "validation_findings": []
}
```

### Exit criteria

```text
- Every non-publishable candidate becomes reviewable or rejected.
- Review approval creates a fixture candidate.
- Source hash change invalidates prior approval.
```

---

## Gate 8 — Gold promotion v3

### Objective

Publish only safe v3 records.

### Work

```text
- Add promote_gold_v3.py.
- Require validation_status = auto_publishable or manually_approved.
- Preserve source spans and field evidence.
- Compare against existing Gold.
- Generate diff preview before publish.
```

### Exit criteria

```text
- Gold preview contains only gated rows.
- Every Gold row links to source_document and field evidence.
- Any v2/v3 conflict is surfaced.
- Publishing can be disabled by feature flag.
```

---

## Gate 9 — Dual-run backfill

### Objective

Run v2 and v3 side-by-side before switching public data.

### Work

```text
- Run all current manifest sources through v3.
- Compare v2 Gold preview vs v3 Gold preview.
- Generate document-level and field-level diffs.
- Review all conflicts.
```

### Exit criteria

```text
- 100% of current sources processed or explicitly marked source_error.
- 100% of v2/v3 critical-field diffs reviewed.
- No unreviewed v3 record publishes.
- Manual review backlog is understood.
```

---

## Gate 10 — Production rollout

### Objective

Switch public publishing to v3 safely.

### Rollout

```text
Phase 1: v3 publish disabled, reports only
Phase 2: v3 publish for one calendar group
Phase 3: v3 publish for recognized A-frame family
Phase 4: v3 publish for recognized vertical sign family
Phase 5: v2 deprecated for recreation schedules
```

### Rollback

```text
feature flag: public_gold_source = v2 | v3
```

### Exit criteria

```text
- Zero known public critical-field errors.
- Monitoring reports generated after every ingest.
- Quarterly drift report blocks publish on unexpected family/layout changes.
```

---

# 15. PR sequence

## PR 1 — Evaluation harness and current baseline

Files:

```text
scripts/ingest/evaluate_activity_extraction.py
data/golden/
tests/eval/
```

DoD:

```text
baseline_v2_report.json generated
format-coverage and known-failure fixtures committed
field-level scoring visible
```

## PR 1.5 — Disposable vision spike

Files:

```text
scripts/ingest/spike_vision_v3_bakeoff.py
data/processed/eval/vision_v3_spike_report.md
data/processed/eval/vision_v3_spike_report.json
```

DoD:

```text
pypdfium2 render check completed
PaddleOCR/RapidOCR bakeoff completed
known v2 failures compared at field level
recommended DPI and parser target documented
no production publish path touched
```

## PR 2 — Source document generalization

Files:

```text
scripts/ingest/source_manifest.py
scripts/ingest/discover.py
scripts/ingest/fetch.py
scripts/ingest/content_type.py
```

DoD:

```text
PDF and JPG fetch
hash unchanged for existing PDFs
source_type/mime fields populated
```

## PR 3 — Canonical renderer

Files:

```text
scripts/ingest/render_source_pages.py
scripts/ingest/render_pdf.py
scripts/ingest/render_image.py
scripts/ingest/page_manifest.py
```

DoD:

```text
deterministic page image hashes
debug thumbnails
page metadata stored
```

## PR 4 — OCR adapters

Files:

```text
scripts/ingest/ocr/paddle_adapter.py
scripts/ingest/ocr/rapidocr_adapter.py
scripts/ingest/ocr/docling_adapter.py
scripts/ingest/ocr/schema.py
```

DoD:

```text
all engines normalize into common token/line/bbox schema
versions/config hashes stored
```

## PR 5 — Vision snapshot writer

Files:

```text
scripts/ingest/vision_snapshot.py
scripts/ingest/quality_metrics.py
scripts/ingest/debug_overlays.py
```

DoD:

```text
<sha256>.vision.json generated
overlays generated
no silent OCR failures
```

## PR 6 — Family classifier and region segmentation

Files:

```text
scripts/ingest/family_classifier.py
scripts/ingest/regions/aframe_recreation.py
scripts/ingest/regions/vertical_digital_rec_sign.py
scripts/ingest/regions/generic_visual.py
```

DoD:

```text
sample documents classified correctly
major regions cropped
unknown family blocked from auto-publish
```

## PR 7 — Activity extraction v3

Files:

```text
scripts/ingest/extract_v3.py
scripts/ingest/blocks.py
scripts/ingest/movies.py
scripts/ingest/field_evidence.py
```

DoD:

```text
activity candidates generated
critical fields carry evidence
movie rows handled separately
```

## PR 8 — Schedule, location, and fee validators

Files:

```text
scripts/ingest/schedule_parser_v3.py
scripts/ingest/location_dictionary.py
scripts/ingest/fee_validator.py
scripts/ingest/engine_agreement.py
scripts/ingest/validate_v3.py
```

DoD:

```text
auto_publishable/needs_review/rejected assigned
known examples pass fixtures
ambiguous examples go to review
```

## PR 9 — Review queue

Files:

```text
scripts/ingest/build_review_queue_v3.py
scripts/ingest/review_schema_v3.py
data/processed/review_queue/
```

DoD:

```text
every blocked candidate has a review task
manual approval format exists
approval invalidates on source hash change
```

## PR 10 — Gold v3 promotion and publish flag

Files:

```text
scripts/ingest/promote_gold_v3.py
scripts/ingest/publish_gold_v3.py
config/publish_flags.yaml
```

DoD:

```text
v3 preview generated
v3 publish behind flag
v2/v3 diff report generated
```

## CI / PR blocking rules

Any extraction, validation, OCR adapter, renderer, or promotion PR must fail if:

```text
auto-publish precision drops on golden fixtures
a critical field loses provenance
a candidate changes from needs_review to auto_publishable without new evidence or approved review
source hash/page image hash determinism breaks
new parser errors do not generate review tasks
an approval references a stale source hash or stale page_image_sha256
engine/config/model pinning metadata is missing
```

Every behavior-changing PR must include:

```text
fixture update or new fixture
before/after eval report
reason for changed behavior
explicit statement that no publish precision gate regressed
```

---

# 16. Codex operating contract

Codex is allowed to:

```text
write adapters
write tests
create fixtures
generate diff reports
suggest parser rule changes
implement deterministic config changes
summarize failed review cases
```

Codex is not allowed to:

```text
choose OCR engines at runtime
change thresholds without config and tests
silently skip failed pages
repair critical fields without evidence
promote candidates to Gold
rewrite golden fixtures without explicit review
```

Every Codex-generated extraction change must include:

```text
fixture update or new fixture
before/after eval report
reason for changed behavior
no loss of precision
```

---

# 17. Quality metrics

## Per-source metrics

```text
source_type
page_count
page_render_success
ocr_success
recognized_family
region_count
activity_candidate_count
movie_candidate_count
auto_publishable_count
needs_review_count
rejected_count
parser_error_count
```

## Per-field metrics

```text
title_missing_rate
location_missing_rate
location_unknown_rate
schedule_missing_rate
schedule_unparsed_rate
fee_disagreement_rate
engine_disagreement_rate
description_low_confidence_rate
```

## Publish blockers

The ingest job should fail closed if:

```text
new source hash appears and no v3 snapshot exists
recognized family changes unexpectedly
activity count changes beyond configured threshold
movie count changes beyond configured threshold
auto-publish candidate has critical validation finding
source has parser_error and no review task
```

---

# 18. Drift detection

For each quarterly source change, generate:

```text
source_drift_report.json
```

Include:

```text
old hash
new hash
old activity count
new activity count
old movie count
new movie count
new/removed titles
changed schedules
changed locations
changed fees
new unknown regions
validation failures
manual review required
```

Publish should block if drift is detected and not reviewed.

---

# 19. Operational runbook

## Normal ingest

```bash
python scripts/ingest/discover.py
python scripts/ingest/fetch.py
python scripts/ingest/render_source_pages.py
python scripts/ingest/vision_snapshot.py
python scripts/ingest/extract_v3.py
python scripts/ingest/validate_v3.py
python scripts/ingest/promote_gold_v3.py --preview
```

## Publish

```bash
python scripts/ingest/publish_gold_v3.py --require-clean-preview
```

## Review flow

```bash
python scripts/ingest/build_review_queue_v3.py
# reviewer approves/edits tasks
python scripts/ingest/promote_gold_v3.py --include-approved-review
python scripts/ingest/publish_gold_v3.py --require-clean-preview
```

## Quarterly update flow

```bash
python scripts/ingest/discover.py --quarter fy26-q4
python scripts/ingest/fetch.py --quarter fy26-q4
python scripts/ingest/render_source_pages.py --quarter fy26-q4
python scripts/ingest/vision_snapshot.py --quarter fy26-q4
python scripts/ingest/extract_v3.py --quarter fy26-q4
python scripts/ingest/validate_v3.py --quarter fy26-q4
python scripts/ingest/source_drift_report.py --quarter fy26-q4
```

Publish only after the drift report is clean or reviewed.

---

# 20. Testing strategy

## Unit tests

```text
content type detection
PDF rendering determinism
image orientation handling
schedule parser
location normalization
fee marker parsing
engine agreement normalization
field evidence serialization
```

## Fixture tests

```text
BoardWalk A-frame
All-Star Sports A-frame
DAAR vertical sign JPG
known bad OCR case
unknown-family case
```

## Regression tests

```text
same source hash → same page image hash
same config hash → same vision snapshot
same OCR output → same candidates
same candidates → same validation result
```

## Precision tests

A public row fails tests if:

```text
critical field lacks evidence
critical field lacks source crop
schedule does not parse
location is unknown
fee marker conflicts with legend
engine disagreement is unresolved
review approval source hash does not match
```

---

# 21. Risk register

## Risk: OCR still misses small text

Mitigation:

```text
render PDFs at 450 DPI
evaluate 600 DPI for hard cases
segment regions before OCR
use secondary comparator
send disagreement to review
```

## Risk: OCR engines agree on the same wrong text

Mitigation:

```text
domain validators
known location dictionary
schedule grammar validation
field crop review for critical data
golden fixture regression
quarterly drift reports
```

## Risk: Disney changes layout

Mitigation:

```text
family classifier confidence
unknown-family auto-publish block
activity-count drift thresholds
new source hash review
fixture expansion
```

## Risk: Surya license mismatch

Mitigation:

```text
do not make Surya required
use PaddleOCR + RapidOCR as free baseline
enable Surya only after license approval
```

## Risk: parser becomes too conservative

Mitigation:

```text
manual review queue
fixture-driven parser improvements
separate recall targets from precision gates
```

---

# 22. Final target state

At the end of this migration, your pipeline should look like this:

```text
Bronze:
  exact official PDF/JPG bytes, hash, storage, metadata

Silver evidence:
  canonical page images
  OCR/layout snapshots
  region crops
  field-level evidence
  engine agreement
  quality metrics

Silver candidates:
  activity/movie candidates with normalized fields
  source spans
  validation findings

Review:
  all uncertain records displayed with source crop and OCR evidence

Gold:
  only auto-publishable or manually approved records
  every public field backed by source hash + crop + validation
```

The central change is:

> **Stop trying to parse these as PDFs. Treat every source as a visual document, extract evidence from rendered page images, and publish only through strict field-level gates.**

[1]: https://pypi.org/project/pypdfium2/ "pypdfium2 · PyPI"
[2]: https://github.com/PADDLEPADDLE/PADDLEOCR "GitHub - PaddlePaddle/PaddleOCR: Turn any PDF or image document into structured data for your AI. A powerful, lightweight OCR toolkit that bridges the gap between images/PDFs and LLMs. Supports 100+ languages. · GitHub"
[3]: https://paddlepaddle.github.io/PaddleX/3.4/en/pipeline_usage/tutorials/information_extraction_pipelines/document_scene_information_extraction_v3.html "PP-ChatOCRv3-doc - PaddleX Documentation"
[4]: https://github.com/rapidai/rapidocr "GitHub - RapidAI/RapidOCR:  Awesome OCR multiple programing languages toolkits based on ONNX Runtime, OpenVINO, MNN, PaddlePaddle, TensorRT and PyTorch. · GitHub"
[5]: https://github.com/datalab-to/surya "GitHub - datalab-to/surya: OCR, layout analysis, reading order, table recognition in 90+ languages · GitHub"
[6]: https://docling-project.github.io/docling/usage/supported_formats/ "Supported formats - Docling"
