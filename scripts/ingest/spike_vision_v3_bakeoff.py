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
DEFAULT_RENDER_REPORT_PATH = ROOT / "data/processed/eval/v3_render_source_pages_report.json"
DEFAULT_VISION_SNAPSHOT_REPORT_PATH = ROOT / "data/processed/eval/v3_vision_snapshot_report.json"
DEFAULT_REVIEW_QUEUE_REPORT_PATH = ROOT / "data/processed/eval/v3_review_queue_report.json"
DEFAULT_REVIEW_QUEUE_PATH = ROOT / "data/processed/review_queue/vision_v3_review_queue.json"
VISION_V3_SPIKE_REPORT_SCHEMA_VERSION = "vision_v3_spike_report_001"

DPI_CANDIDATES = ["300", "450", "600"]
RUNTIME_STORAGE_METRICS_REQUIRED = [
    "average_render_time_per_page",
    "average_ocr_time_per_page",
    "average_page_image_size",
    "average_field_crop_size",
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


def _load_json_dict(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _load_json_list(path: Path) -> list[dict[str, Any]] | None:
    try:
        payload = json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    if not isinstance(payload, list):
        return None
    return [row for row in payload if isinstance(row, dict)]


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) else None


def _file_size(value: Any) -> int | None:
    path = Path(str(value or ""))
    if not str(value or "").strip() or not path.exists() or not path.is_file():
        return None
    return path.stat().st_size


def _page_image_paths(render_report: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    for result in _list(render_report.get("results")):
        if not isinstance(result, dict):
            continue
        for page in _list(result.get("source_document_pages")):
            if not isinstance(page, dict):
                continue
            path = str(page.get("canonical_image_storage_path") or "").strip()
            if path:
                paths.append(path)
    return paths


def _review_artifact_paths(review_tasks: list[dict[str, Any]]) -> list[str]:
    paths: list[str] = []
    for task in review_tasks:
        for key in ("field_crop", "region_crop", "page_image_path"):
            path = str(task.get(key) or "").strip()
            if path:
                paths.append(path)
    return paths


def _field_crop_paths(review_tasks: list[dict[str, Any]]) -> list[str]:
    paths: list[str] = []
    for task in review_tasks:
        path = str(task.get("field_crop") or "").strip()
        if path:
            paths.append(path)
    return paths


def _debug_overlay_paths(vision_snapshot_report: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    for result in _list(vision_snapshot_report.get("results")):
        if not isinstance(result, dict):
            continue
        path = str(result.get("debug_overlay_path") or "").strip()
        if path:
            paths.append(path)
    return paths


def _metric_status(value: Any) -> str:
    return "recorded" if value is not None else "not_recorded"


def _runtime_storage_metrics(
    *,
    render_report: dict[str, Any] | None,
    vision_snapshot_report: dict[str, Any] | None,
    review_tasks: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    render_payload = render_report or {}
    snapshot_payload = vision_snapshot_report or {}
    review_payload = review_tasks or []
    render_times = [
        value
        for value in (_number(result.get("render_elapsed_seconds")) for result in _list(render_payload.get("results")) if isinstance(result, dict))
        if value is not None
    ]
    ocr_times = [
        value
        for value in (_number(result.get("ocr_elapsed_seconds")) for result in _list(snapshot_payload.get("results")) if isinstance(result, dict))
        if value is not None
    ]
    page_sizes = [
        size
        for size in (_file_size(path) for path in _page_image_paths(render_payload))
        if size is not None
    ]
    crop_debug_sizes = [
        size
        for size in (_file_size(path) for path in [*_review_artifact_paths(review_payload), *_debug_overlay_paths(snapshot_payload)])
        if size is not None
    ]
    field_crop_sizes = [
        size
        for size in (_file_size(path) for path in _field_crop_paths(review_payload))
        if size is not None
    ]
    average_render = _average(render_times)
    average_ocr = _average(ocr_times)
    average_page_size = _average([float(size) for size in page_sizes])
    average_crop_debug_size = _average([float(size) for size in crop_debug_sizes])
    average_field_crop_size = _average([float(size) for size in field_crop_sizes])
    metrics = {
        "average_render_time_per_page_seconds": average_render,
        "average_ocr_time_per_page_seconds": average_ocr,
        "average_page_image_size_bytes": int(average_page_size) if average_page_size is not None else None,
        "average_field_crop_size_bytes": int(average_field_crop_size) if average_field_crop_size is not None else None,
        "average_crop_debug_artifact_size_bytes": int(average_crop_debug_size) if average_crop_debug_size is not None else None,
        "page_image_sample_count": len(page_sizes),
        "field_crop_sample_count": len(field_crop_sizes),
        "crop_debug_artifact_sample_count": len(crop_debug_sizes),
    }
    metrics["metric_status"] = {
        "average_render_time_per_page_seconds": _metric_status(average_render),
        "average_ocr_time_per_page_seconds": _metric_status(average_ocr),
        "average_page_image_size_bytes": _metric_status(average_page_size),
        "average_field_crop_size_bytes": _metric_status(average_field_crop_size),
        "average_crop_debug_artifact_size_bytes": _metric_status(average_crop_debug_size),
    }
    return metrics


def _manual_review_metrics(review_queue_report: dict[str, Any] | None) -> dict[str, Any]:
    summary = _dict((review_queue_report or {}).get("summary"))
    by_group = _dict(summary.get("task_count_by_calendar_group"))
    top_group, top_count = ("", 0)
    if by_group:
        top_group, top_count = max(
            ((str(group), int(count)) for group, count in by_group.items() if isinstance(count, int)),
            key=lambda item: item[1],
            default=("", 0),
        )
    return {
        "pending_task_count": int(summary.get("pending_task_count") or 0),
        "top_calendar_group_blocker": {
            "calendar_group_key": top_group or None,
            "task_count": top_count,
        },
    }


def _parser_target_for_group(calendar_group_key: str | None) -> str:
    vertical_groups = {"art-of-animation", "caribbean-beach", "pop-century", "port-orleans-riverside"}
    return "vertical_digital_rec_sign" if calendar_group_key in vertical_groups else "aframe_recreation"


def _rollout_recommendation(manual_review_metrics: dict[str, Any]) -> dict[str, Any]:
    top_group = _dict(manual_review_metrics.get("top_calendar_group_blocker"))
    group_key = top_group.get("calendar_group_key")
    return {
        "recommended_dpi": 450,
        "engine_config": {
            "primary": "paddleocr_ppstructurev3",
            "secondary": "rapidocr",
            "docling_snapshot_enabled": False,
        },
        "first_production_parser_target": _parser_target_for_group(str(group_key) if group_key else None),
        "first_review_focus": top_group,
        "storage_policy": RETENTION_POLICY,
    }


def build_spike_report(
    *,
    baseline_report: dict[str, Any] | None = None,
    render_report: dict[str, Any] | None = None,
    vision_snapshot_report: dict[str, Any] | None = None,
    review_queue_report: dict[str, Any] | None = None,
    review_tasks: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    baseline = baseline_report or {}
    known_failures = baseline.get("known_failures")
    if not isinstance(known_failures, list):
        known_failures = []
    runtime_metrics = _runtime_storage_metrics(
        render_report=render_report,
        vision_snapshot_report=vision_snapshot_report,
        review_tasks=review_tasks,
    )
    manual_metrics = _manual_review_metrics(review_queue_report)

    return {
        "report_kind": "vision_v3_spike_report",
        "schema_version": VISION_V3_SPIKE_REPORT_SCHEMA_VERSION,
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
        "runtime_storage_metrics": runtime_metrics,
        "manual_review_metrics": manual_metrics,
        "retention_policy": RETENTION_POLICY,
        "rollout_recommendation": _rollout_recommendation(manual_metrics),
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
    metrics = _dict(report.get("runtime_storage_metrics"))
    metric_status = _dict(metrics.get("metric_status"))
    def metric_label(key: str) -> Any:
        return metrics.get(key) if metrics.get(key) is not None else metric_status.get(key, "not_recorded")

    metric_lines = [
        f"- Average render time/page: `{metric_label('average_render_time_per_page_seconds')}`",
        f"- Average OCR time/page: `{metric_label('average_ocr_time_per_page_seconds')}`",
        f"- Average page image size: `{metric_label('average_page_image_size_bytes')}` bytes",
        f"- Average field crop size: `{metric_label('average_field_crop_size_bytes')}` bytes",
        f"- Average crop/debug artifact size: `{metric_label('average_crop_debug_artifact_size_bytes')}` bytes",
    ]
    review_metrics = _dict(report.get("manual_review_metrics"))
    top_blocker = _dict(review_metrics.get("top_calendar_group_blocker"))
    recommendation = _dict(report.get("rollout_recommendation"))
    return "\n".join(
        [
            "# Vision v3 Gate 0.5 Spike Report",
            "",
            f"- Pipeline version: `{report['pipeline_version']}`",
            f"- Publish behavior: `{report['publish_behavior']}`",
            f"- Known failures included: `{report['known_failure_count']}`",
            f"- Pending review tasks: `{review_metrics.get('pending_task_count', 0)}`",
            f"- Top review blocker: `{top_blocker.get('calendar_group_key')}` (`{top_blocker.get('task_count', 0)}` tasks)",
            f"- First production parser target: `{recommendation.get('first_production_parser_target')}`",
            "",
            "## Dependencies",
            "",
            *dependency_lines,
            "",
            "## Runtime / Storage Metrics",
            "",
            *metric_lines,
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
    parser.add_argument("--render-report", type=Path, default=DEFAULT_RENDER_REPORT_PATH)
    parser.add_argument("--vision-snapshot-report", type=Path, default=DEFAULT_VISION_SNAPSHOT_REPORT_PATH)
    parser.add_argument("--review-queue-report", type=Path, default=DEFAULT_REVIEW_QUEUE_REPORT_PATH)
    parser.add_argument("--review-queue", type=Path, default=DEFAULT_REVIEW_QUEUE_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_MARKDOWN_PATH)
    parser.add_argument("--json", action="store_true", help="Print report JSON to stdout")
    args = parser.parse_args()

    baseline = _load_baseline_report(args.baseline)
    if baseline is None:
        baseline = build_evaluation_report()
    report = build_spike_report(
        baseline_report=baseline,
        render_report=_load_json_dict(args.render_report),
        vision_snapshot_report=_load_json_dict(args.vision_snapshot_report),
        review_queue_report=_load_json_dict(args.review_queue_report),
        review_tasks=_load_json_list(args.review_queue),
    )

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
