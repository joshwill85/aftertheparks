"""Dedicated audit for Disney jogging/running trail official offerings."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_SCOPE_PATH = Path("data/quality/jogging_trail_audit_scope.json")
DEFAULT_OFFERINGS_PATH = Path("data/processed/official_recreation_offerings.json")
DEFAULT_OUTPUT_PATH = Path("data/processed/jogging_trail_audit_report.json")
SHA256_HEX_LENGTH = 64


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def _has_span(row: dict[str, Any], field: str) -> bool:
    provenance = row.get("field_provenance")
    if not isinstance(provenance, dict):
        return False
    spans = provenance.get(field)
    return isinstance(spans, list) and bool(spans)


def _has_source_hash(row: dict[str, Any]) -> bool:
    value = row.get("source_sha256")
    return isinstance(value, str) and len(value) == SHA256_HEX_LENGTH and all(
        char in "0123456789abcdefABCDEF" for char in value
    )


def _price_needs_source(row: dict[str, Any]) -> bool:
    price = row.get("price")
    if not isinstance(price, dict):
        return False
    state = str(price.get("state") or "unknown")
    if state in {"", "unknown"}:
        return False
    if state in {"free", "fee"}:
        return not _has_span(row, "price")
    return True


def _trail_rows(offerings: dict[str, Any], program_keys: set[str]) -> list[dict[str, Any]]:
    rows = offerings.get("offerings")
    if not isinstance(rows, list):
        return []
    return [
        row
        for row in rows
        if isinstance(row, dict) and row.get("program_key") in program_keys
    ]


def build_jogging_trail_audit(
    *,
    scope_path: Path = DEFAULT_SCOPE_PATH,
    offerings_path: Path = DEFAULT_OFFERINGS_PATH,
) -> dict[str, Any]:
    scope = _read_json(scope_path)
    offerings = _read_json(offerings_path)
    program_keys = set(scope.get("program_keys") or [])
    required_fields = set(scope.get("required_fields") or [])
    rows = _trail_rows(offerings if isinstance(offerings, dict) else {}, program_keys)

    errors: list[str] = []
    source_urls = {str(row.get("source_url") or "") for row in rows if row.get("source_url")}
    if not rows:
        errors.append("jogging_trail_missing_parent_source")
    if not source_urls:
        errors.append("jogging_trail_missing_parent_source")

    missing_source_hash = 0
    missing_resort_join = 0
    missing_source_url = 0
    price_without_source = 0
    missing_required_field_provenance = 0

    for row in rows:
        key = row.get("offering_key") or f"{row.get('program_key')}:{row.get('resort_slug')}"
        if not row.get("source_url"):
            missing_source_url += 1
            errors.append(f"jogging_trail_missing_source_url:{key}")
        if not _has_source_hash(row):
            missing_source_hash += 1
            errors.append(f"jogging_trail_missing_source_hash:{key}")
        if not _has_span(row, "resort_join"):
            missing_resort_join += 1
            errors.append(f"jogging_trail_missing_resort_join:{key}")
        for field in required_fields:
            if not _has_span(row, field):
                missing_required_field_provenance += 1
                errors.append(f"jogging_trail_missing_{field}_provenance:{key}")
        if _price_needs_source(row):
            price_without_source += 1
            errors.append(f"jogging_trail_price_without_source:{key}")

    summary = {
        "parent_trail_items": len(source_urls),
        "resort_trail_offerings": len(rows),
        "missing_resort_join_provenance": missing_resort_join,
        "missing_required_field_provenance": missing_required_field_provenance,
        "missing_source_url": missing_source_url,
        "missing_source_hash": missing_source_hash,
        "price_without_source": price_without_source,
    }
    return {
        "passed": not errors,
        "summary": summary,
        "errors": errors,
        "warnings": [],
        "offerings": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit official jogging/running trail offerings")
    parser.add_argument("--scope", type=Path, default=DEFAULT_SCOPE_PATH)
    parser.add_argument("--offerings", type=Path, default=DEFAULT_OFFERINGS_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--json", action="store_true", help="print full JSON report instead of summary")
    args = parser.parse_args()

    report = build_jogging_trail_audit(scope_path=args.scope, offerings_path=args.offerings)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    summary = {
        "passed": report["passed"],
        "summary": report["summary"],
        "errors": report["errors"],
        "warnings": report["warnings"],
    }
    print(json.dumps(report if args.json else summary, indent=2, ensure_ascii=False))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
