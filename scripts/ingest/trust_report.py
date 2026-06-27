"""Operator-facing source-to-UI trust report."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    from audit_coverage import DEFAULT_FIXTURES_DIR, build_coverage_audit, build_manual_review_report
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .audit_coverage import DEFAULT_FIXTURES_DIR, build_coverage_audit, build_manual_review_report
    from .config import PROCESSED_DIR


DEFAULT_OFFICIAL_OFFERINGS_PATH = PROCESSED_DIR / "official_recreation_offerings.json"
DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_SOURCE_INVENTORY_PATH = PROCESSED_DIR / "source_inventory.json"
DEFAULT_SOURCE_FRESHNESS_PATH = PROCESSED_DIR / "source_freshness_report.json"
DEFAULT_VISUAL_AUDIT_PATH = PROCESSED_DIR / "pdf_visual_audit_report.json"
DEFAULT_FIELD_AUDIT_PATH = PROCESSED_DIR / "field_audit_report.json"
DEFAULT_JOGGING_AUDIT_PATH = PROCESSED_DIR / "jogging_trail_audit_report.json"
DEFAULT_PUBLICATION_PARITY_PATH = PROCESSED_DIR / "publication_parity_report.json"
DEFAULT_SOURCE_TRUST_SUMMARY_PATH = PROCESSED_DIR / "source_trust_summary.json"
DEFAULT_MONITORING_REPORT_PATH = PROCESSED_DIR / "source_trust_monitoring_report.json"
DEFAULT_PARENT_CLASSIFICATION_PATH = Path("data/quality/official_recreation_parent_classification.json")


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


def _escape_table_cell(value: Any) -> str:
    text = str(value or "").replace("\n", " ").strip()
    return text.replace("|", "\\|")


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


def _gold_source_summary(path: Path) -> dict[str, Any]:
    rows = _read_json(path, [])
    if not isinstance(rows, list):
        rows = []

    legend_rows = 0
    legend_count = 0
    kinds: Counter[str] = Counter()
    price_states: Counter[str] = Counter()
    field_confidence: Counter[str] = Counter()
    for row in rows:
        if not isinstance(row, dict):
            continue
        price = row.get("price") if isinstance(row.get("price"), dict) else {}
        price_states[str(price.get("state") or "unknown")] += 1
        provenance = row.get("field_provenance") if isinstance(row.get("field_provenance"), dict) else {}
        for field_name in ("title", "schedule", "location", "description", "price"):
            spans = provenance.get(field_name)
            if isinstance(spans, list) and spans:
                field_confidence["high"] += 1
            elif field_name != "description" or row.get("description"):
                field_confidence["unknown"] += 1
        source = row.get("source") if isinstance(row.get("source"), dict) else {}
        legends = source.get("documentKeyLegends") if isinstance(source, dict) else None
        if not isinstance(legends, list) or not legends:
            continue
        legend_rows += 1
        legend_count += len(legends)
        for legend in legends:
            if isinstance(legend, dict):
                kinds[str(legend.get("kind") or "unknown")] += 1

    return {
        "gold_record_count": len(rows),
        "rows_with_document_key_legends": legend_rows,
        "document_key_legend_count": legend_count,
        "document_key_legend_kinds": dict(sorted(kinds.items())),
        "price_state_counts": dict(sorted(price_states.items())),
        "field_confidence_counts": dict(sorted(field_confidence.items())),
    }


def _source_inventory_summary(path: Path) -> dict[str, Any]:
    rows = _read_json(path, [])
    if not isinstance(rows, list):
        rows = []
    by_role = Counter(str(row.get("source_role") or "unknown") for row in rows if isinstance(row, dict))
    by_kind = Counter(str(row.get("source_kind") or "unknown") for row in rows if isinstance(row, dict))
    return {
        "source_count": len(rows),
        "by_role": dict(sorted(by_role.items())),
        "by_kind": dict(sorted(by_kind.items())),
    }


def _source_freshness_summary(path: Path) -> dict[str, Any]:
    report = _read_json(path, {})
    if not isinstance(report, dict):
        return {"passed": False, "summary": {}, "errors": ["source_freshness_report_invalid"]}
    return {
        "passed": bool(report.get("passed")),
        "summary": report.get("summary") if isinstance(report.get("summary"), dict) else {},
        "errors": report.get("errors") if isinstance(report.get("errors"), list) else [],
        "warnings": report.get("warnings") if isinstance(report.get("warnings"), list) else [],
    }


def _classification_summary(path: Path) -> dict[str, Any]:
    payload = _read_json(path, {})
    items = payload.get("items") if isinstance(payload, dict) else []
    if not isinstance(items, list):
        items = []
    counts = Counter(str(item.get("classification") or "unknown") for item in items if isinstance(item, dict))
    return {
        "source_url": payload.get("source_url") if isinstance(payload, dict) else None,
        "item_count": len(items),
        "classification_counts": dict(sorted(counts.items())),
    }


def _status_report(path: Path, missing_code: str) -> dict[str, Any]:
    report = _read_json(path, None)
    if not isinstance(report, dict):
        return {"passed": False, "summary": {}, "errors": [missing_code]}
    return {
        "passed": bool(report.get("passed")),
        "summary": report.get("summary") if isinstance(report.get("summary"), dict) else {},
        "errors": report.get("errors") if isinstance(report.get("errors"), list) else [],
        "warnings": report.get("warnings") if isinstance(report.get("warnings"), list) else [],
    }


def _source_trust_summary(report: dict[str, Any]) -> dict[str, Any]:
    blockers = report.get("blockers") if isinstance(report.get("blockers"), list) else []
    warnings = report["coverage"].get("warnings", [])
    visual_summary = report["coverage"].get("visual_audit_summary", {})
    independent_visual_status = "low"
    visual_report = _read_json(DEFAULT_VISUAL_AUDIT_PATH, {})
    visual_warnings = visual_report.get("warnings") if isinstance(visual_report, dict) else []
    if (
        isinstance(visual_summary, dict)
        and visual_summary.get("independent_visual_ocr_coverage") == "high"
    ):
        independent_visual_status = "high"
    if (
        isinstance(visual_summary, dict)
        and visual_summary.get("independent_gpt_visual_review_not_run")
    ) or (
        isinstance(visual_warnings, list)
        and "independent_gpt_visual_review_not_run" in visual_warnings
    ):
        independent_visual_status = "low"
    freshness_summary = report["source_freshness"].get("summary", {})
    freshness_high = (
        bool(report["source_freshness"].get("passed"))
        and isinstance(freshness_summary, dict)
        and int(freshness_summary.get("unknown") or 0) == 0
        and int(freshness_summary.get("unchecked") or 0) == 0
    )
    overall_status = "pass" if not blockers else "blocked"
    return {
        "generated_at": report.get("generated_at"),
        "overall_status": overall_status,
        "confidence": {
            "current_gold_price_labels": "high" if not blockers else "medium",
            "current_pdf_freshness": "high" if freshness_high else "low",
            "official_recreation_joinable_coverage": "high" if report["official_recreation"]["quarantine_count"] == 0 else "medium",
            "independent_visual_ocr_coverage": independent_visual_status,
            "all_parent_item_classification": "high" if report["official_parent_classification"]["item_count"] else "low",
        },
        "counts": {
            "source_inventory": report["source_inventory"],
            "source_freshness": report["source_freshness"].get("summary", {}),
            "gold_source": report["gold_source"],
            "manual_review": report["manual_review"].get("summary", {}),
            "official_recreation": {
                "program_count": report["official_recreation"]["program_count"],
                "offering_count": report["official_recreation"]["offering_count"],
                "quarantine_count": report["official_recreation"]["quarantine_count"],
            },
            "official_parent_classification": report["official_parent_classification"],
            "jogging_trails": report["jogging_trails"].get("summary", {}),
            "publication_parity": {
                "passed": report["publication_parity"].get("passed"),
                "gold": report["publication_parity"].get("gold", {}).get("summary", {}),
                "official_offerings": report["publication_parity"].get("official_offerings", {}).get("summary", {}),
            },
        },
        "blockers": blockers,
        "warnings": warnings,
        "next_actions": report.get("next_actions", []),
    }


def _monitoring_report(report: dict[str, Any]) -> dict[str, Any]:
    freshness = report.get("source_freshness", {})
    freshness_errors = freshness.get("errors") if isinstance(freshness, dict) else []
    changed_sources = [
        error
        for error in (freshness_errors if isinstance(freshness_errors, list) else [])
        if any(state in str(error) for state in ("url_changed", "hash_changed", "missing_from_parent", "unreachable"))
    ]
    affected_rows = report.get("blockers", [])
    if changed_sources or affected_rows:
        action = "withhold_publish" if changed_sources else "manual_review"
        status = "blocked" if changed_sources else "attention"
    else:
        action = "none"
        status = "pass"
    return {
        "status": status,
        "changed_sources": changed_sources,
        "affected_rows": affected_rows,
        "recommended_action": action,
    }


def build_trust_report(
    *,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    official_offerings_path: Path = DEFAULT_OFFICIAL_OFFERINGS_PATH,
    gold_path: Path = DEFAULT_GOLD_PATH,
) -> dict[str, Any]:
    coverage_audit = build_coverage_audit(fixtures_dir=fixtures_dir)
    coverage = dict(coverage_audit.summary)
    fixture_quarantines = _fixture_records(fixtures_dir, "expected_quarantine_records")
    fixture_unextractables = _fixture_records(fixtures_dir, "expected_unextractable_records")
    official_recreation = _official_recreation_summary(official_offerings_path)
    gold_source = _gold_source_summary(gold_path)
    source_inventory = _source_inventory_summary(DEFAULT_SOURCE_INVENTORY_PATH)
    source_freshness = _source_freshness_summary(DEFAULT_SOURCE_FRESHNESS_PATH)
    manual_review = build_manual_review_report(fixtures_dir)
    official_parent_classification = _classification_summary(DEFAULT_PARENT_CLASSIFICATION_PATH)
    jogging_trails = _status_report(DEFAULT_JOGGING_AUDIT_PATH, "jogging_trail_audit_report_missing")
    publication_parity = _read_json(DEFAULT_PUBLICATION_PARITY_PATH, {})
    if not isinstance(publication_parity, dict):
        publication_parity = {"passed": False, "errors": ["publication_parity_report_invalid"]}

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
    stale_fixture_groups = coverage.get("stale_fixture_groups")
    if isinstance(stale_fixture_groups, dict) and stale_fixture_groups:
        blockers.append(
            {
                "code": "stale_fixture_sources",
                "severity": "blocker",
                "count": len(stale_fixture_groups),
                "groups": sorted(stale_fixture_groups),
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
    visual_summary = coverage.get("visual_audit_summary")
    if (
        not isinstance(visual_summary, dict)
        or visual_summary.get("independent_visual_ocr_coverage") != "high"
    ):
        blockers.append(
            {
                "code": "independent_visual_ocr_coverage_not_high",
                "severity": "blocker",
                "current": (visual_summary or {}).get("independent_visual_ocr_coverage")
                if isinstance(visual_summary, dict)
                else "missing",
            }
        )

    status = "ready" if coverage.get("production_ready") and not blockers else "blocked"
    next_actions: list[str] = []
    if source_freshness.get("errors"):
        next_actions.append("Refresh changed sources before publishing.")
    if manual_review.get("summary", {}).get("manual_review_error_count"):
        next_actions.append("Complete missing manual review source evidence.")
    if jogging_trails.get("errors"):
        next_actions.append("Resolve jogging/running trail source coverage errors.")
    if not publication_parity.get("passed", False):
        next_actions.append("Resolve publication parity before trusting DB/UI output.")
    if any(blocker.get("code") == "independent_visual_ocr_coverage_not_high" for blocker in blockers):
        next_actions.append("Run the full independent GPT visual PDF audit before release-grade trust approval.")
    if not next_actions:
        next_actions.append("Continue daily source freshness monitoring and weekly full trust validation.")

    report = {
        "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
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
        "gold_source": gold_source,
        "source_inventory": source_inventory,
        "source_freshness": source_freshness,
        "manual_review": manual_review,
        "official_parent_classification": official_parent_classification,
        "jogging_trails": jogging_trails,
        "publication_parity": publication_parity,
        "next_actions": next_actions,
    }
    report["source_trust_summary"] = _source_trust_summary(report)
    report["monitoring_report"] = _monitoring_report(report)
    return report


def render_markdown_report(report: dict[str, Any]) -> str:
    coverage = report["coverage"]
    quarantine = report["fixture_quarantine"]
    unextractable = report["fixture_unextractable"]
    official = report["official_recreation"]
    gold_source = report["gold_source"]
    visual_summary = coverage.get("visual_audit_summary") if isinstance(coverage.get("visual_audit_summary"), dict) else {}
    field_summary = coverage.get("field_audit_summary") if isinstance(coverage.get("field_audit_summary"), dict) else {}
    lines = [
        "# Source-To-UI Trust Report",
        "",
        f"Production cutover: {report['status']}",
        "",
        "## Current Counts",
        "",
        f"- Gold v2 records: {coverage['gold_record_count']}",
        f"- Source inventory: {report['source_inventory']['source_count']} sources",
        f"- Source freshness: {report['source_freshness']['summary']}",
        (
            f"- Gold source evidence: {gold_source['rows_with_document_key_legends']} rows with "
            f"document key legends ({gold_source['document_key_legend_count']} legends; "
            f"kinds: {', '.join(gold_source['document_key_legend_kinds']) or 'none'})"
        ),
        (
            f"- Visual PDF audit: {int(visual_summary.get('activities_compared', 0))} activities compared, "
            f"{int(visual_summary.get('blocking_mismatches', 0))} blocking mismatches"
        ),
        (
            f"- Field audit: {int(field_summary.get('fields_audited', 0))} fields checked, "
            f"{int(field_summary.get('errors', 0))} errors"
        ),
        (
            f"- Manual review: {report['manual_review']['summary']['manual_review_record_count']} records, "
            f"{report['manual_review']['summary']['manual_review_error_count']} evidence errors"
        ),
        f"- Fixture records: {coverage['fixture_count']}",
        f"- Coverage-required records: {coverage['coverage_required_count']}",
        f"- UI pipeline mode: {coverage['ui_pipeline']}",
        (
            f"- Official recreation: {official['program_count']} programs, "
            f"{official['offering_count']} resort offerings, "
            f"{official['quarantine_count']} quarantine records"
        ),
        f"- Official parent classifications: {report['official_parent_classification']['classification_counts']}",
        f"- Jogging/running trails: {report['jogging_trails']['summary']}",
        f"- Publication parity: {'passed' if report['publication_parity'].get('passed') else 'blocked'}",
        (
            f"- Source-visible fixture records retained for audit: {quarantine['record_count']} records "
            f"({quarantine['unique_record_count']} unique; "
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

    if quarantine["blocking_record_count"]:
        lines.extend(["", "## Blocking Quarantine By Group", "", "| Group | Records | Unique |", "| --- | ---: | ---: |"])
    else:
        lines.extend(
            [
                "",
                "## Covered Source-Visible Records",
                "",
                "These records remain in fixtures as audit evidence, but they are represented in the normalized official-offering path and do not block cutover.",
                "",
                "| Group | Records | Unique |",
                "| --- | ---: | ---: |",
            ]
        )
    for group, counts in quarantine["by_group"].items():
        lines.append(
            f"| {_title_case_group(group)} | {counts['record_count']} | {counts['unique_record_count']} |"
        )

    reason_heading = "Blocking Quarantine Reasons" if quarantine["blocking_record_count"] else "Retained Record Reasons"
    lines.extend(["", f"## {reason_heading}", "", "| Reason | Records |", "| --- | ---: |"])
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
        lines.extend(
            [
                "",
                "These source-visible records are withheld from publishing because the current sources do not provide enough public-facing fields to show them without inventing facts.",
                "",
                "| Group | Title | Slug | Fixture | Reason |",
                "| --- | --- | --- | --- | --- |",
            ]
        )
        for record in sorted(
            unextractable["records"],
            key=lambda row: (
                str(row.get("calendar_group_key") or ""),
                str(row.get("slug") or ""),
                str(row.get("fixture") or ""),
            ),
        ):
            lines.append(
                "| "
                f"{_escape_table_cell(_title_case_group(str(record.get('calendar_group_key') or '<missing-group>')))} | "
                f"{_escape_table_cell(record.get('title'))} | "
                f"{_escape_table_cell(record.get('slug'))} | "
                f"{_escape_table_cell(record.get('fixture'))} | "
                f"{_escape_table_cell(record.get('reason'))} |"
            )

    lines.extend(["", "## Next Actions", ""])
    if quarantine["blocking_record_count"]:
        lines.append(
            "- Resolve blocking fixture quarantine records with better extraction, reviewed manual spans, "
            "authoritative detail sources, or explicit non-public decisions."
        )
    elif quarantine["record_count"]:
        lines.append(
            "- No cutover action required for official-offering-covered fixture records; keep them as audit evidence unless a stronger source can promote them safely."
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
    DEFAULT_SOURCE_TRUST_SUMMARY_PATH.write_text(
        json.dumps(report["source_trust_summary"], indent=2, ensure_ascii=False) + "\n"
    )
    DEFAULT_MONITORING_REPORT_PATH.write_text(
        json.dumps(report["monitoring_report"], indent=2, ensure_ascii=False) + "\n"
    )
    text = json.dumps(report, indent=2, ensure_ascii=False) if args.json else render_markdown_report(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
