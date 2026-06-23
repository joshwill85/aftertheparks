"""Operator-facing source-to-UI trust report."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    from audit_coverage import DEFAULT_FIXTURES_DIR, build_coverage_audit
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .audit_coverage import DEFAULT_FIXTURES_DIR, build_coverage_audit
    from .config import PROCESSED_DIR


DEFAULT_OFFICIAL_OFFERINGS_PATH = PROCESSED_DIR / "official_recreation_offerings.json"


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _title_case_group(group: str) -> str:
    overrides = {
        "fort-wilderness": "Fort Wilderness",
        "port-orleans-french-quarter": "Port Orleans French Quarter",
        "port-orleans-riverside": "Port Orleans Riverside",
        "old-key-west": "Old Key West",
        "art-of-animation": "Art of Animation",
    }
    if group in overrides:
        return overrides[group]
    return " ".join(part.capitalize() for part in group.split("-"))


def _fixture_records(fixtures_dir: Path, field_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not fixtures_dir.exists():
        return records

    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = _read_json(path, {})
        expected_records = fixture.get(field_name)
        if not isinstance(expected_records, list):
            continue
        for expected in expected_records:
            if not isinstance(expected, dict):
                continue
            records.append(
                {
                    "calendar_group_key": fixture.get("calendar_group_key"),
                    "fixture": path.name,
                    "source_kind": fixture.get("source_kind", "pdf"),
                    "slug": expected.get("slug"),
                    "title": expected.get("title") or expected.get("canonical_title"),
                    "warnings": expected.get("expected_warnings")
                    or expected.get("warnings")
                    or [],
                    "reason": expected.get("reason"),
                }
            )
    return records


def _group_counts(records: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[str(record.get("calendar_group_key") or "<missing-group>")].append(record)

    return {
        group: {
            "record_count": len(group_records),
            "unique_record_count": len(
                {
                    (record.get("calendar_group_key"), record.get("slug"))
                    for record in group_records
                }
            ),
        }
        for group, group_records in sorted(grouped.items())
    }


def _warning_counts(records: list[dict[str, Any]]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for record in records:
        for warning in record.get("warnings") or []:
            counts[str(warning)] += 1
        if record.get("reason"):
            counts[str(record["reason"])] += 1
    return dict(sorted(counts.items()))


def _unique_count(records: list[dict[str, Any]]) -> int:
    return len(
        {
            (record.get("calendar_group_key"), record.get("slug"))
            for record in records
        }
    )


def _official_recreation_summary(path: Path) -> dict[str, Any]:
    data = _read_json(path, {})
    if not isinstance(data, dict):
        data = {}
    quarantine = data.get("quarantine") if isinstance(data.get("quarantine"), list) else []
    offerings = data.get("offerings") if isinstance(data.get("offerings"), list) else []
    programs = data.get("programs") if isinstance(data.get("programs"), list) else []
    return {
        "program_count": len(programs),
        "offering_count": len(offerings),
        "quarantine_count": len(quarantine),
        "quarantine": quarantine,
    }


def build_trust_report(
    *,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    official_offerings_path: Path = DEFAULT_OFFICIAL_OFFERINGS_PATH,
) -> dict[str, Any]:
    coverage_audit = build_coverage_audit(fixtures_dir=fixtures_dir)
    coverage = dict(coverage_audit.summary)
    fixture_quarantines = _fixture_records(fixtures_dir, "expected_quarantine_records")
    fixture_unextractables = _fixture_records(fixtures_dir, "expected_unextractable_records")
    official_recreation = _official_recreation_summary(official_offerings_path)

    blockers: list[dict[str, Any]] = []
    blocking_count = int(coverage.get("blocking_fixture_quarantine_count", len(fixture_quarantines)))
    blocking_unique = int(
        coverage.get("blocking_fixture_quarantine_unique_count", _unique_count(fixture_quarantines))
    )
    if blocking_count:
        blockers.append(
            {
                "code": "fixture_quarantine_records",
                "severity": "blocker",
                "count": blocking_count,
                "unique_count": blocking_unique,
            }
        )
    if official_recreation["quarantine_count"]:
        blockers.append(
            {
                "code": "official_recreation_quarantine",
                "severity": "blocker",
                "count": official_recreation["quarantine_count"],
            }
        )
    if coverage_audit.errors:
        blockers.append(
            {
                "code": "coverage_errors",
                "severity": "blocker",
                "count": len(coverage_audit.errors),
            }
        )
    if coverage.get("ui_pipeline") != "gold-v2":
        blockers.append(
            {
                "code": "ui_pipeline_not_gold_v2",
                "severity": "blocker",
                "current": coverage.get("ui_pipeline"),
            }
        )

    status = "ready" if coverage.get("production_ready") and not blockers else "blocked"
    return {
        "status": status,
        "coverage": {
            **coverage,
            "warnings": coverage_audit.warnings,
            "errors": coverage_audit.errors,
        },
        "blockers": blockers,
        "fixture_quarantine": {
            "record_count": len(fixture_quarantines),
            "unique_record_count": _unique_count(fixture_quarantines),
            "official_offering_covered_record_count": int(
                coverage.get("official_offering_covered_quarantine_count", 0)
            ),
            "official_offering_covered_unique_record_count": int(
                coverage.get("official_offering_covered_quarantine_unique_count", 0)
            ),
            "official_offering_alias_covered_record_count": int(
                coverage.get("official_offering_alias_covered_quarantine_count", 0)
            ),
            "official_offering_alias_covered_unique_record_count": int(
                coverage.get("official_offering_alias_covered_quarantine_unique_count", 0)
            ),
            "blocking_record_count": int(
                coverage.get("blocking_fixture_quarantine_count", len(fixture_quarantines))
            ),
            "blocking_unique_record_count": int(
                coverage.get("blocking_fixture_quarantine_unique_count", _unique_count(fixture_quarantines))
            ),
            "by_group": _group_counts(fixture_quarantines),
            "by_warning": _warning_counts(fixture_quarantines),
            "records": fixture_quarantines,
        },
        "fixture_unextractable": {
            "record_count": len(fixture_unextractables),
            "unique_record_count": _unique_count(fixture_unextractables),
            "by_group": _group_counts(fixture_unextractables),
            "by_warning": _warning_counts(fixture_unextractables),
            "records": fixture_unextractables,
        },
        "official_recreation": official_recreation,
    }


def render_markdown_report(report: dict[str, Any]) -> str:
    coverage = report["coverage"]
    quarantine = report["fixture_quarantine"]
    unextractable = report["fixture_unextractable"]
    official = report["official_recreation"]
    lines = [
        "# Source-To-UI Trust Report",
        "",
        f"Production cutover: {report['status']}",
        "",
        "## Current Counts",
        "",
        f"- Gold v2 records: {coverage['gold_record_count']}",
        f"- Fixture records: {coverage['fixture_count']}",
        f"- Coverage-required records: {coverage['coverage_required_count']}",
        f"- UI pipeline mode: {coverage['ui_pipeline']}",
        (
            f"- Official recreation: {official['program_count']} programs, "
            f"{official['offering_count']} resort offerings, "
            f"{official['quarantine_count']} quarantine records"
        ),
        (
            f"- Fixture quarantine: {quarantine['record_count']} fixture quarantine records "
            f"({quarantine['unique_record_count']} unique records; "
            f"{quarantine['blocking_record_count']} blocking; "
            f"{quarantine['official_offering_covered_record_count']} covered by official offerings; "
            f"{quarantine['official_offering_alias_covered_record_count']} alias-covered)"
        ),
        (
            f"- Explicit non-publishable source-visible records: "
            f"{unextractable['record_count']} records "
            f"({unextractable['unique_record_count']} unique)"
        ),
        "",
        "## Blockers",
        "",
    ]

    if report["blockers"]:
        for blocker in report["blockers"]:
            count = blocker.get("count")
            unique = blocker.get("unique_count")
            suffix = ""
            if count is not None and unique is not None:
                suffix = f": {count} records, {unique} unique"
            elif count is not None:
                suffix = f": {count}"
            elif blocker.get("current") is not None:
                suffix = f": current={blocker['current']}"
            lines.append(f"- {blocker['code']}{suffix}")
    else:
        lines.append("- None")

    lines.extend(["", "## Quarantine By Group", "", "| Group | Records | Unique |", "| --- | ---: | ---: |"])
    for group, counts in quarantine["by_group"].items():
        lines.append(
            f"| {_title_case_group(group)} | {counts['record_count']} | {counts['unique_record_count']} |"
        )

    lines.extend(["", "## Quarantine Reasons", "", "| Reason | Records |", "| --- | ---: |"])
    for warning, count in quarantine["by_warning"].items():
        lines.append(f"| `{warning}` | {count} |")

    if unextractable["record_count"]:
        lines.extend(
            [
                "",
                "## Explicit Non-Publishable Records",
                "",
                "| Group | Records | Unique |",
                "| --- | ---: | ---: |",
            ]
        )
        for group, counts in unextractable["by_group"].items():
            lines.append(
                f"| {_title_case_group(group)} | {counts['record_count']} | {counts['unique_record_count']} |"
            )

    lines.extend(["", "## Next Actions", ""])
    if quarantine["record_count"]:
        lines.append(
            "- Resolve fixture quarantine records with better extraction, reviewed manual spans, "
            "authoritative detail sources, or explicit non-public decisions."
        )
    if official["quarantine_count"]:
        lines.append("- Resolve official recreation ingest quarantine before publishing official offerings.")
    if coverage.get("ui_pipeline") != "gold-v2":
        lines.append("- Keep public UI off Gold v2 cutover until quarantine blockers are resolved.")
    if not lines[-1].startswith("- "):
        lines.append("- No cutover blockers remain in the current report.")

    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a source-to-UI trust report")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument("--output", type=Path, help="Write the report to this path")
    args = parser.parse_args()

    report = build_trust_report()
    text = json.dumps(report, indent=2, ensure_ascii=False) if args.json else render_markdown_report(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
