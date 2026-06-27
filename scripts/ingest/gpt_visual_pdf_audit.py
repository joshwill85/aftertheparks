"""Create or collect visual PDF audit observations.

The default local mode creates a clearly labeled source-provenance visual seed
from Gold field spans. It is useful for schema and comparison plumbing, but it is
not an independent GPT review. A future/live GPT run should write the same JSON
shape with a real model name and no provenance-seed warning.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from config import PROCESSED_DIR
    from render_pdf_pages import pdf_sha256, render_pdf_pages
except ImportError:  # pragma: no cover
    from .config import PROCESSED_DIR
    from .render_pdf_pages import pdf_sha256, render_pdf_pages


DEFAULT_GOLD_PATH = PROCESSED_DIR / "activity_gold_v2_preview.json"
DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "pdf_visual_audits"
DEFAULT_REPORT_PATH = PROCESSED_DIR / "pdf_visual_audit_report.json"
SEED_MODEL = "source_provenance_visual_seed_v1"
SEED_AUDIT_MODE = "source_provenance_seed"
INDEPENDENT_AUDIT_MODE = "independent_gpt_visual"
PROMPT_VERSION = "disney-pdf-visual-audit-v1"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
PRICE_STATES = {"free", "fee", "unknown"}
PRICE_EVIDENCE = {
    "dollar_marker",
    "marker_absent_under_legend",
    "body_fee_language",
    "complimentary_language",
    "none",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _bbox_from_span(span: dict[str, Any] | None) -> dict[str, float | int]:
    bbox = span.get("bbox") if isinstance(span, dict) else None
    page = int(span.get("page") or 1) if isinstance(span, dict) else 1
    if not isinstance(bbox, list) or len(bbox) != 4:
        return {"page": page, "x": 0, "y": 0, "width": 0, "height": 0}
    x1, y1, x2, y2 = [float(value) for value in bbox]
    return {"page": page, "x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1}


def _first_span(row: dict[str, Any], field: str) -> dict[str, Any] | None:
    provenance = row.get("field_provenance")
    spans = provenance.get(field) if isinstance(provenance, dict) else None
    if isinstance(spans, list) and spans and isinstance(spans[0], dict):
        return spans[0]
    return None


def _price_evidence(row: dict[str, Any]) -> str:
    provenance = row.get("field_provenance")
    price_spans = provenance.get("price") if isinstance(provenance, dict) else None
    if not isinstance(price_spans, list):
        return "none"
    fields = {str(span.get("field") or "") for span in price_spans if isinstance(span, dict)}
    if "source_pdf_fee_marker" in fields:
        return "dollar_marker"
    if "source_pdf_fee_marker_absent" in fields or "source_disney_image_fee_marker_absent" in fields:
        return "marker_absent_under_legend"
    if "source_pdf_body_fee_language" in fields:
        return "body_fee_language"
    if "source_pdf_complimentary_language" in fields:
        return "complimentary_language"
    return "none"


def _activity_from_gold_row(row: dict[str, Any]) -> dict[str, Any]:
    price = row.get("price") if isinstance(row.get("price"), dict) else {}
    schedule = row.get("schedule") if isinstance(row.get("schedule"), dict) else {}
    location = row.get("location") if isinstance(row.get("location"), dict) else {}
    return {
        "title": row.get("title"),
        "section": row.get("section"),
        "date_text": row.get("source_pdf_edition"),
        "schedule_text": schedule.get("text"),
        "location": location.get("label"),
        "description": row.get("description"),
        "price_state": price.get("state", "unknown"),
        "price_evidence": _price_evidence(row),
        "optional_price_options": price.get("options") if isinstance(price.get("options"), list) else [],
        "bbox": _bbox_from_span(_first_span(row, "title")),
        "confidence": "medium",
        "row_key": f"{row.get('calendar_group_key')}:{row.get('canonical_slug')}",
    }


def build_visual_audit_from_gold_rows(gold_rows: list[dict[str, Any]], source_sha256: str) -> dict[str, Any]:
    rows = [row for row in gold_rows if row.get("source_sha256") == source_sha256]
    source_path = ""
    for row in rows:
        source = row.get("source")
        if isinstance(source, dict) and source.get("path"):
            source_path = str(source["path"])
            break
    return {
        "audit_mode": SEED_AUDIT_MODE,
        "source_pdf_sha256": source_sha256,
        "source_pdf_path": source_path,
        "model": SEED_MODEL,
        "prompt_version": PROMPT_VERSION,
        "audited_at": _now(),
        "activities": [_activity_from_gold_row(row) for row in rows],
        "warnings": [
            "seeded_from_gold_field_provenance_not_independent_gpt_visual_review"
        ],
    }


def _coerce_json_response(response_text: str) -> dict[str, Any]:
    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"independent_visual_audit_invalid:json:{error}") from error
    if not isinstance(payload, dict):
        raise RuntimeError("independent_visual_audit_invalid:root_not_object")
    return payload


def parse_independent_visual_audit_response(response_text: str) -> list[dict[str, Any]]:
    payload = _coerce_json_response(response_text)
    activities = payload.get("activities")
    if not isinstance(activities, list):
        raise RuntimeError("independent_visual_audit_invalid:activities_missing")

    parsed: list[dict[str, Any]] = []
    for index, activity in enumerate(activities):
        if not isinstance(activity, dict):
            raise RuntimeError(f"independent_visual_audit_invalid:activity_not_object:{index}")
        required = [
            "title",
            "schedule_text",
            "location",
            "description",
            "price_state",
            "price_evidence",
            "optional_price_options",
            "confidence",
            "page",
        ]
        missing = [field for field in required if field not in activity]
        if missing:
            raise RuntimeError(f"independent_visual_audit_invalid:missing:{index}:{','.join(missing)}")
        price_state = str(activity.get("price_state") or "")
        if price_state not in PRICE_STATES:
            raise RuntimeError(f"independent_visual_audit_invalid:price_state:{index}:{price_state}")
        price_evidence = str(activity.get("price_evidence") or "")
        if price_evidence not in PRICE_EVIDENCE:
            raise RuntimeError(f"independent_visual_audit_invalid:price_evidence:{index}:{price_evidence}")
        options = activity.get("optional_price_options")
        if not isinstance(options, list) or not all(isinstance(option, str) for option in options):
            raise RuntimeError(f"independent_visual_audit_invalid:optional_price_options:{index}")
        try:
            page = int(activity.get("page"))
        except (TypeError, ValueError) as error:
            raise RuntimeError(f"independent_visual_audit_invalid:page:{index}") from error
        parsed.append(
            {
                "title": str(activity.get("title") or "").strip(),
                "schedule_text": str(activity.get("schedule_text") or "").strip(),
                "location": str(activity.get("location") or "").strip(),
                "description": str(activity.get("description") or "").strip(),
                "price_state": price_state,
                "price_evidence": price_evidence,
                "optional_price_options": options,
                "confidence": str(activity.get("confidence") or "").strip(),
                "page": page,
            }
        )
        if not parsed[-1]["title"]:
            raise RuntimeError(f"independent_visual_audit_invalid:title_empty:{index}")
    return parsed


def _extract_output_text(response: dict[str, Any]) -> str:
    output_text = response.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text
    parts: list[str] = []
    output = response.get("output")
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for block in content:
                if isinstance(block, dict) and isinstance(block.get("text"), str):
                    parts.append(block["text"])
    text = "\n".join(parts).strip()
    if not text:
        raise RuntimeError("independent_visual_audit_invalid:empty_model_output")
    return text


def _image_data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _prompt(source_sha256: str, page_numbers: list[int]) -> str:
    pages = ", ".join(str(page) for page in page_numbers)
    return (
        "You are independently auditing official Walt Disney World resort recreation PDF page images. "
        "Return strict JSON only with one top-level key, activities, containing activity objects visible on these pages. "
        "Do not infer prices from activity type. A primary activity is fee only when Disney marks it with a dollar marker or says the activity itself has a fee. "
        "If an event is free but optional supplies cost money, keep price_state free and put those supply notes in optional_price_options. "
        "Use price_state free, fee, or unknown. Use price_evidence dollar_marker, marker_absent_under_legend, body_fee_language, complimentary_language, or none. "
        f"PDF hash: {source_sha256}. Pages in this request: {pages}."
    )


def _call_openai_responses(*, api_key: str, model: str, prompt: str, image_paths: list[Path]) -> dict[str, Any]:
    content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    content.extend({"type": "input_image", "image_url": _image_data_url(path)} for path in image_paths)
    payload = {
        "model": model,
        "input": [{"role": "user", "content": content}],
        "text": {"format": {"type": "json_object"}},
    }
    request = urllib.request.Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")
        raise RuntimeError(f"independent_visual_audit_openai_http_error:{error.code}:{body}") from error


def _chunks(items: list[Path], size: int) -> list[list[Path]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def _merge_activities(activity_batches: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    merged: dict[tuple[str, int], dict[str, Any]] = {}
    for activities in activity_batches:
        for activity in activities:
            key = (str(activity.get("title") or "").casefold(), int(activity.get("page") or 0))
            merged[key] = activity
    return [merged[key] for key in sorted(merged)]


def build_independent_visual_audit_for_pdf(
    pdf_path: Path,
    *,
    model: str,
    api_key: str,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    max_pages_per_request: int = 3,
) -> dict[str, Any]:
    if max_pages_per_request <= 0:
        raise RuntimeError("independent_visual_audit_invalid:max_pages_per_request")
    source_sha256 = pdf_sha256(pdf_path)
    page_images = render_pdf_pages(pdf_path)
    if not page_images:
        raise RuntimeError(f"independent_visual_audit_no_rendered_pages:{pdf_path}")

    batches: list[list[dict[str, Any]]] = []
    for chunk in _chunks(page_images, max_pages_per_request):
        page_numbers = []
        for path in chunk:
            try:
                page_numbers.append(int(path.stem.rsplit("-page-", 1)[1]))
            except (IndexError, ValueError):
                page_numbers.append(len(page_numbers) + 1)
        response = _call_openai_responses(
            api_key=api_key,
            model=model,
            prompt=_prompt(source_sha256, page_numbers),
            image_paths=chunk,
        )
        batches.append(parse_independent_visual_audit_response(_extract_output_text(response)))

    audit = {
        "audit_mode": INDEPENDENT_AUDIT_MODE,
        "source_pdf_sha256": source_sha256,
        "source_pdf_path": str(pdf_path),
        "model": model,
        "prompt_version": PROMPT_VERSION,
        "audited_at": _now(),
        "activities": _merge_activities(batches),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / f"{source_sha256}.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n")
    return audit


def _current_pdf_paths_from_gold(gold_path: Path) -> list[Path]:
    rows = json.loads(gold_path.read_text())
    if not isinstance(rows, list):
        raise RuntimeError(f"gold_rows_invalid:{gold_path}")
    paths: dict[str, Path] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        source = row.get("source") if isinstance(row.get("source"), dict) else {}
        source_url = str(row.get("source_url") or source.get("url") or "")
        source_path = source.get("path")
        if source_url.lower().endswith(".pdf") and isinstance(source_path, str) and source_path:
            paths[str(row.get("source_sha256") or source_path)] = Path(source_path)
    return [paths[key] for key in sorted(paths)]


def build_independent_visual_audit_files(
    *,
    gold_path: Path = DEFAULT_GOLD_PATH,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    model: str | None = None,
    api_key: str | None = None,
    max_pages_per_request: int = 3,
) -> dict[str, Any]:
    model = model or os.environ.get("OPENAI_ACTIVITY_AUDIT_MODEL")
    api_key = api_key or os.environ.get("OPENAI_API_KEY")
    if not model:
        raise RuntimeError("independent_visual_audit_requires:OPENAI_ACTIVITY_AUDIT_MODEL")
    if not api_key:
        raise RuntimeError("independent_visual_audit_requires:OPENAI_API_KEY")

    outputs: list[str] = []
    for pdf_path in _current_pdf_paths_from_gold(gold_path):
        audit = build_independent_visual_audit_for_pdf(
            pdf_path,
            model=model,
            api_key=api_key,
            output_dir=output_dir,
            max_pages_per_request=max_pages_per_request,
        )
        outputs.append(str(output_dir / f"{audit['source_pdf_sha256']}.json"))
    return {
        "mode": INDEPENDENT_AUDIT_MODE,
        "model": model,
        "prompt_version": PROMPT_VERSION,
        "sources": len(outputs),
        "outputs": outputs,
    }


def build_visual_audit_seed_files(
    *,
    gold_path: Path = DEFAULT_GOLD_PATH,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
) -> dict[str, Any]:
    rows = json.loads(gold_path.read_text())
    if not isinstance(rows, list):
        raise RuntimeError(f"gold_rows_invalid:{gold_path}")
    by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if isinstance(row, dict) and row.get("source_sha256") and str(row.get("source_url", "")).endswith(".pdf"):
            by_hash[str(row["source_sha256"])].append(row)

    output_dir.mkdir(parents=True, exist_ok=True)
    stale_removed = 0
    current_hashes = set(by_hash)
    for stale_path in sorted(output_dir.glob("*.json")):
        if stale_path.stem in current_hashes:
            continue
        stale_path.unlink()
        stale_removed += 1
    written: list[str] = []
    for source_hash in sorted(by_hash):
        audit = build_visual_audit_from_gold_rows(rows, source_hash)
        output = output_dir / f"{source_hash}.json"
        output.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n")
        written.append(str(output))

    return {
        "mode": SEED_MODEL,
        "sources": len(written),
        "outputs": written,
        "stale_removed": stale_removed,
        "warnings": ["independent_gpt_visual_review_not_run"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create visual PDF audit observations")
    parser.add_argument("--gold-path", type=Path, default=DEFAULT_GOLD_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--seed-from-gold",
        action="store_true",
        help="write provenance-seed audit files from Gold rows",
    )
    parser.add_argument(
        "--independent",
        action="store_true",
        help="render current PDFs and run an independent GPT visual audit",
    )
    parser.add_argument("--model", help="OpenAI model override; defaults to OPENAI_ACTIVITY_AUDIT_MODEL")
    parser.add_argument("--max-pages-per-request", type=int, default=3)
    parser.add_argument("--json", action="store_true", help="print full JSON output instead of summary")
    args = parser.parse_args()

    if args.seed_from_gold and args.independent:
        raise SystemExit("Choose either --seed-from-gold or --independent, not both.")
    if args.independent:
        report = build_independent_visual_audit_files(
            gold_path=args.gold_path,
            output_dir=args.output_dir,
            model=args.model,
            max_pages_per_request=args.max_pages_per_request,
        )
        summary = {key: value for key, value in report.items() if key != "outputs"}
        print(json.dumps(report if args.json else summary, indent=2))
        return
    if not args.seed_from_gold:
        raise SystemExit(
            "Choose --seed-from-gold for local provenance-seed files or --independent for a live GPT visual audit."
        )
    report = build_visual_audit_seed_files(gold_path=args.gold_path, output_dir=args.output_dir)
    summary = {key: value for key, value in report.items() if key != "outputs"}
    print(json.dumps(report if args.json else summary, indent=2))


if __name__ == "__main__":
    main()
