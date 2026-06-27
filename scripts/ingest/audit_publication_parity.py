"""Compare processed artifacts with published/public rows."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
except ImportError:  # pragma: no cover
    from .config import PROCESSED_DIR


DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_OFFICIAL_PATH = PROCESSED_DIR / "official_recreation_offerings.json"
DEFAULT_OUTPUT = PROCESSED_DIR / "publication_parity_report.json"


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _gold_key(row: dict[str, Any]) -> str:
    for field in ("candidate_id", "promoted_from_candidate_id", "id"):
        value = str(row.get(field) or "").strip()
        if value:
            return value
    return f"{row.get('calendar_group_key')}:{row.get('canonical_slug')}"


def _offering_key(row: dict[str, Any]) -> str:
    return str(row.get("offering_key") or f"{row.get('program_key')}:{row.get('resort_slug')}:{row.get('variant_key')}")


def audit_gold_publication_parity(
    expected_rows: list[dict[str, Any]],
    live_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    errors: list[str] = []
    live_by_key = {_gold_key(row): row for row in live_rows}
    matched = 0

    for expected in expected_rows:
        key = _gold_key(expected)
        live = live_by_key.get(key)
        if live is None:
            errors.append(f"gold:{key}:missing_live_row")
            continue
        expected_hash = expected.get("source_sha256") or (expected.get("source") or {}).get("documentHash")
        live_hash = live.get("source_sha256") or (live.get("source") or {}).get("documentHash")
        if expected_hash != live_hash:
            errors.append(f"gold:{key}:source_hash_mismatch")
            continue
        matched += 1

    extra = sorted(set(live_by_key) - {_gold_key(row) for row in expected_rows})
    errors.extend(f"gold:{key}:unexpected_live_row" for key in extra)
    return {
        "passed": not errors,
        "summary": {
            "expected_gold_rows": len(expected_rows),
            "live_gold_rows": len(live_rows),
            "matched_gold_rows": matched,
            "errors": len(errors),
        },
        "errors": errors,
    }


def audit_official_publication_parity(
    expected_offerings: list[dict[str, Any]],
    live_offerings: list[dict[str, Any]],
) -> dict[str, Any]:
    errors: list[str] = []
    live_by_key = {_offering_key(row): row for row in live_offerings}
    matched = 0

    for expected in expected_offerings:
        key = _offering_key(expected)
        live = live_by_key.get(key)
        if live is None:
            errors.append(f"official:{key}:missing_live_row")
            continue
        if expected.get("source_sha256") != live.get("source_sha256"):
            errors.append(f"official:{key}:source_hash_mismatch")
            continue
        matched += 1

    extra = sorted(set(live_by_key) - {_offering_key(row) for row in expected_offerings})
    errors.extend(f"official:{key}:unexpected_live_row" for key in extra)
    return {
        "passed": not errors,
        "summary": {
            "expected_official_offerings": len(expected_offerings),
            "live_official_offerings": len(live_offerings),
            "matched_official_offerings": matched,
            "errors": len(errors),
        },
        "errors": errors,
    }


def build_local_publication_parity_report(
    *,
    gold_path: Path = DEFAULT_GOLD_PATH,
    official_path: Path = DEFAULT_OFFICIAL_PATH,
) -> dict[str, Any]:
    gold_rows = _read_json(gold_path, [])
    official_payload = _read_json(official_path, {})
    official_rows = official_payload.get("offerings", []) if isinstance(official_payload, dict) else []
    gold_report = audit_gold_publication_parity(gold_rows if isinstance(gold_rows, list) else [], gold_rows if isinstance(gold_rows, list) else [])
    official_report = audit_official_publication_parity(
        official_rows if isinstance(official_rows, list) else [],
        official_rows if isinstance(official_rows, list) else [],
    )
    return {
        "passed": gold_report["passed"] and official_report["passed"],
        "gold": gold_report,
        "official_offerings": official_report,
        "errors": [*gold_report["errors"], *official_report["errors"]],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit publication parity for processed artifacts")
    parser.add_argument("--gold-path", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--official-path", type=Path, default=DEFAULT_OFFICIAL_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    report = build_local_publication_parity_report(gold_path=args.gold_path, official_path=args.official_path)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
