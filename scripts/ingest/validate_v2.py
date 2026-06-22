"""Strict v2 validation gates for source-backed activity data."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable
import copy
import json

try:
    from contracts import ValidationResult, validate_golden_fixture
    from extract_v2 import (
        compare_candidates_to_fixture,
        expected_quarantine_slugs_for_fixture,
        extract_candidates_for_fixture,
    )
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .contracts import ValidationResult, validate_golden_fixture
    from .extract_v2 import (
        compare_candidates_to_fixture,
        expected_quarantine_slugs_for_fixture,
        extract_candidates_for_fixture,
    )


def validate_fixture_paths(paths: Iterable[Path]) -> ValidationResult:
    report = ValidationResult()
    paths = list(paths)
    if not paths:
        report.error("fixtures:missing")
        return report

    for path in paths:
        result = validate_golden_fixture(path)
        for error in result.errors:
            report.error(f"{path}:{error}")
        report.warnings.extend(f"{path}:{warning}" for warning in result.warnings)
    return report


def validate_fixture_extractions(
    paths: Iterable[Path],
    *,
    overrides: dict[str, object] | None = None,
) -> ValidationResult:
    report = ValidationResult()
    paths = list(paths)
    if not paths:
        report.error("fixtures:missing")
        return report

    for path in paths:
        fixture_result = validate_golden_fixture(path)
        for error in fixture_result.errors:
            report.error(f"{path}:{error}")
        if not fixture_result.publishable:
            continue

        fixture = json.loads(path.read_text())
        if overrides:
            fixture = copy.deepcopy(fixture)
            fixture["expected"].update(overrides)
        candidates = extract_candidates_for_fixture(path)
        if not candidates:
            report.error(f"{path}:candidate_missing")
            continue
        expected_quarantine_slugs = expected_quarantine_slugs_for_fixture(fixture)
        for error in compare_candidates_to_fixture(candidates, fixture):
            report.error(f"{path}:{error}")
        for candidate in candidates:
            slug = candidate["normalized_fields"].get("slug", "<missing-slug>")
            if slug in expected_quarantine_slugs:
                continue
            for warning in candidate.get("warnings", []):
                report.error(f"{path}:{slug}:candidate_warning:{warning}")
    return report


def fixture_paths(fixtures_dir: Path) -> list[Path]:
    if not fixtures_dir.exists():
        return []
    return sorted(fixtures_dir.glob("*.json"))


def main() -> None:
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Validate v2 ingest contracts")
    parser.add_argument(
        "--fixtures-dir",
        type=Path,
        default=Path("data/golden/activities"),
    )
    parser.add_argument(
        "--skip-extraction",
        action="store_true",
        help="Only validate fixture schema/hash, not extractor output",
    )
    parser.add_argument(
        "--override-title",
        help="Testing hook: intentionally override expected title to verify drift failures",
    )
    args = parser.parse_args()

    paths = fixture_paths(args.fixtures_dir)
    overrides = {"title": args.override_title} if args.override_title else None
    report = (
        validate_fixture_paths(paths)
        if args.skip_extraction
        else validate_fixture_extractions(paths, overrides=overrides)
    )

    for error in report.errors:
        print(f"[ERROR] {error}")
    for warning in report.warnings:
        print(f"[WARNING] {warning}")
    print(
        f"V2 validation {'PASSED' if report.publishable else 'FAILED'} "
        f"({len(paths)} fixtures, {len(report.errors)} errors)"
    )
    sys.exit(0 if report.publishable else 1)


if __name__ == "__main__":
    main()
