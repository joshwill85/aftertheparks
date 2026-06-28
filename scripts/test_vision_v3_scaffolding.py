import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from PIL import Image

from scripts.ingest.content_type import detect_source_content
from scripts.ingest.evaluate_activity_extraction import build_evaluation_report
from scripts.ingest import discover, fetch
from scripts.ingest import extract_v3
from scripts.ingest.extract_v3 import extract_candidates_from_snapshot
from scripts.ingest.family_classifier import classify_document_family
from scripts.ingest.fee_validator import reconcile_fee_evidence
from scripts.ingest.field_evidence import build_field_evidence
from scripts.ingest.fetch import build_fetch_report, fetch_report_row, source_document_cache_path, source_document_row
from scripts.ingest.normalization_v3 import (
    ALL_DAYS,
    build_runtime_lineage,
    evaluate_field_agreement,
    normalize_location_text,
    normalize_schedule_text,
)
from scripts.ingest.ocr.paddle_adapter import PaddleOcrAdapter
from scripts.ingest.ocr.rapidocr_adapter import RapidOcrAdapter
from scripts.ingest.ocr.schema import normalize_ocr_tokens
from scripts.ingest import promote_gold_v3, publish_gold_v3
from scripts.ingest.promote_gold_v3 import build_gold_v3_preview
from scripts.ingest.publish_gold_v3 import evaluate_publish_readiness, load_publish_flags
from scripts.ingest.quality_metrics import compute_snapshot_quality
from scripts.ingest import review_schema_v3
from scripts.ingest.review_schema_v3 import (
    build_review_decision,
    review_decision_creates_fixture_candidate,
)
from scripts.ingest.regions.aframe_recreation import AframeRecreationParser
from scripts.ingest.regions.generic_visual import GenericVisualScheduleParser
from scripts.ingest.regions.vertical_digital_rec_sign import VerticalDigitalRecSignParser
from scripts.ingest.regions import segment_major_regions
from scripts.ingest import build_review_queue_v3
from scripts.ingest.build_review_queue_v3 import build_review_tasks, review_approval_is_current
from scripts.ingest.debug_overlays import build_debug_overlays
from scripts.ingest import render_source_pages
from scripts.ingest.render_source_pages import render_source_document
from scripts.ingest import source_drift_report
from scripts.ingest.source_drift_report import build_source_drift_report
from scripts.ingest import source_metrics_v3
from scripts.ingest.source_metrics_v3 import build_source_metrics_report
from scripts.ingest.source_manifest import (
    ActivitySource,
    apply_pdf_source_overrides,
    filter_activity_sources_for_quarter,
    resort_recreation_sources_for,
)
from scripts.ingest.spike_vision_v3_bakeoff import build_spike_report
from scripts.ingest import source_status_v3
from scripts.ingest.source_status_v3 import build_v3_source_statuses
from scripts.ingest import v3_dual_run_report
from scripts.ingest.v3_dual_run_report import build_dual_run_report
from scripts.ingest import validate_v3
from scripts.ingest.validate_v3 import validate_candidate
from scripts.ingest import vision_snapshot
from scripts.ingest.vision_snapshot import build_vision_snapshot


