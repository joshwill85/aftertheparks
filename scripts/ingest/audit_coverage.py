"""Coverage audit for source-backed activity pipeline cutover readiness."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR, RAW_DIR
    from source_manifest import ACTIVITY_SOURCES
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import PROCESSED_DIR, RAW_DIR
    from .source_manifest import ACTIVITY_SOURCES


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_DIR = ROOT / "data/golden/activities"
DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_INGEST_PATH = PROCESSED_DIR / "activities_ingest.json"


@dataclass
class CoverageAudit:
    summary: dict[str, Any]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.errors


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _pdf_sources() -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for source in ACTIVITY_SOURCES:
        if not source.pdf_url:
            continue
        filename = source.pdf_url.rsplit("/", 1)[-1]
        local_path = RAW_DIR / filename
        sources.append(
            {
                "calendar_group_key": source.calendar_group_key,
                "resort_slugs": list(source.resort_slugs),
                "pdf_url": source.pdf_url,
                "pdf_edition": source.pdf_edition,
                "local_path": str(local_path),
                "cached": local_path.exists(),
                "content_sha256": _sha256(local_path) if local_path.exists() else None,
            }
        )
    return sources


def _fixture_source_hash(fixture: dict[str, Any], expected: dict[str, Any] | None = None) -> str | None:
    source_kind = str(fixture.get("source_kind", "pdf"))
    if source_kind != "official_web":
        return fixture.get("source_pdf_sha256")

    slug = expected.get("slug") if isinstance(expected, dict) else None
    detail_pages = fixture.get("source_detail_pages")
    if slug and isinstance(detail_pages, list):
        for detail_page in detail_pages:
            if not isinstance(detail_page, dict):
                continue
            if detail_page.get("slug") == slug and detail_page.get("source_web_sha256"):
                return detail_page.get("source_web_sha256")
    return fixture.get("source_web_sha256")


def _fixture_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        expected_records = fixture.get("expected_records")
        if isinstance(expected_records, list):
            for expected in expected_records:
                rows.append(
                    {
                        "path": str(path),
                        "calendar_group_key": fixture.get("calendar_group_key"),
                        "source_sha256": _fixture_source_hash(fixture, expected),
                        "slug": expected.get("slug"),
                        "title": expected.get("title"),
                        "fixture_kind": "full_calendar",
                    }
                )
            reviewed_manual_records = fixture.get("reviewed_manual_records")
            if isinstance(reviewed_manual_records, list):
                for expected in reviewed_manual_records:
                    if not isinstance(expected, dict):
                        continue
                    rows.append(
                        {
                            "path": str(path),
                            "calendar_group_key": fixture.get("calendar_group_key"),
                            "source_sha256": _fixture_source_hash(fixture, expected),
                            "slug": expected.get("slug"),
                            "title": expected.get("title"),
                            "fixture_kind": "full_calendar",
                        }
                    )
        else:
            expected = fixture.get("expected", {})
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "fixture_kind": "single_record",
                }
            )
    return rows


def _fixture_quarantine_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        expected_records = fixture.get("expected_quarantine_records")
        if not isinstance(expected_records, list):
            continue
        for expected in expected_records:
            if not isinstance(expected, dict):
                continue
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "fixture_kind": "expected_quarantine",
                }
            )
    return rows


def _fixture_unextractable_rows(fixtures_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return rows

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = json.loads(path.read_text())
        expected_records = fixture.get("expected_unextractable_records")
        if not isinstance(expected_records, list):
            continue
        for expected in expected_records:
            if not isinstance(expected, dict):
                continue
            rows.append(
                {
                    "path": str(path),
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "source_sha256": _fixture_source_hash(fixture, expected),
                    "slug": expected.get("slug"),
                    "title": expected.get("title"),
                    "reason": expected.get("reason"),
                    "fixture_kind": "expected_unextractable",
                }
            )
    return rows


def _gold_rows(gold_path: Path) -> list[dict[str, Any]]:
    data = _read_json(gold_path, [])
    return data if isinstance(data, list) else []


def _legacy_counts(ingest_path: Path) -> Counter[str]:
    data = _read_json(ingest_path, {})
    counts: Counter[str] = Counter()
    for activity in data.get("activities", []) if isinstance(data, dict) else []:
        group = activity.get("calendar_group_key")
        if group:
            counts[str(group)] += 1
    return counts


def _claims_for(row: dict[str, Any]) -> list[dict[str, Any]]:
    claims = row.get("claims") or []
    if isinstance(claims, dict):
        return [
            {"kind": kind, **claim}
            for kind, claim in claims.items()
            if isinstance(claim, dict)
        ]
    return [claim for claim in claims if isinstance(claim, dict)]


def _format_group_counts(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}={counts['gold']}<{counts['legacy']}"
        for group, counts in sorted(group_counts.items())
    )


def _format_required_group_counts(group_counts: dict[str, dict[str, Any]]) -> str:
    return ",".join(
        f"{group}={counts['gold']}<{counts['required']}({counts['basis']})"
        for group, counts in sorted(group_counts.items())
    )


def _format_legacy_overcount_groups(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}=legacy:{counts['legacy']}>fixture:{counts['fixture']}"
        for group, counts in sorted(group_counts.items())
    )


def _format_legacy_undercount_groups(group_counts: dict[str, dict[str, int]]) -> str:
    return ",".join(
        f"{group}=legacy:{counts['legacy']}<fixture:{counts['fixture']}"
        for group, counts in sorted(group_counts.items())
    )


def _gold_row_errors(row: dict[str, Any], index: int) -> list[str]:
    prefix = f"gold_row:{index}:{row.get('calendar_group_key', '<missing-group>')}/{row.get('canonical_slug', '<missing-slug>')}"
    errors: list[str] = []

    if not row.get("calendar_group_key"):
        errors.append(f"{prefix}:missing_group")
    if not row.get("canonical_slug"):
        errors.append(f"{prefix}:missing_slug")
    if not row.get("source_sha256") and not (row.get("source") or {}).get("documentHash"):
        errors.append(f"{prefix}:missing_source_hash")
    if not row.get("source_url") and not (row.get("source") or {}).get("url"):
        errors.append(f"{prefix}:missing_source_url")

    provenance = row.get("field_provenance") or {}
    for field_name in ("title", "schedule", "location"):
        spans = provenance.get(field_name)
        if not isinstance(spans, list) or not spans:
            errors.append(f"{prefix}:missing_{field_name}_provenance")
    if row.get("description"):
        spans = provenance.get("description")
        if not isinstance(spans, list) or not spans:
            errors.append(f"{prefix}:missing_description_provenance")

    for claim in _claims_for(row):
        value = str(claim.get("value", "")).strip().lower()
        if value and value not in {"unknown", "not_applicable"} and not claim.get("evidence"):
            errors.append(f"{prefix}:claim_without_evidence:{claim.get('kind', 'claim')}")

    return errors


def build_coverage_audit(
    *,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    gold_path: Path = DEFAULT_GOLD_PATH,
    ingest_path: Path = DEFAULT_INGEST_PATH,
    require_production_ready: bool = False,
    expected_ui_mode: str = "gold-v2",
) -> CoverageAudit:
    errors: list[str] = []
    warnings: list[str] = []
    pdf_sources = _pdf_sources()
    fixtures = _fixture_rows(fixtures_dir)
    fixture_quarantines = _fixture_quarantine_rows(fixtures_dir)
    fixture_unextractables = _fixture_unextractable_rows(fixtures_dir)
    gold = _gold_rows(gold_path)
    legacy_counts = _legacy_counts(ingest_path)

    pdf_groups = {source["calendar_group_key"] for source in pdf_sources}
    cached_groups = {source["calendar_group_key"] for source in pdf_sources if source["cached"]}
    fixture_keys = {
        (row["calendar_group_key"], row["slug"], row["source_sha256"])
        for row in fixtures
    }
    fixture_groups = {row["calendar_group_key"] for row in fixtures}
    full_fixture_groups = {
        row["calendar_group_key"]
        for row in fixtures
        if row.get("fixture_kind") == "full_calendar"
    }
    fixture_counts_by_group = Counter(
        str(group)
        for group, _, _ in fixture_keys
        if group
    )
    gold_keys = {
        (
            row.get("calendar_group_key"),
            row.get("canonical_slug"),
            row.get("source_sha256") or (row.get("source") or {}).get("documentHash"),
        )
        for row in gold
    }
    gold_groups = {row.get("calendar_group_key") for row in gold if row.get("calendar_group_key")}
    gold_counts = Counter(str(row.get("calendar_group_key")) for row in gold if row.get("calendar_group_key"))
    legacy_total = sum(legacy_counts.values())
    coverage_requirements: dict[str, dict[str, Any]] = {}
    legacy_overcount_groups: dict[str, dict[str, int]] = {}
    legacy_undercount_groups: dict[str, dict[str, int]] = {}
    for group in sorted(set(legacy_counts) | fixture_groups):
        legacy_count = legacy_counts.get(group, 0)
        fixture_count = fixture_counts_by_group.get(group, 0)
        if group in full_fixture_groups and fixture_count:
            coverage_requirements[group] = {
                "required": fixture_count,
                "basis": "fixture",
            }
            if legacy_count > fixture_count and gold_counts.get(group, 0) >= fixture_count:
                legacy_overcount_groups[group] = {
                    "gold": gold_counts.get(group, 0),
                    "fixture": fixture_count,
                    "legacy": legacy_count,
                }
            if legacy_count < fixture_count and gold_counts.get(group, 0) >= fixture_count:
                legacy_undercount_groups[group] = {
                    "gold": gold_counts.get(group, 0),
                    "fixture": fixture_count,
                    "legacy": legacy_count,
                }
        elif legacy_count:
            coverage_requirements[group] = {
                "required": legacy_count,
                "basis": "legacy",
            }
    coverage_required_count = sum(
        int(requirement["required"])
        for requirement in coverage_requirements.values()
    )
    undercovered_gold_groups = {
        group: {
            "gold": gold_counts.get(group, 0),
            "required": int(requirement["required"]),
            "basis": str(requirement["basis"]),
        }
        for group, requirement in sorted(coverage_requirements.items())
        if gold_counts.get(group, 0) < int(requirement["required"])
    }

    missing_cached_groups = sorted(pdf_groups - cached_groups)
    missing_fixture_groups = sorted(pdf_groups - fixture_groups)
    missing_gold_groups = sorted(pdf_groups - gold_groups)
    missing_gold_fixture_keys = sorted(fixture_keys - gold_keys)

    if missing_cached_groups:
        errors.append(f"bronze:missing_cached_pdfs:{','.join(missing_cached_groups)}")

    if missing_gold_fixture_keys:
        errors.append(
            "gold:missing_fixture_records:"
            + ",".join(f"{group}/{slug}" for group, slug, _ in missing_gold_fixture_keys)
        )

    for index, row in enumerate(gold):
        errors.extend(_gold_row_errors(row, index))

    if missing_fixture_groups:
        warnings.append(f"coverage:missing_fixture_groups:{len(missing_fixture_groups)}")
    if missing_gold_groups:
        warnings.append(f"coverage:missing_gold_groups:{len(missing_gold_groups)}")
    if coverage_required_count and len(gold) < coverage_required_count:
        warnings.append(f"coverage:gold_rows_below_required_count:{len(gold)}<{coverage_required_count}")
    if undercovered_gold_groups:
        warnings.append(
            "coverage:gold_rows_below_required_by_group:"
            + _format_required_group_counts(undercovered_gold_groups)
        )
    if legacy_overcount_groups:
        warnings.append(
            "coverage:legacy_overcount_groups:"
            + _format_legacy_overcount_groups(legacy_overcount_groups)
        )
    if legacy_undercount_groups:
        warnings.append(
            "coverage:legacy_undercount_groups:"
            + _format_legacy_undercount_groups(legacy_undercount_groups)
        )
    if fixture_quarantines:
        warnings.append(f"coverage:fixture_quarantine_records:{len(fixture_quarantines)}")
    if fixture_unextractables:
        warnings.append(f"coverage:fixture_unextractable_records:{len(fixture_unextractables)}")

    ui_mode = os.environ.get("ACTIVITY_DATA_PIPELINE") or os.environ.get(
        "NEXT_PUBLIC_ACTIVITY_DATA_PIPELINE", "gold-v2"
    )
    production_ready = (
        not errors
        and not fixture_quarantines
        and not fixture_unextractables
        and not missing_fixture_groups
        and not missing_gold_groups
        and (not coverage_required_count or len(gold) >= coverage_required_count)
        and not undercovered_gold_groups
        and ui_mode == expected_ui_mode
    )

    if require_production_ready:
        if missing_fixture_groups:
            errors.append(f"coverage:missing_fixture_groups:{','.join(missing_fixture_groups)}")
        if missing_gold_groups:
            errors.append(f"coverage:missing_gold_groups:{','.join(missing_gold_groups)}")
        if coverage_required_count and len(gold) < coverage_required_count:
            errors.append(f"coverage:gold_rows_below_required_count:{len(gold)}<{coverage_required_count}")
        if undercovered_gold_groups:
            errors.append(
                "coverage:gold_rows_below_required_by_group:"
                + _format_required_group_counts(undercovered_gold_groups)
            )
        if fixture_quarantines:
            errors.append(f"coverage:fixture_quarantine_records:{len(fixture_quarantines)}")
        if fixture_unextractables:
            errors.append(f"coverage:fixture_unextractable_records:{len(fixture_unextractables)}")
        if ui_mode != expected_ui_mode:
            errors.append(f"coverage:ui_pipeline_not_{expected_ui_mode}:{ui_mode}")

    summary = {
        "pdf_source_count": len(pdf_sources),
        "cached_pdf_count": len(cached_groups),
        "fixture_count": len(fixtures),
        "fixture_quarantine_count": len(fixture_quarantines),
        "fixture_unextractable_count": len(fixture_unextractables),
        "fixture_group_count": len(fixture_groups),
        "gold_record_count": len(gold),
        "gold_group_count": len(gold_groups),
        "legacy_activity_count": legacy_total,
        "coverage_required_count": coverage_required_count,
        "ui_pipeline": ui_mode,
        "production_ready": production_ready,
        "missing_cached_groups": missing_cached_groups,
        "missing_fixture_groups": missing_fixture_groups,
        "missing_gold_groups": missing_gold_groups,
        "undercovered_gold_groups": undercovered_gold_groups,
        "legacy_overcount_groups": legacy_overcount_groups,
        "legacy_undercount_groups": legacy_undercount_groups,
        "coverage_requirements_by_group": coverage_requirements,
        "legacy_counts_by_group": dict(sorted(legacy_counts.items())),
        "gold_counts_by_group": dict(sorted(gold_counts.items())),
    }
    return CoverageAudit(summary=summary, errors=errors, warnings=warnings)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit v2 source-to-Gold coverage")
    parser.add_argument("--fixtures-dir", type=Path, default=DEFAULT_FIXTURES_DIR)
    parser.add_argument("--gold-path", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--ingest-path", type=Path, default=DEFAULT_INGEST_PATH)
    parser.add_argument("--require-production-ready", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print machine-readable audit JSON")
    args = parser.parse_args()

    audit = build_coverage_audit(
        fixtures_dir=args.fixtures_dir,
        gold_path=args.gold_path,
        ingest_path=args.ingest_path,
        require_production_ready=args.require_production_ready,
    )

    payload = {
        "passed": audit.passed,
        "summary": audit.summary,
        "warnings": audit.warnings,
        "errors": audit.errors,
    }
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        for warning in audit.warnings:
            print(f"[WARNING] {warning}")
        for error in audit.errors:
            print(f"[ERROR] {error}")
        print(
            "Coverage audit "
            f"{'PASSED' if audit.passed else 'FAILED'} "
            f"({audit.summary['gold_record_count']} Gold rows, "
            f"{audit.summary['fixture_count']} fixtures, "
            f"{audit.summary['pdf_source_count']} PDF sources, "
            f"production_ready={audit.summary['production_ready']})"
        )

    raise SystemExit(0 if audit.passed else 1)


if __name__ == "__main__":
    main()
