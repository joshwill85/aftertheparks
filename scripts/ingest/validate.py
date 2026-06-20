"""Validation gates before publishing activity data."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from config import CONFIDENCE_PUBLISH_THRESHOLD, MOVIE_TITLE_GARBAGE_RATIO, PROCESSED_DIR
from source_manifest import ACTIVITY_SOURCES, ALL_RESORT_SLUGS


@dataclass
class ValidationIssue:
    level: str  # error | warning
    check: str
    detail: str


@dataclass
class ValidationReport:
    passed: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def error(self, check: str, detail: str) -> None:
        self.issues.append(ValidationIssue("error", check, detail))
        self.passed = False

    def warn(self, check: str, detail: str) -> None:
        self.issues.append(ValidationIssue("warning", check, detail))


def movie_title_garbage_ratio(title: str) -> float:
    if not title:
        return 1.0
    non_alpha = len(title) - sum(c.isalpha() for c in title)
    return non_alpha / len(title)


def validate_payload(data: dict, *, prior_counts: dict[str, int] | None = None) -> ValidationReport:
    report = ValidationReport(passed=True)
    prior_counts = prior_counts or {}

    # Manifest coverage
    slugs_in_payload = {s for src in data.get("sources", []) for s in src.get("resort_slugs", [])}
    missing_slugs = ALL_RESORT_SLUGS - slugs_in_payload
    if missing_slugs:
        report.error("manifest_coverage", f"Missing resort slugs: {sorted(missing_slugs)}")

    activities = data.get("activities", [])
    by_group: dict[str, list[dict]] = {}
    for act in activities:
        by_group.setdefault(act["calendar_group_key"], []).append(act)

    for source in ACTIVITY_SOURCES:
        group = source.calendar_group_key
        acts = by_group.get(group, [])

        if group == "fort-wilderness":
            if len(acts) < 10:
                report.error("fort_wilderness_min", f"Fort Wilderness has only {len(acts)} activities")
            continue

        if source.pdf_url and len(acts) == 0:
            report.error("empty_group", f"No activities for {group}")

        prior = prior_counts.get(group)
        if prior and len(acts) > 0:
            delta = abs(len(acts) - prior) / prior
            if delta > 0.30:
                report.warn("activity_count_delta", f"{group}: {len(acts)} vs prior {prior} ({delta:.0%} change)")

        movies = [a for a in acts if a.get("category") == "movies_under_stars"]
        if movies:
            total_movie_nights = sum(len(a.get("movie_nights") or []) for a in movies)
            if total_movie_nights == 0 and group not in ("fort-wilderness",):
                report.error("movie_nights_empty", f"{group} has movies_under_stars but 0 movie night rows")

        for act in acts:
            conf = act.get("confidence", 1.0)
            if conf < CONFIDENCE_PUBLISH_THRESHOLD:
                report.warn("low_confidence", f"{group}/{act['normalized_name']}: confidence {conf}")

            for movie in act.get("movie_nights") or []:
                title = movie.get("movie_title", "")
                if movie_title_garbage_ratio(title) > MOVIE_TITLE_GARBAGE_RATIO:
                    report.warn("ocr_garbage_movie", f"{group}: '{title[:50]}'")

    return report


def load_prior_counts() -> dict[str, int]:
    path = PROCESSED_DIR / "activities_ingest.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    counts: dict[str, int] = {}
    for src in data.get("sources", []):
        counts[src["calendar_group_key"]] = src.get("activity_count", 0)
    return counts


def main() -> None:
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Validate activity ingest payload")
    parser.add_argument("--input", type=Path, default=PROCESSED_DIR / "activities_ingest.json")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    args = parser.parse_args()

    data = json.loads(args.input.read_text())
    report = validate_payload(data, prior_counts=load_prior_counts())

    out = {
        "passed": report.passed,
        "issues": [{"level": i.level, "check": i.check, "detail": i.detail} for i in report.issues],
    }
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    (PROCESSED_DIR / "validation_report.json").write_text(json.dumps(out, indent=2))

    for issue in report.issues:
        print(f"[{issue.level.upper()}] {issue.check}: {issue.detail}")

    if args.strict:
        warnings = [i for i in report.issues if i.level == "warning"]
        if warnings:
            report.passed = False

    print(f"Validation {'PASSED' if report.passed else 'FAILED'} ({len(report.issues)} issues)")
    sys.exit(0 if report.passed else 1)


if __name__ == "__main__":
    main()
