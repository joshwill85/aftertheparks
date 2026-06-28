# Vision v3 Gate 0.5 Spike Report

- Pipeline version: `vision_v3_gate0_5_spike`
- Publish behavior: `no_publish`
- Known failures included: `70`

## Dependencies

- docling: missing (parallel structural snapshot)
- paddleocr: missing (primary OCR/layout engine)
- pdftoppm: available (legacy/debug PDF renderer currently used by render_pdf_pages.py)
- pypdfium2: available (deterministic PDF page renderer)
- rapidocr: missing (secondary OCR comparator)

## Evaluation Questions

- Can pypdfium2 render these cleanly and deterministically?
- Does PaddleOCR extract better evidence than current layout_snapshot.py for known failures?
- Does region-first cropping improve title/location/schedule/movie-row extraction?
- Where does RapidOCR disagree, especially on small text and English spacing?
- Which DPI gives the best publishable-field precision per runtime/storage dollar?
- Which failure cases still require human review even with v3?

## Retention Policy

Keep:
- raw source forever
- canonical page image hash/metadata
- field crops needed for review/provenance
- final vision snapshot JSON

Optional / Short Retention:
- full debug overlays
- exploratory OCR dumps
- alternate DPI render artifacts
