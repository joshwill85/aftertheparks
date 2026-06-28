"""Gate 0.5 disposable vision v3 bakeoff scaffold.

This report is deliberately no-publish. It defines the render/OCR/region spike
surface and records dependency availability before production v3 code exists.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from evaluate_activity_extraction import (
        DEFAULT_OUTPUT_PATH as DEFAULT_BASELINE_PATH,
        FORMAT_COVERAGE_SAMPLES,
        build_evaluation_report,
    )
except ImportError:  # pragma: no cover - supports package-style imports
    from .evaluate_activity_extraction import (
        DEFAULT_OUTPUT_PATH as DEFAULT_BASELINE_PATH,
        FORMAT_COVERAGE_SAMPLES,
        build_evaluation_report,
    )


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_PATH = ROOT / "data/processed/eval/vision_v3_spike_report.json"
DEFAULT_MARKDOWN_PATH = ROOT / "data/processed/eval/vision_v3_spike_report.md"

DPI_CANDIDATES = ["300", "450", "600"]
RUNTIME_STORAGE_METRICS_REQUIRED = [
    "average_render_time_per_page",
    "average_ocr_time_per_page",
    "average_page_image_size",
    "average_crop_debug_artifact_size",
    "recommended_retention_policy",
]
EVALUATION_QUESTIONS = [
    "Can pypdfium2 render these cleanly and deterministically?",
    "Does PaddleOCR extract better evidence than current layout_snapshot.py for known failures?",
    "Does region-first cropping improve title/location/schedule/movie-row extraction?",
    "Where does RapidOCR disagree, especially on small text and English spacing?",
    "Which DPI gives the best publishable-field precision per runtime/storage dollar?",
    "Which failure cases still require human review even with v3?",
]
RETENTION_POLICY = {
    "keep": [
        "raw source forever",
        "canonical page image hash/metadata",
        "field crops needed for review/provenance",
        "final vision snapshot JSON",
    ],
    "optional_short_retention": [
        "full debug overlays",
        "exploratory OCR dumps",
        "alternate DPI render artifacts",
    ],
}


def _module_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _dependency_status() -> dict[str, dict[str, Any]]:
    return {
        "pypdfium2": {
            "available": _module_available("pypdfium2"),
            "role": "deterministic PDF page renderer",
        },
        "paddleocr": {
            "available": _module_available("paddleocr"),
            "role": "primary OCR/layout engine",
        },
        "rapidocr": {
            "available": _module_available("rapidocr"),
            "role": "secondary OCR comparator",
        },
        "docling": {
            "available": _module_available("docling"),
            "role": "parallel structural snapshot",
        },
        "pdftoppm": {
            "available": shutil.which("pdftoppm") is not None,
            "role": "legacy/debug PDF renderer currently used by render_pdf_pages.py",
        },
    }


def _load_baseline_report(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def build_spike_report(
    *,
    baseline_report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    baseline = baseline_report or {}
    known_failures = baseline.get("known_failures")
    if not isinstance(known_failures, list):
        known_failures = []

    return {
        "pipeline_version": "vision_v3_gate0_5_spike",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "publish_behavior": "no_publish",
        "scope": "disposable_render_ocr_region_bakeoff",
        "format_coverage_samples": FORMAT_COVERAGE_SAMPLES,
        "known_failure_count": len(known_failures),
        "known_failures": known_failures,
        "dpi_candidates": DPI_CANDIDATES,
        "evaluation_questions": EVALUATION_QUESTIONS,
        "runtime_storage_metrics_required": RUNTIME_STORAGE_METRICS_REQUIRED,
        "retention_policy": RETENTION_POLICY,
        "dependency_status": _dependency_status(),
        "next_steps": [
            "Render format-coverage and known-failure sources at candidate DPIs.",
            "Run primary and secondary OCR in no-publish mode.",
            "Compare field-level crop evidence against v2 and fixture/manual-review truth.",
            "Choose first production parser target only after the spike report is reviewed.",
        ],
    }


def render_markdown_report(report: dict[str, Any]) -> str:
    dependency_lines = [
        f"- {name}: {'available' if meta.get('available') else 'missing'} ({meta.get('role')})"
        for name, meta in sorted(report.get("dependency_status", {}).items())
        if isinstance(meta, dict)
    ]
    questions = [f"- {question}" for question in report.get("evaluation_questions", [])]
    return "\n".join(
        [
            "# Vision v3 Gate 0.5 Spike Report",
            "",
            f"- Pipeline version: `{report['pipeline_version']}`",
            f"- Publish behavior: `{report['publish_behavior']}`",
            f"- Known failures included: `{report['known_failure_count']}`",
            "",
            "## Dependencies",
            "",
            *dependency_lines,
            "",
            "## Evaluation Questions",
            "",
            *questions,
            "",
            "## Retention Policy",
            "",
            "Keep:",
            *[f"- {item}" for item in report["retention_policy"]["keep"]],
            "",
            "Optional / Short Retention:",
            *[f"- {item}" for item in report["retention_policy"]["optional_short_retention"]],
            "",
        ]
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Gate 0.5 no-publish vision v3 spike scaffold")
    parser.add_argument("--baseline", type=Path, default=DEFAULT_BASELINE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_MARKDOWN_PATH)
    parser.add_argument("--json", action="store_true", help="Print report JSON to stdout")
    args = parser.parse_args()

    baseline = _load_baseline_report(args.baseline)
    if baseline is None:
        baseline = build_evaluation_report()
    report = build_spike_report(baseline_report=baseline)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    args.markdown_output.parent.mkdir(parents=True, exist_ok=True)
    args.markdown_output.write_text(render_markdown_report(report))
    print(f"Wrote {args.output}")
    print(f"Wrote {args.markdown_output}")


if __name__ == "__main__":
    main()