class VisionV3ScaffoldingTests(unittest.TestCase):
    def test_evaluation_report_combines_review_queue_manual_review_and_unextractables(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fixtures_dir = root / "fixtures"
            fixtures_dir.mkdir()
            (fixtures_dir / "sample-full-calendar.json").write_text(
                json.dumps(
                    {
                        "calendar_group_key": "sample-resort",
                        "source_pdf": "data/raw/pdfs/sample.pdf",
                        "expected_unextractable_records": [
                            {
                                "title": "Broken Schedule",
                                "slug": "broken-schedule",
                                "reason": "parser_warning:schedule:missing_source_span",
                                "warnings": ["schedule:missing_source_span"],
                                "required_spans": {
                                    "title": [{"page": 1, "line": 2, "text": "Broken Schedule"}],
                                },
                            }
                        ],
                    }
                )
            )
            review_queue_path = root / "review_queue.json"
            review_queue_path.write_text(
                json.dumps(
                    [
                        {
                            "candidate_id": "hash:sample-resort:missing-location",
                            "calendar_group_key": "sample-resort",
                            "activity_slug": "missing-location",
                            "reason": "location:missing",
                            "all_reasons": ["location:missing"],
                            "severity": "blocker",
                        }
                    ]
                )
            )
            manual_review_path = root / "manual_review.json"
            manual_review_path.write_text(
                json.dumps(
                    {
                        "summary": {"manual_review_record_count": 1},
                        "records": [
                            {
                                "fixture": "sample-full-calendar.json",
                                "calendar_group_key": "sample-resort",
                                "slug": "manual-fix",
                                "title": "Manual Fix",
                                "reason": "OCR dropped the title.",
                                "source_sha256": "abc123",
                            }
                        ],
                    }
                )
            )

            report = build_evaluation_report(
                fixtures_dir=fixtures_dir,
                review_queue_path=review_queue_path,
                manual_review_path=manual_review_path,
            )

        self.assertEqual(report["pipeline_version"], "vision_v3_gate0")
        self.assertEqual(report["summary"]["known_failure_candidate_count"], 3)
        self.assertEqual(report["summary"]["review_queue_count"], 1)
        self.assertEqual(report["summary"]["manual_review_count"], 1)
        self.assertEqual(report["summary"]["expected_unextractable_count"], 1)
        self.assertEqual(report["reason_counts"]["location:missing"], 1)
        self.assertEqual(report["reason_counts"]["schedule:missing_source_span"], 1)
        self.assertTrue(report["known_failures"])
        self.assertEqual(report["known_failures"][0]["publication_safe"], False)

    def test_spike_report_is_no_publish_and_includes_runtime_budget_contract(self) -> None:
        baseline = {
            "known_failures": [
                {
                    "calendar_group_key": "boardwalk",
                    "activity_slug": "movie-under-the-stars",
                    "reason": "OCR mangles movie rows",
                    "source_path": "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                }
            ]
        }

        report = build_spike_report(baseline_report=baseline)

        self.assertEqual(report["pipeline_version"], "vision_v3_gate0_5_spike")
        self.assertEqual(report["publish_behavior"], "no_publish")
        self.assertIn("300", report["dpi_candidates"])
        self.assertIn("average_render_time_per_page", report["runtime_storage_metrics_required"])
        self.assertIn("field crops needed for review/provenance", report["retention_policy"]["keep"])
        self.assertEqual(report["known_failure_count"], 1)

    def test_content_detection_sniffs_pdf_jpeg_and_png_bytes(self) -> None:
        pdf = detect_source_content(b"%PDF-1.7\n%fake")
        jpeg = detect_source_content(b"\xff\xd8\xff\xe0\x00\x10JFIF")
        png = detect_source_content(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

        self.assertEqual(pdf.source_type, "pdf")
        self.assertEqual(pdf.mime_type, "application/pdf")
        self.assertEqual(pdf.file_extension, ".pdf")
        self.assertEqual(jpeg.source_type, "image")
        self.assertEqual(jpeg.mime_type, "image/jpeg")
        self.assertEqual(jpeg.file_extension, ".jpg")
        self.assertEqual(png.source_type, "image")
        self.assertEqual(png.mime_type, "image/png")
        self.assertEqual(png.file_extension, ".png")

    def test_activity_source_supports_typed_pdf_and_image_source_urls(self) -> None:
        legacy_pdf = ActivitySource(
            "boardwalk",
            ("boardwalk-inn",),
            "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
            "https://cdn.example.com/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "fy26-q3-0526",
        )
        image_source = ActivitySource(
            "art-of-animation",
            ("art-of-animation-resort",),
            "https://disneyworld.disney.go.com/resorts/art-of-animation-resort/recreation/",
            "https://cdn.example.com/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
            "fy26-q3-0526",
            source_type="image",
        )

        self.assertEqual("pdf", legacy_pdf.source_type)
        self.assertEqual(legacy_pdf.pdf_url, legacy_pdf.source_url)
        self.assertEqual("image", image_source.source_type)
        self.assertEqual(image_source.pdf_url, image_source.source_url)
        resort_sources = resort_recreation_sources_for([image_source])
        self.assertEqual("image", resort_sources[0].source_type)
        self.assertEqual("official_image", resort_sources[0].source_kind)

    def test_source_overrides_infer_source_type_when_replacing_pdf_with_image(self) -> None:
        original = ActivitySource(
            "art-of-animation",
            ("art-of-animation-resort",),
            "https://disneyworld.disney.go.com/resorts/art-of-animation-resort/recreation/",
            "https://cdn.example.com/DAAR_Aframe_Recreation-0326.pdf",
            "fy26-q2-0326",
        )

        [overridden] = apply_pdf_source_overrides(
            [original],
            {
                "art-of-animation": {
                    "pdf_url": "https://cdn.example.com/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
                    "pdf_edition": "fy26-q3-0526",
                }
            },
        )

        self.assertEqual("image", overridden.source_type)
        self.assertEqual("official_image", resort_recreation_sources_for([overridden])[0].source_kind)

    def test_runbook_quarter_filter_selects_only_matching_source_editions(self) -> None:
        q3_pdf = ActivitySource(
            "boardwalk",
            ("boardwalk-inn",),
            "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
            "https://cdn.example.com/fy26-q3/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "fy26-q3-0526",
        )
        q4_image = ActivitySource(
            "art-of-animation",
            ("art-of-animation-resort",),
            "https://disneyworld.disney.go.com/resorts/art-of-animation-resort/recreation/",
            "https://cdn.example.com/fy26-q4/DAAR_CKS-Digital-Rec-Sign_082626-FINAL.jpg",
            "fy26-q4-0826",
            source_type="image",
        )
        html_only = ActivitySource(
            "fort-wilderness",
            ("campsites-at-fort-wilderness-resort",),
            "https://disneyworld.disney.go.com/resorts/campsites-at-fort-wilderness-resort/recreation/",
            None,
            None,
        )

        sources = [q3_pdf, q4_image, html_only]

        self.assertEqual(
            ["art-of-animation"],
            [source.calendar_group_key for source in filter_activity_sources_for_quarter(sources, "FY26-Q4")],
        )
        self.assertEqual(
            ["art-of-animation"],
            [source.calendar_group_key for source in fetch.select_sources_for_fetch(sources, quarter="fy26-q4")],
        )
        self.assertEqual(
            ["art-of-animation"],
            [source.calendar_group_key for source in discover.select_sources_for_discovery(sources, quarter="fy26-q4")],
        )

    def test_render_source_document_creates_deterministic_image_manifest_for_jpg(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            output_dir = root / "pages"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")

            first = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=output_dir,
            )
            second = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=output_dir,
            )

            self.assertEqual(first["source_type"], "image")
            self.assertEqual(first["page_count"], 1)
            self.assertEqual(first["source_sha256"], second["source_sha256"])
            self.assertEqual(first["pages"][0]["canonical_image_sha256"], second["pages"][0]["canonical_image_sha256"])
            self.assertEqual(first["pages"][0]["page_number"], 1)
            self.assertEqual(first["pages"][0]["page_kind"], "image_file")
            self.assertEqual(first["pages"][0]["width_px"], 12)
            self.assertEqual(first["pages"][0]["height_px"], 8)
            self.assertTrue(Path(first["pages"][0]["canonical_image_path"]).exists())
            self.assertTrue(Path(first["manifest_path"]).exists())
            manifest: dict[str, Any] = json.loads(Path(first["manifest_path"]).read_text())
            self.assertEqual(manifest["pages"][0]["canonical_image_sha256"], first["pages"][0]["canonical_image_sha256"])

    def test_render_source_pages_batch_scans_source_documents_and_writes_status_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_documents_dir = root / "source_documents"
            source_path = source_documents_dir / "art-of-animation" / "fy26-q3-0526" / "source.jpg"
            source_path.parent.mkdir(parents=True)
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")
            report_path = root / "render_report.json"

            report = render_source_pages.render_source_documents_from_directory(
                source_documents_dir=source_documents_dir,
                output_dir=root / "pages",
                report_path=report_path,
                quarter="FY26-Q3",
            )

            self.assertEqual(1, report["summary"]["rendered_count"])
            self.assertEqual(0, report["summary"]["source_error_count"])
            self.assertEqual("rendered", report["results"][0]["status"])
            self.assertEqual("art-of-animation", report["results"][0]["calendar_group_key"])
            self.assertEqual("fy26-q3-0526", report["results"][0]["edition"])
            self.assertEqual("image", report["results"][0]["source_type"])
            self.assertTrue(Path(report["results"][0]["manifest_path"]).exists())
            self.assertTrue(report_path.exists())

    def test_render_source_pages_batch_records_unsupported_source_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_documents_dir = root / "source_documents"
            source_path = source_documents_dir / "sample-resort" / "fy26-q4" / "source.txt"
            source_path.parent.mkdir(parents=True)
            source_path.write_text("not a supported bronze source")

            report = render_source_pages.render_source_documents_from_directory(
                source_documents_dir=source_documents_dir,
                output_dir=root / "pages",
                report_path=root / "render_report.json",
            )

        self.assertEqual(0, report["summary"]["rendered_count"])
        self.assertEqual(1, report["summary"]["source_error_count"])
        self.assertEqual("source_error", report["results"][0]["status"])
        self.assertEqual("sample-resort", report["results"][0]["calendar_group_key"])
        self.assertIn("unsupported_source_type", report["results"][0]["error"])

    def test_bronze_source_document_row_uses_detected_type_and_source_document_path(self) -> None:
        data = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        row = source_document_row(
            data=data,
            calendar_group_key="art-of-animation",
            canonical_url="https://example.com/sign.jpg",
            fetched_url="https://example.com/sign.jpg",
            edition="fy26-q3-0526",
            http_metadata={
                "etag": '"abc"',
                "content_length": len(data),
                "http_status": 200,
                "content_type": "image/jpeg",
            },
        )
        cache_path = source_document_cache_path(
            calendar_group_key="art-of-animation",
            edition="fy26-q3-0526",
            content_sha256=row["content_sha256"],
            file_extension=row["file_extension"],
        )

        self.assertEqual(row["source_type"], "image")
        self.assertEqual(row["mime_type"], "image/jpeg")
        self.assertEqual(row["http_content_type"], "image/jpeg")
        self.assertEqual(row["detected_content_type"], "image/jpeg")
        self.assertEqual(row["file_extension"], ".jpg")
        self.assertEqual(row["storage_path"], f"art-of-animation/fy26-q3-0526/{row['content_sha256']}.jpg")
        self.assertEqual(
            str(cache_path),
            f"data/raw/source_documents/art-of-animation/fy26-q3-0526/{row['content_sha256']}.jpg",
        )

    def test_fetch_report_summarizes_pdf_and_image_source_counts(self) -> None:
        report = build_fetch_report(
            [
                fetch_report_row(
                    calendar_group_key="boardwalk",
                    status="fetched",
                    source_document_id="source-doc-pdf",
                    content_sha256="pdfhash",
                    message=None,
                    canonical_url="https://example.com/calendar.pdf",
                    source_type="pdf",
                ),
                fetch_report_row(
                    calendar_group_key="art-of-animation",
                    status="fetched",
                    source_document_id="source-doc-image",
                    content_sha256="imagehash",
                    message=None,
                    canonical_url="https://example.com/schedule.jpg",
                    source_type="image",
                ),
                fetch_report_row(
                    calendar_group_key="fort-wilderness",
                    status="no_source",
                    source_document_id=None,
                    content_sha256=None,
                    message="HTML-only source",
                    source_type="html",
                ),
            ],
            ingest_run_id="run-1",
            fetched_at="2026-06-28T12:00:00+00:00",
        )

        self.assertEqual({"pdf": 1, "image": 1, "html": 1}, report["source_type_counts"])
        self.assertEqual(2, report["document_source_count"])
        self.assertEqual(3, len(report["results"]))

    def test_vision_snapshot_records_structured_engine_unavailable_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")
            page_manifest = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
            )

            snapshot = build_vision_snapshot(page_manifest=page_manifest)

        self.assertEqual(snapshot["snapshot_kind"], "vision_layout_v3")
        self.assertEqual(snapshot["pipeline_version"], "vision_v3_001")
        self.assertEqual(snapshot["status"], "ocr_unavailable")
        self.assertEqual(snapshot["source_sha256"], page_manifest["source_sha256"])
        self.assertEqual(snapshot["source_pages"][0]["page_image_sha256"], page_manifest["pages"][0]["canonical_image_sha256"])
        self.assertEqual(
            ["paddleocr_ppstructurev3", "rapidocr", "docling_snapshot"],
            [run["engine"] for run in snapshot["engine_runs"]],
        )
        self.assertTrue(all(run["status"] == "unavailable" for run in snapshot["engine_runs"]))
        self.assertEqual([], snapshot["tokens"])
        self.assertEqual([], snapshot["regions"])
        self.assertIn("ocr_engine_unavailable:paddleocr_ppstructurev3", snapshot["errors"])
        self.assertEqual(
            snapshot["source_pages"][0]["page_image_sha256"],
            snapshot["quality"]["pages"][0]["page_image_sha256"],
        )
        self.assertEqual(3, snapshot["quality"]["engine_status_counts"]["unavailable"])
        self.assertIn("missing_ocr_tokens", snapshot["quality"]["findings"])

    def test_vision_snapshot_records_runtime_lineage_for_reproducibility(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "BW_Aframe_Recreation-0526_DIGITAL.jpg"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")
            page_manifest = render_source_document(
                source_path,
                calendar_group_key="boardwalk",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
            )

            snapshot = build_vision_snapshot(page_manifest=page_manifest)

        lineage = snapshot["runtime_lineage"]
        self.assertEqual(snapshot["config_hash"], lineage["config_hash"])
        self.assertEqual(snapshot["config"], lineage["config"])
        self.assertIn("Pillow", lineage["package_versions"])
        self.assertIn("pypdfium2", lineage["package_versions"])
        self.assertIn("lineage_hash", lineage)
        self.assertIn("model_asset_hashes", lineage)

    def test_vision_snapshot_batch_scans_page_manifests_and_writes_status_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")
            page_manifest = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
            )
            report_path = root / "vision_report.json"

            report = vision_snapshot.build_vision_snapshots_from_directory(
                page_images_dir=root / "pages",
                output_dir=root / "snapshots",
                report_path=report_path,
            )

            self.assertEqual(1, report["summary"]["snapshot_count"])
            self.assertEqual(0, report["summary"]["parser_error_count"])
            self.assertEqual(page_manifest["source_sha256"], report["results"][0]["source_sha256"])
            self.assertEqual("ocr_unavailable", report["results"][0]["status"])
            self.assertTrue(Path(report["results"][0]["snapshot_path"]).exists())
            self.assertTrue(report_path.exists())

    def test_vision_snapshot_writes_prd_debug_overlay_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            Image.new("RGB", (160, 100), color=(255, 255, 255)).save(source_path, "JPEG")
            page_manifest = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
            )

            def paddle_run(page: dict[str, Any]) -> dict[str, Any]:
                return {
                    "engine": "paddleocr_ppstructurev3",
                    "status": "success",
                    "page_number": page["page_number"],
                    "page_image_sha256": page["page_image_sha256"],
                    "tokens": [
                        {
                            "text": "Poolside",
                            "page_number": 1,
                            "bbox_px": [10, 10, 80, 28],
                            "confidence": 0.98,
                        }
                    ],
                }

            def rapid_run(page: dict[str, Any]) -> dict[str, Any]:
                return {
                    "engine": "rapidocr",
                    "status": "success",
                    "page_number": page["page_number"],
                    "page_image_sha256": page["page_image_sha256"],
                    "tokens": [
                        {
                            "text": "Poolside",
                            "page_number": 1,
                            "bbox_px": [12, 12, 82, 30],
                            "confidence": 0.96,
                        }
                    ],
                }

            with (
                patch("scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page", side_effect=paddle_run),
                patch("scripts.ingest.vision_snapshot.RapidOcrAdapter.run_page", side_effect=rapid_run),
                patch("scripts.ingest.vision_snapshot.DoclingAdapter.run_page", return_value={"engine": "docling_snapshot", "status": "success", "tokens": []}),
            ):
                snapshot = build_vision_snapshot(
                    page_manifest=page_manifest,
                    write_debug_overlays=True,
                    debug_output_dir=root / "debug",
                )

            primary = Path(snapshot["debug_overlays"]["primary"]["overlay_path"])
            secondary = Path(snapshot["debug_overlays"]["secondary"]["overlay_path"])
            self.assertEqual(root / "debug" / page_manifest["source_sha256"] / "overlay_primary.png", primary)
            self.assertEqual(root / "debug" / page_manifest["source_sha256"] / "overlay_secondary.png", secondary)
            self.assertTrue(primary.exists())
            self.assertTrue(secondary.exists())
            self.assertTrue(snapshot["debug_overlays"]["primary"]["overlay_sha256"])

    def test_vision_snapshot_aggregates_successful_engine_tokens_into_canonical_tokens(self) -> None:
        page_manifest = {
            "source_path": "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "source_sha256": "sourcehash",
            "source_type": "pdf",
            "calendar_group_key": "boardwalk",
            "edition": "fy26-q3-0526",
            "render_config": {"config_hash": "renderhash"},
            "pages": [
                {
                    "page_number": 1,
                    "page_kind": "pdf_page",
                    "canonical_image_path": "page.png",
                    "canonical_image_sha256": "pagehash",
                    "width_px": 1200,
                    "height_px": 1800,
                    "render_dpi": 450,
                    "render_engine": "pypdfium2",
                    "render_engine_version": "4.30.0",
                }
            ],
        }

        def paddle_run(page: dict[str, Any]) -> dict[str, Any]:
            return {
                "engine": "paddleocr_ppstructurev3",
                "status": "success",
                "page_number": page["page_number"],
                "page_image_sha256": page["page_image_sha256"],
                "tokens": [
                    {
                        "text": "Poolside Activities",
                        "bbox_px": [10, 20, 200, 44],
                        "confidence": 0.97,
                        "reading_order": 1,
                    }
                ],
                "lines": [],
                "regions": [],
            }

        def rapid_run(page: dict[str, Any]) -> dict[str, Any]:
            return {
                "engine": "rapidocr",
                "status": "success",
                "page_number": page["page_number"],
                "page_image_sha256": page["page_image_sha256"],
                "tokens": [
                    {
                        "text": "POOLSIDE ACTIVITIES",
                        "bbox_px": [12, 22, 202, 46],
                        "confidence": 0.94,
                        "reading_order": 1,
                    }
                ],
                "lines": [],
                "regions": [],
            }

        def docling_run(page: dict[str, Any]) -> dict[str, Any]:
            return {
                "engine": "docling_snapshot",
                "status": "success",
                "page_number": page["page_number"],
                "page_image_sha256": page["page_image_sha256"],
                "tokens": [],
                "lines": [],
                "regions": [],
            }

        with (
            patch("scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page", side_effect=paddle_run),
            patch("scripts.ingest.vision_snapshot.RapidOcrAdapter.run_page", side_effect=rapid_run),
            patch("scripts.ingest.vision_snapshot.DoclingAdapter.run_page", side_effect=docling_run),
        ):
            snapshot = build_vision_snapshot(page_manifest=page_manifest)

        self.assertEqual("ocr_complete", snapshot["status"])
        self.assertEqual(2, len(snapshot["tokens"]))
        self.assertEqual("paddleocr_ppstructurev3", snapshot["tokens"][0]["engine"])
        self.assertEqual("Poolside Activities", snapshot["tokens"][0]["text"])
        self.assertEqual("pagehash", snapshot["tokens"][0]["page_image_sha256"])
        self.assertEqual([10, 20, 200, 44], snapshot["tokens"][0]["bbox_px"])
        self.assertEqual(2, snapshot["quality"]["token_count"])
        self.assertTrue(snapshot["quality"]["ocr_success"])

    def test_family_classifier_recognizes_known_samples_and_blocks_unknown_family(self) -> None:
        boardwalk = {
            "source_path": "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "source_type": "pdf",
            "pages": [{"width_px": 10800, "height_px": 16200}],
        }
        all_star_sports = {
            "source_path": "data/raw/pdfs/All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf",
            "source_type": "pdf",
            "pages": [{"width_px": 10800, "height_px": 16200}],
        }
        daar = {
            "source_path": "data/raw/pdfs/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
            "source_type": "image",
            "pages": [{"width_px": 1200, "height_px": 12696}],
        }
        unknown = {
            "source_path": "data/raw/pdfs/mystery-layout.png",
            "source_type": "image",
            "pages": [{"width_px": 800, "height_px": 800}],
        }

        self.assertEqual("aframe_recreation", classify_document_family(boardwalk)["document_family"])
        self.assertEqual("aframe_recreation", classify_document_family(all_star_sports)["document_family"])
        self.assertEqual("vertical_digital_rec_sign", classify_document_family(daar)["document_family"])
        unknown_classification = classify_document_family(unknown)
        self.assertEqual("unknown_visual_schedule", unknown_classification["document_family"])
        self.assertFalse(unknown_classification["allow_auto_publish"])

    def test_region_segmentation_creates_major_crops_for_known_family(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page_path = root / "page.png"
            Image.new("RGB", (1200, 1800), color=(255, 255, 255)).save(page_path, "PNG")
            snapshot = {
                "source_sha256": "abc123",
                "source_pages": [
                    {
                        "page_number": 1,
                        "page_image_path": str(page_path),
                        "page_image_sha256": "pagehash",
                        "width_px": 1200,
                        "height_px": 1800,
                    }
                ],
            }

            result = segment_major_regions(
                snapshot=snapshot,
                classification={"document_family": "aframe_recreation", "allow_auto_publish": True},
                output_dir=root / "regions",
            )

            region_types = {region["region_type"] for region in result["regions"]}
            self.assertIn("qr_callout", region_types)
            self.assertIn("resort_activities_section", region_types)
            self.assertIn("movie_section", region_types)
            self.assertTrue(all(region["crop_sha256"] for region in result["regions"]))
            self.assertTrue(all(Path(region["crop_path"]).exists() for region in result["regions"]))
            self.assertTrue(all(region["bbox_px"][0] < region["bbox_px"][2] for region in result["regions"]))

    def test_region_segmentation_decodes_qr_callout_targets_when_present(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page_path = root / "page.png"
            Image.new("RGB", (1200, 1800), color=(255, 255, 255)).save(page_path, "PNG")
            snapshot = {
                "source_sha256": "abc123",
                "source_pages": [
                    {
                        "page_number": 1,
                        "page_image_path": str(page_path),
                        "page_image_sha256": "pagehash",
                        "width_px": 1200,
                        "height_px": 1800,
                    }
                ],
            }

            result = segment_major_regions(
                snapshot=snapshot,
                classification={"document_family": "aframe_recreation", "allow_auto_publish": True},
                output_dir=root / "regions",
                qr_decoder=lambda crop_path: [
                    {
                        "target_url": "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                        "decoder": "test_decoder",
                    }
                ],
            )

            qr_region = next(region for region in result["regions"] if region["region_type"] == "qr_callout")
            self.assertEqual("decoded", qr_region["qr_decode_status"])
            self.assertEqual(
                "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                qr_region["qr_targets"][0]["target_url"],
            )
            self.assertEqual(qr_region["crop_sha256"], qr_region["qr_targets"][0]["source_crop_sha256"])

    def test_vision_snapshot_can_attach_family_classification_and_regions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "BW_Aframe_Recreation-0526_DIGITAL.jpg"
            Image.new("RGB", (1200, 1800), color=(255, 255, 255)).save(source_path, "JPEG")
            page_manifest = render_source_document(
                source_path,
                calendar_group_key="boardwalk",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
            )

            snapshot = build_vision_snapshot(
                page_manifest=page_manifest,
                attach_regions=True,
                region_output_dir=root / "regions",
            )

            self.assertEqual("aframe_recreation", snapshot["document_family"])
            self.assertTrue(snapshot["family_classification"]["allow_auto_publish"])
            self.assertIn("resort_activities_section", {region["region_type"] for region in snapshot["regions"]})
            self.assertTrue(all(region["page_image_sha256"] for region in snapshot["regions"]))
            self.assertGreater(snapshot["quality"]["region_count"], 0)

    def test_region_parser_scaffolds_define_publish_policy_and_major_regions(self) -> None:
        aframe = AframeRecreationParser()
        vertical = VerticalDigitalRecSignParser()
        generic = GenericVisualScheduleParser()

        self.assertTrue(aframe.allow_auto_publish)
        self.assertIn("movie_section", aframe.major_region_types)
        self.assertTrue(vertical.allow_auto_publish)
        self.assertIn("day_banner", vertical.major_region_types)
        self.assertFalse(generic.allow_auto_publish)
        self.assertEqual(["unknown"], generic.major_region_types)

    def test_extract_v3_creates_review_candidates_with_region_evidence_when_ocr_is_unavailable(self) -> None:
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "regions": [
                {
                    "region_id": "page-001-region-04",
                    "region_type": "resort_activities_section",
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "bbox_px": [100, 200, 900, 1000],
                    "crop_path": "region.png",
                    "crop_sha256": "crophash",
                }
            ],
            "tokens": [],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("needs_review", candidate["validation_status"])
        self.assertEqual("activity", candidate["candidate_type"])
        self.assertEqual("source-doc-1", candidate["source_document_id"])
        self.assertEqual("sourcehash", candidate["content_sha256"])
        self.assertEqual("page-001-region-04", candidate["region_id"])
        self.assertIn("ocr_text_missing", candidate["validation_findings"])
        self.assertEqual("crophash", candidate["field_evidence"]["region"]["source"]["crop_sha256"])

    def test_extract_v3_builds_activity_candidate_from_region_scoped_engine_tokens(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [100, 200, 900, 1000],
            "crop_path": "region.png",
            "crop_sha256": "regioncrop",
        }
        base_token = {
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "region_id": "page-001-region-04",
            "bbox_px": [110, 210, 500, 240],
            "confidence": 0.95,
        }
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "regions": [region],
            "tokens": [
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Poolside Activities ($)", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "rapidocr", "text": "POOLSIDE ACTIVITIES ($)", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "rapidocr", "text": "Daily 1:30 PM", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Luna Park Pool Deck", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "rapidocr", "text": "luna park pool deck", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
                {**base_token, "engine": "rapidocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("Poolside Activities ($)", candidate["source_title"])
        self.assertEqual("poolside activities ($)", candidate["normalized_title"])
        self.assertEqual("Daily at 1:30pm", candidate["schedule_raw"])
        self.assertEqual("13:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("luna_park_pool_deck", candidate["normalized_location_id"])
        self.assertTrue(candidate["fee_required"])
        self.assertEqual([], candidate["validation_findings"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["schedule"]["agreement"])
        self.assertEqual("sourcehash", candidate["field_evidence"]["title"]["source"]["content_sha256"])
        self.assertEqual([110, 210, 500, 240], candidate["field_evidence"]["title"]["source"]["bbox_px"])
        self.assertEqual("regioncrop", candidate["field_evidence"]["fee"]["source"]["crop_sha256"])

    def test_extract_v3_assigns_ocr_tokens_to_region_by_page_bbox_when_region_id_missing(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [100, 200, 900, 1000],
            "crop_path": "region.png",
            "crop_sha256": "regioncrop",
        }
        inside = {
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [120, 220, 500, 250],
            "confidence": 0.95,
        }
        outside = {
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [20, 20, 90, 80],
            "confidence": 0.95,
        }
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "regions": [region],
            "tokens": [
                {**inside, "engine": "paddleocr_ppstructurev3", "text": "Poolside Activities", "field_hint": "title", "reading_order": 1},
                {**inside, "engine": "rapidocr", "text": "POOLSIDE ACTIVITIES", "field_hint": "title", "reading_order": 1},
                {**inside, "engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "field_hint": "schedule", "reading_order": 2},
                {**inside, "engine": "rapidocr", "text": "Daily 1:30 PM", "field_hint": "schedule", "reading_order": 2},
                {**inside, "engine": "paddleocr_ppstructurev3", "text": "Luna Park Pool Deck", "field_hint": "location", "reading_order": 3},
                {**inside, "engine": "rapidocr", "text": "luna park pool deck", "field_hint": "location", "reading_order": 3},
                {**inside, "engine": "paddleocr_ppstructurev3", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
                {**inside, "engine": "rapidocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
                {**outside, "engine": "paddleocr_ppstructurev3", "text": "Wrong Region", "field_hint": "title", "reading_order": 0},
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("Poolside Activities", candidate["source_title"])
        self.assertEqual("13:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("luna_park_pool_deck", candidate["normalized_location_id"])
        self.assertEqual([], candidate["validation_findings"])
        self.assertEqual([120, 220, 500, 250], candidate["field_evidence"]["title"]["source"]["bbox_px"])

    def test_extract_v3_builds_movie_candidate_with_movie_title_evidence(self) -> None:
        region = {
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [50, 800, 700, 1100],
            "crop_path": "movie-region.png",
            "crop_sha256": "moviecrop",
        }
        base_token = {
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "region_id": "page-001-region-05",
            "bbox_px": [80, 840, 520, 870],
            "confidence": 0.96,
        }
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "regions": [region],
            "tokens": [
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Movie Under the Stars", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "rapidocr", "text": "MOVIE UNDER THE STARS", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Tuesday at 8:30pm", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "rapidocr", "text": "Tuesday 8:30 PM", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Village Green Lawn", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "rapidocr", "text": "village green lawn", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Moana", "field_hint": "movie_title", "reading_order": 4},
                {**base_token, "engine": "rapidocr", "text": "MOANA", "field_hint": "movie_title", "reading_order": 4},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 5},
                {**base_token, "engine": "rapidocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 5},
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("movie", candidate["candidate_type"])
        self.assertEqual("Movie Under the Stars", candidate["source_title"])
        self.assertEqual("Moana", candidate["movie_title"])
        self.assertEqual("moana", candidate["normalized_movie_title"])
        self.assertEqual("20:30", candidate["schedule_normalized"]["start_time"])
        self.assertFalse(candidate["fee_required"])
        self.assertEqual([], candidate["validation_findings"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["movie_title"]["agreement"])
        self.assertEqual("moviecrop", candidate["field_evidence"]["movie_title"]["source"]["crop_sha256"])

    def test_extract_v3_vertical_sign_row_inherits_day_banner_for_schedule(self) -> None:
        region = {
            "region_id": "page-001-region-03",
            "region_type": "vertical_activity_row",
            "region_family": "vertical_digital_rec_sign",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [0, 1200, 900, 1450],
            "crop_path": "vertical-row.png",
            "crop_sha256": "verticalrowcrop",
        }
        base_token = {
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "region_id": "page-001-region-03",
            "bbox_px": [20, 1220, 500, 1250],
            "confidence": 0.94,
        }
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "vertical_digital_rec_sign",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "art-of-animation",
            "regions": [region],
            "tokens": [
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Tuesday", "field_hint": "day_banner", "reading_order": 1},
                {**base_token, "engine": "rapidocr", "text": "Tuesday", "field_hint": "day_banner", "reading_order": 1},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Trivia Challenge", "field_hint": "title", "reading_order": 2},
                {**base_token, "engine": "rapidocr", "text": "TRIVIA CHALLENGE", "field_hint": "title", "reading_order": 2},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "8:30pm", "field_hint": "schedule", "reading_order": 3},
                {**base_token, "engine": "rapidocr", "text": "8:30 PM", "field_hint": "schedule", "reading_order": 3},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "Surfboard Bay Pool Deck", "field_hint": "location", "reading_order": 4},
                {**base_token, "engine": "rapidocr", "text": "surfboard bay pool deck", "field_hint": "location", "reading_order": 4},
                {**base_token, "engine": "paddleocr_ppstructurev3", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 5},
                {**base_token, "engine": "rapidocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 5},
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("Trivia Challenge", candidate["source_title"])
        self.assertEqual("Tuesday at 8:30pm", candidate["schedule_raw"])
        self.assertEqual(["Tuesday"], candidate["schedule_normalized"]["days_of_week"])
        self.assertEqual("20:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("surfboard_bay_pool_deck", candidate["normalized_location_id"])
        self.assertEqual([], candidate["validation_findings"])
        self.assertEqual("Tuesday at 8:30pm", candidate["field_evidence"]["schedule"]["raw_value"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["schedule"]["agreement"])

    def test_extract_v3_batch_scans_vision_snapshots_and_writes_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            snapshots_dir = root / "vision_snapshots"
            snapshots_dir.mkdir()
            snapshot_path = snapshots_dir / "sourcehash.vision.json"
            snapshot_path.write_text(
                json.dumps(
                    {
                        "snapshot_kind": "vision_layout_v3",
                        "pipeline_version": "vision_v3_001",
                        "document_family": "aframe_recreation",
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "calendar_group_key": "boardwalk",
                        "edition": "fy26-q3-0526",
                        "regions": [
                            {
                                "region_id": "page-001-region-04",
                                "region_type": "resort_activities_section",
                                "page_number": 1,
                                "page_image_sha256": "pagehash",
                                "bbox_px": [100, 200, 900, 1000],
                                "crop_path": "region.png",
                                "crop_sha256": "regioncrop",
                            }
                        ],
                        "tokens": [],
                    }
                )
            )
            report_path = root / "extract_report.json"

            report = extract_v3.extract_candidates_from_directory(
                snapshots_dir=snapshots_dir,
                output_dir=root / "candidates",
                report_path=report_path,
                quarter="FY26-Q3",
            )

            self.assertEqual(1, report["summary"]["snapshot_count"])
            self.assertEqual(1, report["summary"]["candidate_count"])
            self.assertEqual(0, report["summary"]["parser_error_count"])
            self.assertEqual("sourcehash", report["results"][0]["source_sha256"])
            self.assertTrue(Path(report["results"][0]["candidates_path"]).exists())
            candidates = json.loads(Path(report["results"][0]["candidates_path"]).read_text())
            self.assertEqual("fy26-q3-0526", candidates[0]["edition"])
            self.assertTrue(report_path.exists())

    def test_field_evidence_object_preserves_source_crop_engine_text_and_agreement(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [100, 200, 500, 260],
            "crop_path": "title.png",
            "crop_sha256": "titlecrop",
        }

        evidence = build_field_evidence(
            field="title",
            raw_value="Poolside Activities ($)",
            normalized_value="poolside activities ($)",
            content_sha256="sourcehash",
            region=region,
            primary_engine={"engine": "paddleocr_ppstructurev3", "text": "Poolside Activities ($)", "confidence": 0.97},
            secondary_engine={"engine": "rapidocr", "text": "POOLSIDE ACTIVITIES ($)", "confidence": 0.94},
            agreement="exact_after_normalization",
            review_status="not_required",
        )

        self.assertEqual("title", evidence["field"])
        self.assertEqual("sourcehash", evidence["source"]["content_sha256"])
        self.assertEqual("page-001-region-04", evidence["source"]["region_id"])
        self.assertEqual("pagehash", evidence["source"]["page_image_sha256"])
        self.assertEqual("titlecrop", evidence["source"]["crop_sha256"])
        self.assertEqual("paddleocr_ppstructurev3", evidence["engines"][0]["engine"])
        self.assertEqual("rapidocr", evidence["engines"][1]["engine"])
        self.assertEqual("exact_after_normalization", evidence["agreement"])
        self.assertEqual("not_required", evidence["review_status"])

    def test_fee_validator_reconciles_title_marker_legend_and_phrase_conflicts(self) -> None:
        marker_and_legend = reconcile_fee_evidence(
            title_text="Poolside Activities ($)",
            body_text="Enjoy activities by the pool.",
            legend_text="($) There is a fee associated with this activity.",
        )
        free_with_understood_legend = reconcile_fee_evidence(
            title_text="Poolside Activities",
            body_text="Enjoy activities by the pool.",
            legend_text="($) There is a fee associated with this activity.",
        )
        phrase_fee = reconcile_fee_evidence(
            title_text="Simba's Activity Center",
            body_text="Fees may apply.",
            legend_text="",
        )
        unclear = reconcile_fee_evidence(
            title_text="Poolside Activities",
            body_text="Enjoy activities by the pool.",
            legend_text="",
        )

        self.assertTrue(marker_and_legend["fee_required"])
        self.assertEqual("validated", marker_and_legend["status"])
        self.assertFalse(free_with_understood_legend["fee_required"])
        self.assertEqual("validated", free_with_understood_legend["status"])
        self.assertTrue(phrase_fee["fee_required"])
        self.assertEqual("validated", phrase_fee["status"])
        self.assertEqual("needs_review", unclear["status"])
        self.assertIn("fee_legend_missing_for_unmarked_title", unclear["findings"])

    def test_validate_v3_fails_closed_for_missing_evidence_unknowns_and_disagreement(self) -> None:
        valid_candidate = {
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "candidate_type": "activity",
            "source_title": "Poolside Activities",
            "normalized_title": "Poolside Activities",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ["Monday"],
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "normalized_location_id": "village_green_lawn",
            "fee_required": False,
            "field_evidence": {
                field: {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_storage_path": f"{field}.png",
                        "crop_sha256": f"{field}crop",
                    },
                    "agreement": "exact_after_normalization",
                }
                for field in ("title", "schedule", "location", "fee")
            },
            "validation_findings": [],
        }

        self.assertEqual("auto_publishable", validate_candidate(valid_candidate)["validation_status"])

        missing_schedule = json.loads(json.dumps(valid_candidate))
        del missing_schedule["field_evidence"]["schedule"]
        self.assertEqual("needs_review", validate_candidate(missing_schedule)["validation_status"])
        self.assertIn("missing_required_field:schedule", validate_candidate(missing_schedule)["validation_findings"])

        missing_source_identity = json.loads(json.dumps(valid_candidate))
        del missing_source_identity["source_document_id"]
        self.assertEqual("rejected", validate_candidate(missing_source_identity)["validation_status"])
        self.assertIn("missing_source_document_id", validate_candidate(missing_source_identity)["validation_findings"])

        missing_all_evidence = json.loads(json.dumps(valid_candidate))
        missing_all_evidence["field_evidence"] = {}
        self.assertEqual("rejected", validate_candidate(missing_all_evidence)["validation_status"])
        self.assertIn("missing_reviewable_evidence", validate_candidate(missing_all_evidence)["validation_findings"])

        missing_schedule_crop_path = json.loads(json.dumps(valid_candidate))
        del missing_schedule_crop_path["field_evidence"]["schedule"]["source"]["crop_storage_path"]
        self.assertIn(
            "missing_required_field:schedule",
            validate_candidate(missing_schedule_crop_path)["validation_findings"],
        )

        missing_schedule_page_image = json.loads(json.dumps(valid_candidate))
        del missing_schedule_page_image["field_evidence"]["schedule"]["source"]["page_image_sha256"]
        self.assertIn(
            "missing_required_field:schedule",
            validate_candidate(missing_schedule_page_image)["validation_findings"],
        )

        unknown_location = json.loads(json.dumps(valid_candidate))
        unknown_location["normalized_location_id"] = "unknown"
        self.assertIn("unknown_location", validate_candidate(unknown_location)["validation_findings"])

        disagreement = json.loads(json.dumps(valid_candidate))
        disagreement["field_evidence"]["title"]["agreement"] = "disagreement"
        self.assertIn("engine_disagreement:title", validate_candidate(disagreement)["validation_findings"])

        unknown_family = json.loads(json.dumps(valid_candidate))
        unknown_family["document_family"] = "unknown_visual_schedule"
        self.assertIn("unknown_document_family", validate_candidate(unknown_family)["validation_findings"])

        fee_conflict = json.loads(json.dumps(valid_candidate))
        fee_conflict["fee_required"] = False
        fee_conflict["field_evidence"]["fee"]["raw_value"] = "Poolside Activities ($)"
        self.assertIn("fee_marker_conflict", validate_candidate(fee_conflict)["validation_findings"])

        movie_missing_title_evidence = json.loads(json.dumps(valid_candidate))
        movie_missing_title_evidence["candidate_type"] = "movie"
        movie_missing_title_evidence["movie_title"] = "Moana"
        movie_missing_title_evidence["normalized_movie_title"] = "moana"
        self.assertIn(
            "missing_required_field:movie_title",
            validate_candidate(movie_missing_title_evidence)["validation_findings"],
        )

    def test_validate_v3_batch_scans_candidate_files_and_writes_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            candidates_path = candidates_dir / "sourcehash.candidates.json"
            candidates_path.write_text(
                json.dumps(
                    [
                        {
                            "document_family": "aframe_recreation",
                            "source_document_id": "source-doc-1",
                            "content_sha256": "sourcehash",
                            "candidate_type": "activity",
                            "source_title": "Poolside Activities",
                            "normalized_title": "Poolside Activities",
                            "schedule_normalized": {
                                "schedule_type": "recurring",
                                "days_of_week": ["Monday"],
                                "start_time": "13:30",
                            },
                            "normalized_location_id": "village_green_lawn",
                            "fee_required": False,
                            "field_evidence": {
                                field: {
                                    "source": {
                                        "content_sha256": "sourcehash",
                                        "page_number": 1,
                                        "page_image_sha256": "pagehash",
                                        "bbox_px": [10, 10, 100, 30],
                                        "crop_path": f"{field}.png",
                                        "crop_sha256": f"{field}crop",
                                    },
                                    "agreement": "exact_after_normalization",
                                }
                                for field in ("title", "schedule", "location", "fee")
                            },
                            "validation_findings": [],
                        }
                    ]
                )
            )
            report_path = root / "validate_report.json"

            report = validate_v3.validate_candidates_from_directory(
                candidates_dir=candidates_dir,
                output_dir=root / "validated",
                report_path=report_path,
            )

            self.assertEqual(1, report["summary"]["candidate_count"])
            self.assertEqual(1, report["summary"]["auto_publishable_count"])
            self.assertEqual(0, report["summary"]["parser_error_count"])
            self.assertTrue(Path(report["results"][0]["validated_path"]).exists())
            self.assertTrue(report_path.exists())

    def test_review_queue_v3_turns_blocked_candidates_into_source_hash_bound_tasks(self) -> None:
        candidate = {
            "candidate_id": "cand-1",
            "validation_status": "needs_review",
            "validation_findings": ["missing_required_field:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "field_evidence": {
                "region": {
                    "source": {
                        "page_number": 1,
                        "crop_storage_path": "region.png",
                        "crop_sha256": "crophash",
                    }
                }
            },
        }

        tasks = build_review_tasks([candidate])

        self.assertEqual(1, len(tasks))
        self.assertEqual("missing_required_field", tasks[0]["task_type"])
        self.assertEqual("sourcehash", tasks[0]["content_sha256"])
        self.assertEqual("region.png", tasks[0]["field_crop"])
        rejected = {**candidate, "candidate_id": "cand-rejected", "validation_status": "rejected"}
        self.assertEqual([], build_review_tasks([rejected]))
        self.assertFalse(
            review_approval_is_current(
                {"content_sha256": "oldhash", "page_image_sha256": "pagehash"},
                current_content_sha256="sourcehash",
                current_page_image_sha256="pagehash",
            )
        )

    def test_review_queue_v3_adds_source_level_parser_error_tasks(self) -> None:
        source_statuses = [
            {
                "source_document_id": "source-doc-parser",
                "content_sha256": "sourcehash",
                "calendar_group_key": "boardwalk",
                "status": "parser_error",
                "snapshot_path": "snapshots/sourcehash.vision.json",
                "message": "region_segmentation_failed",
            }
        ]

        tasks = build_review_tasks([], source_statuses=source_statuses)

        self.assertEqual(1, len(tasks))
        self.assertEqual("source-parser-error-source-doc-parser", tasks[0]["task_id"])
        self.assertEqual("parser_error", tasks[0]["task_type"])
        self.assertEqual("source-doc-parser", tasks[0]["source_document_id"])
        self.assertEqual("sourcehash", tasks[0]["content_sha256"])
        self.assertEqual("boardwalk", tasks[0]["calendar_group_key"])
        self.assertEqual(["region_segmentation_failed"], tasks[0]["validation_findings"])
        self.assertEqual("snapshots/sourcehash.vision.json", tasks[0]["snapshot_path"])

    def test_review_queue_v3_adds_source_level_source_error_tasks(self) -> None:
        source_statuses = [
            {
                "source_document_id": "source-doc-unsupported",
                "content_sha256": "sourcehash",
                "calendar_group_key": "boardwalk",
                "status": "source_error",
                "message": "unsupported_source_type:application/zip",
            }
        ]

        tasks = build_review_tasks([], source_statuses=source_statuses)

        self.assertEqual(1, len(tasks))
        self.assertEqual("source-source-error-source-doc-unsupported", tasks[0]["task_id"])
        self.assertEqual("source_error", tasks[0]["task_type"])
        self.assertEqual("source-doc-unsupported", tasks[0]["source_document_id"])
        self.assertEqual(["unsupported_source_type:application/zip"], tasks[0]["validation_findings"])

    def test_review_queue_v3_cli_defaults_to_validated_candidates_directory(self) -> None:
        candidate = {
            "candidate_id": "cand-cli-review",
            "validation_status": "needs_review",
            "validation_findings": ["missing_required_field:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "field_evidence": {
                "region": {
                    "source": {
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "crop_storage_path": "region.png",
                        "crop_sha256": "crophash",
                    }
                }
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            validated_dir = root / "validated"
            validated_dir.mkdir()
            output_path = root / "review_queue.json"
            (validated_dir / "one.json").write_text(json.dumps([candidate]))

            with patch.object(build_review_queue_v3, "DEFAULT_VALIDATED_CANDIDATES_PATH", validated_dir):
                with patch.object(
                    sys,
                    "argv",
                    ["build_review_queue_v3.py", "--output", str(output_path)],
                ):
                    build_review_queue_v3.main()

            tasks = json.loads(output_path.read_text())

        self.assertEqual(1, len(tasks))
        self.assertEqual("cand-cli-review", tasks[0]["task_id"])

    def test_review_queue_v3_cli_accepts_source_statuses_for_parser_errors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            validated_dir = root / "validated"
            source_statuses_path = root / "source_statuses.json"
            output_path = root / "review_queue.json"
            validated_dir.mkdir()
            source_statuses_path.write_text(
                json.dumps(
                    [
                        {
                            "source_document_id": "source-doc-parser",
                            "content_sha256": "sourcehash",
                            "status": "parser_error",
                            "message": "region_segmentation_failed",
                        }
                    ]
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "build_review_queue_v3.py",
                    str(validated_dir),
                    "--source-statuses",
                    str(source_statuses_path),
                    "--output",
                    str(output_path),
                ],
            ):
                build_review_queue_v3.main()

            tasks = json.loads(output_path.read_text())

        self.assertEqual(1, len(tasks))
        self.assertEqual("parser_error", tasks[0]["task_type"])
        self.assertEqual("source-doc-parser", tasks[0]["source_document_id"])

    def test_review_queue_v3_uses_field_specific_evidence_for_disagreement_tasks(self) -> None:
        candidate = {
            "candidate_id": "cand-2",
            "validation_status": "needs_review",
            "validation_findings": ["engine_disagreement:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "schedule_raw": "Daily at 1:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ALL_DAYS,
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "field_evidence": {
                "schedule": {
                    "field": "schedule",
                    "raw_value": "Daily at 1:30pm",
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "13:30",
                        "timezone": "America/New_York",
                    },
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 20, 200, 44],
                        "crop_storage_path": "schedule.png",
                        "crop_sha256": "schedulecrop",
                    },
                    "engines": [
                        {"engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "confidence": 0.97},
                        {"engine": "rapidocr", "text": "Daily at 7:30pm", "confidence": 0.94},
                    ],
                    "agreement": "disagreement",
                    "review_status": "required",
                }
            },
        }

        tasks = build_review_tasks([candidate])

        self.assertEqual(1, len(tasks))
        task = tasks[0]
        self.assertEqual("ocr_disagreement", task["task_type"])
        self.assertEqual("schedule", task["field"])
        self.assertEqual("schedule.png", task["field_crop"])
        self.assertEqual("schedulecrop", task["field_crop_sha256"])
        self.assertEqual("Daily at 1:30pm", task["primary_text"])
        self.assertEqual("Daily at 7:30pm", task["secondary_text"])
        self.assertEqual("Daily at 1:30pm", task["candidate_value"])
        self.assertEqual(candidate["schedule_normalized"], task["normalized_value"])
        self.assertEqual([10, 20, 200, 44], task["field_bbox"])

    def test_promote_gold_v3_preview_only_includes_gated_rows_with_field_evidence(self) -> None:
        auto_candidate = {
            "validation_status": "auto_publishable",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "canonical_url": "https://example.com/official-calendar.pdf",
            "fetched_url": "https://cdn.example.com/official-calendar.pdf",
            "calendar_group_key": "boardwalk",
            "document_family": "aframe_recreation",
            "edition": "fy26-q3-0526",
            "source_type": "pdf",
            "resort_slug": "boardwalk-inn",
            "candidate_type": "activity",
            "normalized_title": "Poolside Activities",
            "source_title": "Poolside Activities",
            "category": "poolside",
            "normalized_location_id": "village_green_lawn",
            "location_text": "Village Green Lawn",
            "schedule_raw": "Daily at 1:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ["Monday"],
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "fee_required": False,
            "field_evidence": {
                field: {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "bbox_px": [10, 10, 100, 30],
                        "crop_sha256": f"{field}crop",
                    },
                    "agreement": "exact_after_normalization",
                }
                for field in ("title", "schedule", "location", "fee")
            },
        }
        needs_review = {**auto_candidate, "validation_status": "needs_review", "normalized_title": "Unsafe Guess"}
        mislabeled_auto = {
            **auto_candidate,
            "validation_status": "auto_publishable",
            "normalized_title": "Bad Auto",
            "validation_findings": ["engine_disagreement:schedule"],
        }

        preview = build_gold_v3_preview([auto_candidate, needs_review, mislabeled_auto])

        self.assertEqual(1, len(preview["rows"]))
        row = preview["rows"][0]
        self.assertEqual("vision_v3_preview", row["publication_mode"])
        self.assertEqual("source-doc-1", row["source_document_id"])
        self.assertEqual("sourcehash", row["source_sha256"])
        self.assertEqual("aframe_recreation", row["document_family"])
        self.assertEqual("fy26-q3-0526", row["edition"])
        self.assertEqual("pdf", row["source_type"])
        self.assertEqual("https://example.com/official-calendar.pdf", row["source"]["canonicalUrl"])
        self.assertEqual("https://cdn.example.com/official-calendar.pdf", row["source"]["fetchedUrl"])
        self.assertEqual("https://example.com/official-calendar.pdf", row["source_url"])
        self.assertEqual("Poolside Activities", row["title"])
        self.assertEqual("Daily at 1:30pm", row["schedule"]["text"])
        self.assertEqual(auto_candidate["field_evidence"], row["field_evidence"])
        self.assertEqual([], row["validation_findings"])
        self.assertEqual(2, preview["summary"]["skipped_not_publishable"])
        self.assertEqual(1, preview["summary"]["skipped_validation_findings"])

    def test_promote_gold_v3_allows_current_hash_bound_review_approval_only(self) -> None:
        needs_review = {
            "candidate_id": "cand-review-1",
            "validation_status": "needs_review",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "resort_slug": "boardwalk-inn",
            "candidate_type": "activity",
            "normalized_title": "Poolside Activities",
            "source_title": "Poolside Activities",
            "category": "poolside",
            "normalized_location_id": "village_green_lawn",
            "location_text": "Village Green Lawn",
            "schedule_raw": "Daily at 7:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ALL_DAYS,
                "start_time": "19:30",
                "timezone": "America/New_York",
            },
            "fee_required": False,
            "field_evidence": {
                field: {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_storage_path": f"{field}.png",
                        "crop_sha256": f"{field}crop",
                    },
                    "agreement": "manual_review_required",
                }
                for field in ("title", "schedule", "location", "fee")
            },
        }
        task = {
            "task_id": "cand-review-1",
            "task_type": "unparsed_schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "schedulecrop",
            "candidate": needs_review,
        }
        current_decision = build_review_decision(
            task,
            reviewer="josh",
            decision="edit",
            approved_fields={
                "schedule": {
                    "raw_value": "Daily at 1:30pm",
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "13:30",
                        "timezone": "America/New_York",
                    },
                }
            },
            reason="Corrected from visible crop.",
            decided_at="2026-06-28T12:00:00Z",
        )
        stale_decision = {**current_decision, "content_sha256": "oldhash", "decided_at": "2026-06-28T12:01:00Z"}

        stale_preview = build_gold_v3_preview([needs_review], review_decisions=[stale_decision])
        current_preview = build_gold_v3_preview([needs_review], review_decisions=[current_decision])

        self.assertEqual(0, len(stale_preview["rows"]))
        self.assertEqual(1, stale_preview["summary"]["skipped_stale_review_decision"])
        self.assertEqual(1, len(current_preview["rows"]))
        row = current_preview["rows"][0]
        self.assertEqual("manual_review_approved", row["review_status"])
        self.assertEqual("Daily at 1:30pm", row["schedule"]["text"])
        self.assertEqual("13:30", row["schedule"]["normalized"]["start_time"])
        self.assertEqual("edit", row["review_decision"]["decision"])
        self.assertEqual("josh", row["review_decision"]["reviewer"])
        self.assertEqual("sourcehash", row["review_decision"]["content_sha256"])
        self.assertEqual("pagehash", row["review_decision"]["page_image_sha256"])
        self.assertEqual("schedulecrop", row["review_decision"]["field_crop_sha256"])
        self.assertEqual(1, current_preview["summary"]["manually_approved_by_review"])

    def test_promote_gold_v3_cli_can_include_approved_review_decisions(self) -> None:
        candidate = {
            "candidate_id": "cand-review-cli",
            "validation_status": "needs_review",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "normalized_title": "Poolside Activities",
            "location_text": "Village Green Lawn",
            "schedule_raw": "Daily at 7:30pm",
            "schedule_normalized": {"schedule_type": "recurring", "start_time": "19:30"},
            "fee_required": False,
            "field_evidence": {
                "schedule": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_image_sha256": "pagehash",
                        "crop_storage_path": "schedule.png",
                        "crop_sha256": "schedulecrop",
                    }
                }
            },
        }
        decision = build_review_decision(
            {
                "task_id": "cand-review-cli",
                "task_type": "unparsed_schedule",
                "source_document_id": "source-doc-1",
                "content_sha256": "sourcehash",
                "page_image": "pagehash",
                "field_crop": "schedule.png",
                "field_crop_sha256": "schedulecrop",
                "candidate": candidate,
            },
            reviewer="josh",
            decision="approve",
            approved_fields={"schedule": {"raw_value": "Daily at 1:30pm", "normalized_value": {"start_time": "13:30"}}},
            reason="Visible in crop.",
            decided_at="2026-06-28T12:00:00Z",
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidates_path = root / "validated.json"
            decisions_path = root / "review_decisions.json"
            output_path = root / "preview.json"
            candidates_path.write_text(json.dumps([candidate]))
            decisions_path.write_text(json.dumps([decision]))

            with patch.object(
                sys,
                "argv",
                [
                    "promote_gold_v3.py",
                    str(candidates_path),
                    "--output",
                    str(output_path),
                    "--include-approved-review",
                    "--review-decisions",
                    str(decisions_path),
                ],
            ):
                promote_gold_v3.main()

            preview = json.loads(output_path.read_text())

        self.assertEqual(1, len(preview["rows"]))
        self.assertEqual("Daily at 1:30pm", preview["rows"][0]["schedule"]["text"])
        self.assertEqual(1, preview["summary"]["manually_approved_by_review"])

    def test_promote_gold_v3_cli_preview_defaults_to_validated_candidates_directory(self) -> None:
        candidate = {
            "candidate_id": "cand-default-preview",
            "validation_status": "auto_publishable",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "canonical_url": "https://example.com/calendar.pdf",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "normalized_title": "Poolside Activities",
            "location_text": "Village Green Lawn",
            "schedule_raw": "Daily at 1:30pm",
            "schedule_normalized": {"start_time": "13:30"},
            "fee_required": False,
            "field_evidence": {"title": {"source": {"crop_sha256": "titlecrop"}}},
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            validated_dir = root / "validated"
            validated_dir.mkdir()
            output_path = root / "preview.json"
            (validated_dir / "one.json").write_text(json.dumps([candidate]))

            with patch.object(promote_gold_v3, "DEFAULT_VALIDATED_CANDIDATES_PATH", validated_dir):
                with patch.object(
                    sys,
                    "argv",
                    ["promote_gold_v3.py", "--preview", "--output", str(output_path)],
                ):
                    promote_gold_v3.main()

            preview = json.loads(output_path.read_text())

        self.assertEqual(1, len(preview["rows"]))
        self.assertEqual("Poolside Activities", preview["rows"][0]["title"])

    def test_ocr_schema_normalizes_engine_tokens_to_coordinate_contract(self) -> None:
        tokens = normalize_ocr_tokens(
            [
                {
                    "text": " Poolside Activities ",
                    "bbox": [[10, 20], [110, 20], [110, 44], [10, 44]],
                    "confidence": 0.91,
                    "line_number": 2,
                    "reading_order": 3,
                }
            ],
            engine="paddleocr_ppstructurev3",
            page_number=1,
            page_image_sha256="pagehash",
        )

        self.assertEqual(1, len(tokens))
        self.assertEqual("paddleocr_ppstructurev3", tokens[0]["engine"])
        self.assertEqual("Poolside Activities", tokens[0]["text"])
        self.assertEqual("poolside activities", tokens[0]["normalized_text"])
        self.assertEqual([10, 20, 110, 44], tokens[0]["bbox_px"])
        self.assertEqual("pagehash", tokens[0]["page_image_sha256"])
        self.assertEqual(0.91, tokens[0]["confidence"])

    def test_ocr_adapters_fail_with_structured_unavailable_status(self) -> None:
        page = {
            "page_number": 1,
            "page_image_path": "missing.png",
            "page_image_sha256": "pagehash",
        }
        paddle = PaddleOcrAdapter()
        rapid = RapidOcrAdapter()

        paddle_result = paddle.run_page(page)
        rapid_result = rapid.run_page(page)

        self.assertEqual("paddleocr_ppstructurev3", paddle_result["engine"])
        self.assertEqual("rapidocr", rapid_result["engine"])
        self.assertEqual("unavailable", paddle_result["status"])
        self.assertEqual("unavailable", rapid_result["status"])
        self.assertEqual([], paddle_result["tokens"])
        self.assertIn("ocr_engine_unavailable:paddleocr_ppstructurev3", paddle_result["error"])

    def test_publish_gold_v3_requires_feature_flag_and_clean_preview(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            disabled_flags = root / "publish_flags_disabled.yaml"
            disabled_flags.write_text("public_gold_source: v2\nv3_publish_enabled: false\n")
            enabled_flags = root / "publish_flags_enabled.yaml"
            enabled_flags.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            rollout_flags = root / "publish_flags_rollout.yaml"
            rollout_flags.write_text(
                "public_gold_source: v3\n"
                "v3_publish_enabled: true\n"
                "v3_allowed_calendar_groups: boardwalk, animal-kingdom-jambo\n"
                "v3_allowed_document_families: aframe_recreation\n"
            )
            clean_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "validation_status": "auto_publishable",
                        "calendar_group_key": "boardwalk",
                        "document_family": "aframe_recreation",
                        "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                        "schedule": {"text": "Daily at 1:30pm", "normalized": {"start_time": "13:30"}},
                        "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
                        "price": {"state": "free"},
                        "field_evidence": {
                            field: {
                                "source": {
                                    "content_sha256": "sourcehash",
                                    "page_number": 1,
                                    "page_image_sha256": "pagehash",
                                    "bbox_px": [10, 20, 100, 40],
                                    "crop_sha256": f"{field}crop",
                                    "crop_storage_path": f"{field}.png",
                                },
                                "agreement": "exact_after_normalization",
                            }
                            for field in ("title", "schedule", "location", "fee")
                        },
                    }
                ],
            }
            dirty_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 2},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                        "schedule": clean_preview["rows"][0]["schedule"],
                        "location": clean_preview["rows"][0]["location"],
                        "price": clean_preview["rows"][0]["price"],
                        "field_evidence": clean_preview["rows"][0]["field_evidence"],
                    }
                ],
            }
            missing_url_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "schedule": clean_preview["rows"][0]["schedule"],
                        "location": clean_preview["rows"][0]["location"],
                        "price": clean_preview["rows"][0]["price"],
                        "field_evidence": clean_preview["rows"][0]["field_evidence"],
                    }
                ],
            }
            missing_hash_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source": {"canonicalUrl": "https://example.com/calendar.pdf"},
                        "schedule": clean_preview["rows"][0]["schedule"],
                        "location": clean_preview["rows"][0]["location"],
                        "price": clean_preview["rows"][0]["price"],
                        "field_evidence": clean_preview["rows"][0]["field_evidence"],
                    }
                ],
            }
            non_public_source_url_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "source_url": "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities",
                    }
                ],
            }
            non_public_nested_source_url_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "source": {
                            "canonicalUrl": "manual://fort-wilderness/2026-05-26-to-2026-09-08/recreation-activities",
                            "documentHash": "sourcehash",
                        },
                    }
                ],
            }
            missing_critical_evidence_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                        "schedule": clean_preview["rows"][0]["schedule"],
                        "location": clean_preview["rows"][0]["location"],
                        "price": clean_preview["rows"][0]["price"],
                        "field_evidence": {"title": clean_preview["rows"][0]["field_evidence"]["title"]},
                    }
                ],
            }
            clean_dual_run_report = {
                "status": "clean",
                "publish_blockers": [],
                "unreviewed_diff_keys": [],
                "unreviewed_new_keys": [],
            }
            unparsed_schedule_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "schedule": {"text": "Daily-ish", "normalized": {}}}],
            }
            unknown_location_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "location": {"id": "unknown", "label": "Somewhere"}}],
            }
            unresolved_disagreement_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "field_evidence": {
                            **clean_preview["rows"][0]["field_evidence"],
                            "schedule": {
                                **clean_preview["rows"][0]["field_evidence"]["schedule"],
                                "agreement": "disagreement",
                            },
                        },
                    }
                ],
            }
            validation_findings_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "validation_findings": ["engine_disagreement:schedule"],
                    }
                ],
            }
            disallowed_group_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "calendar_group_key": "grand-floridian"}],
            }
            disallowed_family_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "document_family": "vertical_digital_rec_sign"}],
            }
            mismatched_field_source_hash_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "field_evidence": {
                            **clean_preview["rows"][0]["field_evidence"],
                            "schedule": {
                                **clean_preview["rows"][0]["field_evidence"]["schedule"],
                                "source": {
                                    **clean_preview["rows"][0]["field_evidence"]["schedule"]["source"],
                                    "content_sha256": "differenthash",
                                },
                            },
                        },
                    }
                ],
            }
            missing_page_bbox_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "field_evidence": {
                            **clean_preview["rows"][0]["field_evidence"],
                            "schedule": {
                                **clean_preview["rows"][0]["field_evidence"]["schedule"],
                                "source": {
                                    "content_sha256": "sourcehash",
                                    "page_number": 1,
                                    "crop_sha256": "schedulecrop",
                                    "crop_storage_path": "schedule.png",
                                },
                            },
                        },
                    }
                ],
            }
            unpromotable_status_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "validation_status": "needs_review",
                    }
                ],
            }
            manual_without_review_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "validation_status": "manually_approved",
                        "review_status": None,
                        "review_decision": None,
                    }
                ],
            }
            manual_with_stale_review_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "validation_status": "manually_approved",
                        "review_status": "manual_review_approved",
                        "review_decision": {
                            "decision": "approve",
                            "content_sha256": "oldhash",
                            "page_image_sha256": "pagehash",
                        },
                    }
                ],
            }
            manual_with_stale_page_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "validation_status": "manually_approved",
                        "review_status": "manual_review_approved",
                        "review_decision": {
                            "decision": "edit",
                            "content_sha256": "sourcehash",
                            "page_image_sha256": "oldpagehash",
                        },
                    }
                ],
            }
            blocked_source_drift_report = {
                "status": "review_required",
                "publish_blockers": [
                    "recognized_family_changed",
                    "activity_count_drift",
                    "movie_count_drift",
                ],
            }

            self.assertEqual("v2", load_publish_flags(disabled_flags)["public_gold_source"])
            disabled = evaluate_publish_readiness(clean_preview, flags=load_publish_flags(disabled_flags))
            missing_dual_run = evaluate_publish_readiness(clean_preview, flags=load_publish_flags(enabled_flags))
            enabled = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            rollout_allowed = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(rollout_flags),
                dual_run_report=clean_dual_run_report,
            )
            rollout_disallowed_group = evaluate_publish_readiness(
                disallowed_group_preview,
                flags=load_publish_flags(rollout_flags),
                dual_run_report=clean_dual_run_report,
            )
            rollout_disallowed_family = evaluate_publish_readiness(
                disallowed_family_preview,
                flags=load_publish_flags(rollout_flags),
                dual_run_report=clean_dual_run_report,
            )
            dirty = evaluate_publish_readiness(
                dirty_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_url = evaluate_publish_readiness(
                missing_url_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_hash = evaluate_publish_readiness(
                missing_hash_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            non_public_source_url = evaluate_publish_readiness(
                non_public_source_url_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            non_public_nested_source_url = evaluate_publish_readiness(
                non_public_nested_source_url_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_critical_evidence = evaluate_publish_readiness(
                missing_critical_evidence_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            unparsed_schedule = evaluate_publish_readiness(
                unparsed_schedule_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            unknown_location = evaluate_publish_readiness(
                unknown_location_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            unresolved_disagreement = evaluate_publish_readiness(
                unresolved_disagreement_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            validation_findings = evaluate_publish_readiness(
                validation_findings_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            mismatched_field_source_hash = evaluate_publish_readiness(
                mismatched_field_source_hash_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_page_bbox = evaluate_publish_readiness(
                missing_page_bbox_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            unpromotable_status = evaluate_publish_readiness(
                unpromotable_status_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_without_review = evaluate_publish_readiness(
                manual_without_review_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_with_stale_review = evaluate_publish_readiness(
                manual_with_stale_review_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_with_stale_page = evaluate_publish_readiness(
                manual_with_stale_page_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            source_drift_blocked = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=blocked_source_drift_report,
            )
            dual_run_blocked = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report={
                    "status": "blocked",
                    "unreviewed_diff_keys": ["boardwalk:poolside-activities:schedule"],
                    "publish_blockers": ["unreviewed_v2_v3_field_diffs"],
                },
            )

        self.assertFalse(disabled["ready"])
        self.assertIn("v3_publish_disabled", disabled["errors"])
        self.assertFalse(missing_dual_run["ready"])
        self.assertIn("missing_dual_run_report", missing_dual_run["errors"])
        self.assertTrue(enabled["ready"])
        self.assertTrue(rollout_allowed["ready"])
        self.assertFalse(rollout_disallowed_group["ready"])
        self.assertIn("row_calendar_group_not_enabled_for_v3:0", rollout_disallowed_group["errors"])
        self.assertFalse(rollout_disallowed_family["ready"])
        self.assertIn("row_document_family_not_enabled_for_v3:0", rollout_disallowed_family["errors"])
        self.assertFalse(dirty["ready"])
        self.assertIn("preview_has_skipped_candidates", dirty["errors"])
        self.assertFalse(missing_url["ready"])
        self.assertIn("row_missing_source_url:0", missing_url["errors"])
        self.assertFalse(missing_hash["ready"])
        self.assertIn("row_missing_source_sha256:0", missing_hash["errors"])
        self.assertFalse(non_public_source_url["ready"])
        self.assertIn("row_non_public_source_url:0", non_public_source_url["errors"])
        self.assertFalse(non_public_nested_source_url["ready"])
        self.assertIn("row_non_public_source_url:0", non_public_nested_source_url["errors"])
        self.assertFalse(missing_critical_evidence["ready"])
        self.assertIn("row_missing_critical_field_evidence:0:schedule", missing_critical_evidence["errors"])
        self.assertFalse(unparsed_schedule["ready"])
        self.assertIn("row_unparsed_schedule:0", unparsed_schedule["errors"])
        self.assertFalse(unknown_location["ready"])
        self.assertIn("row_unknown_location:0", unknown_location["errors"])
        self.assertFalse(unresolved_disagreement["ready"])
        self.assertIn("row_unresolved_engine_disagreement:0:schedule", unresolved_disagreement["errors"])
        self.assertFalse(validation_findings["ready"])
        self.assertIn("row_has_validation_findings:0", validation_findings["errors"])
        self.assertFalse(mismatched_field_source_hash["ready"])
        self.assertIn("row_field_source_hash_mismatch:0:schedule", mismatched_field_source_hash["errors"])
        self.assertFalse(missing_page_bbox["ready"])
        self.assertIn("row_missing_critical_field_page_image_sha256:0:schedule", missing_page_bbox["errors"])
        self.assertIn("row_missing_critical_field_bbox_px:0:schedule", missing_page_bbox["errors"])
        self.assertFalse(unpromotable_status["ready"])
        self.assertIn("row_unpromotable_validation_status:0", unpromotable_status["errors"])
        self.assertFalse(manual_without_review["ready"])
        self.assertIn("row_missing_manual_review_approval:0", manual_without_review["errors"])
        self.assertFalse(manual_with_stale_review["ready"])
        self.assertIn("row_stale_manual_review_source_hash:0", manual_with_stale_review["errors"])
        self.assertFalse(manual_with_stale_page["ready"])
        self.assertIn("row_stale_manual_review_page_image:0", manual_with_stale_page["errors"])
        self.assertFalse(source_drift_blocked["ready"])
        self.assertIn("source_drift_report_blocked", source_drift_blocked["errors"])
        self.assertIn("recognized_family_changed", source_drift_blocked["errors"])
        self.assertIn("activity_count_drift", source_drift_blocked["errors"])
        self.assertIn("movie_count_drift", source_drift_blocked["errors"])
        self.assertFalse(dual_run_blocked["ready"])
        self.assertIn("dual_run_report_blocked", dual_run_blocked["errors"])
        self.assertIn("unreviewed_v2_v3_field_diffs", dual_run_blocked["errors"])

    def test_publish_gold_v3_cli_can_require_clean_dual_run_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "preview.json"
            dual_run_path = root / "dual_run.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(
                json.dumps(
                    {
                        "publication_mode": "vision_v3_preview",
                        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                        "rows": [
                            {
                                "source_document_id": "source-doc-1",
                                "source_sha256": "sourcehash",
                                "validation_status": "auto_publishable",
                                "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                                "schedule": {"text": "Daily at 1:30pm", "normalized": {"start_time": "13:30"}},
                                "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
                                "price": {"state": "free"},
                                "field_evidence": {
                                    field: {
                                        "source": {
                                            "crop_sha256": f"{field}crop",
                                            "crop_storage_path": f"{field}.png",
                                        }
                                    }
                                    for field in ("title", "schedule", "location", "fee")
                                },
                            }
                        ],
                    }
                )
            )
            dual_run_path.write_text(
                json.dumps(
                    {
                        "status": "blocked",
                        "publish_blockers": ["unreviewed_new_v3_rows"],
                        "unreviewed_diff_keys": [],
                    }
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "publish_gold_v3.py",
                    str(preview_path),
                    "--flags",
                    str(flags_path),
                    "--require-clean-preview",
                    "--dual-run-report",
                    str(dual_run_path),
                ],
            ):
                with self.assertRaises(SystemExit) as raised:
                    publish_gold_v3.main()

        self.assertEqual(1, raised.exception.code)

    def test_publish_gold_v3_cli_blocks_source_drift_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "preview.json"
            dual_run_path = root / "dual_run.json"
            drift_path = root / "source_drift_report.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(
                json.dumps(
                    {
                        "publication_mode": "vision_v3_preview",
                        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                        "rows": [
                            {
                                "source_document_id": "source-doc-1",
                                "source_sha256": "sourcehash",
                                "validation_status": "auto_publishable",
                                "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                                "schedule": {"text": "Daily at 1:30pm", "normalized": {"start_time": "13:30"}},
                                "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
                                "price": {"state": "free"},
                                "field_evidence": {
                                    field: {
                                        "source": {
                                            "crop_sha256": f"{field}crop",
                                            "crop_storage_path": f"{field}.png",
                                        }
                                    }
                                    for field in ("title", "schedule", "location", "fee")
                                },
                            }
                        ],
                    }
                )
            )
            dual_run_path.write_text(
                json.dumps({"status": "clean", "publish_blockers": [], "unreviewed_diff_keys": []})
            )
            drift_path.write_text(
                json.dumps(
                    {
                        "status": "review_required",
                        "publish_blockers": ["recognized_family_changed"],
                    }
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "publish_gold_v3.py",
                    str(preview_path),
                    "--flags",
                    str(flags_path),
                    "--require-clean-preview",
                    "--dual-run-report",
                    str(dual_run_path),
                    "--source-drift-report",
                    str(drift_path),
                ],
            ):
                with self.assertRaises(SystemExit) as raised:
                    publish_gold_v3.main()

        self.assertEqual(1, raised.exception.code)

    def test_publish_gold_v3_cli_loads_default_dual_run_report_when_present(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "preview.json"
            dual_run_path = root / "v3_dual_run_report.json"
            drift_path = root / "source_drift_report.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(
                json.dumps(
                    {
                        "publication_mode": "vision_v3_preview",
                        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                        "rows": [
                            {
                                "source_document_id": "source-doc-1",
                                "source_sha256": "sourcehash",
                                "validation_status": "auto_publishable",
                                "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                                "schedule": {"text": "Daily at 1:30pm", "normalized": {"start_time": "13:30"}},
                                "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
                                "price": {"state": "free"},
                                "field_evidence": {
                                    field: {
                                        "source": {
                                            "content_sha256": "sourcehash",
                                            "page_number": 1,
                                            "page_image_sha256": "pagehash",
                                            "bbox_px": [10, 20, 100, 40],
                                            "crop_sha256": f"{field}crop",
                                            "crop_storage_path": f"{field}.png",
                                        },
                                        "agreement": "exact_after_normalization",
                                    }
                                    for field in ("title", "schedule", "location", "fee")
                                },
                            }
                        ],
                    }
                )
            )
            dual_run_path.write_text(
                json.dumps(
                    {
                        "status": "clean",
                        "publish_blockers": [],
                        "unreviewed_diff_keys": [],
                        "unreviewed_new_keys": [],
                    }
                )
            )
            drift_path.write_text(json.dumps({"status": "clean", "publish_blockers": []}))

            with patch.object(publish_gold_v3, "DEFAULT_DUAL_RUN_REPORT_PATH", dual_run_path):
                with patch.object(publish_gold_v3, "DEFAULT_SOURCE_DRIFT_REPORT_PATH", drift_path):
                    with patch.object(
                        sys,
                        "argv",
                        [
                            "publish_gold_v3.py",
                            str(preview_path),
                            "--flags",
                            str(flags_path),
                            "--require-clean-preview",
                        ],
                    ):
                        publish_gold_v3.main()

    def test_source_drift_report_flags_changed_fields_for_review(self) -> None:
        old_rows = [
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 1:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            }
        ]
        new_rows = [
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 2:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            },
            {
                "canonical_slug": "campfire",
                "title": "Campfire",
                "schedule": {"text": "Nightly at 6:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            },
        ]

        report = build_source_drift_report(
            old_source_hash="oldhash",
            new_source_hash="newhash",
            old_rows=old_rows,
            new_rows=new_rows,
        )

        self.assertEqual("review_required", report["status"])
        self.assertEqual("oldhash", report["old_hash"])
        self.assertEqual("newhash", report["new_hash"])
        self.assertEqual(1, report["old_activity_count"])
        self.assertEqual(2, report["new_activity_count"])
        self.assertEqual(["Campfire"], report["new_titles"])
        self.assertEqual(["poolside-activities"], [item["canonical_slug"] for item in report["changed_schedules"]])
        self.assertTrue(report["manual_review_required"])
        self.assertTrue(
            review_approval_is_current(
                {"content_sha256": "sourcehash", "page_image_sha256": "pagehash"},
                current_content_sha256="sourcehash",
                current_page_image_sha256="pagehash",
            )
        )

    def test_source_drift_report_blocks_family_and_count_drift_beyond_thresholds(self) -> None:
        old_rows = [
            {
                "candidate_type": "activity",
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 1:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            },
            {
                "candidate_type": "movie",
                "canonical_slug": "movie-under-the-stars",
                "movie_title": "Moana",
                "title": "Movie Under the Stars",
                "schedule": {"text": "Nightly at 8:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            },
        ]
        new_rows = [
            *old_rows,
            {
                "candidate_type": "activity",
                "canonical_slug": "campfire",
                "title": "Campfire",
                "schedule": {"text": "Nightly at 6:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            },
            {
                "candidate_type": "movie",
                "canonical_slug": "movie-under-the-stars-lilo-stitch",
                "movie_title": "Lilo & Stitch",
                "title": "Movie Under the Stars",
                "schedule": {"text": "Thursday at 8:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            },
        ]

        report = build_source_drift_report(
            old_source_hash="oldhash",
            new_source_hash="newhash",
            old_rows=old_rows,
            new_rows=new_rows,
            old_document_family="aframe_recreation",
            new_document_family="vertical_digital_rec_sign",
            activity_count_threshold=0,
            movie_count_threshold=0,
        )

        self.assertEqual("review_required", report["status"])
        self.assertEqual("aframe_recreation", report["old_document_family"])
        self.assertEqual("vertical_digital_rec_sign", report["new_document_family"])
        self.assertEqual(1, report["old_activity_count"])
        self.assertEqual(2, report["new_activity_count"])
        self.assertEqual(1, report["old_movie_count"])
        self.assertEqual(2, report["new_movie_count"])
        self.assertIn("recognized_family_changed", report["publish_blockers"])
        self.assertIn("activity_count_drift", report["publish_blockers"])
        self.assertIn("movie_count_drift", report["publish_blockers"])

        thresholded = build_source_drift_report(
            old_source_hash="oldhash",
            new_source_hash="newhash",
            old_rows=old_rows,
            new_rows=new_rows,
            old_document_family="aframe_recreation",
            new_document_family="aframe_recreation",
            activity_count_threshold=1,
            movie_count_threshold=1,
        )

        self.assertNotIn("recognized_family_changed", thresholded["publish_blockers"])
        self.assertNotIn("activity_count_drift", thresholded["publish_blockers"])
        self.assertNotIn("movie_count_drift", thresholded["publish_blockers"])

    def test_source_drift_report_surfaces_unknown_regions_and_validation_failures(self) -> None:
        new_rows = [
            {
                "candidate_id": "cand-bad-schedule",
                "candidate_type": "activity",
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "validation_findings": ["missing_required_field:schedule"],
            },
            {
                "candidate_id": "cand-good",
                "candidate_type": "activity",
                "canonical_slug": "campfire",
                "title": "Campfire",
                "validation_findings": [],
            },
        ]
        new_regions = [
            {
                "region_id": "region-unknown-1",
                "region_family": "unknown",
                "page_number": 1,
                "bbox_px": [10, 20, 300, 180],
                "text": "Unclassified promo block",
            },
            {
                "region_id": "region-known-1",
                "region_family": "aframe_recreation",
                "page_number": 1,
                "bbox_px": [10, 200, 300, 360],
            },
        ]

        report = build_source_drift_report(
            old_source_hash="samehash",
            new_source_hash="samehash",
            old_rows=[],
            new_rows=new_rows,
            new_regions=new_regions,
            activity_count_threshold=10,
        )

        self.assertEqual("review_required", report["status"])
        self.assertEqual(
            [
                {
                    "candidate_id": "cand-bad-schedule",
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "validation_findings": ["missing_required_field:schedule"],
                }
            ],
            report["validation_failures"],
        )
        self.assertEqual(
            [
                {
                    "region_id": "region-unknown-1",
                    "region_family": "unknown",
                    "page_number": 1,
                    "bbox_px": [10, 20, 300, 180],
                    "text": "Unclassified promo block",
                }
            ],
            report["new_unknown_regions"],
        )
        self.assertIn("validation_failures", report["publish_blockers"])
        self.assertIn("new_unknown_regions", report["publish_blockers"])

    def test_source_drift_report_cli_accepts_family_and_count_thresholds(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            old_path = root / "old.json"
            new_path = root / "new.json"
            regions_path = root / "regions.json"
            output_path = root / "source_drift_report.json"
            old_path.write_text(
                json.dumps(
                    [
                        {
                            "candidate_type": "activity",
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                        }
                    ]
                )
            )
            new_path.write_text(
                json.dumps(
                    [
                        {
                            "candidate_type": "activity",
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                        },
                        {
                            "candidate_type": "movie",
                            "canonical_slug": "movie-under-the-stars",
                            "title": "Movie Under the Stars",
                            "movie_title": "Moana",
                        },
                    ]
                )
            )
            regions_path.write_text(
                json.dumps(
                    [
                        {
                            "region_id": "region-unknown-1",
                            "region_family": "unknown",
                            "page_number": 1,
                            "bbox_px": [10, 20, 100, 80],
                        }
                    ]
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "source_drift_report.py",
                    "--old",
                    str(old_path),
                    "--new",
                    str(new_path),
                    "--old-source-hash",
                    "oldhash",
                    "--new-source-hash",
                    "newhash",
                    "--old-document-family",
                    "aframe_recreation",
                    "--new-document-family",
                    "aframe_recreation",
                    "--activity-count-threshold",
                    "0",
                    "--movie-count-threshold",
                    "0",
                    "--new-regions",
                    str(regions_path),
                    "--output",
                    str(output_path),
                ],
            ):
                source_drift_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("aframe_recreation", report["old_document_family"])
        self.assertEqual("aframe_recreation", report["new_document_family"])
        self.assertEqual(1, report["old_activity_count"])
        self.assertEqual(1, report["new_activity_count"])
        self.assertEqual(0, report["old_movie_count"])
        self.assertEqual(1, report["new_movie_count"])
        self.assertEqual(["movie_count_drift", "new_unknown_regions"], report["publish_blockers"])
        self.assertEqual("region-unknown-1", report["new_unknown_regions"][0]["region_id"])

    def test_source_drift_report_quarter_batch_compares_candidate_directories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            old_dir = root / "old_candidates"
            new_dir = root / "new_candidates"
            output_path = root / "source_drift_report.json"
            old_dir.mkdir()
            new_dir.mkdir()
            (old_dir / "oldhash.validated.json").write_text(
                json.dumps(
                    [
                        {
                            "candidate_type": "activity",
                            "calendar_group_key": "boardwalk",
                            "content_sha256": "oldhash",
                            "document_family": "aframe_recreation",
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "schedule": {"text": "Daily at 1:30pm"},
                            "location": {"label": "Luna Park Pool Deck"},
                            "price": {"state": "free"},
                        }
                    ]
                )
            )
            (new_dir / "newhash.validated.json").write_text(
                json.dumps(
                    [
                        {
                            "candidate_type": "activity",
                            "calendar_group_key": "boardwalk",
                            "content_sha256": "newhash",
                            "document_family": "aframe_recreation",
                            "edition": "fy26-q4-0826",
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "schedule": {"text": "Daily at 2:30pm"},
                            "location": {"label": "Luna Park Pool Deck"},
                            "price": {"state": "free"},
                        }
                    ]
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "source_drift_report.py",
                    "--quarter",
                    "fy26-q4",
                    "--old-candidates-dir",
                    str(old_dir),
                    "--new-candidates-dir",
                    str(new_dir),
                    "--output",
                    str(output_path),
                ],
            ):
                source_drift_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("v3_quarter_source_drift", report["report_kind"])
        self.assertEqual("fy26-q4", report["quarter"])
        self.assertEqual("review_required", report["status"])
        self.assertEqual(1, report["summary"]["source_count"])
        self.assertEqual(["source_hash_changed"], report["publish_blockers"])
        source_report = report["source_reports"][0]
        self.assertEqual("boardwalk", source_report["calendar_group_key"])
        self.assertEqual("oldhash", source_report["old_hash"])
        self.assertEqual("newhash", source_report["new_hash"])
        self.assertEqual(["poolside-activities"], [item["canonical_slug"] for item in source_report["changed_schedules"]])

    def test_schedule_normalization_handles_recurring_point_time_and_phrase_schedules(self) -> None:
        daily = normalize_schedule_text("Daily from 8:00am–11:00pm")
        weekly = normalize_schedule_text("Monday, Wednesday and Friday from 4:00pm-5:00pm")
        point_time = normalize_schedule_text("Tuesday and Thursday at 8:30pm")
        phrase = normalize_schedule_text("Dawn to Dusk")

        self.assertEqual("recurring", daily["schedule_type"])
        self.assertEqual(ALL_DAYS, daily["days_of_week"])
        self.assertEqual("08:00", daily["start_time"])
        self.assertEqual("23:00", daily["end_time"])
        self.assertEqual("America/New_York", daily["timezone"])
        self.assertEqual("schedule_parser_v3", daily["parser"])
        self.assertEqual("validated", daily["confidence"])

        self.assertEqual(["Monday", "Wednesday", "Friday"], weekly["days_of_week"])
        self.assertEqual("16:00", weekly["start_time"])
        self.assertEqual("17:00", weekly["end_time"])
        self.assertEqual(["Tuesday", "Thursday"], point_time["days_of_week"])
        self.assertEqual("20:30", point_time["start_time"])
        self.assertNotIn("end_time", point_time)
        self.assertEqual("phrase", phrase["schedule_type"])
        self.assertEqual("dawn_to_dusk", phrase["phrase"])

    def test_engine_agreement_is_field_specific_after_deterministic_normalization(self) -> None:
        schedule = evaluate_field_agreement(
            "schedule",
            primary_text="Daily from 8:00am-11:00pm",
            secondary_text="Daily 8:00 AM - 11:00 PM",
        )
        title = evaluate_field_agreement(
            "title",
            primary_text="Poolside Activities ($)",
            secondary_text="  POOLSIDE ACTIVITIES ($) ",
        )
        location = evaluate_field_agreement(
            "location",
            primary_text="Luna Park Pool Deck",
            secondary_text="luna park pool deck",
        )
        fee = evaluate_field_agreement(
            "fee",
            primary_text="Poolside Activities ($)",
            secondary_text="($) There is a fee associated with this activity.",
        )
        bad_location = evaluate_field_agreement(
            "location",
            primary_text="Luna Park Pool Deck",
            secondary_text="Village Green Lawn",
        )

        self.assertEqual("exact_after_normalization", schedule["agreement"])
        self.assertEqual("08:00", schedule["normalized_value"]["start_time"])
        self.assertEqual("exact_after_normalization", title["agreement"])
        self.assertEqual("poolside activities ($)", title["normalized_value"])
        self.assertEqual("luna_park_pool_deck", location["normalized_value"])
        self.assertEqual("exact_after_normalization", fee["agreement"])
        self.assertTrue(fee["normalized_value"])
        self.assertEqual("disagreement", bad_location["agreement"])

    def test_location_normalization_uses_controlled_dictionary_and_blocks_unknowns(self) -> None:
        known = normalize_location_text("  Village Green Lawn ")
        unknown = normalize_location_text("Somewhere near the lobby")

        self.assertEqual("village_green_lawn", known["location_id"])
        self.assertFalse(known["manual_review_required"])
        self.assertEqual("unknown", unknown["location_id"])
        self.assertTrue(unknown["manual_review_required"])

    def test_runtime_lineage_records_reproducibility_surface_and_stable_hash(self) -> None:
        config = {
            "pipeline_version": "vision_v3_001",
            "render": {"pdf_engine": "pypdfium2", "default_dpi": 450},
            "ocr": {"primary": "paddleocr_ppstructurev3", "secondary": "rapidocr"},
        }

        first = build_runtime_lineage(
            config=config,
            package_versions={"pypdfium2": "4.30.0", "Pillow": "10.0.0"},
            model_asset_hashes={"paddleocr_ppstructurev3": "modelhash"},
            git_sha="deadbeef",
            container_image_digest="sha256:abc",
        )
        second = build_runtime_lineage(
            config=json.loads(json.dumps(config)),
            package_versions={"Pillow": "10.0.0", "pypdfium2": "4.30.0"},
            model_asset_hashes={"paddleocr_ppstructurev3": "modelhash"},
            git_sha="deadbeef",
            container_image_digest="sha256:abc",
        )

        self.assertEqual(first["config_hash"], second["config_hash"])
        self.assertEqual(first["lineage_hash"], second["lineage_hash"])
        self.assertEqual("deadbeef", first["git_sha"])
        self.assertEqual("sha256:abc", first["container_image_digest"])
        self.assertEqual("modelhash", first["model_asset_hashes"]["paddleocr_ppstructurev3"])

    def test_quality_metrics_summarize_page_engine_region_and_token_health(self) -> None:
        snapshot = {
            "source_pages": [
                {
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "width_px": 400,
                    "height_px": 300,
                }
            ],
            "engine_runs": [
                {"engine": "paddleocr_ppstructurev3", "status": "success", "tokens": [{"text": "Poolside"}]},
                {"engine": "rapidocr", "status": "unavailable", "tokens": []},
            ],
            "regions": [{"region_id": "r1"}, {"region_id": "r2"}],
            "tokens": [{"engine": "paddleocr_ppstructurev3"}, {"engine": "rapidocr"}],
        }

        quality = compute_snapshot_quality(snapshot)

        self.assertEqual(1, quality["page_count"])
        self.assertEqual(2, quality["region_count"])
        self.assertEqual(2, quality["token_count"])
        self.assertEqual(1, quality["engine_status_counts"]["success"])
        self.assertEqual(1, quality["engine_status_counts"]["unavailable"])
        self.assertEqual("pagehash", quality["pages"][0]["page_image_sha256"])
        self.assertIn("low_quality_image:page_1", quality["findings"])

    def test_source_metrics_v3_rolls_up_per_source_quality_and_candidate_counts(self) -> None:
        snapshots = [
            {
                "source_sha256": "hash-1",
                "source_type": "pdf",
                "document_family": "aframe_recreation",
                "source_pages": [{"page_number": 1}, {"page_number": 2}],
                "quality": {"ocr_success": True},
                "regions": [{"region_id": "r1"}, {"region_id": "r2"}],
            },
            {
                "source_sha256": "hash-2",
                "source_type": "image",
                "document_family": "vertical_digital_rec_sign",
                "source_pages": [{"page_number": 1}],
                "status": "parser_error",
                "quality": {"ocr_success": False, "findings": ["missing_ocr_tokens"]},
                "regions": [],
            },
        ]
        candidates = [
            {
                "content_sha256": "hash-1",
                "candidate_type": "activity",
                "validation_status": "auto_publishable",
            },
            {
                "content_sha256": "hash-1",
                "candidate_type": "movie",
                "validation_status": "needs_review",
            },
            {
                "content_sha256": "hash-2",
                "candidate_type": "activity",
                "validation_status": "rejected",
            },
        ]

        report = build_source_metrics_report(snapshots=snapshots, candidates=candidates)

        self.assertEqual("vision_v3_source_metrics", report["report_kind"])
        self.assertEqual(2, report["summary"]["source_count"])
        by_hash = {row["source_sha256"]: row for row in report["sources"]}
        self.assertEqual("pdf", by_hash["hash-1"]["source_type"])
        self.assertEqual(2, by_hash["hash-1"]["page_count"])
        self.assertTrue(by_hash["hash-1"]["page_render_success"])
        self.assertTrue(by_hash["hash-1"]["ocr_success"])
        self.assertEqual("aframe_recreation", by_hash["hash-1"]["recognized_family"])
        self.assertEqual(2, by_hash["hash-1"]["region_count"])
        self.assertEqual(1, by_hash["hash-1"]["activity_candidate_count"])
        self.assertEqual(1, by_hash["hash-1"]["movie_candidate_count"])
        self.assertEqual(1, by_hash["hash-1"]["auto_publishable_count"])
        self.assertEqual(1, by_hash["hash-1"]["needs_review_count"])
        self.assertEqual(0, by_hash["hash-1"]["rejected_count"])
        self.assertEqual(0, by_hash["hash-1"]["parser_error_count"])
        self.assertEqual("image", by_hash["hash-2"]["source_type"])
        self.assertFalse(by_hash["hash-2"]["ocr_success"])
        self.assertEqual(1, by_hash["hash-2"]["rejected_count"])
        self.assertEqual(1, by_hash["hash-2"]["parser_error_count"])

    def test_source_metrics_v3_reports_per_field_failure_rates(self) -> None:
        snapshots = [{"source_sha256": "hash-1", "source_pages": [{"page_number": 1}]}]
        candidates = [
            {
                "content_sha256": "hash-1",
                "candidate_type": "activity",
                "title": "Poolside Games",
                "normalized_location_id": "main_pool",
                "schedule_normalized": {"days_of_week": ["monday"], "start_time": "13:00"},
                "field_evidence": {
                    "fee": {"agreement": "exact_after_normalization"},
                    "description": {"engines": [{"confidence": 0.92}]},
                },
                "validation_findings": [],
            },
            {
                "content_sha256": "hash-1",
                "candidate_type": "activity",
                "title": "",
                "normalized_location_id": "unknown",
                "schedule_normalized": {},
                "field_evidence": {
                    "fee": {"agreement": "conflict"},
                    "description": {"engines": [{"confidence": 0.41}]},
                },
                "validation_findings": [
                    "missing_required_field:location",
                    "unparsed_schedule",
                    "fee_marker_conflict",
                    "engine_disagreement:schedule",
                    "candidate_warning:description:text_quality_low",
                ],
            },
        ]

        report = build_source_metrics_report(snapshots=snapshots, candidates=candidates)

        field_metrics = report["summary"]["field_metrics"]
        self.assertEqual(0.5, field_metrics["title_missing_rate"])
        self.assertEqual(0.5, field_metrics["location_missing_rate"])
        self.assertEqual(0.5, field_metrics["location_unknown_rate"])
        self.assertEqual(0.5, field_metrics["schedule_missing_rate"])
        self.assertEqual(0.5, field_metrics["schedule_unparsed_rate"])
        self.assertEqual(0.5, field_metrics["fee_disagreement_rate"])
        self.assertEqual(0.5, field_metrics["engine_disagreement_rate"])
        self.assertEqual(0.5, field_metrics["description_low_confidence_rate"])

    def test_source_metrics_v3_cli_writes_report_from_snapshot_and_candidate_directories(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            snapshots_dir = root / "snapshots"
            candidates_dir = root / "candidates"
            output_path = root / "source_metrics.json"
            snapshots_dir.mkdir()
            candidates_dir.mkdir()
            (snapshots_dir / "hash-1.vision.json").write_text(
                json.dumps(
                    {
                        "source_sha256": "hash-1",
                        "source_type": "pdf",
                        "document_family": "aframe_recreation",
                        "source_pages": [{"page_number": 1}],
                        "quality": {"ocr_success": True},
                        "regions": [{"region_id": "r1"}],
                    }
                )
            )
            (candidates_dir / "hash-1.json").write_text(
                json.dumps(
                    [
                        {
                            "content_sha256": "hash-1",
                            "candidate_type": "activity",
                            "validation_status": "auto_publishable",
                        }
                    ]
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "source_metrics_v3.py",
                    "--snapshots",
                    str(snapshots_dir),
                    "--candidates",
                    str(candidates_dir),
                    "--output",
                    str(output_path),
                ],
            ):
                source_metrics_v3.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("vision_v3_source_metrics", report["report_kind"])
        self.assertEqual(1, report["summary"]["source_count"])
        self.assertEqual(1, report["sources"][0]["auto_publishable_count"])

    def test_debug_overlays_write_reviewable_region_and_engine_images(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page_path = root / "page.png"
            Image.new("RGB", (160, 100), color=(255, 255, 255)).save(page_path, "PNG")
            snapshot = {
                "source_sha256": "sourcehash",
                "source_pages": [
                    {
                        "page_number": 1,
                        "page_image_path": str(page_path),
                        "page_image_sha256": "pagehash",
                        "width_px": 160,
                        "height_px": 100,
                    }
                ],
                "regions": [
                    {
                        "region_id": "r1",
                        "region_type": "activity_block",
                        "page_number": 1,
                        "bbox_px": [10, 10, 90, 50],
                    }
                ],
                "engine_runs": [
                    {
                        "engine": "paddleocr_ppstructurev3",
                        "status": "success",
                        "tokens": [
                            {
                                "text": "Poolside",
                                "page_number": 1,
                                "bbox_px": [12, 14, 50, 28],
                            }
                        ],
                    },
                    {
                        "engine": "rapidocr",
                        "status": "success",
                        "tokens": [
                            {
                                "text": "Poolside",
                                "page_number": 1,
                                "bbox_px": [14, 16, 52, 30],
                            }
                        ],
                    },
                ],
            }

            overlays = build_debug_overlays(snapshot, output_dir=root / "overlays")

            self.assertEqual("sourcehash", overlays["source_sha256"])
            self.assertTrue(Path(overlays["regions"][0]["overlay_path"]).exists())
            self.assertTrue(Path(overlays["engines"]["paddleocr_ppstructurev3"][0]["overlay_path"]).exists())
            self.assertTrue(Path(overlays["engines"]["rapidocr"][0]["overlay_path"]).exists())
            self.assertTrue(overlays["regions"][0]["overlay_sha256"])

    def test_review_schema_records_hash_bound_approval_and_fixture_candidate(self) -> None:
        task = {
            "task_id": "cand-1",
            "task_type": "unparsed_schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "crophash",
            "candidate": {
                "candidate_id": "cand-1",
                "calendar_group_key": "boardwalk",
                "candidate_type": "activity",
                "normalized_title": "Poolside Activities",
            },
        }

        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            approved_fields={
                "schedule": {
                    "raw_value": "Daily at 1:30pm",
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "13:30",
                        "timezone": "America/New_York",
                    },
                }
            },
            reason="Visible in crop.",
            decided_at="2026-06-28T12:00:00Z",
        )
        fixture_candidate = review_decision_creates_fixture_candidate(decision)

        self.assertEqual("approve", decision["decision"])
        self.assertEqual("sourcehash", decision["content_sha256"])
        self.assertEqual("pagehash", decision["page_image_sha256"])
        self.assertEqual("schedule.png", decision["field_crop"])
        self.assertEqual("crophash", decision["field_crop_sha256"])
        self.assertTrue(
            review_approval_is_current(
                decision,
                current_content_sha256="sourcehash",
                current_page_image_sha256="pagehash",
            )
        )
        self.assertEqual("review_fixture_candidate_v3", fixture_candidate["fixture_kind"])
        self.assertEqual("cand-1", fixture_candidate["candidate_id"])
        self.assertEqual("Daily at 1:30pm", fixture_candidate["approved_fields"]["schedule"]["raw_value"])

    def test_review_schema_exports_approved_decisions_to_fixture_candidates_file(self) -> None:
        task = {
            "task_id": "cand-1",
            "task_type": "unparsed_schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "crophash",
            "candidate": {
                "candidate_id": "cand-1",
                "calendar_group_key": "boardwalk",
                "candidate_type": "activity",
            },
        }
        approved = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            approved_fields={"schedule": {"raw_value": "Daily at 1:30pm"}},
            reason="Visible in crop.",
            decided_at="2026-06-28T12:00:00Z",
        )
        rejected = build_review_decision(
            {**task, "task_id": "cand-2", "candidate": {"candidate_id": "cand-2"}},
            reviewer="josh",
            decision="reject",
            reason="Not enough evidence.",
            decided_at="2026-06-28T12:01:00Z",
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "fixture_candidates.json"
            decisions_path.write_text(json.dumps([approved, rejected]))

            report = review_schema_v3.export_review_fixture_candidates(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(2, report["summary"]["decision_count"])
        self.assertEqual(1, report["summary"]["fixture_candidate_count"])
        self.assertEqual(1, report["summary"]["skipped_non_approval_count"])
        self.assertEqual("review_fixture_candidates_v3", payload["fixture_kind"])
        self.assertEqual("cand-1", payload["candidates"][0]["candidate_id"])
        self.assertEqual("sourcehash", payload["candidates"][0]["content_sha256"])

    def test_dual_run_report_surfaces_field_diffs_and_unreviewed_publish_blockers(self) -> None:
        v2_rows = [
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "calendar_group_key": "boardwalk",
                "schedule": {"text": "Daily at 1:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            },
            {
                "canonical_slug": "campfire",
                "title": "Campfire",
                "calendar_group_key": "boardwalk",
                "schedule": {"text": "Nightly at 6:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            },
        ]
        v3_preview = {
            "rows": [
                {
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Daily at 2:30pm"},
                    "location": {"label": "Luna Park Pool Deck"},
                    "price": {"state": "free"},
                    "field_evidence": {"schedule": {"source": {"crop_sha256": "schedulecrop"}}},
                    "validation_status": "auto_publishable",
                },
                {
                    "canonical_slug": "movie-under-the-stars",
                    "title": "Movie Under the Stars",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Tuesday at 8:30pm"},
                    "location": {"label": "Village Green Lawn"},
                    "price": {"state": "free"},
                    "field_evidence": {"schedule": {"source": {"crop_sha256": "moviecrop"}}},
                    "validation_status": "needs_review",
                },
            ],
            "summary": {"skipped_not_publishable": 1},
        }

        report = build_dual_run_report(v2_rows=v2_rows, v3_preview=v3_preview, reviewed_diff_keys=[])

        self.assertEqual("blocked", report["status"])
        self.assertEqual(2, report["v2_count"])
        self.assertEqual(2, report["v3_count"])
        self.assertEqual(["movie-under-the-stars"], report["new_in_v3"])
        self.assertEqual(["campfire"], report["missing_in_v3"])
        self.assertEqual(
            ["boardwalk:poolside-activities:schedule"],
            [diff["diff_key"] for diff in report["field_diffs"]],
        )
        self.assertEqual(["boardwalk:poolside-activities:schedule"], report["unreviewed_diff_keys"])
        self.assertIn("v3_candidate_not_publishable:movie-under-the-stars", report["publish_blockers"])

    def test_dual_run_report_blocks_unreviewed_new_v3_rows(self) -> None:
        v3_preview = {
            "rows": [
                {
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Daily at 1:30pm"},
                    "location": {"label": "Luna Park Pool Deck"},
                    "price": {"state": "free"},
                    "field_evidence": {"schedule": {"source": {"crop_sha256": "schedulecrop"}}},
                    "validation_status": "auto_publishable",
                }
            ],
            "summary": {"skipped_not_publishable": 0},
        }

        blocked = build_dual_run_report(v2_rows=[], v3_preview=v3_preview, reviewed_diff_keys=[])
        reviewed = build_dual_run_report(
            v2_rows=[],
            v3_preview=v3_preview,
            reviewed_diff_keys=["boardwalk:poolside-activities:new_record"],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["boardwalk:poolside-activities"], blocked["unreviewed_new_keys"])
        self.assertIn("unreviewed_new_v3_rows", blocked["publish_blockers"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual([], reviewed["unreviewed_new_keys"])

    def test_dual_run_report_cli_loads_reviewed_diff_keys_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            v2_path = root / "v2.json"
            v3_path = root / "v3.json"
            reviewed_path = root / "reviewed.json"
            output_path = root / "dual_run.json"
            v2_path.write_text(
                json.dumps(
                    [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "calendar_group_key": "boardwalk",
                            "schedule": {"text": "Daily at 1:30pm"},
                            "location": {"label": "Luna Park Pool Deck"},
                            "price": {"state": "free"},
                        }
                    ]
                )
            )
            v3_path.write_text(
                json.dumps(
                    {
                        "rows": [
                            {
                                "canonical_slug": "poolside-activities",
                                "title": "Poolside Activities",
                                "calendar_group_key": "boardwalk",
                                "schedule": {"text": "Daily at 2:30pm"},
                                "location": {"label": "Luna Park Pool Deck"},
                                "price": {"state": "free"},
                                "validation_status": "auto_publishable",
                                "field_evidence": {"schedule": {"source": {"crop_sha256": "schedulecrop"}}},
                            }
                        ]
                    }
                )
            )
            reviewed_path.write_text(
                json.dumps({"reviewed_diff_keys": ["boardwalk:poolside-activities:schedule"]})
            )

            with patch.object(
                sys,
                "argv",
                [
                    "v3_dual_run_report.py",
                    "--v2",
                    str(v2_path),
                    "--v3",
                    str(v3_path),
                    "--reviewed-diff-keys-file",
                    str(reviewed_path),
                    "--output",
                    str(output_path),
                ],
            ):
                v3_dual_run_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("clean", report["status"])
        self.assertEqual(["boardwalk:poolside-activities:schedule"], report["reviewed_diff_keys"])
        self.assertEqual([], report["unreviewed_diff_keys"])

    def test_dual_run_report_blocks_unprocessed_sources_without_source_error(self) -> None:
        expected_sources = [
            {"source_document_id": "source-doc-1", "calendar_group_key": "boardwalk"},
            {"source_document_id": "source-doc-2", "calendar_group_key": "fort-wilderness"},
            {"source_document_id": "source-doc-3", "calendar_group_key": "pop-century"},
        ]
        source_statuses = [
            {"source_document_id": "source-doc-1", "status": "processed"},
            {"source_document_id": "source-doc-3", "status": "source_error", "message": "download failed"},
        ]

        blocked = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=source_statuses,
        )
        clean = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=[
                *source_statuses,
                {"source_document_id": "source-doc-2", "status": "processed"},
            ],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["source-doc-2"], blocked["source_coverage"]["unprocessed_source_ids"])
        self.assertEqual(["source-doc-3"], blocked["source_coverage"]["source_error_ids"])
        self.assertIn("v3_unprocessed_sources", blocked["publish_blockers"])
        self.assertEqual("clean", clean["status"])
        self.assertEqual([], clean["source_coverage"]["unprocessed_source_ids"])

    def test_source_status_v3_maps_expected_sources_to_processed_error_or_unprocessed(self) -> None:
        expected_sources = [
            {
                "source_document_id": "source-doc-1",
                "content_sha256": "hash-1",
                "calendar_group_key": "boardwalk",
            },
            {
                "source_document_id": "source-doc-2",
                "content_sha256": "hash-2",
                "calendar_group_key": "fort-wilderness",
                "status": "source_error",
                "message": "download failed",
            },
            {
                "source_document_id": "source-doc-3",
                "content_sha256": "hash-3",
                "calendar_group_key": "pop-century",
            },
        ]
        snapshots = [
            {
                "source_sha256": "hash-1",
                "status": "ocr_complete",
                "snapshot_path": "snapshots/hash-1.vision.json",
                "quality": {"ocr_success": True},
            }
        ]

        statuses = build_v3_source_statuses(expected_sources=expected_sources, snapshots=snapshots)

        self.assertEqual(
            ["processed", "source_error", "unprocessed"],
            [status["status"] for status in statuses],
        )
        self.assertEqual("source-doc-1", statuses[0]["source_document_id"])
        self.assertEqual("snapshots/hash-1.vision.json", statuses[0]["snapshot_path"])
        self.assertEqual("download failed", statuses[1]["message"])
        self.assertEqual("missing_v3_snapshot", statuses[2]["message"])

    def test_source_status_v3_preserves_parser_error_snapshots(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-parser",
                    "content_sha256": "hash-parser",
                    "calendar_group_key": "boardwalk",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-parser",
                    "status": "parser_error",
                    "errors": ["region_segmentation_failed"],
                    "snapshot_path": "snapshots/hash-parser.vision.json",
                }
            ],
        )

        self.assertEqual("parser_error", statuses[0]["status"])
        self.assertEqual("region_segmentation_failed", statuses[0]["message"])

    def test_source_status_v3_cli_writes_status_artifact_from_snapshot_directory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            expected_path = root / "expected_sources.json"
            snapshots_dir = root / "snapshots"
            output_path = root / "source_statuses.json"
            snapshots_dir.mkdir()
            expected_path.write_text(
                json.dumps(
                    [
                        {
                            "source_document_id": "source-doc-1",
                            "content_sha256": "hash-1",
                            "calendar_group_key": "boardwalk",
                        }
                    ]
                )
            )
            (snapshots_dir / "hash-1.vision.json").write_text(
                json.dumps({"source_sha256": "hash-1", "status": "ocr_complete", "path": "hash-1.vision.json"})
            )

            with patch.object(
                sys,
                "argv",
                [
                    "source_status_v3.py",
                    "--expected-sources",
                    str(expected_path),
                    "--snapshots",
                    str(snapshots_dir),
                    "--output",
                    str(output_path),
                ],
            ):
                source_status_v3.main()

            statuses = json.loads(output_path.read_text())

        self.assertEqual(1, len(statuses))
        self.assertEqual("processed", statuses[0]["status"])
        self.assertEqual("source-doc-1", statuses[0]["source_document_id"])

    def test_dual_run_report_cli_accepts_source_coverage_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            v2_path = root / "v2.json"
            v3_path = root / "v3.json"
            expected_sources_path = root / "expected_sources.json"
            source_statuses_path = root / "source_statuses.json"
            review_tasks_path = root / "review_tasks.json"
            output_path = root / "dual_run.json"
            v2_path.write_text(json.dumps([]))
            v3_path.write_text(json.dumps({"rows": []}))
            expected_sources_path.write_text(json.dumps([{"source_document_id": "source-doc-1"}]))
            source_statuses_path.write_text(json.dumps([{"source_document_id": "source-doc-1", "status": "parser_error"}]))
            review_tasks_path.write_text(json.dumps([{"source_document_id": "source-doc-1", "task_type": "parser_error"}]))

            with patch.object(
                sys,
                "argv",
                [
                    "v3_dual_run_report.py",
                    "--v2",
                    str(v2_path),
                    "--v3",
                    str(v3_path),
                    "--expected-sources",
                    str(expected_sources_path),
                    "--source-statuses",
                    str(source_statuses_path),
                    "--review-tasks",
                    str(review_tasks_path),
                    "--output",
                    str(output_path),
                ],
            ):
                v3_dual_run_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("clean", report["status"])
        self.assertEqual(1, report["source_coverage"]["expected_source_count"])
        self.assertEqual(["source-doc-1"], report["source_coverage"]["parser_error_ids"])
        self.assertEqual([], report["source_coverage"]["parser_error_without_review_task_ids"])

    def test_dual_run_report_blocks_parser_error_sources_without_review_tasks(self) -> None:
        expected_sources = [{"source_document_id": "source-doc-parser"}]
        source_statuses = [{"source_document_id": "source-doc-parser", "status": "parser_error"}]

        blocked = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=source_statuses,
            review_tasks=[],
        )
        reviewed = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=source_statuses,
            review_tasks=[{"source_document_id": "source-doc-parser", "task_type": "parser_error"}],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["source-doc-parser"], blocked["source_coverage"]["parser_error_ids"])
        self.assertEqual(["source-doc-parser"], blocked["source_coverage"]["parser_error_without_review_task_ids"])
        self.assertIn("parser_error_without_review_task", blocked["publish_blockers"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual([], reviewed["source_coverage"]["parser_error_without_review_task_ids"])


if __name__ == "__main__":
    unittest.main()
