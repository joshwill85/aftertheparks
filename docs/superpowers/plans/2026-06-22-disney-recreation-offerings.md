# Disney Recreation Offerings

> **For Josh:** Implement a source-backed ingestion path for Disney's official recreation pages that models evergreen and multi-resort offerings without forcing them into timed calendar occurrences.

**Goal:** Add a normalized official recreation offering pipeline that can ingest Disney activity detail pages, preserve resort joins from downstream pages, quarantine unresolved joins, and expose non-calendar activities safely to the app.

**Architecture:** Keep existing calendar/PDF occurrences intact. Add a separate offering model for evergreen, reservation-based, and calendar-dependent activities so the UI never fabricates times, locations, walkability, or transportation claims.

## Tasks

- [x] Add failing extraction contract tests for multi-resort detail pages, per-resort variants, resort-filtered page joins, and unresolved join quarantine.
- [x] Add failing mapping tests proving offerings do not require `startDateTime` and do not infer unsupported access claims.
- [x] Add a Supabase migration for normalized official recreation programs, resort offerings, quarantine, RLS, grants, and a public view.
- [x] Implement the official recreation offering extractor with source-backed resort alias resolution and quarantine gates.
- [x] Implement a publisher that upserts programs, offerings, and quarantine records from deterministic web snapshots.
- [ ] Add a TypeScript data mapper for official offerings and wire resort/detail consumers to load them separately from timed occurrences.
- [ ] Run focused tests, then the repository contract validation suite as far as feasible.
