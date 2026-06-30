import json
import importlib
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
from scripts.ingest.ocr.docling_adapter import DoclingAdapter
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
from scripts.ingest import trust_report
from scripts.ingest import v3_dual_run_report
from scripts.ingest.v3_dual_run_report import build_dual_run_report
from scripts.ingest import validate_v3
from scripts.ingest.validate_v3 import validate_candidate
from scripts.ingest import vision_snapshot
from scripts.ingest.vision_snapshot import build_vision_snapshot


def publish_field_evidence_values(field: str) -> dict[str, Any]:
    raw_value = {
        "title": "Poolside Activities",
        "schedule": "Daily at 1:30pm",
        "location": "Village Green Lawn",
        "fee": "No fee marker present",
    }[field]
    return {
        "raw_value": raw_value,
        "normalized_value": {
            "title": "Poolside Activities",
            "schedule": {
                "schedule_type": "recurring",
                "days_of_week": ALL_DAYS,
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "location": "village_green_lawn",
            "fee": False,
        }[field],
        "engines": [
            {"engine": "paddleocr_ppstructurev3", "text": raw_value, "confidence": 0.97},
            {"engine": "rapidocr", "text": raw_value, "confidence": 0.94},
        ],
    }


def clean_publish_v3_preview(*, generated_at: str = "2026-06-28T12:00:00+00:00") -> dict[str, Any]:
    row = {
        "source_document_id": "source-doc-1",
        "source_sha256": "sourcehash",
        "source_kind": "official_pdf",
        "source_role": "resort_pdf",
        "http_status": 200,
        "currentness": "current",
        "captured_at": generated_at,
        "validation_status": "auto_publishable",
        "calendar_group_key": "boardwalk",
        "document_family": "aframe_recreation",
        "canonical_page_image_sha256s": ["pagehash"],
        "source_pages": [
            {
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "page_image_path": "page.png",
            }
        ],
        "region_id": "page-001-region-04",
        "region_type": "resort_activities_section",
        "pipeline_version": "vision_v3_001",
        "config_hash": "confighash",
        "runtime_lineage": {
            "config_hash": "confighash",
            "lineage_hash": "lineagehash",
            "git_sha": "deadbeef",
            "config": {
                "ocr": {
                    "primary": {"engine": "paddleocr_ppstructurev3"},
                    "secondary": {"engine": "rapidocr"},
                }
            },
            "package_versions": {"pypdfium2": "4.30.0"},
            "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
            "ocr_engine_configs": {
                "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                "rapidocr": {"engine": "rapidocr"},
            },
        },
        "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
        "title": "Poolside Activities",
        "schedule": {
            "text": "Daily at 1:30pm",
            "normalized": {
                "schedule_type": "recurring",
                "days_of_week": ALL_DAYS,
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
        },
        "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
        "price": {"state": "free"},
        "field_evidence": {
            field: {
                **publish_field_evidence_values(field),
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
        "source_spans": {
            "title": [{"page": 1, "text": "Poolside Activities"}],
            "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
            "location": [{"page": 1, "text": "Village Green Lawn"}],
            "fee": [{"page": 1, "text": "No fee marker present"}],
        },
    }
    row["field_evidence"]["region"] = {
        "source": {
            "content_sha256": "sourcehash",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [0, 0, 200, 200],
            "crop_storage_path": "region.png",
            "crop_sha256": "regioncrop",
        },
        "agreement": "not_required",
    }
    return {
        "publication_mode": "vision_v3_preview",
        "generated_at": generated_at,
        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
        "rows": [row],
    }


def clean_dual_run_coverage_report(preview: dict[str, Any] = None) -> dict[str, Any]:
    bound_preview = preview or clean_publish_v3_preview()
    return {
        "generated_at": "2026-06-28T12:01:00+00:00",
        "status": "clean",
        "publish_blockers": [],
        "unreviewed_diff_keys": [],
        "unreviewed_new_keys": [],
        "v3_count": 1,
        "v3_source_hashes": ["sourcehash"],
        "v3_preview_fingerprint": publish_gold_v3._dual_run_preview_fingerprint(bound_preview),
        "source_coverage": {
            "expected_source_count": 1,
            "processed_source_count": 1,
            "source_error_count": 0,
            "unprocessed_source_ids": [],
            "source_error_ids": [],
            "parser_error_ids": [],
            "stale_source_status_ids": [],
            "stale_source_status_config_ids": [],
            "stale_source_status_pipeline_ids": [],
            "parser_error_without_review_task_ids": [],
            "source_error_without_review_task_ids": [],
        },
    }


def clean_source_drift_report(*, generated_at: str = "2026-06-28T12:01:00+00:00") -> dict[str, Any]:
    return {
        "generated_at": generated_at,
        "status": "clean",
        "publish_blockers": [],
        "summary": {"source_count": 1, "clean_count": 1, "review_required_count": 0},
        "source_reports": [
            {
                "source_document_id": "source-doc-1",
                "calendar_group_key": "boardwalk",
                "old_hash": "sourcehash",
                "new_hash": "sourcehash",
                "status": "clean",
                "publish_blockers": [],
            }
        ],
    }


def empty_review_queue_cli_defaults(
    root: Path,
    *,
    include_source_statuses: bool = True,
    include_existing_gold: bool = True,
    include_gold_conflicts: bool = True,
    include_source_drift_report: bool = True,
    include_dual_run_report: bool = True,
) -> list[str]:
    empty_list_path = root / "empty_review_queue_default_list.json"
    empty_report_path = root / "empty_review_queue_default_report.json"
    empty_list_path.write_text("[]")
    empty_report_path.write_text("{}")
    args: list[str] = []
    if include_source_statuses:
        args.extend(["--source-statuses", str(empty_list_path)])
    if include_existing_gold:
        args.extend(["--existing-gold", str(empty_list_path)])
    if include_gold_conflicts:
        args.extend(["--gold-conflicts", str(empty_list_path)])
    if include_source_drift_report:
        args.extend(["--source-drift-report", str(empty_report_path)])
    if include_dual_run_report:
        args.extend(["--dual-run-report", str(empty_report_path)])
    return args


class VisionV3ScaffoldingTests(unittest.TestCase):
    def test_location_normalization_covers_observed_v3_resort_locations(self) -> None:
        expected_locations = {
            "Old Port Royale Lobby": "old_port_royale_lobby",
            "Doubloon Lagoon Pool Deck": "doubloon_lagoon_pool_deck",
            "Fantasia Pool Deck": "fantasia_pool_deck",
            "Beach Pool Deck": "beach_pool_deck",
            "Copper Creek Springs Pool": "copper_creek_springs_pool",
            "Copper Creek Springs Pool Deck": "copper_creek_springs_pool_deck",
            "Throughout the Main Building": "throughout_the_main_building",
            "Papa's Den near the Lobby": "papas_den_near_the_lobby",
            "Note'able Games Arcade": "noteable_games_arcade",
            "Throughout Disney's Riviera Resort": "throughout_disneys_riviera_resort",
            "Movie Lawn near the Big Blue Pool": "movie_lawn_near_the_big_blue_pool",
            "Movie Lawn": "movie_lawn",
            "Hakuna Matata Playground": "hakuna_matata_playground",
            "Near the Sandcastle Pool Area Tennis Courts": "near_the_sandcastle_pool_area_tennis_courts",
            "Toledo - Tapas, Steak & Seafood": "toledo_tapas_steak_and_seafood",
        }

        for raw_text, location_id in expected_locations.items():
            with self.subTest(raw_text=raw_text):
                self.assertEqual(location_id, normalize_location_text(raw_text)["location_id"])

        agreement = evaluate_field_agreement(
            "location",
            primary_text="Beach Pool Deck",
            secondary_text="beach pool deck",
        )
        self.assertEqual("exact_after_normalization", agreement["agreement"])
        self.assertEqual("beach_pool_deck", agreement["normalized_value"])

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

    def test_render_source_pages_batch_carries_source_inventory_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_documents_dir = root / "source_documents"
            source_path = source_documents_dir / "art-of-animation" / "fy26-q3-0526" / "source.jpg"
            source_path.parent.mkdir(parents=True)
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")
            content_sha256 = render_source_pages.sha256_file(source_path)

            report = render_source_pages.render_source_documents_from_directory(
                source_documents_dir=source_documents_dir,
                output_dir=root / "pages",
                report_path=root / "render_report.json",
                source_inventory=[
                    {
                        "source_document_id": "source-doc-image",
                        "content_sha256": content_sha256,
                        "source_kind": "official_image",
                        "source_role": "resort_pdf",
                        "canonical_url": "https://example.com/sign.jpg",
                        "fetched_url": "https://example.com/sign.jpg",
                        "http_status": 200,
                        "currentness": "current",
                        "captured_at": "2026-06-28T12:00:00+00:00",
                    }
                ],
            )

            self.assertEqual("source-doc-image", report["results"][0]["source_document_id"])
            self.assertEqual("https://example.com/sign.jpg", report["results"][0]["canonical_url"])
            self.assertEqual(1, report["summary"]["source_document_page_count"])
            self.assertEqual(1, report["results"][0]["source_document_page_count"])
            [page_row] = report["results"][0]["source_document_pages"]
            self.assertEqual("source-doc-image", page_row["source_document_id"])
            self.assertEqual(content_sha256, page_row["content_sha256"])
            self.assertEqual("image_file", page_row["page_kind"])
            self.assertRegex(page_row["canonical_image_sha256"], r"^[a-f0-9]{64}$")
            manifest = json.loads(Path(report["results"][0]["manifest_path"]).read_text())
            self.assertEqual("source-doc-image", manifest["source_document_id"])
            self.assertEqual("official_image", manifest["source_kind"])
            self.assertEqual("resort_pdf", manifest["source_role"])
            self.assertEqual("https://example.com/sign.jpg", manifest["canonical_url"])
            self.assertEqual("current", manifest["currentness"])

    @unittest.skipIf(render_source_pages.pdfium is None, "pypdfium2 is required for PDF render contracts")
    def test_gate2_current_source_fixtures_render_deterministically(self) -> None:
        fixtures = [
            (
                ROOT / "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
                "boardwalk",
                "fy26-q3-0526",
                "pdf",
                "pdf_page",
            ),
            (
                ROOT / "data/raw/pdfs/All-Star-Sports_Aframe_Recreation-0526_DIGITAL.pdf",
                "all-star-sports",
                "fy26-q3-0526",
                "pdf",
                "pdf_page",
            ),
            (
                ROOT / "data/raw/pdfs/DAAR_CKS-Digital-Rec-Sign_052626-FINAL.jpg",
                "art-of-animation",
                "fy26-q3-0526",
                "image",
                "image_file",
            ),
        ]
        missing = [str(path) for path, *_rest in fixtures if not path.exists()]
        if missing:
            self.skipTest(f"missing raw render fixture(s): {', '.join(missing)}")

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for source_path, group, edition, source_type, page_kind in fixtures:
                with self.subTest(source_path=source_path.name):
                    first = render_source_document(
                        source_path,
                        calendar_group_key=group,
                        edition=edition,
                        output_dir=root / "first",
                    )
                    second = render_source_document(
                        source_path,
                        calendar_group_key=group,
                        edition=edition,
                        output_dir=root / "second",
                    )

                    self.assertEqual(source_type, first["source_type"])
                    self.assertEqual(1, first["page_count"])
                    self.assertEqual(page_kind, first["pages"][0]["page_kind"])
                    self.assertEqual(
                        first["pages"][0]["canonical_image_sha256"],
                        second["pages"][0]["canonical_image_sha256"],
                    )
                    self.assertGreater(first["pages"][0]["width_px"], 0)
                    self.assertGreater(first["pages"][0]["height_px"], 0)
                    self.assertTrue(Path(first["pages"][0]["thumbnail_path"]).exists())

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

    def test_render_source_pages_can_upsert_page_rows_from_report(self) -> None:
        class FakeDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, list[dict[str, Any]], str]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                payload = rows if isinstance(rows, list) else [rows]
                self.upserts.append((table, payload, on_conflict))
                return payload

        report = {
            "report_kind": "v3_render_source_pages",
            "results": [
                {
                    "status": "rendered",
                    "source_document_pages": [
                        {
                            "source_document_id": "source-doc-1",
                            "content_sha256": "sourcehash",
                            "page_number": 1,
                            "page_kind": "pdf_page",
                            "canonical_image_storage_path": "pages/sourcehash/page_001.png",
                            "canonical_image_sha256": "pagehash",
                            "width_px": 1200,
                            "height_px": 1800,
                            "render_engine": "pypdfium2",
                        }
                    ],
                },
                {
                    "status": "source_error",
                    "source_document_pages": [
                        {
                            "source_document_id": "should-not-write",
                            "canonical_image_sha256": "bad",
                        }
                    ],
                },
                {"status": "rendered", "source_document_pages": []},
            ],
        }
        db = FakeDb()

        summary = render_source_pages.upsert_source_document_pages_from_report(db, report)

        self.assertEqual({"source_document_pages": 1}, summary)
        self.assertEqual(1, len(db.upserts))
        table, rows, on_conflict = db.upserts[0]
        self.assertEqual("source_document_pages", table)
        self.assertEqual(
            "source_document_id,page_number,canonical_image_sha256",
            on_conflict,
        )
        self.assertEqual(["source-doc-1"], [row["source_document_id"] for row in rows])

    def test_render_source_pages_cli_upserts_page_rows_only_with_explicit_flag(self) -> None:
        report = {
            "report_kind": "v3_render_source_pages",
            "results": [
                {
                    "status": "rendered",
                    "source_document_pages": [
                        {
                            "source_document_id": "source-doc-1",
                            "page_number": 1,
                            "canonical_image_sha256": "pagehash",
                        }
                    ],
                }
            ],
        }
        calls: list[tuple[str, Any]] = []

        class FakeDb:
            pass

        def fake_upsert(db: Any, bound_report: dict[str, Any]) -> dict[str, int]:
            calls.append(("upsert", db))
            self.assertIs(report, bound_report)
            return {"source_document_pages": 1}

        with (
            patch.object(
                sys,
                "argv",
                [
                    "render_source_pages.py",
                    "--source-documents-dir",
                    "unused",
                    "--report-path",
                    "unused.json",
                    "--upsert-source-document-pages",
                ],
            ),
            patch.object(
                render_source_pages,
                "render_source_documents_from_directory",
                return_value=report,
            ),
            patch.object(render_source_pages, "SupabaseClient", return_value=FakeDb()),
            patch.object(
                render_source_pages,
                "upsert_source_document_pages_from_report",
                side_effect=fake_upsert,
            ),
        ):
            render_source_pages.main()

        self.assertEqual([("upsert", calls[0][1])], calls)

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

    def test_fetch_source_uploads_bronze_image_with_detected_content_type(self) -> None:
        class FakeDb:
            def __init__(self) -> None:
                self.uploads: list[tuple[str, bytes, str]] = []
                self.upserts: list[dict[str, Any]] = []

            def select(self, *_args: Any, **_kwargs: Any) -> list[dict[str, Any]]:
                return []

            def upload_storage(
                self,
                path: str,
                data: bytes,
                content_type: str = "application/pdf",
            ) -> str:
                self.uploads.append((path, data, content_type))
                return path

            def upsert(self, _table: str, row: dict[str, Any], on_conflict: str) -> list[dict[str, Any]]:
                stored = {**row, "id": "source-doc-1", "on_conflict": on_conflict}
                self.upserts.append(stored)
                return [stored]

        data = b"\xff\xd8\xff\xe0\x00\x10JFIF"
        source = ActivitySource(
            "art-of-animation",
            ("art-of-animation-resort",),
            "https://disneyworld.disney.go.com/resorts/art-of-animation-resort/recreation/",
            "https://example.com/sign.jpg",
            "fy26-q3-0526",
            source_type="image",
        )
        db = FakeDb()

        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(fetch, "SOURCE_DOCUMENTS_RAW_DIR", Path(tmp)):
                with patch.object(fetch, "head_metadata") as head_metadata:
                    with patch.object(fetch, "download_bytes", return_value=data):
                        head_metadata.return_value = {
                            "etag": '"abc"',
                            "content_length": len(data),
                            "content_type": "image/jpeg",
                            "last_modified": "Wed, 20 May 2026 13:55:23 GMT",
                            "http_status": 200,
                        }

                        result = fetch.fetch_source(db, source)

        self.assertEqual("fetched", result.status)
        self.assertEqual(1, len(db.uploads))
        self.assertEqual("image/jpeg", db.uploads[0][2])
        self.assertTrue(db.uploads[0][0].endswith(".jpg"))

    def test_source_documents_migration_supports_v3_bronze_metadata_columns(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        )

        for column in (
            "mime_type text",
            "http_content_type text",
            "detected_content_type text",
            "file_extension text",
            "raw_page_count integer",
            "raw_width integer",
            "raw_height integer",
        ):
            self.assertIn(column, migration_text)

    def test_source_document_pages_migration_persists_canonical_page_images(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        )

        self.assertIn("create table if not exists public.source_document_pages", migration_text)
        for column in (
            "source_document_id uuid not null references public.source_documents(id)",
            "content_sha256 text not null",
            "page_number integer not null",
            "page_kind text not null",
            "canonical_image_storage_path text not null",
            "canonical_image_sha256 text not null",
            "width_px integer not null",
            "height_px integer not null",
            "render_engine text",
            "render_engine_version text",
            "render_dpi integer",
            "render_scale numeric",
            "image_orientation integer",
            "image_quality jsonb not null default '{}'::jsonb",
            "unique(source_document_id, page_number, canonical_image_sha256)",
        ):
            self.assertIn(column, migration_text)

    def test_source_document_v3_migration_defines_publish_health_rpc(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        )

        self.assertIn("create or replace function public.check_activity_pipeline_v3_health()", migration_text)
        self.assertIn("gold_v3_missing_promoted_candidate", migration_text)
        self.assertIn("gold_v3_missing_field_provenance", migration_text)
        self.assertIn("gold_v3_missing_currentness_check", migration_text)
        self.assertIn("grant execute on function public.check_activity_pipeline_v3_health() to service_role", migration_text)

    def test_source_document_v3_health_rpc_requires_persisted_canonical_page_rows(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        )

        self.assertIn("gold_v3_missing_source_document_page", migration_text)
        self.assertIn("jsonb_array_elements_text", migration_text)
        self.assertIn("public.source_document_pages page_row", migration_text)
        self.assertIn("page_row.canonical_image_sha256", migration_text)

    def test_source_document_v3_health_rpc_requires_persisted_layout_snapshot(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
        )

        self.assertIn("gold_v3_missing_layout_snapshot", migration_text)
        self.assertIn("public.activity_layout_snapshots layout_snapshot", migration_text)
        self.assertIn("layout_snapshot.snapshot_json->>'snapshot_kind'", migration_text)
        self.assertIn("vision_layout_v3", migration_text)

    def test_render_source_document_preserves_source_authority_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")

            manifest = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
                source_metadata={
                    "source_document_id": "source-doc-1",
                    "source_kind": "official_image",
                    "source_role": "resort_pdf",
                    "canonical_url": "https://example.com/sign.jpg",
                    "fetched_url": "https://example.com/sign.jpg",
                    "http_status": 200,
                    "currentness": "current",
                    "captured_at": "2026-06-28T12:00:00+00:00",
                },
            )

        self.assertEqual("source-doc-1", manifest["source_document_id"])
        self.assertEqual("official_image", manifest["source_kind"])
        self.assertEqual("resort_pdf", manifest["source_role"])
        self.assertEqual("https://example.com/sign.jpg", manifest["canonical_url"])
        self.assertEqual("https://example.com/sign.jpg", manifest["fetched_url"])
        self.assertEqual(200, manifest["http_status"])
        self.assertEqual("current", manifest["currentness"])
        self.assertEqual("2026-06-28T12:00:00+00:00", manifest["captured_at"])

    def test_render_source_document_builds_source_document_page_rows(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_path = root / "source.jpg"
            Image.new("RGB", (12, 8), color=(32, 64, 128)).save(source_path, "JPEG")

            manifest = render_source_document(
                source_path,
                calendar_group_key="art-of-animation",
                edition="fy26-q3-0526",
                output_dir=root / "pages",
                source_metadata={"source_document_id": "source-doc-1"},
            )
            [row] = render_source_pages.source_document_page_rows_from_manifest(manifest)

        page = manifest["pages"][0]
        self.assertEqual("source-doc-1", row["source_document_id"])
        self.assertEqual(manifest["source_sha256"], row["content_sha256"])
        self.assertEqual(page["page_number"], row["page_number"])
        self.assertEqual("image_file", row["page_kind"])
        self.assertEqual(page["canonical_image_path"], row["canonical_image_storage_path"])
        self.assertEqual(page["canonical_image_sha256"], row["canonical_image_sha256"])
        self.assertEqual(12, row["width_px"])
        self.assertEqual(8, row["height_px"])
        self.assertEqual(page["render_engine"], row["render_engine"])
        self.assertEqual(page["render_engine_version"], row["render_engine_version"])
        self.assertIsNone(row["render_dpi"])
        self.assertIsNone(row["render_scale"])
        self.assertEqual(1, row["image_orientation"])
        self.assertEqual(
            {
                "thumbnail_storage_path": page["thumbnail_path"],
                "thumbnail_sha256": page["thumbnail_sha256"],
            },
            row["image_quality"],
        )

    def test_source_relationship_schema_allows_qr_derived_source_links(self) -> None:
        migration_text = "\n".join(
            path.read_text()
            for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))
            if "source" in path.name or "vision" in path.name
        )

        self.assertIn("'qr_links_derived_source'", migration_text)

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

            with patch("scripts.ingest.ocr.paddle_adapter.module_available", return_value=False), patch(
                "scripts.ingest.ocr.rapidocr_adapter.module_available",
                return_value=False,
            ):
                snapshot = build_vision_snapshot(page_manifest=page_manifest)

        self.assertEqual(snapshot["snapshot_kind"], "vision_layout_v3")
        self.assertEqual(snapshot["pipeline_version"], "vision_v3_001")
        self.assertEqual(snapshot["status"], "ocr_unavailable")
        self.assertEqual(snapshot["source_sha256"], page_manifest["source_sha256"])
        self.assertEqual(snapshot["source_pages"][0]["page_image_sha256"], page_manifest["pages"][0]["canonical_image_sha256"])
        self.assertEqual(
            ["paddleocr_ppstructurev3", "rapidocr"],
            [run["engine"] for run in snapshot["engine_runs"]],
        )

    def test_vision_snapshot_propagates_source_authority_metadata(self) -> None:
        page_manifest = {
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "source_type": "image",
            "calendar_group_key": "art-of-animation",
            "edition": "fy26-q3-0526",
            "pages": [
                {
                    "page_number": 1,
                    "page_kind": "image_file",
                    "canonical_image_path": "page.png",
                    "canonical_image_sha256": "pagehash",
                    "width_px": 12,
                    "height_px": 8,
                    "render_dpi": None,
                    "render_engine": "Pillow",
                    "render_engine_version": "10.0.0",
                }
            ],
        }

        with patch("scripts.ingest.ocr.paddle_adapter.module_available", return_value=False), patch(
            "scripts.ingest.ocr.rapidocr_adapter.module_available",
            return_value=False,
        ):
            snapshot = build_vision_snapshot(page_manifest=page_manifest)

        self.assertEqual("source-doc-1", snapshot["source_document_id"])
        self.assertEqual("official_image", snapshot["source_kind"])
        self.assertEqual("resort_pdf", snapshot["source_role"])
        self.assertEqual("https://example.com/sign.jpg", snapshot["canonical_url"])
        self.assertEqual("https://example.com/sign.jpg", snapshot["fetched_url"])
        self.assertEqual(200, snapshot["http_status"])
        self.assertEqual("current", snapshot["currentness"])
        self.assertEqual("2026-06-28T12:00:00+00:00", snapshot["captured_at"])
        self.assertTrue(all(run["status"] == "unavailable" for run in snapshot["engine_runs"]))
        self.assertEqual([], snapshot["tokens"])
        self.assertEqual([], snapshot["regions"])
        self.assertIn("ocr_engine_unavailable:paddleocr_ppstructurev3", snapshot["errors"])
        self.assertEqual(
            snapshot["source_pages"][0]["page_image_sha256"],
            snapshot["quality"]["pages"][0]["page_image_sha256"],
        )
        self.assertEqual(2, snapshot["quality"]["engine_status_counts"]["unavailable"])
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
                source_metadata={"source_document_id": "source-doc-parent"},
            )

            snapshot = build_vision_snapshot(page_manifest=page_manifest)

        lineage = snapshot["runtime_lineage"]
        self.assertEqual(snapshot["config_hash"], lineage["config_hash"])
        self.assertEqual(snapshot["config"], lineage["config"])
        self.assertIn("Pillow", lineage["package_versions"])
        self.assertIn("pypdfium2", lineage["package_versions"])
        self.assertIn("lineage_hash", lineage)
        self.assertIn("model_asset_hashes", lineage)

    def test_vision_snapshot_hashes_configured_model_asset_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            model_dir = root / "model"
            model_dir.mkdir()
            (model_dir / "weights.bin").write_bytes(b"model-weights")

            config = vision_snapshot.default_vision_config()
            config["ocr"]["primary"]["model_asset_path"] = str(model_dir)

            hashes = vision_snapshot._model_asset_hashes(
                vision_snapshot._engine_routes(config)
            )

        self.assertIn("paddleocr_ppstructurev3", hashes)
        self.assertEqual(64, len(hashes["paddleocr_ppstructurev3"]))

    def test_vision_snapshot_routes_engines_from_versioned_config_and_stamps_runs(self) -> None:
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
        config = vision_snapshot.default_vision_config()
        config["ocr"]["docling_snapshot_enabled"] = False

        def engine_run(page: dict[str, Any], engine: str) -> dict[str, Any]:
            return {
                "engine": engine,
                "status": "success",
                "page_number": page["page_number"],
                "page_image_sha256": page["page_image_sha256"],
                "tokens": [],
                "lines": [],
                "regions": [
                    {
                        "region_type": "activity_block",
                        "bbox_px": [8, 16, 220, 92],
                        "confidence": 0.88,
                        "reading_order": 1,
                    }
                ],
            }

        with (
            patch(
                "scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page",
                side_effect=lambda page: engine_run(page, "paddleocr_ppstructurev3"),
            ),
            patch(
                "scripts.ingest.vision_snapshot.RapidOcrAdapter.run_page",
                side_effect=lambda page: engine_run(page, "rapidocr"),
            ),
            patch("scripts.ingest.vision_snapshot._git_sha", return_value="deadbeef"),
            patch("scripts.ingest.vision_snapshot._package_versions", return_value={"paddleocr": "3.0.0", "rapidocr": "2.0.0"}),
        ):
            snapshot = build_vision_snapshot(page_manifest=page_manifest, vision_config=config)

        self.assertEqual(
            ["paddleocr_ppstructurev3", "rapidocr"],
            [run["engine"] for run in snapshot["engine_runs"]],
        )
        self.assertEqual("fixed_config", snapshot["config"]["engine_routing_policy"])
        self.assertEqual(snapshot["config_hash"], snapshot["runtime_lineage"]["config_hash"])
        self.assertEqual("deadbeef", snapshot["runtime_lineage"]["git_sha"])
        self.assertIn("ocr_engine_configs", snapshot["runtime_lineage"])
        self.assertIn("paddleocr_ppstructurev3", snapshot["runtime_lineage"]["ocr_engine_configs"])
        for run in snapshot["engine_runs"]:
            self.assertEqual("vision_v3_001", run["pipeline_version"])
            self.assertEqual(snapshot["config_hash"], run["config_hash"])
            self.assertRegex(run["engine_config_hash"], r"^[a-f0-9]{64}$")
            self.assertIn(run["engine_role"], {"primary_ocr_layout", "secondary_ocr_comparator"})

    def test_vision_snapshot_fails_closed_when_config_has_no_ocr_routes(self) -> None:
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
        config = vision_snapshot.default_vision_config()
        config["ocr"] = {"docling_snapshot_enabled": False}

        snapshot = build_vision_snapshot(page_manifest=page_manifest, vision_config=config)

        self.assertEqual("ocr_unavailable", snapshot["status"])
        self.assertEqual([], snapshot["engine_runs"])
        self.assertEqual(["ocr_config_error:no_configured_ocr_routes"], snapshot["errors"])
        self.assertIn("ocr_config_error:no_configured_ocr_routes", snapshot["quality"]["findings"])

    def test_vision_snapshot_fails_closed_for_unsupported_configured_engine(self) -> None:
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
        config = vision_snapshot.default_vision_config()
        config["ocr"]["primary"]["engine"] = "surya_ocr2"
        config["ocr"]["primary"]["package"] = "surya"
        config["ocr"]["primary"]["role"] = "primary_ocr_layout"
        config["ocr"]["docling_snapshot_enabled"] = False

        snapshot = build_vision_snapshot(page_manifest=page_manifest, vision_config=config)

        self.assertEqual("ocr_unavailable", snapshot["status"])
        self.assertIn("ocr_config_error:unsupported_ocr_engine:surya_ocr2", snapshot["errors"])
        self.assertEqual("surya_ocr2", snapshot["engine_runs"][0]["engine"])
        self.assertEqual("config_error", snapshot["engine_runs"][0]["status"])
        self.assertEqual(snapshot["config_hash"], snapshot["engine_runs"][0]["config_hash"])
        self.assertRegex(snapshot["engine_runs"][0]["engine_config_hash"], r"^[a-f0-9]{64}$")
        self.assertIn(
            "ocr_config_error:unsupported_ocr_engine:surya_ocr2",
            snapshot["quality"]["findings"],
        )

    def test_vision_snapshot_captures_adapter_exceptions_as_structured_ocr_errors(self) -> None:
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
        config = vision_snapshot.default_vision_config()
        config["ocr"]["docling_snapshot_enabled"] = False

        with patch(
            "scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page",
            side_effect=RuntimeError("native ocr failed"),
        ):
            snapshot = build_vision_snapshot(page_manifest=page_manifest, vision_config=config)

        self.assertEqual("ocr_unavailable", snapshot["status"])
        self.assertIn("ocr_engine_error:paddleocr_ppstructurev3:RuntimeError", snapshot["errors"])
        self.assertEqual("paddleocr_ppstructurev3", snapshot["engine_runs"][0]["engine"])
        self.assertEqual("error", snapshot["engine_runs"][0]["status"])
        self.assertEqual("native ocr failed", snapshot["engine_runs"][0]["error_detail"])
        self.assertEqual(snapshot["config_hash"], snapshot["engine_runs"][0]["config_hash"])
        self.assertIn(
            "ocr_engine_error:paddleocr_ppstructurev3:RuntimeError",
            snapshot["quality"]["findings"],
        )

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

            with patch(
                "scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page",
                return_value={
                    "engine": "paddleocr_ppstructurev3",
                    "status": "unavailable",
                    "tokens": [],
                    "lines": [],
                    "regions": [],
                    "error": "ocr_engine_unavailable:paddleocr_ppstructurev3",
                },
            ), patch(
                "scripts.ingest.vision_snapshot.RapidOcrAdapter.run_page",
                return_value={
                    "engine": "rapidocr",
                    "status": "unavailable",
                    "tokens": [],
                    "lines": [],
                    "regions": [],
                    "error": "ocr_engine_unavailable:rapidocr",
                },
            ):
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

    def test_vision_snapshot_builds_activity_layout_snapshot_row(self) -> None:
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "source_document_id": "00000000-0000-0000-0000-000000000001",
            "source_sha256": "sourcehash",
            "source_pages": [{"page_number": 1}, {"page_number": 2}],
            "engine_runs": [],
            "regions": [],
            "tokens": [],
        }

        row = vision_snapshot.activity_layout_snapshot_row_from_snapshot(snapshot)

        self.assertEqual("00000000-0000-0000-0000-000000000001", row["source_document_id"])
        self.assertEqual("sourcehash", row["content_sha256"])
        self.assertEqual("vision_v3_001", row["parser_version"])
        self.assertEqual(2, row["page_count"])
        self.assertIs(snapshot, row["snapshot_json"])

    def test_vision_snapshot_can_upsert_layout_snapshots_from_report(self) -> None:
        class FakeDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, list[dict[str, Any]], str]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                payload = rows if isinstance(rows, list) else [rows]
                self.upserts.append((table, payload, on_conflict))
                return payload

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            snapshot_path = root / "sourcehash.vision.json"
            snapshot = {
                "snapshot_kind": "vision_layout_v3",
                "pipeline_version": "vision_v3_001",
                "source_document_id": "00000000-0000-0000-0000-000000000001",
                "source_sha256": "sourcehash",
                "source_pages": [{"page_number": 1}],
                "engine_runs": [],
                "regions": [],
                "tokens": [],
            }
            snapshot_path.write_text(json.dumps(snapshot))
            report = {
                "report_kind": "v3_vision_snapshot",
                "results": [
                    {"status": "ocr_complete", "snapshot_path": str(snapshot_path)},
                    {"status": "parser_error", "snapshot_path": None},
                ],
            }
            db = FakeDb()

            summary = vision_snapshot.upsert_activity_layout_snapshots_from_report(db, report)

        self.assertEqual({"activity_layout_snapshots": 1}, summary)
        self.assertEqual(1, len(db.upserts))
        table, rows, on_conflict = db.upserts[0]
        self.assertEqual("activity_layout_snapshots", table)
        self.assertEqual("content_sha256,parser_version", on_conflict)
        self.assertEqual(["sourcehash"], [row["content_sha256"] for row in rows])

    def test_vision_snapshot_cli_upserts_layout_snapshots_only_with_explicit_flag(self) -> None:
        report = {"report_kind": "v3_vision_snapshot", "results": []}
        calls: list[Any] = []

        class FakeDb:
            pass

        def fake_upsert(db: Any, bound_report: dict[str, Any]) -> dict[str, int]:
            calls.append(db)
            self.assertIs(report, bound_report)
            return {"activity_layout_snapshots": 0}

        with (
            patch.object(
                sys,
                "argv",
                [
                    "vision_snapshot.py",
                    "--page-images-dir",
                    "unused",
                    "--report-path",
                    "unused.json",
                    "--upsert-layout-snapshots",
                ],
            ),
            patch.object(
                vision_snapshot,
                "build_vision_snapshots_from_directory",
                return_value=report,
            ),
            patch.object(vision_snapshot, "SupabaseClient", return_value=FakeDb()),
            patch.object(
                vision_snapshot,
                "upsert_activity_layout_snapshots_from_report",
                side_effect=fake_upsert,
            ),
        ):
            vision_snapshot.main()

        self.assertEqual(1, len(calls))

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
                "lines": [
                    {
                        "text": "Poolside Activities",
                        "bbox_px": [10, 20, 200, 44],
                        "confidence": 0.96,
                        "reading_order": 1,
                    }
                ],
                "regions": [
                    {
                        "region_type": "activity_block",
                        "bbox_px": [8, 16, 220, 92],
                        "confidence": 0.88,
                        "reading_order": 1,
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
                        "text": "POOLSIDE ACTIVITIES",
                        "bbox_px": [12, 22, 202, 46],
                        "confidence": 0.94,
                        "reading_order": 1,
                    }
                ],
                "lines": [
                    {
                        "text": "POOLSIDE ACTIVITIES",
                        "bbox_px": [12, 22, 202, 46],
                        "confidence": 0.93,
                        "reading_order": 1,
                    }
                ],
                "regions": [
                    {
                        "region_type": "activity_block",
                        "bbox_px": [9, 18, 222, 94],
                        "confidence": 0.81,
                        "reading_order": 1,
                    }
                ],
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
        self.assertEqual(2, len(snapshot["lines"]))
        self.assertEqual("paddleocr_ppstructurev3", snapshot["lines"][0]["engine"])
        self.assertEqual("Poolside Activities", snapshot["lines"][0]["text"])
        self.assertEqual("pagehash", snapshot["lines"][0]["page_image_sha256"])
        self.assertEqual([10, 20, 200, 44], snapshot["lines"][0]["bbox_px"])
        self.assertEqual(0.96, snapshot["lines"][0]["confidence"])
        self.assertEqual(2, len(snapshot["engine_regions"]))
        self.assertEqual("paddleocr_ppstructurev3", snapshot["engine_regions"][0]["engine"])
        self.assertEqual("activity_block", snapshot["engine_regions"][0]["region_type"])
        self.assertEqual("pagehash", snapshot["engine_regions"][0]["page_image_sha256"])
        self.assertEqual([8, 16, 220, 92], snapshot["engine_regions"][0]["bbox_px"])
        self.assertEqual(0.88, snapshot["engine_regions"][0]["confidence"])
        self.assertEqual(2, snapshot["quality"]["token_count"])
        self.assertEqual(2, snapshot["quality"]["line_count"])
        self.assertEqual(2, snapshot["quality"]["engine_region_count"])
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
        boardwalk_from_processed_manifest = {
            "canonical_url": (
                "https://cdn1.parksmedia.wdprapps.disney.com/vision-dam/digital/parks-services/"
                "services-standard-assets/ops-comm/wdw-csd/resort-collateral/recreation/fy26-q3/"
                "BW_Aframe_Recreation-0526_DIGITAL.pdf"
            ),
            "source_type": "pdf",
            "source_pages": [{"width_px": 10800, "height_px": 16200}],
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
        aframe_by_text = {
            "source_path": "data/raw/pdfs/unknown-flyer.pdf",
            "source_type": "pdf",
            "pages": [{"width_px": 10800, "height_px": 16200}],
            "lines": [
                {"text": "Resort Activities"},
                {"text": "Movie Under the Stars"},
                {"text": "Scan the QR code for the latest schedule"},
            ],
        }
        vertical_by_text = {
            "source_path": "data/raw/pdfs/unknown-sign.jpg",
            "source_type": "image",
            "pages": [{"width_px": 1200, "height_px": 12696}],
            "lines": [
                {"text": "MONDAY"},
                {"text": "TUESDAY"},
                {"text": "Arts & Crafts 1:00pm"},
            ],
        }

        self.assertEqual("aframe_recreation", classify_document_family(boardwalk)["document_family"])
        self.assertEqual("aframe_recreation", classify_document_family(all_star_sports)["document_family"])
        self.assertEqual("aframe_recreation", classify_document_family(boardwalk_from_processed_manifest)["document_family"])
        self.assertEqual("vertical_digital_rec_sign", classify_document_family(daar)["document_family"])
        aframe_text_classification = classify_document_family(aframe_by_text)
        self.assertEqual("aframe_recreation", aframe_text_classification["document_family"])
        self.assertIn("text:resort_activities", aframe_text_classification["signals"])
        self.assertFalse(aframe_text_classification["allow_auto_publish"])
        vertical_text_classification = classify_document_family(vertical_by_text)
        self.assertEqual("vertical_digital_rec_sign", vertical_text_classification["document_family"])
        self.assertIn("text:day_banners", vertical_text_classification["signals"])
        self.assertFalse(vertical_text_classification["allow_auto_publish"])
        unknown_classification = classify_document_family(unknown)
        self.assertEqual("unknown_visual_schedule", unknown_classification["document_family"])
        self.assertFalse(unknown_classification["allow_auto_publish"])

    def test_region_segmentation_creates_major_crops_for_known_family(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            page_path = root / "page.png"
            Image.new("RGB", (1200, 1800), color=(255, 255, 255)).save(page_path, "PNG")
            snapshot = {
                "source_document_id": "source-doc-parent",
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
                "source_document_id": "source-doc-parent",
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
            self.assertEqual("derived_source_link", qr_region["qr_targets"][0]["source_role"])
            self.assertTrue(qr_region["qr_targets"][0]["is_official_source"])
            self.assertEqual("official_disney", qr_region["qr_targets"][0]["source_authority"])
            self.assertEqual(qr_region["crop_sha256"], qr_region["qr_targets"][0]["source_crop_sha256"])
            self.assertEqual("source-doc-parent", qr_region["qr_targets"][0]["parent_source_document_id"])
            self.assertEqual("abc123", qr_region["qr_targets"][0]["parent_content_sha256"])
            self.assertEqual(qr_region["qr_targets"], result["derived_source_links"])

    def test_region_segmentation_classifies_non_official_qr_targets(self) -> None:
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
                    }
                ],
            }

            result = segment_major_regions(
                snapshot=snapshot,
                classification={"document_family": "aframe_recreation", "allow_auto_publish": True},
                output_dir=root / "regions",
                qr_decoder=lambda crop_path: [
                    {"target_url": "https://example.org/untrusted-schedule", "decoder": "test_decoder"}
                ],
            )

            qr_region = next(region for region in result["regions"] if region["region_type"] == "qr_callout")
            target = qr_region["qr_targets"][0]
            self.assertEqual("derived_source_link", target["source_role"])
            self.assertFalse(target["is_official_source"])
            self.assertEqual("non_official", target["source_authority"])
            self.assertEqual(qr_region["crop_sha256"], target["source_crop_sha256"])

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
                source_metadata={"source_document_id": "source-doc-parent"},
            )

            with patch(
                "scripts.ingest.regions.decode_qr_targets",
                return_value=[
                    {
                        "target_url": "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                        "decoder": "test_decoder",
                    }
                ],
            ):
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
            self.assertEqual(1, len(snapshot["derived_source_links"]))
            self.assertEqual(
                "derived_source_link",
                snapshot["derived_source_links"][0]["source_role"],
            )
            self.assertEqual(
                "https://disneyworld.disney.go.com/resorts/boardwalk-inn/recreation/",
                snapshot["derived_source_links"][0]["target_url"],
            )
            self.assertEqual(
                "source-doc-parent",
                snapshot["derived_source_links"][0]["parent_source_document_id"],
            )
            self.assertEqual(
                page_manifest["source_sha256"],
                snapshot["derived_source_links"][0]["parent_content_sha256"],
            )

    def test_vision_snapshot_records_structured_region_segmentation_error(self) -> None:
        page_manifest = {
            "source_path": "data/raw/pdfs/BW_Aframe_Recreation-0526_DIGITAL.pdf",
            "source_sha256": "sourcehash",
            "source_type": "pdf",
            "calendar_group_key": "boardwalk",
            "edition": "fy26-q3-0526",
            "pages": [
                {
                    "page_number": 1,
                    "page_kind": "pdf_page",
                    "canonical_image_path": "missing-page.png",
                    "canonical_image_sha256": "pagehash",
                    "width_px": 1200,
                    "height_px": 1800,
                    "render_dpi": 450,
                    "render_engine": "pypdfium2",
                    "render_engine_version": "4.30.0",
                }
            ],
        }

        def engine_run(page: dict[str, Any]) -> dict[str, Any]:
            return {
                "engine": "paddleocr_ppstructurev3",
                "status": "success",
                "page_number": page["page_number"],
                "page_image_sha256": page["page_image_sha256"],
                "tokens": [],
                "lines": [],
                "regions": [],
            }

        config = vision_snapshot.default_vision_config()
        config["ocr"]["secondary"]["engine"] = ""
        config["ocr"]["docling_snapshot_enabled"] = False
        with patch("scripts.ingest.vision_snapshot.PaddleOcrAdapter.run_page", side_effect=engine_run):
            snapshot = build_vision_snapshot(
                page_manifest=page_manifest,
                vision_config=config,
                attach_regions=True,
            )

        self.assertEqual("region_segmentation_failed", snapshot["status"])
        self.assertEqual([], snapshot["regions"])
        self.assertIn("region_segmentation_error:missing_page_image", snapshot["errors"])
        self.assertIn("region_segmentation_error:missing_page_image", snapshot["quality"]["findings"])
        self.assertEqual(1, snapshot["quality"]["structured_error_count"])

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
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [
                {
                    "page_number": 1,
                    "canonical_image_sha256": "pagehash",
                }
            ],
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
        self.assertEqual("official_image", candidate["source_kind"])
        self.assertEqual("resort_pdf", candidate["source_role"])
        self.assertEqual("https://example.com/sign.jpg", candidate["canonical_url"])
        self.assertEqual("https://example.com/sign.jpg", candidate["fetched_url"])
        self.assertEqual(200, candidate["http_status"])
        self.assertEqual("current", candidate["currentness"])
        self.assertEqual("2026-06-28T12:00:00+00:00", candidate["captured_at"])
        self.assertEqual("sourcehash", candidate["content_sha256"])
        self.assertEqual(["pagehash"], candidate["canonical_page_image_sha256s"])
        self.assertEqual("page-001-region-04", candidate["region_id"])
        self.assertIn("ocr_text_missing", candidate["validation_findings"])
        self.assertEqual("crophash", candidate["field_evidence"]["region"]["source"]["crop_sha256"])

    def test_extract_v3_carries_snapshot_derived_source_links_to_candidates(self) -> None:
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "source_type": "pdf",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "derived_source_links": [
                {
                    "source_role": "derived_source_link",
                    "target_url": "https://disneyworld.disney.go.com/recreation/boardwalk-activities/",
                    "content_sha256": "derivedhash",
                    "source_crop_sha256": "qrcrop",
                    "parent_content_sha256": "sourcehash",
                }
            ],
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

        [candidate] = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(snapshot["derived_source_links"], candidate["derived_source_links"])

    def test_extract_v3_generic_visual_schedule_produces_review_candidate_only(self) -> None:
        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "document_family": "unknown_visual_schedule",
            "source_document_id": "source-doc-unknown",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/unknown-sign.jpg",
            "source_sha256": "unknownhash",
            "calendar_group_key": "mystery-resort",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [
                {
                    "region_id": "page-001-region-01",
                    "region_type": "unknown",
                    "region_family": "unknown_visual_schedule",
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "bbox_px": [0, 0, 1200, 1800],
                    "crop_path": "unknown-region.png",
                    "crop_sha256": "unknowncrop",
                    "allow_auto_publish": False,
                }
            ],
            "tokens": [
                {
                    "engine": "paddleocr_ppstructurev3",
                    "text": "Pool Party Daily at 1:00pm",
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "bbox_px": [100, 200, 700, 240],
                    "confidence": 0.91,
                }
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("generic_visual_review", candidate["candidate_type"])
        self.assertEqual("needs_review", candidate["validation_status"])
        self.assertEqual("unknown_visual_schedule", candidate["document_family"])
        self.assertEqual("page-001-region-01", candidate["region_id"])
        self.assertEqual("unknown", candidate["region_type"])
        self.assertIn("unknown_document_family", candidate["validation_findings"])
        self.assertIn("generic_visual_schedule_review_required", candidate["validation_findings"])
        self.assertEqual("unknowncrop", candidate["field_evidence"]["region"]["source"]["crop_sha256"])
        self.assertEqual({}, candidate["source_spans"])

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
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {
                    "ocr": {
                        "primary": {"engine": "paddleocr_ppstructurev3"},
                        "secondary": {"engine": "rapidocr"},
                    }
                },
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [
                {
                    "page_number": 1,
                    "canonical_image_sha256": "pagehash",
                }
            ],
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
        self.assertEqual("confighash", candidate["config_hash"])
        self.assertEqual("lineagehash", candidate["runtime_lineage"]["lineage_hash"])
        self.assertEqual("official_image", candidate["source_kind"])
        self.assertEqual("resort_pdf", candidate["source_role"])
        self.assertEqual("https://example.com/sign.jpg", candidate["canonical_url"])
        self.assertEqual("https://example.com/sign.jpg", candidate["fetched_url"])
        self.assertEqual(200, candidate["http_status"])
        self.assertEqual("current", candidate["currentness"])
        self.assertEqual("2026-06-28T12:00:00+00:00", candidate["captured_at"])
        self.assertEqual(["pagehash"], candidate["canonical_page_image_sha256s"])
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
        self.assertEqual("Poolside Activities ($)", candidate["source_spans"]["title"][0]["text"])
        self.assertEqual("Daily at 1:30pm", candidate["source_spans"]["schedule"][0]["text"])
        self.assertEqual("Luna Park Pool Deck", candidate["source_spans"]["location"][0]["text"])
        self.assertEqual("($) There is a fee associated with this activity.", candidate["source_spans"]["fee"][0]["text"])
        self.assertEqual([110, 210, 500, 240], candidate["source_spans"]["title"][0]["bbox_px"])

    def test_extract_v3_prefers_secondary_controlled_location_over_nearer_description(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 12000, 10800, 15000],
            "crop_path": "region.png",
            "crop_sha256": "regioncrop",
        }

        def token(engine: str, text: str, bbox: list[int], order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "region_id": "page-001-region-04",
                "bbox_px": bbox,
                "confidence": 0.95,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {
                    "ocr": {
                        "primary": {"engine": "paddleocr_ppstructurev3"},
                        "secondary": {"engine": "rapidocr"},
                    }
                },
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "port-orleans-french-quarter",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "NIGHTTIME TRIVIA CHALLENGE", [5700, 12975, 9800, 13203], 1),
                token("paddleocr_ppstructurev3", "Doubloon Lagoon Pool Deck", [5700, 13535, 8076, 13697], 2),
                token("paddleocr_ppstructurev3", "Wednesday at 8:00pm", [5700, 14300, 8076, 14480], 3),
                token("rapidocr", "NIGHTTIME TRIVIA CHALLENGE", [5665, 12975, 9844, 13203], 1),
                token("rapidocr", "Doubloon Lagoon Pool Deck", [5673, 13269, 7915, 13432], 2),
                token("rapidocr", "Put your knowledge to the test!", [5665, 13701, 8100, 13922], 3),
                token("rapidocr", "Wednesday at 8:00pm", [5665, 14300, 8076, 14480], 4),
                token("paddleocr_ppstructurev3", "($) There is a fee associated with this activity.", [5700, 15000, 9800, 15100], 5),
                token("rapidocr", "($) There is a fee associated with this activity.", [5665, 15000, 9800, 15100], 5),
            ],
        }

        [candidate] = extract_candidates_from_snapshot(snapshot)

        self.assertEqual("Doubloon Lagoon Pool Deck", candidate["field_evidence"]["location"]["engines"][1]["text"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["location"]["agreement"])
        self.assertNotIn("engine_disagreement:location", candidate["validation_findings"])

    def test_extract_v3_prefers_secondary_location_matching_primary_location_id(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 2500, 10800, 4200],
            "crop_path": "region.png",
            "crop_sha256": "regioncrop",
        }

        def token(engine: str, text: str, bbox: list[int], order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "region_id": "page-001-region-04",
                "bbox_px": bbox,
                "confidence": 0.95,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {"ocr": {"primary": {"engine": "paddleocr_ppstructurev3"}, "secondary": {"engine": "rapidocr"}}},
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "all-star-music",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "NOTE'ABLE GAMES ARCADE ($)", [5721, 2940, 10202, 3187], 1),
                token("paddleocr_ppstructurev3", "Inside Melody Hall", [5729, 3256, 7258, 3410], 2),
                token("paddleocr_ppstructurev3", "Daily from 8:00am-11:00pm", [5725, 3475, 8068, 3661], 3),
                token("rapidocr", "NOTE'ABLE GAMES ARCADE ($)", [5665, 3160, 9892, 3421], 1),
                token("rapidocr", "Inside Melody Hall", [5673, 3429, 7160, 3658], 2),
                token("rapidocr", "Daily from 8:00am-11:00pm", [5689, 3691, 7899, 3854], 3),
                token("paddleocr_ppstructurev3", "($) There is a fee associated with this activity.", [5700, 3900, 9800, 4000], 4),
                token("rapidocr", "($) There is a fee associated with this activity.", [5665, 3900, 9800, 4000], 4),
            ],
        }

        [candidate] = extract_candidates_from_snapshot(snapshot)

        self.assertEqual("Inside Melody Hall", candidate["field_evidence"]["location"]["engines"][1]["text"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["location"]["agreement"])
        self.assertNotIn("engine_disagreement:location", candidate["validation_findings"])

    def test_extract_v3_accepts_primary_day_with_matching_secondary_time_fragment(self) -> None:
        region = {
            "region_id": "page-001-region-03",
            "region_type": "vertical_activity_row",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [0, 5000, 1200, 8000],
            "crop_path": "row.png",
            "crop_sha256": "rowcrop",
        }

        def token(engine: str, text: str, bbox: list[int], order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "region_id": "page-001-region-03",
                "bbox_px": bbox,
                "confidence": 0.95,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {"ocr": {"primary": {"engine": "paddleocr_ppstructurev3"}, "secondary": {"engine": "rapidocr"}}},
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "caribbean-beach",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "THURSDAY", [10, 5100, 400, 5200], 1),
                token("paddleocr_ppstructurev3", "CARIBBEAN CAMPFIRE", [10, 5300, 800, 5400], 2),
                token("paddleocr_ppstructurev3", "Martinique Beach", [10, 5500, 800, 5600], 3),
                token("paddleocr_ppstructurev3", "From 6:30pm-7:30pm", [10, 5700, 800, 5800], 4),
                token("rapidocr", "CARIBBEAN CAMPFIRE", [10, 5305, 800, 5405], 1),
                token("rapidocr", "Martinique Beach", [10, 5505, 800, 5605], 2),
                token("rapidocr", "=ro6.30pm-7.30pm", [10, 5705, 800, 5805], 3),
                token("paddleocr_ppstructurev3", "($) There is a fee associated with this activity.", [10, 7800, 1000, 7900], 5),
                token("rapidocr", "($) There is a fee associated with this activity.", [10, 7800, 1000, 7900], 4),
            ],
        }

        [candidate] = extract_candidates_from_snapshot(snapshot)

        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["schedule"]["agreement"])
        self.assertEqual(["Thursday"], candidate["schedule_normalized"]["days_of_week"])
        self.assertEqual("18:30", candidate["schedule_normalized"]["start_time"])
        self.assertNotIn("engine_disagreement:schedule", candidate["validation_findings"])

    def test_extract_v3_movie_header_ignores_nearby_stars_prose(self) -> None:
        region = {
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 12000, 10800, 14500],
            "crop_path": "movies.png",
            "crop_sha256": "moviescrop",
        }

        def token(engine: str, text: str, bbox: list[int], order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "region_id": "page-001-region-05",
                "bbox_px": bbox,
                "confidence": 0.95,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {"ocr": {"primary": {"engine": "paddleocr_ppstructurev3"}, "secondary": {"engine": "rapidocr"}}},
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "riviera",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "MOVIE UNDER THE STARS", [5713, 13235, 10288, 13507], 1),
                token("paddleocr_ppstructurev3", "MOVIE LAWN | 8:30PM", [5704, 13822, 8133, 14050], 2),
                token("paddleocr_ppstructurev3", "Sunday", [5700, 14100, 6100, 14200], 3),
                token("paddleocr_ppstructurev3", "Moana", [6400, 14100, 7200, 14200], 4),
                token("rapidocr", "Sparkle and shine under the stars during this evening", [5657, 12101, 9715, 12338], 1),
                token("rapidocr", "MOVIE UNDER THE STARS", [5681, 12950, 9924, 13195], 2),
                token("rapidocr", "MOVIE LAWN | 8:30PM", [5673, 13514, 7947, 13701], 3),
                token("rapidocr", "Sunday", [5680, 14100, 6100, 14200], 4),
                token("rapidocr", "Moana", [6400, 14100, 7200, 14200], 5),
                token("paddleocr_ppstructurev3", "($) There is a fee associated with this activity.", [5700, 14400, 9800, 14500], 6),
                token("rapidocr", "($) There is a fee associated with this activity.", [5665, 14400, 9800, 14500], 6),
            ],
        }

        [candidate] = extract_candidates_from_snapshot(snapshot)

        self.assertEqual("MOVIE UNDER THE STARS", candidate["field_evidence"]["title"]["engines"][1]["text"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["title"]["agreement"])
        self.assertNotIn("engine_disagreement:title", candidate["validation_findings"])

    def test_extract_v3_uses_configured_primary_and_secondary_engines(self) -> None:
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
            "config_hash": "confighash",
            "config": {
                "ocr": {
                    "primary": {"engine": "configured_primary_ocr"},
                    "secondary": {"engine": "configured_secondary_ocr"},
                }
            },
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "config": {
                    "ocr": {
                        "primary": {"engine": "configured_primary_ocr"},
                        "secondary": {"engine": "configured_secondary_ocr"},
                    }
                },
                "package_versions": {"configured-primary": "1.0.0", "configured-secondary": "1.0.0"},
                "model_asset_hashes": {"configured_primary_ocr": "modelhash"},
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                {**base_token, "engine": "configured_primary_ocr", "text": "Poolside Activities", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "configured_secondary_ocr", "text": "POOLSIDE ACTIVITIES", "field_hint": "title", "reading_order": 1},
                {**base_token, "engine": "configured_primary_ocr", "text": "Daily at 1:30pm", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "configured_secondary_ocr", "text": "Daily 1:30 PM", "field_hint": "schedule", "reading_order": 2},
                {**base_token, "engine": "configured_primary_ocr", "text": "Luna Park Pool Deck", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "configured_secondary_ocr", "text": "luna park pool deck", "field_hint": "location", "reading_order": 3},
                {**base_token, "engine": "configured_primary_ocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
                {**base_token, "engine": "configured_secondary_ocr", "text": "($) There is a fee associated with this activity.", "field_hint": "fee_legend", "reading_order": 4},
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("Poolside Activities", candidate["source_title"])
        self.assertEqual("13:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("configured_primary_ocr", candidate["field_evidence"]["title"]["engines"][0]["engine"])
        self.assertEqual("configured_secondary_ocr", candidate["field_evidence"]["title"]["engines"][1]["engine"])
        self.assertEqual("configured_primary_ocr", candidate["source_spans"]["title"][0]["engine"])

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

    def test_extract_v3_vertical_sign_derives_field_evidence_from_unhinted_ocr_tokens(self) -> None:
        region = {
            "region_id": "page-001-region-03",
            "region_type": "vertical_activity_row",
            "region_family": "vertical_digital_rec_sign",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [0, 180, 1200, 900],
            "crop_path": "vertical-row.png",
            "crop_sha256": "verticalrowcrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [200, y1, 900, y2],
                "confidence": 0.93,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "vertical_digital_rec_sign",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "supporting_price_image",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "port-orleans-riverside",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "MONDAY", 120, 150, 1),
                token("paddleocr_ppstructurev3", "POOL PARTY", 200, 230, 2),
                token("paddleocr_ppstructurev3", "Ol' Man Island Pool Deck", 240, 270, 3),
                token("paddleocr_ppstructurev3", "From 2:30pm-3:30pm", 280, 310, 4),
                token("rapidocr", "MONDAY", 121, 151, 1),
                token("rapidocr", "POOL PARTY", 201, 231, 2),
                token("rapidocr", "O. Man Island Pool Deck", 241, 271, 3),
                token("rapidocr", "From 2:30pm-3:30pm", 281, 311, 4),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("POOL PARTY", candidate["source_title"])
        self.assertEqual("Monday at From 2:30pm-3:30pm", candidate["schedule_raw"])
        self.assertEqual(["Monday"], candidate["schedule_normalized"]["days_of_week"])
        self.assertEqual("14:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("ol_man_island_pool_deck", candidate["normalized_location_id"])
        self.assertEqual("verticalrowcrop", candidate["field_evidence"]["title"]["source"]["crop_sha256"])
        self.assertEqual("POOL PARTY", candidate["source_spans"]["title"][0]["text"])
        self.assertEqual("rapidocr", candidate["field_evidence"]["title"]["engines"][1]["engine"])
        self.assertRegex(candidate["candidate_id"], r"^vision-v3-[0-9a-f]{24}$")
        self.assertEqual(candidate["candidate_id"], extract_candidates_from_snapshot(snapshot)[0]["candidate_id"])

    def test_extract_v3_aframe_activity_derives_field_evidence_from_unhinted_ocr_tokens(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 2000, 10800, 12000],
            "crop_path": "activities.png",
            "crop_sha256": "activitiescrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [5700, y1, 9000, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_pdf",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/boardwalk.pdf",
            "fetched_url": "https://example.com/boardwalk.pdf",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "POOLSIDE ACTIVITIES", 5500, 5750, 1),
                token("paddleocr_ppstructurev3", "Luna Park Pool Deck", 5800, 6000, 2),
                token("paddleocr_ppstructurev3", "Daily at 1:30pm", 6050, 6250, 3),
                token("rapidocr", "POOLSIDE ACTIVITIES", 5520, 5770, 1),
                token("rapidocr", "Luna Park Pool Deck", 5820, 6020, 2),
                token("rapidocr", "Daily at 1:30pm", 6070, 6270, 3),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("POOLSIDE ACTIVITIES", candidate["source_title"])
        self.assertEqual("Daily at 1:30pm", candidate["schedule_raw"])
        self.assertEqual("13:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("luna_park_pool_deck", candidate["normalized_location_id"])
        self.assertEqual("activitiescrop", candidate["field_evidence"]["title"]["source"]["crop_sha256"])
        self.assertEqual("POOLSIDE ACTIVITIES", candidate["source_spans"]["title"][0]["text"])

    def test_extract_v3_uses_page_fee_legend_for_unmarked_aframe_activity_fee(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 2000, 10800, 12000],
            "crop_path": "activities.png",
            "crop_sha256": "activitiescrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [5700, y1, 9000, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "POOLSIDE ACTIVITIES", 5500, 5750, 1),
                token("paddleocr_ppstructurev3", "Luna Park Pool Deck", 5800, 6000, 2),
                token("paddleocr_ppstructurev3", "Daily at 1:30pm", 6050, 6250, 3),
                token("paddleocr_ppstructurev3", "($) There is a fee associated with this activity.", 15000, 15100, 4),
                token("rapidocr", "POOLSIDE ACTIVITIES", 5520, 5770, 1),
                token("rapidocr", "Luna Park Pool Deck", 5820, 6020, 2),
                token("rapidocr", "Daily at 1:30pm", 6070, 6270, 3),
                token("rapidocr", "($) There is a fee associated with this activity.", 15020, 15120, 4),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertFalse(candidate["fee_required"])
        self.assertNotIn("fee_legend_missing_for_unmarked_title", candidate["validation_findings"])
        self.assertEqual("exact_after_normalization", candidate["field_evidence"]["fee"]["agreement"])
        self.assertFalse(candidate["field_evidence"]["fee"]["normalized_value"])
        self.assertIn("($) There is a fee associated", candidate["field_evidence"]["fee"]["raw_value"])

    def test_extract_v3_accepts_two_engine_no_fee_marker_without_page_legend(self) -> None:
        region = {
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 2000, 10800, 12000],
            "crop_path": "activities.png",
            "crop_sha256": "activitiescrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [5700, y1, 9000, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "POOLSIDE ACTIVITIES", 5500, 5750, 1),
                token("paddleocr_ppstructurev3", "Luna Park Pool Deck", 5800, 6000, 2),
                token("paddleocr_ppstructurev3", "Daily at 1:30pm", 6050, 6250, 3),
                token("rapidocr", "POOLSIDE ACTIVITIES", 5520, 5770, 1),
                token("rapidocr", "Luna Park Pool Deck", 5820, 6020, 2),
                token("rapidocr", "Daily at 1:30pm", 6070, 6270, 3),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertFalse(candidate["fee_required"])
        self.assertNotIn("fee_legend_missing_for_unmarked_title", candidate["validation_findings"])
        self.assertEqual(False, candidate["field_evidence"]["fee"]["normalized_value"])
        self.assertEqual("no fee marker", candidate["field_evidence"]["fee"]["raw_value"])
        self.assertEqual(
            ["no fee marker", "no fee marker"],
            [engine["text"] for engine in candidate["field_evidence"]["fee"]["engines"]],
        )

    def test_extract_v3_aframe_movie_rows_derive_field_evidence_from_unhinted_ocr_tokens(self) -> None:
        region = {
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 12000, 10800, 15000],
            "crop_path": "movies.png",
            "crop_sha256": "moviescrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int, x1: int = 5700, x2: int = 9800) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [x1, y1, x2, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "MOVIE UNDER THE STARS", 12400, 12650, 1),
                token("paddleocr_ppstructurev3", "VILLAGE GREEN LAWN | 8:30PM", 12900, 13100, 2),
                token("paddleocr_ppstructurev3", "Sunday", 13300, 13500, 3, 5700, 6400),
                token("paddleocr_ppstructurev3", "Beauty and the Beast (1991)", 13300, 13500, 4, 7900, 10200),
                token("rapidocr", "MOVIE UNDER THE STARS", 12420, 12670, 1),
                token("rapidocr", "VILLAGE GREEN LAWN | 8:30PM", 12920, 13120, 2),
                token("rapidocr", "Sunday", 13320, 13520, 3, 5700, 6400),
                token("rapidocr", "Beauty and the Beast (1991) G", 13320, 13520, 4, 7900, 10200),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("movie", candidate["candidate_type"])
        self.assertEqual("MOVIE UNDER THE STARS", candidate["source_title"])
        self.assertEqual("Beauty and the Beast (1991)", candidate["movie_title"])
        self.assertEqual("Sunday at 8:30PM", candidate["schedule_raw"])
        self.assertEqual(["Sunday"], candidate["schedule_normalized"]["days_of_week"])
        self.assertEqual("20:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("village_green_lawn", candidate["normalized_location_id"])
        self.assertEqual("moviescrop", candidate["field_evidence"]["movie_title"]["source"]["crop_sha256"])

    def test_extract_v3_aframe_movie_rows_accept_secondary_location_time_without_pipe(self) -> None:
        region = {
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 12000, 10800, 15000],
            "crop_path": "movies.png",
            "crop_sha256": "moviescrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int, x1: int = 5700, x2: int = 9800) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [x1, y1, x2, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "coronado-springs",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "MOVIE UNDER THE STARS", 12400, 12650, 1),
                token("paddleocr_ppstructurev3", "GRAN DESTINO LAWN | 8:3OPM", 12900, 13100, 2),
                token("paddleocr_ppstructurev3", "Sunday", 13300, 13500, 3, 5700, 6400),
                token("paddleocr_ppstructurev3", "Toy Story 2 G", 13300, 13500, 4, 7900, 10200),
                token("rapidocr", "MOVIE UNDER THE STARS", 12420, 12670, 1),
                token("rapidocr", "GRAN DESTINO LAWN 8:3OPM", 12920, 13120, 2),
                token("rapidocr", "Sunday", 13320, 13520, 3, 5700, 6400),
                token("rapidocr", "Toy Story 2 G", 13320, 13520, 4, 7900, 10200),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("movie", candidate["candidate_type"])
        self.assertEqual("GRAN DESTINO LAWN", candidate["location_text"])
        self.assertEqual("Sunday at 8:3OPM", candidate["schedule_raw"])
        self.assertEqual("20:30", candidate["schedule_normalized"]["start_time"])
        self.assertEqual("Toy Story 2", candidate["movie_title"])

    def test_extract_v3_aframe_lower_right_section_can_fall_back_to_activity_rows(self) -> None:
        region = {
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "region_family": "aframe_recreation",
            "page_number": 1,
            "page_image_sha256": "pagehash",
            "bbox_px": [5000, 11000, 10800, 15500],
            "crop_path": "lower-right.png",
            "crop_sha256": "lowerrightcrop",
        }

        def token(engine: str, text: str, y1: int, y2: int, order: int) -> dict[str, Any]:
            return {
                "engine": engine,
                "text": text,
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [5600, y1, 9500, y2],
                "confidence": 0.94,
                "reading_order": order,
            }

        snapshot = {
            "snapshot_kind": "vision_layout_v3",
            "pipeline_version": "vision_v3_001",
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_sha256": "sourcehash",
            "calendar_group_key": "all-star-sports",
            "source_pages": [{"page_number": 1, "canonical_image_sha256": "pagehash"}],
            "regions": [region],
            "tokens": [
                token("paddleocr_ppstructurev3", "FIELD DAY", 11700, 11900, 1),
                token("paddleocr_ppstructurev3", "Touchdown! Football Field", 12000, 12200, 2),
                token("paddleocr_ppstructurev3", "Tuesday at 8:30pm", 12300, 12500, 3),
                token("rapidocr", "FIELD DAY", 11720, 11920, 1),
                token("rapidocr", "Touchdown! Football Field", 12020, 12220, 2),
                token("rapidocr", "Tuesday at 8:30pm", 12320, 12520, 3),
            ],
        }

        candidates = extract_candidates_from_snapshot(snapshot)

        self.assertEqual(1, len(candidates))
        candidate = candidates[0]
        self.assertEqual("activity", candidate["candidate_type"])
        self.assertEqual("movie_section", candidate["region_type"])
        self.assertEqual("FIELD DAY", candidate["source_title"])
        self.assertEqual("Tuesday at 8:30pm", candidate["schedule_raw"])
        self.assertEqual("touchdown_football_field", candidate["normalized_location_id"])

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
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "git_sha": "deadbeef",
                "config": {
                    "ocr": {
                        "primary": {"engine": "paddleocr_ppstructurev3"},
                        "secondary": {"engine": "rapidocr"},
                    }
                },
                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                "ocr_engine_configs": {
                    "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                    "rapidocr": {"engine": "rapidocr"},
                },
            },
            "document_family": "aframe_recreation",
            "source_document_id": "source-doc-1",
            "source_kind": "official_image",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/sign.jpg",
            "fetched_url": "https://example.com/sign.jpg",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "content_sha256": "sourcehash",
            "canonical_page_image_sha256s": ["pagehash"],
            "candidate_type": "activity",
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
            "source_title": "Poolside Activities",
            "normalized_title": "Poolside Activities",
            "schedule_raw": "Monday at 1:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ["Monday"],
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "location_text": "Village Green Lawn",
            "normalized_location_id": "village_green_lawn",
            "fee_required": False,
            "field_evidence": {
                field: {
                    "raw_value": {
                        "title": "Poolside Activities",
                        "schedule": "Monday at 1:30pm",
                        "location": "Village Green Lawn",
                        "fee": "No fee marker present",
                    }[field],
                    "normalized_value": {
                        "title": "Poolside Activities",
                        "schedule": {
                            "schedule_type": "recurring",
                            "days_of_week": ["Monday"],
                            "start_time": "13:30",
                            "timezone": "America/New_York",
                        },
                        "location": "village_green_lawn",
                        "fee": False,
                    }[field],
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_storage_path": f"{field}.png",
                        "crop_sha256": f"{field}crop",
                    },
                    "engines": [
                        {
                            "engine": "paddleocr_ppstructurev3",
                            "text": {
                                "title": "Poolside Activities",
                                "schedule": "Monday at 1:30pm",
                                "location": "Village Green Lawn",
                                "fee": "No fee marker present",
                            }[field],
                            "confidence": 0.97,
                        },
                        {
                            "engine": "rapidocr",
                            "text": {
                                "title": "Poolside Activities",
                                "schedule": "Monday at 1:30pm",
                                "location": "Village Green Lawn",
                                "fee": "No fee marker present",
                            }[field],
                            "confidence": 0.94,
                        },
                    ],
                    "agreement": "exact_after_normalization",
                }
                for field in ("title", "schedule", "location", "fee")
            },
            "source_spans": {
                "title": [{"page": 1, "text": "Poolside Activities"}],
                "schedule": [{"page": 1, "text": "Monday at 1:30pm"}],
                "location": [{"page": 1, "text": "Village Green Lawn"}],
                "fee": [{"page": 1, "text": "No fee marker present"}],
            },
            "validation_findings": [],
        }
        valid_candidate["field_evidence"]["region"] = {
            "source": {
                "content_sha256": "sourcehash",
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [0, 0, 200, 200],
                "crop_storage_path": "region.png",
                "crop_sha256": "regioncrop",
            },
            "agreement": "not_required",
        }

        self.assertEqual("auto_publishable", validate_candidate(valid_candidate)["validation_status"])

        missing_source_kind = json.loads(json.dumps(valid_candidate))
        del missing_source_kind["source_kind"]
        self.assertEqual("rejected", validate_candidate(missing_source_kind)["validation_status"])
        self.assertIn("missing_source_kind", validate_candidate(missing_source_kind)["validation_findings"])

        non_official_source = json.loads(json.dumps(valid_candidate))
        non_official_source["source_kind"] = "third_party_image"
        self.assertEqual("rejected", validate_candidate(non_official_source)["validation_status"])
        self.assertIn("non_official_source", validate_candidate(non_official_source)["validation_findings"])

        failed_fetch = json.loads(json.dumps(valid_candidate))
        failed_fetch["http_status"] = 404
        self.assertEqual("rejected", validate_candidate(failed_fetch)["validation_status"])
        self.assertIn("source_fetch_not_successful", validate_candidate(failed_fetch)["validation_findings"])

        stale_source = json.loads(json.dumps(valid_candidate))
        stale_source["currentness"] = "hash_changed"
        self.assertEqual("rejected", validate_candidate(stale_source)["validation_status"])
        self.assertIn("source_not_current", validate_candidate(stale_source)["validation_findings"])

        missing_source_url = json.loads(json.dumps(valid_candidate))
        del missing_source_url["canonical_url"]
        del missing_source_url["fetched_url"]
        self.assertEqual("rejected", validate_candidate(missing_source_url)["validation_status"])
        self.assertIn("missing_source_url", validate_candidate(missing_source_url)["validation_findings"])

        missing_region_id = json.loads(json.dumps(valid_candidate))
        del missing_region_id["region_id"]
        self.assertEqual("needs_review", validate_candidate(missing_region_id)["validation_status"])
        self.assertIn("missing_activity_region_id", validate_candidate(missing_region_id)["validation_findings"])

        missing_region_type = json.loads(json.dumps(valid_candidate))
        del missing_region_type["region_type"]
        self.assertEqual("needs_review", validate_candidate(missing_region_type)["validation_status"])
        self.assertIn("missing_activity_region_type", validate_candidate(missing_region_type)["validation_findings"])

        missing_region_evidence = json.loads(json.dumps(valid_candidate))
        del missing_region_evidence["field_evidence"]["region"]
        self.assertEqual("needs_review", validate_candidate(missing_region_evidence)["validation_status"])
        self.assertIn("missing_activity_region_evidence", validate_candidate(missing_region_evidence)["validation_findings"])

        missing_schedule = json.loads(json.dumps(valid_candidate))
        del missing_schedule["field_evidence"]["schedule"]
        self.assertEqual("needs_review", validate_candidate(missing_schedule)["validation_status"])
        self.assertIn("missing_required_field:schedule", validate_candidate(missing_schedule)["validation_findings"])

        missing_source_identity = json.loads(json.dumps(valid_candidate))
        del missing_source_identity["source_document_id"]
        self.assertEqual("rejected", validate_candidate(missing_source_identity)["validation_status"])
        self.assertIn("missing_source_document_id", validate_candidate(missing_source_identity)["validation_findings"])

        missing_config_hash = json.loads(json.dumps(valid_candidate))
        del missing_config_hash["config_hash"]
        self.assertEqual("rejected", validate_candidate(missing_config_hash)["validation_status"])
        self.assertIn("missing_config_hash", validate_candidate(missing_config_hash)["validation_findings"])

        missing_runtime_lineage = json.loads(json.dumps(valid_candidate))
        del missing_runtime_lineage["runtime_lineage"]
        self.assertEqual("rejected", validate_candidate(missing_runtime_lineage)["validation_status"])
        self.assertIn("missing_runtime_lineage", validate_candidate(missing_runtime_lineage)["validation_findings"])

        missing_git_sha = json.loads(json.dumps(valid_candidate))
        del missing_git_sha["runtime_lineage"]["git_sha"]
        self.assertEqual("rejected", validate_candidate(missing_git_sha)["validation_status"])
        self.assertIn("missing_git_sha", validate_candidate(missing_git_sha)["validation_findings"])

        missing_model_hashes = json.loads(json.dumps(valid_candidate))
        del missing_model_hashes["runtime_lineage"]["model_asset_hashes"]
        self.assertEqual("rejected", validate_candidate(missing_model_hashes)["validation_status"])
        self.assertIn("missing_model_asset_hashes", validate_candidate(missing_model_hashes)["validation_findings"])

        missing_runtime_config = json.loads(json.dumps(valid_candidate))
        del missing_runtime_config["runtime_lineage"]["config"]
        self.assertEqual("rejected", validate_candidate(missing_runtime_config)["validation_status"])
        self.assertIn("missing_runtime_config", validate_candidate(missing_runtime_config)["validation_findings"])

        missing_ocr_engine_configs = json.loads(json.dumps(valid_candidate))
        del missing_ocr_engine_configs["runtime_lineage"]["ocr_engine_configs"]
        self.assertEqual("rejected", validate_candidate(missing_ocr_engine_configs)["validation_status"])
        self.assertIn("missing_ocr_engine_configs", validate_candidate(missing_ocr_engine_configs)["validation_findings"])

        empty_package_versions = json.loads(json.dumps(valid_candidate))
        empty_package_versions["runtime_lineage"]["package_versions"] = {}
        self.assertEqual("rejected", validate_candidate(empty_package_versions)["validation_status"])
        self.assertIn("missing_package_versions", validate_candidate(empty_package_versions)["validation_findings"])

        empty_model_hashes = json.loads(json.dumps(valid_candidate))
        empty_model_hashes["runtime_lineage"]["model_asset_hashes"] = {}
        self.assertEqual("rejected", validate_candidate(empty_model_hashes)["validation_status"])
        self.assertIn("missing_model_asset_hashes", validate_candidate(empty_model_hashes)["validation_findings"])

        mismatched_lineage_config = json.loads(json.dumps(valid_candidate))
        mismatched_lineage_config["runtime_lineage"]["config_hash"] = "oldconfighash"
        self.assertEqual("rejected", validate_candidate(mismatched_lineage_config)["validation_status"])
        self.assertIn(
            "runtime_lineage_config_hash_mismatch",
            validate_candidate(mismatched_lineage_config)["validation_findings"],
        )

        missing_canonical_pages = json.loads(json.dumps(valid_candidate))
        del missing_canonical_pages["canonical_page_image_sha256s"]
        self.assertEqual("rejected", validate_candidate(missing_canonical_pages)["validation_status"])
        self.assertIn("missing_canonical_page_image", validate_candidate(missing_canonical_pages)["validation_findings"])

        mismatched_canonical_page = json.loads(json.dumps(valid_candidate))
        mismatched_canonical_page["canonical_page_image_sha256s"] = ["otherpagehash"]
        self.assertEqual("rejected", validate_candidate(mismatched_canonical_page)["validation_status"])
        self.assertIn(
            "field_page_image_not_canonical:schedule",
            validate_candidate(mismatched_canonical_page)["validation_findings"],
        )

        mismatched_field_source_hash = json.loads(json.dumps(valid_candidate))
        mismatched_field_source_hash["field_evidence"]["schedule"]["source"]["content_sha256"] = "otherhash"
        self.assertEqual("rejected", validate_candidate(mismatched_field_source_hash)["validation_status"])
        self.assertIn(
            "field_source_hash_mismatch:schedule",
            validate_candidate(mismatched_field_source_hash)["validation_findings"],
        )

        missing_source_span = json.loads(json.dumps(valid_candidate))
        del missing_source_span["source_spans"]["schedule"]
        self.assertEqual("needs_review", validate_candidate(missing_source_span)["validation_status"])
        self.assertIn("missing_source_span:schedule", validate_candidate(missing_source_span)["validation_findings"])

        missing_field_raw_value = json.loads(json.dumps(valid_candidate))
        del missing_field_raw_value["field_evidence"]["schedule"]["raw_value"]
        self.assertEqual("needs_review", validate_candidate(missing_field_raw_value)["validation_status"])
        self.assertIn(
            "missing_field_raw_value:schedule",
            validate_candidate(missing_field_raw_value)["validation_findings"],
        )

        missing_field_normalized_value = json.loads(json.dumps(valid_candidate))
        del missing_field_normalized_value["field_evidence"]["schedule"]["normalized_value"]
        self.assertEqual("needs_review", validate_candidate(missing_field_normalized_value)["validation_status"])
        self.assertIn(
            "missing_field_normalized_value:schedule",
            validate_candidate(missing_field_normalized_value)["validation_findings"],
        )

        mismatched_field_normalized_value = json.loads(json.dumps(valid_candidate))
        mismatched_field_normalized_value["field_evidence"]["schedule"]["normalized_value"]["start_time"] = "14:30"
        self.assertEqual("needs_review", validate_candidate(mismatched_field_normalized_value)["validation_status"])
        self.assertIn(
            "field_normalized_value_mismatch:schedule",
            validate_candidate(mismatched_field_normalized_value)["validation_findings"],
        )

        mismatched_field_raw_value = json.loads(json.dumps(valid_candidate))
        mismatched_field_raw_value["field_evidence"]["schedule"]["raw_value"] = "Monday at 2:30pm"
        self.assertEqual("needs_review", validate_candidate(mismatched_field_raw_value)["validation_status"])
        self.assertIn(
            "field_raw_value_mismatch:schedule",
            validate_candidate(mismatched_field_raw_value)["validation_findings"],
        )

        missing_engine_evidence = json.loads(json.dumps(valid_candidate))
        missing_engine_evidence["field_evidence"]["schedule"].pop("engines", None)
        self.assertEqual("needs_review", validate_candidate(missing_engine_evidence)["validation_status"])
        self.assertIn(
            "missing_field_engine_evidence:schedule",
            validate_candidate(missing_engine_evidence)["validation_findings"],
        )

        missing_engine_confidence = json.loads(json.dumps(valid_candidate))
        missing_engine_confidence["field_evidence"]["schedule"]["engines"][0].pop("confidence", None)
        self.assertEqual("needs_review", validate_candidate(missing_engine_confidence)["validation_status"])
        self.assertIn(
            "missing_field_engine_confidence:schedule",
            validate_candidate(missing_engine_confidence)["validation_findings"],
        )

        wrong_primary_engine = json.loads(json.dumps(valid_candidate))
        wrong_primary_engine["field_evidence"]["schedule"]["engines"][0]["engine"] = "other_primary_ocr"
        self.assertEqual("needs_review", validate_candidate(wrong_primary_engine)["validation_status"])
        self.assertIn(
            "missing_required_engine_evidence:schedule",
            validate_candidate(wrong_primary_engine)["validation_findings"],
        )

        composed_schedule_engine_fragments = json.loads(json.dumps(valid_candidate))
        composed_schedule_engine_fragments["schedule_raw"] = "Monday at 8:3OPM"
        composed_schedule_engine_fragments["schedule_normalized"] = {
            "schedule_type": "recurring",
            "days_of_week": ["Monday"],
            "start_time": "20:30",
            "timezone": "America/New_York",
        }
        composed_schedule_engine_fragments["field_evidence"]["schedule"]["raw_value"] = "Monday at 8:3OPM"
        composed_schedule_engine_fragments["field_evidence"]["schedule"]["normalized_value"] = {
            "schedule_type": "recurring",
            "days_of_week": ["Monday"],
            "start_time": "20:30",
            "timezone": "America/New_York",
        }
        composed_schedule_engine_fragments["field_evidence"]["schedule"]["engines"][0]["text"] = "8:3OPM"
        composed_schedule_engine_fragments["field_evidence"]["schedule"]["engines"][1]["text"] = "8:30PM"
        composed_schedule_engine_fragments["source_spans"]["schedule"] = [{"page": 1, "text": "Monday at 8:3OPM"}]
        composed_result = validate_candidate(composed_schedule_engine_fragments)
        self.assertEqual("auto_publishable", composed_result["validation_status"])
        self.assertNotIn("engine_disagreement:schedule", composed_result["validation_findings"])

        runtime_configured_secondary_engine = json.loads(json.dumps(valid_candidate))
        runtime_configured_secondary_engine["runtime_lineage"]["config"] = {
            "ocr": {
                "primary": {"engine": "paddleocr_ppstructurev3"},
                "secondary": {"engine": "configured_secondary_ocr"},
            }
        }
        self.assertEqual("needs_review", validate_candidate(runtime_configured_secondary_engine)["validation_status"])
        self.assertIn(
            "missing_required_engine_evidence:schedule",
            validate_candidate(runtime_configured_secondary_engine)["validation_findings"],
        )

        mismatched_engine_text = json.loads(json.dumps(valid_candidate))
        mismatched_engine_text["field_evidence"]["schedule"]["engines"][1]["text"] = "Monday at 2:30pm"
        self.assertEqual("needs_review", validate_candidate(mismatched_engine_text)["validation_status"])
        self.assertIn(
            "engine_disagreement:schedule",
            validate_candidate(mismatched_engine_text)["validation_findings"],
        )

        engine_agrees_on_different_value = json.loads(json.dumps(valid_candidate))
        engine_agrees_on_different_value["field_evidence"]["schedule"]["engines"][0]["text"] = "Monday at 2:30pm"
        engine_agrees_on_different_value["field_evidence"]["schedule"]["engines"][1]["text"] = "Monday at 2:30pm"
        self.assertEqual("needs_review", validate_candidate(engine_agrees_on_different_value)["validation_status"])
        self.assertIn(
            "field_engine_value_mismatch:schedule",
            validate_candidate(engine_agrees_on_different_value)["validation_findings"],
        )

        missing_all_evidence = json.loads(json.dumps(valid_candidate))
        missing_all_evidence["field_evidence"] = {}
        self.assertEqual("rejected", validate_candidate(missing_all_evidence)["validation_status"])
        self.assertIn("missing_reviewable_evidence", validate_candidate(missing_all_evidence)["validation_findings"])

        missing_visible_review_artifact = json.loads(json.dumps(valid_candidate))
        del missing_visible_review_artifact["field_evidence"]["schedule"]
        missing_visible_review_artifact["field_evidence"] = {
            "region": {
                "source": {
                    "page_number": 1,
                    "bbox_px": [10, 10, 100, 30],
                    "crop_sha256": "regioncrop",
                }
            }
        }
        self.assertEqual("rejected", validate_candidate(missing_visible_review_artifact)["validation_status"])
        self.assertIn(
            "missing_reviewable_evidence",
            validate_candidate(missing_visible_review_artifact)["validation_findings"],
        )

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

        critical_agreement_not_required = json.loads(json.dumps(valid_candidate))
        critical_agreement_not_required["field_evidence"]["title"]["agreement"] = "not_required"
        self.assertEqual("needs_review", validate_candidate(critical_agreement_not_required)["validation_status"])
        self.assertIn(
            "engine_disagreement:title",
            validate_candidate(critical_agreement_not_required)["validation_findings"],
        )

        manual_reviewed_without_decision = json.loads(json.dumps(valid_candidate))
        manual_reviewed_without_decision["field_evidence"]["schedule"]["agreement"] = "manual_reviewed"
        self.assertEqual("needs_review", validate_candidate(manual_reviewed_without_decision)["validation_status"])
        self.assertIn(
            "manual_review_required:schedule",
            validate_candidate(manual_reviewed_without_decision)["validation_findings"],
        )

        unknown_family = json.loads(json.dumps(valid_candidate))
        unknown_family["document_family"] = "unknown_visual_schedule"
        self.assertIn("unknown_document_family", validate_candidate(unknown_family)["validation_findings"])

        generic_visual_review = json.loads(json.dumps(valid_candidate))
        generic_visual_review["candidate_type"] = "generic_visual_review"
        validated_generic = validate_candidate(generic_visual_review)
        self.assertEqual("needs_review", validated_generic["validation_status"])
        self.assertIn(
            "review_only_candidate_type:generic_visual_review",
            validated_generic["validation_findings"],
        )

        fee_conflict = json.loads(json.dumps(valid_candidate))
        fee_conflict["fee_required"] = False
        fee_conflict["field_evidence"]["fee"]["raw_value"] = "Poolside Activities ($)"
        for engine_record in fee_conflict["field_evidence"]["fee"]["engines"]:
            engine_record["text"] = "($)"
        self.assertIn("fee_marker_conflict", validate_candidate(fee_conflict)["validation_findings"])

        page_legend_not_conflict = json.loads(json.dumps(valid_candidate))
        page_legend_not_conflict["fee_required"] = False
        page_legend_not_conflict["field_evidence"]["fee"]["raw_value"] = (
            "Poolside Activities ($) There is a fee associated with this activity."
        )
        page_legend_not_conflict["field_evidence"]["fee"]["normalized_value"] = False
        for engine_record in page_legend_not_conflict["field_evidence"]["fee"]["engines"]:
            engine_record["text"] = "no fee marker"
        self.assertNotIn(
            "fee_marker_conflict",
            validate_candidate(page_legend_not_conflict)["validation_findings"],
        )

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
                            "pipeline_version": "vision_v3_001",
                            "config_hash": "confighash",
                            "runtime_lineage": {
                                "config_hash": "confighash",
                                "lineage_hash": "lineagehash",
                                "git_sha": "deadbeef",
                                "config": {
                                    "ocr": {
                                        "primary": {"engine": "paddleocr_ppstructurev3"},
                                        "secondary": {"engine": "rapidocr"},
                                    }
                                },
                                "package_versions": {"paddleocr": "3.0.0", "rapidocr": "2.0.0"},
                                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                                "ocr_engine_configs": {
                                    "paddleocr_ppstructurev3": {
                                        "engine": "paddleocr_ppstructurev3",
                                        "mode": "ppstructurev3",
                                    },
                                    "rapidocr": {"engine": "rapidocr"},
                                },
                            },
                            "document_family": "aframe_recreation",
                            "source_document_id": "source-doc-1",
                            "source_kind": "official_image",
                            "source_role": "resort_pdf",
                            "canonical_url": "https://example.com/sign.jpg",
                            "fetched_url": "https://example.com/sign.jpg",
                            "http_status": 200,
                            "currentness": "current",
                            "captured_at": "2026-06-28T12:00:00+00:00",
                            "content_sha256": "sourcehash",
                            "canonical_page_image_sha256s": ["pagehash"],
                            "candidate_type": "activity",
                            "region_id": "page-001-region-04",
                            "region_type": "resort_activities_section",
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
                                    "raw_value": {
                                        "title": "Poolside Activities",
                                        "schedule": "Monday at 1:30pm",
                                        "location": "Village Green Lawn",
                                        "fee": "No fee marker present",
                                    }[field],
                                    "normalized_value": {
                                        "title": "Poolside Activities",
                                        "schedule": {
                                            "schedule_type": "recurring",
                                            "days_of_week": ["Monday"],
                                            "start_time": "13:30",
                                            "timezone": "America/New_York",
                                        },
                                        "location": "village_green_lawn",
                                        "fee": False,
                                    }[field],
                                    "source": {
                                        "content_sha256": "sourcehash",
                                        "page_number": 1,
                                        "page_image_sha256": "pagehash",
                                        "bbox_px": [10, 10, 100, 30],
                                        "crop_path": f"{field}.png",
                                        "crop_sha256": f"{field}crop",
                                    },
                                    "engines": [
                                        {
                                            "engine": "paddleocr_ppstructurev3",
                                            "text": {
                                                "title": "Poolside Activities",
                                                "schedule": "Monday at 1:30pm",
                                                "location": "Village Green Lawn",
                                                "fee": "No fee marker present",
                                            }[field],
                                            "confidence": 0.97,
                                        },
                                        {
                                            "engine": "rapidocr",
                                            "text": {
                                                "title": "Poolside Activities",
                                                "schedule": "Monday at 1:30pm",
                                                "location": "Village Green Lawn",
                                                "fee": "No fee marker present",
                                            }[field],
                                            "confidence": 0.94,
                                        },
                                    ],
                                    "agreement": "exact_after_normalization",
                                }
                                for field in ("title", "schedule", "location", "fee")
                            },
                            "source_spans": {
                                "title": [{"page": 1, "text": "Poolside Activities"}],
                                "schedule": [{"page": 1, "text": "Monday at 1:30pm"}],
                                "location": [{"page": 1, "text": "Village Green Lawn"}],
                                "fee": [{"page": 1, "text": "No fee marker present"}],
                            },
                            "validation_findings": [],
                        }
                    ]
                )
            )
            candidate_payload = json.loads(candidates_path.read_text())
            candidate_payload[0]["field_evidence"]["region"] = {
                "source": {
                    "content_sha256": "sourcehash",
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "bbox_px": [0, 0, 200, 200],
                    "crop_path": "region.png",
                    "crop_sha256": "regioncrop",
                },
                "agreement": "not_required",
            }
            candidates_path.write_text(json.dumps(candidate_payload))
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

    def test_validate_v3_report_summarizes_findings_by_status(self) -> None:
        rejected_candidate = clean_publish_v3_preview()["rows"][0]
        rejected_candidate["source_kind"] = "third_party_pdf"
        rejected_candidate["field_evidence"] = {}
        rejected_candidate["source_spans"] = {}

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            (candidates_dir / "sourcehash.candidates.json").write_text(json.dumps([rejected_candidate]))

            report = validate_v3.validate_candidates_from_directory(
                candidates_dir=candidates_dir,
                output_dir=root / "validated",
                report_path=root / "validate_report.json",
            )

        self.assertEqual(1, report["summary"]["rejected_count"])
        self.assertEqual(
            1,
            report["summary"]["validation_findings_by_status"]["rejected"]["non_official_source"],
        )
        self.assertEqual(
            1,
            report["summary"]["validation_findings_by_status"]["rejected"]["missing_reviewable_evidence"],
        )

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
                        "page_image_sha256": "pagehash",
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
        hollow_candidate = json.loads(json.dumps(candidate))
        del hollow_candidate["field_evidence"]["region"]["source"]["page_image_sha256"]
        [unreviewable_task] = build_review_tasks([hollow_candidate])
        self.assertEqual("unreviewable_candidate", unreviewable_task["task_type"])
        self.assertEqual("cand-1", unreviewable_task["task_id"])
        self.assertEqual("sourcehash", unreviewable_task["content_sha256"])
        self.assertIn("missing_reviewable_evidence", unreviewable_task["validation_findings"])
        self.assertEqual(hollow_candidate, unreviewable_task["candidate"])
        manual_review_candidate = {
            **candidate,
            "candidate_id": "cand-manual",
            "validation_findings": ["manual_review_required:schedule"],
            "field_evidence": {
                "schedule": {
                    "source": {
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "crop_storage_path": "schedule.png",
                        "crop_sha256": "schedulecrop",
                        "bbox_px": [10, 20, 100, 40],
                    },
                    "engines": [{"text": "Daily at 1:30pm"}, {"text": "Daily at 1:30pm"}],
                    "raw_value": "Daily at 1:30pm",
                    "normalized_value": {"start_time": "13:30"},
                }
            },
        }
        [manual_task] = build_review_tasks([manual_review_candidate])
        self.assertEqual("manual_review_required", manual_task["task_type"])
        self.assertEqual("schedule", manual_task["field"])
        self.assertEqual("schedule.png", manual_task["field_crop"])
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
                "source_kind": "official_pdf",
                "source_role": "resort_pdf",
                "canonical_url": "https://example.com/official-calendar.pdf",
                "fetched_url": "https://cdn.example.com/official-calendar.pdf",
                "http_status": 200,
                "currentness": "current",
                "captured_at": "2026-06-28T12:00:00+00:00",
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
        self.assertEqual(
            {
                "source_kind": "official_pdf",
                "source_role": "resort_pdf",
                "canonical_url": "https://example.com/official-calendar.pdf",
                "fetched_url": "https://cdn.example.com/official-calendar.pdf",
                "http_status": 200,
                "currentness": "current",
                "captured_at": "2026-06-28T12:00:00+00:00",
            },
            tasks[0]["source_metadata"],
        )

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
                    [
                        "build_review_queue_v3.py",
                        "--output",
                        str(output_path),
                        *empty_review_queue_cli_defaults(root),
                    ],
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
                    *empty_review_queue_cli_defaults(root, include_source_statuses=False),
                ],
            ):
                build_review_queue_v3.main()

            tasks = json.loads(output_path.read_text())

        self.assertEqual(1, len(tasks))
        self.assertEqual("parser_error", tasks[0]["task_type"])
        self.assertEqual("source-doc-parser", tasks[0]["source_document_id"])

    def test_review_queue_v3_cli_accepts_source_drift_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            validated_dir = root / "validated"
            drift_path = root / "source_drift_report.json"
            output_path = root / "review_queue.json"
            validated_dir.mkdir()
            drift_path.write_text(
                json.dumps(
                    {
                        "status": "review_required",
                        "calendar_group_key": "boardwalk",
                        "old_hash": "oldhash",
                        "new_hash": "newhash",
                        "changed_locations": [
                            {
                                "canonical_slug": "campfire",
                                "title": "Campfire",
                                "old": "Beach",
                                "new": "Village Green Lawn",
                            }
                        ],
                        "publish_blockers": [],
                    }
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "build_review_queue_v3.py",
                    str(validated_dir),
                    "--source-drift-report",
                    str(drift_path),
                    "--output",
                    str(output_path),
                    *empty_review_queue_cli_defaults(root, include_source_drift_report=False),
                ],
            ):
                build_review_queue_v3.main()

            tasks = json.loads(output_path.read_text())

        self.assertEqual(1, len(tasks))
        self.assertEqual("source-drift-boardwalk-location-campfire", tasks[0]["task_id"])
        self.assertEqual("source_changed", tasks[0]["task_type"])
        self.assertEqual(["source_changed:location"], tasks[0]["validation_findings"])

    def test_review_queue_v3_cli_accepts_dual_run_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            validated_dir = root / "validated"
            dual_run_path = root / "v3_dual_run_report.json"
            output_path = root / "review_queue.json"
            validated_dir.mkdir()
            dual_run_path.write_text(
                json.dumps(
                    {
                        "status": "blocked",
                        "field_diffs": [
                            {
                                "diff_key": "boardwalk:poolside-activities:schedule",
                                "canonical_slug": "poolside-activities",
                                "calendar_group_key": "boardwalk",
                                "field": "schedule",
                                "v2_value": "Daily at 1:30pm",
                                "v3_value": "Daily at 2:30pm",
                                "reviewed": False,
                            }
                        ],
                    }
                )
            )

            with patch.object(
                sys,
                "argv",
                [
                    "build_review_queue_v3.py",
                    str(validated_dir),
                    "--dual-run-report",
                    str(dual_run_path),
                    "--output",
                    str(output_path),
                    *empty_review_queue_cli_defaults(root, include_dual_run_report=False),
                ],
            ):
                build_review_queue_v3.main()

            tasks = json.loads(output_path.read_text())

        self.assertEqual(1, len(tasks))
        self.assertEqual("dual-run-diff-boardwalk-poolside-activities-schedule", tasks[0]["task_id"])
        self.assertEqual("gold_conflict", tasks[0]["task_type"])

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

    def test_review_queue_v3_includes_page_region_and_source_context_for_review(self) -> None:
        candidate = {
            "candidate_id": "cand-context",
            "validation_status": "needs_review",
            "validation_findings": ["engine_disagreement:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "source_kind": "official_pdf",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/official-calendar.pdf",
            "fetched_url": "https://cdn.example.com/official-calendar.pdf",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
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
                "region": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "page_image_path": "pages/page_001.png",
                        "bbox_px": [0, 0, 400, 300],
                        "crop_storage_path": "regions/region.png",
                        "crop_sha256": "regioncrop",
                    }
                },
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
                        "page_image_path": "pages/page_001.png",
                        "bbox_px": [10, 20, 200, 44],
                        "crop_storage_path": "fields/schedule.png",
                        "crop_sha256": "schedulecrop",
                    },
                    "engines": [
                        {"engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "confidence": 0.97},
                        {"engine": "rapidocr", "text": "Daily at 7:30pm", "confidence": 0.94},
                    ],
                    "agreement": "disagreement",
                    "review_status": "required",
                },
            },
        }

        [task] = build_review_tasks([candidate])

        self.assertEqual("pagehash", task["page_image"])
        self.assertEqual("pagehash", task["page_image_sha256"])
        self.assertEqual("pages/page_001.png", task["page_image_path"])
        self.assertEqual("regions/region.png", task["region_crop"])
        self.assertEqual("regioncrop", task["region_crop_sha256"])
        self.assertEqual("fields/schedule.png", task["field_crop"])
        self.assertEqual("schedulecrop", task["field_crop_sha256"])
        self.assertEqual(
            {
                "source_kind": "official_pdf",
                "source_role": "resort_pdf",
                "canonical_url": "https://example.com/official-calendar.pdf",
                "fetched_url": "https://cdn.example.com/official-calendar.pdf",
                "http_status": 200,
                "currentness": "current",
                "captured_at": "2026-06-28T12:00:00+00:00",
            },
            task["source_metadata"],
        )

    def test_review_queue_v3_resolves_page_image_path_from_candidate_source_pages(self) -> None:
        candidate = {
            "candidate_id": "cand-source-page-path",
            "validation_status": "needs_review",
            "validation_findings": ["manual_review_required:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "source_pages": [
                {
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "page_image_path": "pages/page_001.png",
                }
            ],
            "field_evidence": {
                "region": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [0, 0, 400, 300],
                        "crop_storage_path": "regions/region.png",
                        "crop_sha256": "regioncrop",
                    }
                },
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
                        "crop_storage_path": "fields/schedule.png",
                        "crop_sha256": "schedulecrop",
                    },
                    "engines": [
                        {"engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "confidence": 0.97},
                        {"engine": "rapidocr", "text": "Daily at 1:30pm", "confidence": 0.94},
                    ],
                    "agreement": "agreement",
                    "review_status": "required",
                },
            },
        }

        [task] = build_review_tasks([candidate])

        self.assertEqual("pagehash", task["page_image_sha256"])
        self.assertEqual("pages/page_001.png", task["page_image_path"])

    def test_review_queue_v3_includes_existing_gold_comparison_when_available(self) -> None:
        candidate = {
            "candidate_id": "cand-gold-compare",
            "validation_status": "needs_review",
            "validation_findings": ["engine_disagreement:schedule"],
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "canonical_slug": "poolside-activities",
            "candidate_type": "activity",
            "source_title": "Poolside Activities",
            "normalized_title": "Poolside Activities",
            "location_text": "Village Green Lawn",
            "normalized_location_id": "village_green_lawn",
            "schedule_raw": "Daily at 1:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ALL_DAYS,
                "start_time": "13:30",
                "timezone": "America/New_York",
            },
            "fee_required": False,
            "field_evidence": {
                "region": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [0, 0, 400, 300],
                        "crop_storage_path": "regions/region.png",
                        "crop_sha256": "regioncrop",
                    }
                },
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
                        "crop_storage_path": "fields/schedule.png",
                        "crop_sha256": "schedulecrop",
                    },
                    "engines": [
                        {"engine": "paddleocr_ppstructurev3", "text": "Daily at 1:30pm", "confidence": 0.97},
                        {"engine": "rapidocr", "text": "Daily at 7:30pm", "confidence": 0.94},
                    ],
                    "agreement": "disagreement",
                    "review_status": "required",
                },
            },
        }
        existing_gold = [
            {
                "calendar_group_key": "boardwalk",
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 7:30pm"},
                "location": {"id": "luna_park_pool_deck", "label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            }
        ]

        [task] = build_review_tasks([candidate], existing_gold_rows=existing_gold)

        self.assertEqual(
            {
                "matched": True,
                "match_key": "boardwalk:poolside-activities",
                "fields": {
                    "title": {"candidate": "Poolside Activities", "existing": "Poolside Activities", "changed": False},
                    "schedule": {"candidate": "Daily at 1:30pm", "existing": "Daily at 7:30pm", "changed": True},
                    "location": {"candidate": "Village Green Lawn", "existing": "Luna Park Pool Deck", "changed": True},
                    "price": {"candidate": "free", "existing": "free", "changed": False},
                },
            },
            task["existing_gold_comparison"],
        )

    def test_review_queue_v3_normalizes_prd_review_task_types(self) -> None:
        base_candidate = {
            "validation_status": "needs_review",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "activity",
            "field_evidence": {
                "region": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [0, 0, 400, 300],
                        "crop_storage_path": "regions/region.png",
                        "crop_sha256": "regioncrop",
                    }
                }
            },
        }
        candidates = [
            {
                **base_candidate,
                "candidate_id": "cand-low-quality",
                "validation_findings": ["low_quality_image:page_1"],
            },
            {
                **base_candidate,
                "candidate_id": "cand-source-changed",
                "validation_findings": ["source_changed:content_sha256"],
            },
            {
                **base_candidate,
                "candidate_id": "cand-gold-conflict",
                "validation_findings": ["gold_conflict:schedule"],
            },
            {
                **base_candidate,
                "candidate_id": "cand-fee-legend",
                "validation_findings": ["fee_legend_missing_for_unmarked_title", "engine_disagreement:title"],
                "field_evidence": {
                    **base_candidate["field_evidence"],
                    "fee": {
                        "raw_value": "no fee marker",
                        "normalized_value": None,
                        "source": {
                            "content_sha256": "sourcehash",
                            "page_number": 1,
                            "page_image_sha256": "pagehash",
                            "bbox_px": [10, 10, 100, 30],
                            "crop_storage_path": "fee.png",
                            "crop_sha256": "feecrop",
                        },
                        "engines": [
                            {"engine": "paddleocr_ppstructurev3", "text": "no fee marker", "confidence": 0.97},
                            {"engine": "rapidocr", "text": "no fee marker", "confidence": 0.94},
                        ],
                    },
                },
            },
        ]

        tasks = build_review_tasks(candidates)

        self.assertEqual(
            ["low_quality_image", "source_changed", "gold_conflict", "manual_review_required"],
            [task["task_type"] for task in tasks],
        )
        self.assertEqual(
            [
                ["low_quality_image:page_1"],
                ["source_changed:content_sha256"],
                ["gold_conflict:schedule"],
                ["fee_legend_missing_for_unmarked_title", "engine_disagreement:title"],
            ],
            [task["validation_findings"] for task in tasks],
        )
        self.assertEqual("fee", tasks[3]["field"])
        self.assertEqual("fee.png", tasks[3]["field_crop"])

    def test_review_queue_v3_builds_gold_conflict_tasks_from_promotion_report(self) -> None:
        gold_conflicts = [
            {
                "conflict_type": "existing_gold_field_mismatch",
                "calendar_group_key": "boardwalk",
                "canonical_slug": "poolside-activities",
                "source_sha256": "sourcehash",
                "edition": "fy26-q3-0526",
                "fields": ["schedule", "location"],
            }
        ]
        existing_gold = [
            {
                "calendar_group_key": "boardwalk",
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 7:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            }
        ]

        tasks = build_review_tasks([], gold_conflicts=gold_conflicts, existing_gold_rows=existing_gold)

        self.assertEqual(1, len(tasks))
        task = tasks[0]
        self.assertEqual("gold-conflict-boardwalk-poolside-activities-sourcehash", task["task_id"])
        self.assertEqual("gold_conflict", task["task_type"])
        self.assertEqual("boardwalk", task["calendar_group_key"])
        self.assertEqual("sourcehash", task["content_sha256"])
        self.assertEqual(["gold_conflict:schedule", "gold_conflict:location"], task["validation_findings"])
        self.assertEqual(gold_conflicts[0], task["gold_conflict"])
        self.assertEqual(
            {
                "matched": True,
                "match_key": "boardwalk:poolside-activities",
                "fields": {
                    "title": {"candidate": "", "existing": "Poolside Activities", "changed": True},
                    "schedule": {"candidate": "", "existing": "Daily at 7:30pm", "changed": True},
                    "location": {"candidate": "", "existing": "Luna Park Pool Deck", "changed": True},
                    "price": {"candidate": "", "existing": "free", "changed": True},
                },
            },
            task["existing_gold_comparison"],
        )

    def test_review_queue_v3_builds_source_changed_tasks_from_drift_report(self) -> None:
        source_drift_report = {
            "report_kind": "v3_quarter_source_drift",
            "quarter": "fy26-q4",
            "status": "review_required",
            "publish_blockers": ["source_hash_changed", "activity_count_drift"],
            "source_reports": [
                {
                    "calendar_group_key": "boardwalk",
                    "status": "review_required",
                    "old_hash": "oldhash",
                    "new_hash": "newhash",
                    "old_document_family": "aframe_recreation",
                    "new_document_family": "aframe_recreation",
                    "old_activity_count": 1,
                    "new_activity_count": 2,
                    "old_movie_count": 0,
                    "new_movie_count": 0,
                    "new_titles": ["Campfire"],
                    "new_title_details": [
                        {
                            "title": "Campfire",
                            "page_number": 1,
                            "page_image_sha256": "titlepagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-a/title.png",
                            "crop_sha256": "titlecrophash",
                            "bbox_px": [20, 40, 180, 70],
                            "text": "Campfire",
                        }
                    ],
                    "removed_titles": ["Arcade Tournament"],
                    "removed_title_details": [
                        {
                            "title": "Arcade Tournament",
                            "page_number": 1,
                            "page_image_sha256": "removedpagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-old/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-old/title.png",
                            "crop_sha256": "removedcrophash",
                            "bbox_px": [24, 80, 220, 108],
                            "text": "Arcade Tournament",
                        }
                    ],
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 1:30pm",
                            "new": "Daily at 2:30pm",
                        }
                    ],
                    "changed_locations": [],
                    "changed_fees": [],
                    "new_unknown_regions": [],
                    "validation_failures": [],
                    "publish_blockers": ["activity_count_drift"],
                    "manual_review_required": True,
                }
            ],
        }

        tasks = build_review_tasks([], source_drift_report=source_drift_report)

        self.assertEqual(
            [
                "source-drift-boardwalk-schedule-poolside-activities",
                "source-drift-boardwalk-new-title-campfire",
                "source-drift-boardwalk-removed-title-arcade-tournament",
                "source-drift-boardwalk-blocker-activity-count-drift",
            ],
            [task["task_id"] for task in tasks],
        )
        self.assertEqual(["source_changed"] * 4, [task["task_type"] for task in tasks])
        self.assertEqual(["schedule", "title", "title", None], [task["field"] for task in tasks])
        self.assertEqual(["newhash"] * 4, [task["content_sha256"] for task in tasks])
        self.assertEqual(["boardwalk"] * 4, [task["calendar_group_key"] for task in tasks])
        self.assertEqual("Daily at 1:30pm", tasks[0]["source_drift"]["old"])
        self.assertEqual("Daily at 2:30pm", tasks[0]["candidate_value"])
        self.assertEqual(["source_changed:schedule"], tasks[0]["validation_findings"])
        self.assertEqual(["source_changed:new_title"], tasks[1]["validation_findings"])
        self.assertEqual("titlepagehash", tasks[1]["page_image_sha256"])
        self.assertEqual("data/processed/source_pages/source-doc-a/page-001.png", tasks[1]["page_image_path"])
        self.assertEqual("data/processed/region_crops/source-doc-a/title.png", tasks[1]["field_crop"])
        self.assertEqual("titlecrophash", tasks[1]["field_crop_sha256"])
        self.assertEqual([20, 40, 180, 70], tasks[1]["field_bbox"])
        self.assertEqual("Campfire", tasks[1]["primary_text"])
        self.assertEqual(["source_changed:removed_title"], tasks[2]["validation_findings"])
        self.assertEqual("removedpagehash", tasks[2]["page_image_sha256"])
        self.assertEqual("data/processed/source_pages/source-doc-old/page-001.png", tasks[2]["page_image_path"])
        self.assertEqual("data/processed/region_crops/source-doc-old/title.png", tasks[2]["field_crop"])
        self.assertEqual("removedcrophash", tasks[2]["field_crop_sha256"])
        self.assertEqual([24, 80, 220, 108], tasks[2]["field_bbox"])
        self.assertEqual("Arcade Tournament", tasks[2]["primary_text"])
        self.assertEqual(["source_changed:activity_count_drift"], tasks[3]["validation_findings"])
        self.assertEqual(
            {
                "publish_blocker": "activity_count_drift",
                "old_activity_count": 1,
                "new_activity_count": 2,
                "old_movie_count": 0,
                "new_movie_count": 0,
                "old_document_family": "aframe_recreation",
                "new_document_family": "aframe_recreation",
                "old_count": 1,
                "new_count": 2,
            },
            tasks[3]["source_drift"],
        )
        self.assertEqual({"old_count": 1, "new_count": 2}, tasks[3]["normalized_value"])
        self.assertEqual(source_drift_report["source_reports"][0], tasks[0]["source_drift_report"])

    def test_review_queue_v3_carries_source_drift_visual_evidence(self) -> None:
        source_drift_report = {
            "report_kind": "v3_quarter_source_drift",
            "quarter": "fy26-q4",
            "status": "review_required",
            "publish_blockers": ["source_hash_changed"],
            "source_reports": [
                {
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-a",
                    "source_kind": "official_pdf",
                    "source_role": "resort_pdf",
                    "canonical_url": "https://example.test/boardwalk.pdf",
                    "fetched_url": "https://cdn.example.test/boardwalk.pdf",
                    "http_status": 200,
                    "currentness": "current",
                    "captured_at": "2026-06-29T12:00:00+00:00",
                    "status": "review_required",
                    "old_hash": "oldhash",
                    "new_hash": "newhash",
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 1:30pm",
                            "new": "Daily at 2:30pm",
                            "page_number": 1,
                            "page_image_sha256": "pagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-a/schedule.png",
                            "crop_sha256": "crophash",
                            "bbox_px": [16, 32, 320, 72],
                            "text": "Poolside Activities Daily at 2:30pm",
                        }
                    ],
                    "changed_locations": [],
                    "changed_fees": [],
                    "new_titles": [],
                    "removed_titles": [],
                    "publish_blockers": [],
                    "manual_review_required": True,
                }
            ],
        }

        [task] = build_review_tasks([], source_drift_report=source_drift_report)

        self.assertEqual(1, task["page_number"])
        self.assertEqual("pagehash", task["page_image"])
        self.assertEqual("pagehash", task["page_image_sha256"])
        self.assertEqual("data/processed/source_pages/source-doc-a/page-001.png", task["page_image_path"])
        self.assertEqual("data/processed/region_crops/source-doc-a/schedule.png", task["field_crop"])
        self.assertEqual("crophash", task["field_crop_sha256"])
        self.assertEqual([16, 32, 320, 72], task["field_bbox"])
        self.assertEqual("Poolside Activities Daily at 2:30pm", task["primary_text"])
        self.assertEqual(
            {
                "source_kind": "official_pdf",
                "source_role": "resort_pdf",
                "canonical_url": "https://example.test/boardwalk.pdf",
                "fetched_url": "https://cdn.example.test/boardwalk.pdf",
                "http_status": 200,
                "currentness": "current",
                "captured_at": "2026-06-29T12:00:00+00:00",
            },
            task["source_metadata"],
        )

    def test_review_queue_v3_keeps_source_drift_tasks_distinct_per_source_document(self) -> None:
        source_drift_report = {
            "report_kind": "v3_quarter_source_drift",
            "quarter": "fy26-q4",
            "status": "review_required",
            "publish_blockers": ["source_hash_changed"],
            "source_reports": [
                {
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-a",
                    "status": "review_required",
                    "old_hash": "oldhash-a",
                    "new_hash": "newhash-a",
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 1:30pm",
                            "new": "Daily at 2:30pm",
                        }
                    ],
                    "publish_blockers": [],
                },
                {
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-b",
                    "status": "review_required",
                    "old_hash": "oldhash-b",
                    "new_hash": "newhash-b",
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 3:30pm",
                            "new": "Daily at 4:30pm",
                        }
                    ],
                    "publish_blockers": [],
                },
            ],
        }

        tasks = build_review_tasks([], source_drift_report=source_drift_report)

        self.assertEqual(2, len(tasks))
        self.assertEqual(2, len({task["task_id"] for task in tasks}))
        self.assertEqual(
            ["source-doc-a", "source-doc-b"],
            [task["source_document_id"] for task in tasks],
        )
        self.assertEqual(
            [
                "source-drift-boardwalk-source-doc-a-schedule-poolside-activities",
                "source-drift-boardwalk-source-doc-b-schedule-poolside-activities",
            ],
            [task["task_id"] for task in tasks],
        )

    def test_review_queue_v3_builds_tasks_from_dual_run_report_blockers(self) -> None:
        dual_run_report = {
            "report_version": "v3_dual_run_report_001",
            "status": "blocked",
            "field_diffs": [
                {
                    "diff_key": "boardwalk:poolside-activities:schedule",
                    "row_key": "boardwalk:poolside-activities",
                    "canonical_slug": "poolside-activities",
                    "calendar_group_key": "boardwalk",
                    "field": "schedule",
                    "v2_value": "Daily at 1:30pm",
                    "v3_value": "Daily at 2:30pm",
                    "reviewed": False,
                    "v3_field_evidence": {
                        "source": {
                            "content_sha256": "sourcehash",
                            "page_number": 1,
                            "page_image_sha256": "pagehash",
                            "bbox_px": [10, 20, 200, 44],
                            "crop_storage_path": "fields/schedule.png",
                            "crop_sha256": "schedulecrop",
                        },
                        "engines": [
                            {"engine": "paddleocr_ppstructurev3", "text": "Daily at 2:30pm"},
                            {"engine": "rapidocr", "text": "Daily at 2:30pm"},
                        ],
                    },
                }
            ],
            "status_transitions": [
                {
                    "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
                    "row_key": "boardwalk:poolside-activities",
                    "canonical_slug": "poolside-activities",
                    "calendar_group_key": "boardwalk",
                    "from_status": "needs_review",
                    "to_status": "auto_publishable",
                    "evidence_changed": False,
                    "reviewed": False,
                }
            ],
            "unreviewed_status_transition_keys": [
                "boardwalk:poolside-activities:needs_review_to_auto_publishable"
            ],
            "new_v3_records": [
                {
                    "review_key": "boardwalk:movie-under-the-stars:new_record",
                    "row_key": "boardwalk:movie-under-the-stars",
                    "canonical_slug": "movie-under-the-stars",
                    "calendar_group_key": "boardwalk",
                    "title": "Movie Under the Stars",
                    "content_sha256": "newsourcehash",
                    "reviewed": False,
                }
            ],
            "unreviewed_new_keys": ["boardwalk:movie-under-the-stars"],
            "publish_blockers": [
                "unreviewed_v2_v3_field_diffs",
                "unreviewed_v3_status_transitions",
                "unreviewed_new_v3_rows",
            ],
        }

        tasks = build_review_tasks([], dual_run_report=dual_run_report)

        self.assertEqual(
            [
                "dual-run-diff-boardwalk-poolside-activities-schedule",
                "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
                "dual-run-new-boardwalk-movie-under-the-stars-new-record",
            ],
            [task["task_id"] for task in tasks],
        )
        self.assertEqual(
            ["gold_conflict", "manual_review_required", "manual_review_required"],
            [task["task_type"] for task in tasks],
        )
        self.assertEqual(["schedule", "status_transition", "new_record"], [task["field"] for task in tasks])
        self.assertEqual(["sourcehash", None, "newsourcehash"], [task["content_sha256"] for task in tasks])
        self.assertEqual("Daily at 1:30pm", tasks[0]["source_drift"]["old"])
        self.assertEqual("Daily at 2:30pm", tasks[0]["candidate_value"])
        self.assertEqual(["gold_conflict:v2_v3:schedule"], tasks[0]["validation_findings"])
        self.assertEqual("schedulecrop", tasks[0]["field_crop_sha256"])
        self.assertEqual(["manual_review_required:status_transition"], tasks[1]["validation_findings"])
        self.assertEqual(["manual_review_required:new_record"], tasks[2]["validation_findings"])
        self.assertEqual(dual_run_report["field_diffs"][0], tasks[0]["dual_run_diff"])
        self.assertEqual(dual_run_report["status_transitions"][0], tasks[1]["dual_run_status_transition"])
        self.assertEqual(dual_run_report["new_v3_records"][0], tasks[2]["dual_run_new_record"])

    def test_promote_gold_v3_preview_only_includes_gated_rows_with_field_evidence(self) -> None:
        auto_candidate = {
            "validation_status": "auto_publishable",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "source_kind": "official_pdf",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/official-calendar.pdf",
            "fetched_url": "https://cdn.example.com/official-calendar.pdf",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "calendar_group_key": "boardwalk",
            "document_family": "aframe_recreation",
            "canonical_page_image_sha256s": ["pagehash"],
            "source_pages": [
                {
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "page_image_path": "page.png",
                }
            ],
            "edition": "fy26-q3-0526",
            "source_type": "pdf",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "package_versions": {"pypdfium2": "4.30.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
            },
            "resort_slug": "boardwalk-inn",
            "candidate_type": "activity",
            "region_id": "page-001-region-04",
            "region_type": "resort_activities_section",
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
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_sha256": f"{field}crop",
                        "crop_storage_path": f"{field}.png",
                    },
                    "agreement": "exact_after_normalization",
                }
                for field in ("title", "schedule", "location", "fee")
            },
            "source_spans": {
                "title": [{"page": 1, "text": "Poolside Activities"}],
                "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
                "location": [{"page": 1, "text": "Village Green Lawn"}],
                "fee": [{"page": 1, "text": "No fee marker present"}],
            },
            "derived_source_links": [
                {
                    "source_role": "derived_source_link",
                    "target_url": "https://disneyworld.disney.go.com/recreation/boardwalk-activities/",
                    "content_sha256": "derivedhash",
                    "source_crop_sha256": "qrcrop",
                    "parent_content_sha256": "sourcehash",
                }
            ],
        }
        auto_candidate["field_evidence"]["region"] = {
            "source": {
                "content_sha256": "sourcehash",
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [0, 0, 200, 200],
                "crop_storage_path": "region.png",
                "crop_sha256": "regioncrop",
            },
            "agreement": "not_required",
        }
        needs_review = {**auto_candidate, "validation_status": "needs_review", "normalized_title": "Unsafe Guess"}
        mislabeled_auto = {
            **auto_candidate,
            "validation_status": "auto_publishable",
            "normalized_title": "Bad Auto",
            "validation_findings": ["engine_disagreement:schedule"],
        }

        preview = build_gold_v3_preview([auto_candidate, needs_review, mislabeled_auto])

        self.assertRegex(preview.get("generated_at", ""), r"^\d{4}-\d{2}-\d{2}T")
        self.assertEqual(1, len(preview["rows"]))
        row = preview["rows"][0]
        self.assertEqual("vision_v3_preview", row["publication_mode"])
        self.assertEqual("source-doc-1", row["source_document_id"])
        self.assertEqual("sourcehash", row["source_sha256"])
        self.assertEqual("aframe_recreation", row["document_family"])
        self.assertEqual(["pagehash"], row["canonical_page_image_sha256s"])
        self.assertEqual("pagehash", row["source_pages"][0]["page_image_sha256"])
        self.assertEqual("fy26-q3-0526", row["edition"])
        self.assertEqual("pdf", row["source_type"])
        self.assertEqual("official_pdf", row["source_kind"])
        self.assertEqual("resort_pdf", row["source_role"])
        self.assertEqual(200, row["http_status"])
        self.assertEqual("current", row["currentness"])
        self.assertEqual("2026-06-28T12:00:00+00:00", row["captured_at"])
        self.assertEqual("page-001-region-04", row["region_id"])
        self.assertEqual("resort_activities_section", row["region_type"])
        self.assertEqual("confighash", row["config_hash"])
        self.assertEqual("lineagehash", row["runtime_lineage"]["lineage_hash"])
        self.assertEqual(
            "modelhash",
            row["runtime_lineage"]["model_asset_hashes"]["paddleocr_ppstructurev3"],
        )
        self.assertEqual("https://example.com/official-calendar.pdf", row["source"]["canonicalUrl"])
        self.assertEqual("https://cdn.example.com/official-calendar.pdf", row["source"]["fetchedUrl"])
        self.assertEqual("https://example.com/official-calendar.pdf", row["source_url"])
        self.assertEqual("Poolside Activities", row["title"])
        self.assertEqual("Daily at 1:30pm", row["schedule"]["text"])
        self.assertEqual(auto_candidate["field_evidence"], row["field_evidence"])
        self.assertEqual("regioncrop", row["field_evidence"]["region"]["source"]["crop_sha256"])
        self.assertEqual(auto_candidate["source_spans"], row["source_spans"])
        self.assertEqual(auto_candidate["derived_source_links"], row["derived_source_links"])
        self.assertEqual(auto_candidate["derived_source_links"], row["source"]["derivedSourceLinks"])
        self.assertEqual([], row["validation_findings"])
        self.assertEqual(2, preview["summary"]["skipped_not_publishable"])
        self.assertEqual(1, preview["summary"]["skipped_validation_findings"])

    def test_promote_gold_v3_preserves_movie_title_fields_for_movie_candidates(self) -> None:
        candidate = {
            "validation_status": "auto_publishable",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "source_kind": "official_pdf",
            "source_role": "resort_pdf",
            "canonical_url": "https://example.com/official-calendar.pdf",
            "fetched_url": "https://cdn.example.com/official-calendar.pdf",
            "http_status": 200,
            "currentness": "current",
            "captured_at": "2026-06-28T12:00:00+00:00",
            "calendar_group_key": "all-star-sports",
            "document_family": "aframe_recreation",
            "edition": "fy26-q3-0526",
            "source_type": "pdf",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {"config_hash": "confighash", "lineage_hash": "lineagehash"},
            "resort_slug": "all-star-sports-resort",
            "candidate_type": "movie",
            "region_id": "page-001-region-05",
            "region_type": "movie_section",
            "normalized_title": "Movies Under the Stars",
            "source_title": "Movies Under the Stars",
            "category": "movie",
            "movie_title": "Moana",
            "normalized_movie_title": "moana",
            "normalized_location_id": "surfboard_bay_pool_deck",
            "location_text": "Surfboard Bay Pool Deck",
            "schedule_raw": "Tuesday at 8:30pm",
            "schedule_normalized": {
                "schedule_type": "recurring",
                "days_of_week": ["Tuesday"],
                "start_time": "20:30",
                "timezone": "America/New_York",
            },
            "fee_required": False,
            "field_evidence": {
                field: {
                    **(
                        {"raw_value": "Moana", "normalized_value": "moana"}
                        if field == "movie_title"
                        else {}
                    ),
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
                for field in ("title", "schedule", "location", "fee", "movie_title")
            },
            "source_spans": {
                "title": [{"page": 1, "text": "Movies Under the Stars"}],
                "schedule": [{"page": 1, "text": "Tuesday at 8:30pm"}],
                "location": [{"page": 1, "text": "Surfboard Bay Pool Deck"}],
                "fee": [{"page": 1, "text": "No fee marker present"}],
                "movie_title": [{"page": 1, "text": "Moana"}],
            },
        }
        candidate["field_evidence"]["region"] = {
            "source": {
                "content_sha256": "sourcehash",
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [0, 0, 200, 200],
                "crop_storage_path": "region.png",
                "crop_sha256": "regioncrop",
            },
            "agreement": "not_required",
        }

        preview = build_gold_v3_preview([candidate])

        self.assertEqual(1, len(preview["rows"]))
        row = preview["rows"][0]
        self.assertEqual("movie", row["candidate_type"])
        self.assertEqual("Moana", row["movie_title"])
        self.assertEqual("moana", row["normalized_movie_title"])
        self.assertEqual("Moana", row["field_evidence"]["movie_title"]["raw_value"])

    def test_promote_gold_v3_surfaces_same_source_edition_gold_conflicts(self) -> None:
        candidate = {
            "validation_status": "auto_publishable",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "canonical_url": "https://example.com/official-calendar.pdf",
            "calendar_group_key": "boardwalk",
            "document_family": "aframe_recreation",
            "edition": "fy26-q3-0526",
            "source_type": "pdf",
            "pipeline_version": "vision_v3_001",
            "config_hash": "confighash",
            "runtime_lineage": {
                "config_hash": "confighash",
                "lineage_hash": "lineagehash",
                "package_versions": {"pypdfium2": "4.30.0"},
                "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
            },
            "resort_slug": "boardwalk-inn",
            "candidate_type": "activity",
            "canonical_slug": "poolside-activities",
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
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_storage_path": f"{field}.png",
                        "crop_sha256": f"{field}crop",
                    },
                    "agreement": "exact_after_normalization",
                }
                for field in ("title", "schedule", "location", "fee")
            },
            "source_spans": {
                "title": [{"page": 1, "text": "Poolside Activities"}],
                "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
                "location": [{"page": 1, "text": "Village Green Lawn"}],
                "fee": [{"page": 1, "text": "No fee marker present"}],
            },
        }
        existing_gold = [
            {
                "calendar_group_key": "boardwalk",
                "canonical_slug": "poolside-activities",
                "source_sha256": "sourcehash",
                "source_pdf_edition": "fy26-q3-0526",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 2:30pm"},
                "location": {"label": "Village Green Lawn"},
                "price": {"state": "free"},
            }
        ]

        preview = build_gold_v3_preview([candidate], existing_gold_rows=existing_gold)

        self.assertEqual([], preview["rows"])
        self.assertEqual(1, preview["summary"]["skipped_gold_conflicts"])
        self.assertEqual(1, preview["summary"]["skipped_not_publishable"])
        self.assertEqual(
            [
                {
                    "conflict_type": "existing_gold_field_mismatch",
                    "calendar_group_key": "boardwalk",
                    "canonical_slug": "poolside-activities",
                    "source_sha256": "sourcehash",
                    "edition": "fy26-q3-0526",
                    "fields": ["schedule"],
                }
            ],
            preview["gold_conflicts"],
        )

    def test_promote_gold_v3_allows_current_hash_bound_review_approval_only(self) -> None:
        needs_review = {
            "candidate_id": "cand-review-1",
            "validation_status": "needs_review",
            "validation_findings": ["engine_disagreement:schedule", "unparsed_schedule"],
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
        stale_crop_decision = {
            **current_decision,
            "field_crop_sha256": "oldcrop",
            "decided_at": "2026-06-28T12:02:00Z",
        }
        wrong_field_crop_decision = {
            **current_decision,
            "field_crop_sha256": "titlecrop",
            "decided_at": "2026-06-28T12:03:00Z",
        }
        missing_page_hash_candidate = json.loads(json.dumps(needs_review))
        for field_evidence in missing_page_hash_candidate["field_evidence"].values():
            field_evidence["source"].pop("page_image_sha256", None)

        stale_preview = build_gold_v3_preview([needs_review], review_decisions=[stale_decision])
        stale_crop_preview = build_gold_v3_preview([needs_review], review_decisions=[stale_crop_decision])
        wrong_field_crop_preview = build_gold_v3_preview([needs_review], review_decisions=[wrong_field_crop_decision])
        missing_page_hash_preview = build_gold_v3_preview(
            [missing_page_hash_candidate],
            review_decisions=[current_decision],
        )
        current_preview = build_gold_v3_preview([needs_review], review_decisions=[current_decision])

        self.assertEqual(0, len(stale_preview["rows"]))
        self.assertEqual(1, stale_preview["summary"]["skipped_stale_review_decision"])
        self.assertEqual(0, len(stale_crop_preview["rows"]))
        self.assertEqual(1, stale_crop_preview["summary"]["skipped_stale_review_decision"])
        self.assertEqual(0, len(wrong_field_crop_preview["rows"]))
        self.assertEqual(1, wrong_field_crop_preview["summary"]["skipped_stale_review_decision"])
        self.assertEqual(0, len(missing_page_hash_preview["rows"]))
        self.assertEqual(1, missing_page_hash_preview["summary"]["skipped_stale_review_decision"])
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
        self.assertEqual([], row["validation_findings"])
        self.assertEqual(
            ["engine_disagreement:schedule", "unparsed_schedule"],
            row["review_decision"]["original_validation_findings"],
        )
        self.assertEqual(1, current_preview["summary"]["manually_approved_by_review"])

    def test_promote_gold_v3_rejects_malformed_review_decision_files(self) -> None:
        needs_review = {
            "candidate_id": "cand-review-malformed",
            "validation_status": "needs_review",
            "validation_findings": ["manual_review_required:schedule"],
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
                "schedule": {
                    "source": {
                        "content_sha256": "sourcehash",
                        "page_number": 1,
                        "page_image_sha256": "pagehash",
                        "bbox_px": [10, 10, 100, 30],
                        "crop_storage_path": "schedule.png",
                        "crop_sha256": "schedulecrop",
                    },
                    "agreement": "manual_review_required",
                }
            },
        }
        malformed_decision = {
            "schema_version": "review_decision_v3_001",
            "task_id": "cand-review-malformed",
            "candidate_id": "cand-review-malformed",
            "decision": "approve",
            "reviewer": "josh",
            "reason": "Visible in crop.",
            "decided_at": "2026-06-28T12:00:00Z",
            "content_sha256": "sourcehash",
            "page_image_sha256": "pagehash",
            "field_crop_sha256": "schedulecrop",
            "approved_fields": {
                "schedule": {
                    "raw_value": "Daily at 1:30pm",
                }
            },
        }

        preview = build_gold_v3_preview([needs_review], review_decisions=[malformed_decision])

        self.assertEqual([], preview["rows"])
        self.assertEqual(1, preview["summary"]["skipped_invalid_review_decision"])

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

        with patch("scripts.ingest.ocr.paddle_adapter.module_available", return_value=False), patch(
            "scripts.ingest.ocr.rapidocr_adapter.module_available",
            return_value=False,
        ):
            paddle_result = paddle.run_page(page)
            rapid_result = rapid.run_page(page)

        self.assertEqual("paddleocr_ppstructurev3", paddle_result["engine"])
        self.assertEqual("rapidocr", rapid_result["engine"])
        self.assertEqual("unavailable", paddle_result["status"])
        self.assertEqual("unavailable", rapid_result["status"])
        self.assertEqual([], paddle_result["tokens"])
        self.assertIn("ocr_engine_unavailable:paddleocr_ppstructurev3", paddle_result["error"])

    def test_paddle_ocr_adapter_normalizes_legacy_ocr_rows_when_available(self) -> None:
        class FakePaddleOcr:
            def __init__(self, **kwargs: Any) -> None:
                self.kwargs = kwargs

            def ocr(self, image_path: str, cls: bool = True) -> list[Any]:
                self.image_path = image_path
                self.cls = cls
                return [
                    [
                        [
                            [[10, 20], [110, 20], [110, 44], [10, 44]],
                            ("Poolside Activities", 0.91),
                        ],
                        [
                            [[12, 50], [180, 50], [180, 72], [12, 72]],
                            ("Daily at 2:30pm", 0.88),
                        ],
                    ]
                ]

        page = {
            "page_number": 1,
            "page_image_path": "/tmp/page.png",
            "page_image_sha256": "pagehash",
        }

        with patch("scripts.ingest.ocr.paddle_adapter.module_available", return_value=True), patch(
            "scripts.ingest.ocr.paddle_adapter._paddle_ocr_class",
            return_value=FakePaddleOcr,
        ):
            result = PaddleOcrAdapter().run_page(page)

        self.assertEqual("success", result["status"])
        self.assertEqual("paddleocr_ppstructurev3", result["engine"])
        self.assertEqual("primary_ocr_layout", result["role"])
        self.assertEqual(2, len(result["tokens"]))
        self.assertEqual("Poolside Activities", result["tokens"][0]["text"])
        self.assertEqual([10, 20, 110, 44], result["tokens"][0]["bbox_px"])
        self.assertEqual(0.91, result["tokens"][0]["confidence"])
        self.assertEqual(result["tokens"], result["lines"])

    def test_rapid_ocr_adapter_normalizes_tuple_rows_when_available(self) -> None:
        class FakeRapidOcr:
            def __call__(self, image_path: str) -> tuple[list[Any], float]:
                self.image_path = image_path
                return (
                    [
                        [
                            [[20, 30], [140, 30], [140, 58], [20, 58]],
                            "Movie Under the Stars",
                            0.94,
                        ],
                        [
                            [[22, 70], [155, 70], [155, 92], [22, 92]],
                            "7:00pm",
                            0.9,
                        ],
                    ],
                    0.12,
                )

        page = {
            "page_number": 2,
            "page_image_path": "/tmp/page-2.png",
            "page_image_sha256": "pagehash2",
        }

        with patch("scripts.ingest.ocr.rapidocr_adapter.module_available", return_value=True), patch(
            "scripts.ingest.ocr.rapidocr_adapter._rapid_ocr_class",
            return_value=FakeRapidOcr,
        ):
            result = RapidOcrAdapter().run_page(page)

        self.assertEqual("success", result["status"])
        self.assertEqual("rapidocr", result["engine"])
        self.assertEqual("secondary_ocr_comparator", result["role"])
        self.assertEqual(2, len(result["tokens"]))
        self.assertEqual("Movie Under the Stars", result["tokens"][0]["text"])
        self.assertEqual([20, 30, 140, 58], result["tokens"][0]["bbox_px"])
        self.assertEqual(0.94, result["tokens"][0]["confidence"])
        self.assertEqual(0.12, result["elapsed_seconds"])

    def test_docling_adapter_normalizes_exported_text_items_when_available(self) -> None:
        class FakeDocument:
            def export_to_dict(self) -> dict[str, Any]:
                return {
                    "texts": [
                        {
                            "text": "Campfire Activities",
                            "prov": [
                                {
                                    "page_no": 1,
                                    "bbox": {
                                        "l": 30,
                                        "t": 40,
                                        "r": 220,
                                        "b": 70,
                                    },
                                }
                            ],
                        }
                    ]
                }

        class FakeConversionResult:
            document = FakeDocument()

        class FakeDocumentConverter:
            def convert(self, image_path: str) -> FakeConversionResult:
                self.image_path = image_path
                return FakeConversionResult()

        page = {
            "page_number": 1,
            "page_image_path": "/tmp/page.png",
            "page_image_sha256": "doclingpagehash",
        }

        with patch("scripts.ingest.ocr.docling_adapter.module_available", return_value=True), patch(
            "scripts.ingest.ocr.docling_adapter._document_converter_class",
            return_value=FakeDocumentConverter,
        ):
            result = DoclingAdapter().run_page(page)

        self.assertEqual("success", result["status"])
        self.assertEqual("docling_snapshot", result["engine"])
        self.assertEqual("parallel_structural_snapshot", result["role"])
        self.assertEqual("Campfire Activities", result["tokens"][0]["text"])
        self.assertEqual([30, 40, 220, 70], result["tokens"][0]["bbox_px"])
        self.assertEqual(result["tokens"], result["lines"])
        self.assertEqual(1, len(result["regions"]))

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
                "generated_at": "2026-06-28T12:00:00+00:00",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        "source_document_id": "source-doc-1",
                        "source_sha256": "sourcehash",
                        "source_kind": "official_pdf",
                        "source_role": "resort_pdf",
                        "http_status": 200,
                        "currentness": "current",
                        "captured_at": "2026-06-28T12:00:00+00:00",
                        "validation_status": "auto_publishable",
                        "calendar_group_key": "boardwalk",
                        "document_family": "aframe_recreation",
                        "canonical_page_image_sha256s": ["pagehash"],
                        "source_pages": [
                            {
                                "page_number": 1,
                                "page_image_sha256": "pagehash",
                                "page_image_path": "page.png",
                            }
                        ],
                        "region_id": "page-001-region-04",
                        "region_type": "resort_activities_section",
                        "pipeline_version": "vision_v3_001",
                        "config_hash": "confighash",
                        "runtime_lineage": {
                            "config_hash": "confighash",
                            "lineage_hash": "lineagehash",
                            "git_sha": "deadbeef",
                            "config": {
                                "ocr": {
                                    "primary": {"engine": "paddleocr_ppstructurev3"},
                                    "secondary": {"engine": "rapidocr"},
                                }
                            },
                            "package_versions": {"pypdfium2": "4.30.0"},
                            "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                            "ocr_engine_configs": {
                                "paddleocr_ppstructurev3": {"engine": "paddleocr_ppstructurev3", "mode": "ppstructurev3"},
                                "rapidocr": {"engine": "rapidocr"},
                            },
                        },
                        "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                        "title": "Poolside Activities",
                        "schedule": {
                            "text": "Daily at 1:30pm",
                            "normalized": {
                                "schedule_type": "recurring",
                                "days_of_week": ALL_DAYS,
                                "start_time": "13:30",
                                "timezone": "America/New_York",
                            },
                        },
                        "location": {"id": "village_green_lawn", "label": "Village Green Lawn"},
                        "price": {"state": "free"},
                        "field_evidence": {
                            field: {
                                **publish_field_evidence_values(field),
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
                        "source_spans": {
                            "title": [{"page": 1, "text": "Poolside Activities"}],
                            "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
                            "location": [{"page": 1, "text": "Village Green Lawn"}],
                            "fee": [{"page": 1, "text": "No fee marker present"}],
                        },
                    }
                ],
            }
            clean_preview["rows"][0]["field_evidence"]["region"] = {
                "source": {
                    "content_sha256": "sourcehash",
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "bbox_px": [0, 0, 200, 200],
                    "crop_storage_path": "region.png",
                    "crop_sha256": "regioncrop",
                },
                "agreement": "not_required",
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
            missing_source_kind_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "source_kind": None}],
            }
            non_official_source_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "source_kind": "third_party_image"}],
            }
            failed_source_fetch_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "http_status": 404}],
            }
            stale_source_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "currentness": "hash_changed"}],
            }
            missing_region_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "region_id": None}],
            }
            missing_region_evidence_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "field_evidence": {
                            field: evidence
                            for field, evidence in clean_preview["rows"][0]["field_evidence"].items()
                            if field != "region"
                        },
                    }
                ],
            }
            missing_config_hash_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "config_hash": None,
                    }
                ],
            }
            missing_runtime_lineage_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": None,
                    }
                ],
            }
            mismatched_runtime_lineage_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": {
                            **clean_preview["rows"][0]["runtime_lineage"],
                            "config_hash": "otherhash",
                        },
                    }
                ],
            }
            missing_model_asset_hashes_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": {
                            **clean_preview["rows"][0]["runtime_lineage"],
                            "model_asset_hashes": {},
                        },
                    }
                ],
            }
            missing_git_sha_preview = {
                "publication_mode": "vision_v3_preview",
                "generated_at": "2026-06-28T12:00:00+00:00",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": {
                            key: value
                            for key, value in clean_preview["rows"][0]["runtime_lineage"].items()
                            if key != "git_sha"
                        },
                    }
                ],
            }
            missing_runtime_config_preview = {
                "publication_mode": "vision_v3_preview",
                "generated_at": "2026-06-28T12:00:00+00:00",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": {
                            key: value
                            for key, value in clean_preview["rows"][0]["runtime_lineage"].items()
                            if key != "config"
                        },
                    }
                ],
            }
            missing_ocr_engine_configs_preview = {
                "publication_mode": "vision_v3_preview",
                "generated_at": "2026-06-28T12:00:00+00:00",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "runtime_lineage": {
                            key: value
                            for key, value in clean_preview["rows"][0]["runtime_lineage"].items()
                            if key != "ocr_engine_configs"
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
            missing_source_spans_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "source_spans": {
                            "title": [{"page": 1, "text": "Poolside Activities"}],
                            "location": [{"page": 1, "text": "Village Green Lawn"}],
                            "fee": [{"page": 1, "text": "No fee marker present"}],
                        },
                    }
                ],
            }
            movie_missing_title_evidence_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "candidate_type": "movie",
                        "movie_title": "Moana",
                    }
                ],
            }
            clean_dual_run_report = clean_dual_run_coverage_report()
            unparsed_schedule_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [{**clean_preview["rows"][0], "schedule": {"text": "Daily-ish", "normalized": {}}}],
            }
            malformed_schedule_preview = {
                "publication_mode": "vision_v3_preview",
                "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                "rows": [
                    {
                        **clean_preview["rows"][0],
                        "schedule": {
                            "text": "Daily-ish",
                            "normalized": {"schedule_type": "recurring"},
                        },
                    }
                ],
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
            missing_page_number_preview = {
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
                                    "page_number": None,
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
            manual_missing_review_evidence_preview = {
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
                        },
                    }
                ],
            }
            manual_missing_review_metadata_preview = {
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
                            "page_image_sha256": "pagehash",
                            "field_crop_sha256": "schedulecrop",
                        },
                    }
                ],
            }
            manual_with_stale_crop_preview = {
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
                            "page_image_sha256": "pagehash",
                            "field_crop_sha256": "oldcrop",
                        },
                    }
                ],
            }
            manual_with_wrong_field_crop_preview = {
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
                            "page_image_sha256": "pagehash",
                            "field_crop_sha256": "titlecrop",
                            "reviewer": "josh",
                            "decided_at": "2026-06-28T12:00:00Z",
                            "reason": "Corrected visible schedule crop.",
                            "approved_fields": {
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
                        },
                    }
                ],
            }
            manual_with_mismatched_approved_schedule_preview = {
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
                            "page_image_sha256": "pagehash",
                            "field_crop_sha256": "schedulecrop",
                            "reviewer": "josh",
                            "decided_at": "2026-06-28T12:00:00Z",
                            "reason": "Corrected visible schedule crop.",
                            "approved_fields": {
                                "schedule": {
                                    "raw_value": "Daily at 7:30pm",
                                    "normalized_value": {
                                        "schedule_type": "recurring",
                                        "days_of_week": ALL_DAYS,
                                        "start_time": "19:30",
                                        "timezone": "America/New_York",
                                    },
                                }
                            },
                        },
                    }
                ],
            }
            blocked_source_drift_report = {
                "generated_at": "2026-06-28T12:01:00+00:00",
                "status": "review_required",
                "publish_blockers": [
                    "recognized_family_changed",
                    "activity_count_drift",
                    "movie_count_drift",
                ],
            }
            reviewed_source_drift_report_shell = {
                "generated_at": "2026-06-28T12:01:00+00:00",
                "status": "reviewed",
                "review_status": "manual_review_approved",
                "calendar_group_key": "boardwalk",
                "publish_blockers": ["recognized_family_changed"],
                "review_decision": {
                    "decision": "approve",
                    "reviewer": "josh",
                    "decided_at": "2026-06-28T12:00:00Z",
                    "reason": "Reviewed source drift report and accepted the family change.",
                },
            }
            reviewed_source_drift_report = {
                **reviewed_source_drift_report_shell,
                "reviewed_source_drift_task_ids": [
                    "source-drift-boardwalk-blocker-recognized-family-changed",
                ],
                "missing_source_drift_task_ids": [],
            }
            forged_reviewed_source_drift_report = {
                **reviewed_source_drift_report_shell,
                "reviewed_source_drift_task_ids": ["source-drift-boardwalk-blocker-unrelated"],
                "missing_source_drift_task_ids": [],
            }
            incomplete_reviewed_source_drift_report = {
                **reviewed_source_drift_report,
                "reviewed_source_drift_task_ids": [],
                "missing_source_drift_task_ids": ["source-drift-boardwalk-blocker-activity-count-drift"],
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
            missing_source_kind = evaluate_publish_readiness(
                missing_source_kind_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            non_official_source = evaluate_publish_readiness(
                non_official_source_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            failed_source_fetch = evaluate_publish_readiness(
                failed_source_fetch_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            stale_source = evaluate_publish_readiness(
                stale_source_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_region = evaluate_publish_readiness(
                missing_region_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_region_evidence = evaluate_publish_readiness(
                missing_region_evidence_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_config_hash = evaluate_publish_readiness(
                missing_config_hash_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_runtime_lineage = evaluate_publish_readiness(
                missing_runtime_lineage_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            mismatched_runtime_lineage = evaluate_publish_readiness(
                mismatched_runtime_lineage_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_model_asset_hashes = evaluate_publish_readiness(
                missing_model_asset_hashes_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_git_sha = evaluate_publish_readiness(
                missing_git_sha_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_runtime_config = evaluate_publish_readiness(
                missing_runtime_config_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_ocr_engine_configs = evaluate_publish_readiness(
                missing_ocr_engine_configs_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_critical_evidence = evaluate_publish_readiness(
                missing_critical_evidence_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            movie_missing_title_evidence = evaluate_publish_readiness(
                movie_missing_title_evidence_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            missing_source_spans = evaluate_publish_readiness(
                missing_source_spans_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            unparsed_schedule = evaluate_publish_readiness(
                unparsed_schedule_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            malformed_schedule = evaluate_publish_readiness(
                malformed_schedule_preview,
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
            missing_page_number = evaluate_publish_readiness(
                missing_page_number_preview,
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
            manual_missing_review_evidence = evaluate_publish_readiness(
                manual_missing_review_evidence_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_missing_review_metadata = evaluate_publish_readiness(
                manual_missing_review_metadata_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_with_stale_crop = evaluate_publish_readiness(
                manual_with_stale_crop_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_with_wrong_field_crop = evaluate_publish_readiness(
                manual_with_wrong_field_crop_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            manual_with_mismatched_approved_schedule = evaluate_publish_readiness(
                manual_with_mismatched_approved_schedule_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
            )
            source_drift_blocked = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=blocked_source_drift_report,
            )
            source_drift_reviewed = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=reviewed_source_drift_report,
            )
            source_drift_reviewed_shell = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=reviewed_source_drift_report_shell,
            )
            source_drift_forged_review = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=forged_reviewed_source_drift_report,
            )
            source_drift_incomplete_review = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report=clean_dual_run_report,
                source_drift_report=incomplete_reviewed_source_drift_report,
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
            dual_run_missing_coverage = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report={
                    "status": "clean",
                    "publish_blockers": [],
                    "unreviewed_diff_keys": [],
                    "unreviewed_new_keys": [],
                },
            )
            dual_run_empty_expected_sources = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report={
                    **clean_dual_run_report,
                    "source_coverage": {
                        **clean_dual_run_report["source_coverage"],
                        "expected_source_count": 0,
                        "processed_source_count": 0,
                    },
                },
            )
            dual_run_incomplete_coverage = evaluate_publish_readiness(
                clean_preview,
                flags=load_publish_flags(enabled_flags),
                dual_run_report={
                    **clean_dual_run_report,
                    "source_coverage": {
                        **clean_dual_run_report["source_coverage"],
                        "expected_source_count": 2,
                        "processed_source_count": 1,
                        "unprocessed_source_ids": ["source-doc-2"],
                    },
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
        self.assertFalse(missing_source_kind["ready"])
        self.assertIn("row_missing_source_kind:0", missing_source_kind["errors"])
        self.assertFalse(non_official_source["ready"])
        self.assertIn("row_non_official_source:0", non_official_source["errors"])
        self.assertFalse(failed_source_fetch["ready"])
        self.assertIn("row_source_fetch_not_successful:0", failed_source_fetch["errors"])
        self.assertFalse(stale_source["ready"])
        self.assertIn("row_source_not_current:0", stale_source["errors"])
        self.assertFalse(missing_region["ready"])
        self.assertIn("row_missing_region_id:0", missing_region["errors"])
        self.assertFalse(missing_region_evidence["ready"])
        self.assertIn("row_missing_region_evidence:0", missing_region_evidence["errors"])
        self.assertFalse(missing_config_hash["ready"])
        self.assertIn("row_missing_config_hash:0", missing_config_hash["errors"])
        self.assertFalse(missing_runtime_lineage["ready"])
        self.assertIn("row_missing_runtime_lineage:0", missing_runtime_lineage["errors"])
        self.assertFalse(mismatched_runtime_lineage["ready"])
        self.assertIn(
            "row_runtime_lineage_config_hash_mismatch:0",
            mismatched_runtime_lineage["errors"],
        )
        self.assertFalse(missing_model_asset_hashes["ready"])
        self.assertIn("row_missing_model_asset_hashes:0", missing_model_asset_hashes["errors"])
        self.assertFalse(missing_git_sha["ready"])
        self.assertIn("row_missing_git_sha:0", missing_git_sha["errors"])
        self.assertFalse(missing_runtime_config["ready"])
        self.assertIn("row_missing_runtime_config:0", missing_runtime_config["errors"])
        self.assertFalse(missing_ocr_engine_configs["ready"])
        self.assertIn("row_missing_ocr_engine_configs:0", missing_ocr_engine_configs["errors"])
        self.assertFalse(missing_critical_evidence["ready"])
        self.assertIn("row_missing_critical_field_evidence:0:schedule", missing_critical_evidence["errors"])
        self.assertFalse(movie_missing_title_evidence["ready"])
        self.assertIn("row_missing_critical_field_evidence:0:movie_title", movie_missing_title_evidence["errors"])
        self.assertFalse(missing_source_spans["ready"])
        self.assertIn("row_missing_critical_field_source_span:0:schedule", missing_source_spans["errors"])
        self.assertFalse(unparsed_schedule["ready"])
        self.assertIn("row_unparsed_schedule:0", unparsed_schedule["errors"])
        self.assertFalse(malformed_schedule["ready"])
        self.assertIn("row_unparsed_schedule:0", malformed_schedule["errors"])
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
        self.assertFalse(missing_page_number["ready"])
        self.assertIn("row_missing_critical_field_page_number:0:schedule", missing_page_number["errors"])
        self.assertFalse(unpromotable_status["ready"])
        self.assertIn("row_unpromotable_validation_status:0", unpromotable_status["errors"])
        self.assertFalse(manual_without_review["ready"])
        self.assertIn("row_missing_manual_review_approval:0", manual_without_review["errors"])
        self.assertFalse(manual_with_stale_review["ready"])
        self.assertIn("row_stale_manual_review_source_hash:0", manual_with_stale_review["errors"])
        self.assertFalse(manual_with_stale_page["ready"])
        self.assertIn("row_stale_manual_review_page_image:0", manual_with_stale_page["errors"])
        self.assertFalse(manual_missing_review_evidence["ready"])
        self.assertIn("row_missing_manual_review_page_image:0", manual_missing_review_evidence["errors"])
        self.assertIn("row_missing_manual_review_field_crop:0", manual_missing_review_evidence["errors"])
        self.assertFalse(manual_missing_review_metadata["ready"])
        self.assertIn("row_missing_manual_review_reviewer:0", manual_missing_review_metadata["errors"])
        self.assertIn("row_missing_manual_review_decided_at:0", manual_missing_review_metadata["errors"])
        self.assertIn("row_missing_manual_review_reason:0", manual_missing_review_metadata["errors"])
        self.assertIn("row_missing_manual_review_approved_fields:0", manual_missing_review_metadata["errors"])
        self.assertFalse(manual_with_stale_crop["ready"])
        self.assertIn("row_stale_manual_review_field_crop:0", manual_with_stale_crop["errors"])
        self.assertFalse(manual_with_wrong_field_crop["ready"])
        self.assertIn(
            "row_manual_review_approved_field_crop_mismatch:0",
            manual_with_wrong_field_crop["errors"],
        )
        self.assertFalse(manual_with_mismatched_approved_schedule["ready"])
        self.assertIn(
            "row_manual_review_approved_field_mismatch:0:schedule",
            manual_with_mismatched_approved_schedule["errors"],
        )
        self.assertFalse(source_drift_blocked["ready"])
        self.assertIn("source_drift_report_blocked", source_drift_blocked["errors"])
        self.assertIn("recognized_family_changed", source_drift_blocked["errors"])
        self.assertIn("activity_count_drift", source_drift_blocked["errors"])
        self.assertIn("movie_count_drift", source_drift_blocked["errors"])
        self.assertTrue(source_drift_reviewed["ready"])
        self.assertFalse(source_drift_reviewed_shell["ready"])
        self.assertIn(
            "source_drift_report_missing_review_manifest",
            source_drift_reviewed_shell["errors"],
        )
        self.assertFalse(source_drift_forged_review["ready"])
        self.assertIn(
            "source_drift_report_review_manifest_mismatch",
            source_drift_forged_review["errors"],
        )
        self.assertFalse(source_drift_incomplete_review["ready"])
        self.assertIn(
            "source_drift_report_missing_reviewed_tasks",
            source_drift_incomplete_review["errors"],
        )
        self.assertFalse(dual_run_blocked["ready"])
        self.assertIn("dual_run_report_blocked", dual_run_blocked["errors"])
        self.assertIn("unreviewed_v2_v3_field_diffs", dual_run_blocked["errors"])
        self.assertFalse(dual_run_missing_coverage["ready"])
        self.assertIn("dual_run_missing_source_coverage", dual_run_missing_coverage["errors"])
        self.assertFalse(dual_run_empty_expected_sources["ready"])
        self.assertIn("dual_run_missing_expected_sources", dual_run_empty_expected_sources["errors"])
        self.assertFalse(dual_run_incomplete_coverage["ready"])
        self.assertIn("dual_run_unprocessed_sources", dual_run_incomplete_coverage["errors"])

    def test_publish_gold_v3_requires_fresh_passing_monitoring_report_when_enabled(self) -> None:
        preview = clean_publish_v3_preview(generated_at="2026-06-28T12:00:00+00:00")
        flags = {"public_gold_source": "v3", "v3_publish_enabled": True}
        clean_dual_run_report = clean_dual_run_coverage_report()
        passing_monitoring_report = {
            "generated_at": "2026-06-28T12:01:00+00:00",
            "status": "pass",
            "changed_sources": [],
            "affected_rows": [],
            "recommended_action": "none",
        }

        missing = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            require_monitoring_report=True,
        )
        stale = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            monitoring_report={**passing_monitoring_report, "generated_at": "2026-06-28T11:59:00+00:00"},
            require_monitoring_report=True,
        )
        blocked = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            monitoring_report={
                "generated_at": "2026-06-28T12:01:00+00:00",
                "status": "blocked",
                "changed_sources": ["source_freshness:hash_changed:https://example.com/calendar.pdf"],
                "affected_rows": [],
                "recommended_action": "withhold_publish",
            },
            require_monitoring_report=True,
        )
        attention = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            monitoring_report={
                "generated_at": "2026-06-28T12:01:00+00:00",
                "status": "attention",
                "changed_sources": [],
                "affected_rows": [{"code": "known_public_error", "severity": "blocker"}],
                "recommended_action": "manual_review",
            },
            require_monitoring_report=True,
        )
        passed = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            monitoring_report=passing_monitoring_report,
            require_monitoring_report=True,
        )

        self.assertFalse(missing["ready"])
        self.assertIn("missing_monitoring_report", missing["errors"])
        self.assertFalse(stale["ready"])
        self.assertIn("monitoring_report_stale", stale["errors"])
        self.assertFalse(blocked["ready"])
        self.assertIn("monitoring_report_blocked", blocked["errors"])
        self.assertIn("monitoring_changed_sources", blocked["errors"])
        self.assertFalse(attention["ready"])
        self.assertIn("monitoring_affected_rows", attention["errors"])
        self.assertTrue(passed["ready"])

    def test_publish_gold_v3_rejects_manual_review_bound_to_wrong_source_document(self) -> None:
        preview = clean_publish_v3_preview()
        row = preview["rows"][0]
        row["validation_status"] = "manually_approved"
        row["review_status"] = "manual_review_approved"
        row["review_decision"] = {
            "decision": "edit",
            "source_document_id": "source-doc-2",
            "calendar_group_key": row["calendar_group_key"],
            "content_sha256": row["source_sha256"],
            "page_image_sha256": "pagehash",
            "field_crop_sha256": "schedulecrop",
            "reviewer": "josh",
            "decided_at": "2026-06-28T12:00:00Z",
            "reason": "Corrected visible schedule crop.",
            "approved_fields": {
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
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_stale_manual_review_source_document_id:0", readiness["errors"])

    def test_publish_gold_v3_rejects_non_exact_critical_field_agreement_without_review(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["agreement"] = "not_required"

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_unresolved_engine_disagreement:0:schedule", readiness["errors"])

    def test_publish_gold_v3_requires_two_engine_text_records_for_exact_agreement(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"].pop("engines", None)

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_missing_critical_field_engine_evidence:0:schedule", readiness["errors"])

    def test_publish_gold_v3_requires_field_page_hash_to_match_canonical_source_page(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["canonical_page_image_sha256s"] = ["otherpagehash"]
        preview["rows"][0]["source_pages"] = [
            {"page_number": 1, "page_image_sha256": "otherpagehash"}
        ]

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_field_page_image_not_canonical:0:schedule", readiness["errors"])

    def test_publish_gold_v3_requires_engine_confidence_for_exact_agreement(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["engines"][0].pop("confidence", None)

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_missing_critical_field_engine_confidence:0:schedule", readiness["errors"])

    def test_publish_gold_v3_requires_configured_engine_identities_for_exact_agreement(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["engines"][1]["engine"] = "other_secondary_ocr"

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_missing_required_engine_evidence:0:schedule", readiness["errors"])

    def test_publish_gold_v3_uses_runtime_configured_engine_identities(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["runtime_lineage"]["config"] = {
            "ocr": {
                "primary": {"engine": "paddleocr_ppstructurev3"},
                "secondary": {"engine": "configured_secondary_ocr"},
            }
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_missing_required_engine_evidence:0:schedule", readiness["errors"])

    def test_publish_gold_v3_recomputes_engine_agreement_from_engine_text(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["engines"][1]["text"] = "Daily at 2:30pm"

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_unresolved_engine_disagreement:0:schedule", readiness["errors"])

    def test_publish_gold_v3_rejects_engine_agreed_value_mismatch(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["engines"][0]["text"] = "Monday at 2:30pm"
        preview["rows"][0]["field_evidence"]["schedule"]["engines"][1]["text"] = "Monday at 2:30pm"

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_critical_field_engine_value_mismatch:0:schedule", readiness["errors"])

    def test_publish_gold_v3_requires_field_evidence_values_at_publish_gate(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"].pop("normalized_value", None)

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_missing_critical_field_normalized_value:0:schedule", readiness["errors"])

    def test_publish_gold_v3_blocks_unresolved_gold_conflict_preview(self) -> None:
        preview = clean_publish_v3_preview()
        preview["gold_conflicts"] = [
            {
                "conflict_type": "existing_gold_field_mismatch",
                "calendar_group_key": "boardwalk",
                "canonical_slug": "poolside-activities",
                "source_sha256": "sourcehash",
                "edition": "fy26-q3-0526",
                "fields": ["schedule"],
            }
        ]
        skipped_conflict_preview = clean_publish_v3_preview()
        skipped_conflict_preview["summary"]["skipped_gold_conflicts"] = 1

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )
        skipped_conflict_readiness = evaluate_publish_readiness(
            skipped_conflict_preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(skipped_conflict_preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("preview_has_unresolved_gold_conflicts", readiness["errors"])
        self.assertFalse(skipped_conflict_readiness["ready"])
        self.assertIn("preview_has_skipped_gold_conflicts", skipped_conflict_readiness["errors"])

    def test_publish_gold_v3_requires_preview_summary_to_match_rows(self) -> None:
        preview = clean_publish_v3_preview()
        preview["summary"]["gold_rows"] = 0
        missing_summary_preview = {
            key: value
            for key, value in clean_publish_v3_preview().items()
            if key != "summary"
        }

        mismatched = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )
        missing_summary = evaluate_publish_readiness(
            missing_summary_preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(missing_summary_preview),
        )

        self.assertFalse(mismatched["ready"])
        self.assertIn("preview_summary_gold_rows_mismatch", mismatched["errors"])
        self.assertFalse(missing_summary["ready"])
        self.assertIn("preview_summary_missing", missing_summary["errors"])

    def test_publish_gold_v3_requires_preview_generated_at(self) -> None:
        preview = {
            key: value
            for key, value in clean_publish_v3_preview().items()
            if key != "generated_at"
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("preview_missing_generated_at", readiness["errors"])

    def test_publish_gold_v3_rejects_public_value_mismatch_with_field_evidence(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["normalized_value"] = {
            "schedule_type": "recurring",
            "days_of_week": ["Monday"],
            "start_time": "14:30",
            "timezone": "America/New_York",
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_critical_field_normalized_value_mismatch:0:schedule", readiness["errors"])

    def test_publish_gold_v3_rejects_public_raw_text_mismatch_with_field_evidence(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0]["field_evidence"]["schedule"]["raw_value"] = "Daily at 2:30pm"

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(),
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("row_critical_field_raw_value_mismatch:0:schedule", readiness["errors"])

    def test_publish_gold_v3_accepts_deterministically_normalized_movie_title_and_schedule_fragments(self) -> None:
        preview = clean_publish_v3_preview()
        row = preview["rows"][0]
        row["candidate_type"] = "movie"
        row["title"] = "movie under the stars"
        row["movie_title"] = "Toy Story 4G"
        row["normalized_movie_title"] = "toy story 4"
        row["schedule"] = {
            "text": "Monday at 8:3OPM",
            "normalized": {
                "schedule_type": "recurring",
                "days_of_week": ["Monday"],
                "start_time": "20:30",
                "timezone": "America/New_York",
            },
        }
        row["field_evidence"]["title"]["raw_value"] = "MOVIE UNDER THESTARS"
        row["field_evidence"]["title"]["normalized_value"] = "movie under the stars"
        row["field_evidence"]["title"]["engines"] = [
            {"engine": "paddleocr_ppstructurev3", "text": "MOVIE UNDER THESTARS", "confidence": 0.97},
            {"engine": "rapidocr", "text": "UNDER THE STARS", "confidence": 0.94},
        ]
        row["field_evidence"]["schedule"]["raw_value"] = "Monday at 8:3OPM"
        row["field_evidence"]["schedule"]["normalized_value"] = row["schedule"]["normalized"]
        row["field_evidence"]["schedule"]["engines"] = [
            {"engine": "paddleocr_ppstructurev3", "text": "8:3OPM", "confidence": 0.97},
            {"engine": "rapidocr", "text": "8:30PM", "confidence": 0.94},
        ]
        row["field_evidence"]["movie_title"] = {
            **publish_field_evidence_values("title"),
            "raw_value": "Toy Story 4G",
            "normalized_value": "toy story 4",
            "engines": [
                {"engine": "paddleocr_ppstructurev3", "text": "Toy Story 4G", "confidence": 0.97},
                {"engine": "rapidocr", "text": "Toy Story 4 [G", "confidence": 0.94},
            ],
            "source": {
                "content_sha256": "sourcehash",
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [10, 50, 100, 70],
                "crop_sha256": "moviecrop",
                "crop_storage_path": "movie.png",
            },
            "agreement": "exact_after_normalization",
        }
        row["source_spans"]["title"] = [{"page": 1, "text": "MOVIE UNDER THESTARS"}]
        row["source_spans"]["schedule"] = [{"page": 1, "text": "Monday at 8:3OPM"}]
        row["source_spans"]["movie_title"] = [{"page": 1, "text": "Toy Story 4G"}]

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=clean_dual_run_coverage_report(preview),
        )

        self.assertTrue(readiness["ready"], readiness["errors"])

    def test_publish_gold_v3_requires_dual_run_report_to_match_preview_source_hashes(self) -> None:
        preview = clean_publish_v3_preview()
        stale_dual_run_report = {
            **clean_dual_run_coverage_report(),
            "v3_count": 1,
            "v3_source_hashes": ["oldsourcehash"],
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=stale_dual_run_report,
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("dual_run_preview_source_hash_mismatch", readiness["errors"])

    def test_publish_gold_v3_requires_dual_run_report_to_match_preview_fingerprint(self) -> None:
        preview = clean_publish_v3_preview()
        stale_dual_run_report = {
            **clean_dual_run_coverage_report(),
            "v3_preview_fingerprint": "old-preview-fingerprint",
        }
        missing_fingerprint_report = {
            key: value
            for key, value in clean_dual_run_coverage_report().items()
            if key != "v3_preview_fingerprint"
        }

        readiness = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=stale_dual_run_report,
        )
        missing = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=missing_fingerprint_report,
        )

        self.assertFalse(readiness["ready"])
        self.assertIn("dual_run_preview_fingerprint_mismatch", readiness["errors"])
        self.assertFalse(missing["ready"])
        self.assertIn("dual_run_missing_preview_fingerprint", missing["errors"])

    def test_publish_gold_v3_requires_current_dual_run_report_timestamp(self) -> None:
        preview = clean_publish_v3_preview(generated_at="2026-06-28T12:00:00+00:00")
        missing_generated_at_report = {
            key: value
            for key, value in clean_dual_run_coverage_report(preview).items()
            if key != "generated_at"
        }
        stale_report = {
            **clean_dual_run_coverage_report(preview),
            "generated_at": "2026-06-28T11:59:00+00:00",
        }

        missing = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=missing_generated_at_report,
        )
        stale = evaluate_publish_readiness(
            preview,
            flags={"public_gold_source": "v3", "v3_publish_enabled": True},
            dual_run_report=stale_report,
        )

        self.assertFalse(missing["ready"])
        self.assertIn("dual_run_missing_generated_at", missing["errors"])
        self.assertFalse(stale["ready"])
        self.assertIn("dual_run_report_stale", stale["errors"])

    def test_publish_gold_v3_requires_source_drift_report_when_enabled(self) -> None:
        preview = clean_publish_v3_preview(generated_at="2026-06-28T12:00:00+00:00")
        flags = {"public_gold_source": "v3", "v3_publish_enabled": True}
        clean_dual_run_report = clean_dual_run_coverage_report()
        source_drift_report = clean_source_drift_report()
        covered_before_preview_source_drift_report = {
            **source_drift_report,
            "generated_at": "2026-06-28T11:59:00+00:00",
        }
        stale_source_drift_report = {
            "status": "clean",
            "publish_blockers": [],
            "generated_at": "2026-06-28T11:59:00+00:00",
            "source_reports": [],
        }
        empty_source_drift_report = {
            **source_drift_report,
            "source_reports": [],
            "summary": {"source_count": 0, "clean_count": 0, "review_required_count": 0},
        }
        missing_generated_at_source_drift_report = {
            "status": "clean",
            "publish_blockers": [],
        }

        missing = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            require_source_drift_report=True,
        )
        passed = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            source_drift_report=source_drift_report,
            require_source_drift_report=True,
        )
        covered_before_preview = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            source_drift_report=covered_before_preview_source_drift_report,
            require_source_drift_report=True,
        )
        stale = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            source_drift_report=stale_source_drift_report,
            require_source_drift_report=True,
        )
        missing_preview_sources = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            source_drift_report=empty_source_drift_report,
            require_source_drift_report=True,
        )
        missing_generated_at = evaluate_publish_readiness(
            preview,
            flags=flags,
            dual_run_report=clean_dual_run_report,
            source_drift_report=missing_generated_at_source_drift_report,
            require_source_drift_report=True,
        )

        self.assertFalse(missing["ready"])
        self.assertIn("missing_source_drift_report", missing["errors"])
        self.assertTrue(passed["ready"])
        self.assertTrue(covered_before_preview["ready"])
        self.assertFalse(stale["ready"])
        self.assertIn("source_drift_report_stale", stale["errors"])
        self.assertIn("source_drift_report_missing_preview_sources", stale["errors"])
        self.assertFalse(missing_preview_sources["ready"])
        self.assertIn("source_drift_report_missing_preview_sources", missing_preview_sources["errors"])
        self.assertFalse(missing_generated_at["ready"])
        self.assertIn("source_drift_report_missing_generated_at", missing_generated_at["errors"])

    def test_source_trust_monitoring_report_includes_generated_at(self) -> None:
        report = {
            "generated_at": "2026-06-28T12:01:00+00:00",
            "source_freshness": {"errors": []},
            "blockers": [],
        }

        monitoring_report = trust_report._monitoring_report(report)

        self.assertEqual("2026-06-28T12:01:00+00:00", monitoring_report["generated_at"])
        self.assertEqual("pass", monitoring_report["status"])

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
                        "generated_at": "2026-06-28T12:00:00+00:00",
                        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                        "rows": [
                            {
                                "source_document_id": "source-doc-1",
                                "source_sha256": "sourcehash",
                                "source_kind": "official_pdf",
                                "source_role": "resort_pdf",
                                "http_status": 200,
                                "currentness": "current",
                                "captured_at": "2026-06-28T12:00:00+00:00",
                                "validation_status": "auto_publishable",
                                "region_id": "page-001-region-04",
                                "region_type": "resort_activities_section",
                                "pipeline_version": "vision_v3_001",
                                "config_hash": "confighash",
                                "runtime_lineage": {
                                    "config_hash": "confighash",
                                    "lineage_hash": "lineagehash",
                                    "package_versions": {"pypdfium2": "4.30.0"},
                                    "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                                },
                                "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                                "title": "Poolside Activities",
                                "schedule": {
                                    "text": "Daily at 1:30pm",
                                    "normalized": {
                                        "schedule_type": "recurring",
                                        "days_of_week": ALL_DAYS,
                                        "start_time": "13:30",
                                        "timezone": "America/New_York",
                                    },
                                },
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
	                                "source_spans": {
	                                    "title": [{"page": 1, "text": "Poolside Activities"}],
	                                    "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
	                                    "location": [{"page": 1, "text": "Village Green Lawn"}],
	                                    "fee": [{"page": 1, "text": "No fee marker present"}],
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
            monitoring_path = root / "source_trust_monitoring_report.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(
                json.dumps(
                    {
                        "publication_mode": "vision_v3_preview",
                        "generated_at": "2026-06-28T12:00:00+00:00",
                        "summary": {"gold_rows": 1, "skipped_not_publishable": 0},
                        "rows": [
	                            {
	                                "source_document_id": "source-doc-1",
	                                "source_sha256": "sourcehash",
	                                "source_kind": "official_pdf",
	                                "source_role": "resort_pdf",
	                                "http_status": 200,
	                                "currentness": "current",
	                                "captured_at": "2026-06-28T12:00:00+00:00",
	                                "validation_status": "auto_publishable",
	                                "region_id": "page-001-region-04",
	                                "region_type": "resort_activities_section",
	                                "pipeline_version": "vision_v3_001",
                                "config_hash": "confighash",
                                "runtime_lineage": {
                                    "config_hash": "confighash",
                                    "lineage_hash": "lineagehash",
                                    "package_versions": {"pypdfium2": "4.30.0"},
                                    "model_asset_hashes": {"paddleocr_ppstructurev3": "modelhash"},
                                },
                                "source": {"canonicalUrl": "https://example.com/calendar.pdf", "documentHash": "sourcehash"},
                                "title": "Poolside Activities",
                                "schedule": {
                                    "text": "Daily at 1:30pm",
                                    "normalized": {
                                        "schedule_type": "recurring",
                                        "days_of_week": ALL_DAYS,
                                        "start_time": "13:30",
                                        "timezone": "America/New_York",
                                    },
                                },
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
	                                "source_spans": {
	                                    "title": [{"page": 1, "text": "Poolside Activities"}],
	                                    "schedule": [{"page": 1, "text": "Daily at 1:30pm"}],
	                                    "location": [{"page": 1, "text": "Village Green Lawn"}],
	                                    "fee": [{"page": 1, "text": "No fee marker present"}],
	                                },
	                            }
	                        ],
	                    }
                )
            )
            dual_run_path.write_text(json.dumps(clean_dual_run_coverage_report(json.loads(preview_path.read_text()))))
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
            monitoring_path = root / "source_trust_monitoring_report.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(json.dumps(clean_publish_v3_preview()))
            dual_run_path.write_text(json.dumps(clean_dual_run_coverage_report(json.loads(preview_path.read_text()))))
            drift_path.write_text(json.dumps(clean_source_drift_report()))
            monitoring_path.write_text(
                json.dumps(
                    {
                        "generated_at": "2026-06-28T12:01:00+00:00",
                        "status": "pass",
                        "changed_sources": [],
                        "affected_rows": [],
                        "recommended_action": "none",
                    }
                )
            )

            with patch.object(publish_gold_v3, "DEFAULT_DUAL_RUN_REPORT_PATH", dual_run_path):
                with patch.object(publish_gold_v3, "DEFAULT_SOURCE_DRIFT_REPORT_PATH", drift_path):
                    with patch.object(publish_gold_v3, "DEFAULT_MONITORING_REPORT_PATH", monitoring_path):
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

    def test_publish_gold_v3_cli_uses_default_preview_path_for_runbook_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "activity_gold_v3_preview.json"
            dual_run_path = root / "v3_dual_run_report.json"
            drift_path = root / "source_drift_report.json"
            monitoring_path = root / "source_trust_monitoring_report.json"
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            preview_path.write_text(json.dumps(clean_publish_v3_preview()))
            dual_run_path.write_text(json.dumps(clean_dual_run_coverage_report(json.loads(preview_path.read_text()))))
            drift_path.write_text(json.dumps(clean_source_drift_report()))
            monitoring_path.write_text(
                json.dumps(
                    {
                        "generated_at": "2026-06-28T12:01:00+00:00",
                        "status": "pass",
                        "changed_sources": [],
                        "affected_rows": [],
                        "recommended_action": "none",
                    }
                )
            )

            with patch.object(publish_gold_v3, "DEFAULT_PREVIEW_PATH", preview_path):
                with patch.object(publish_gold_v3, "DEFAULT_DUAL_RUN_REPORT_PATH", dual_run_path):
                    with patch.object(publish_gold_v3, "DEFAULT_SOURCE_DRIFT_REPORT_PATH", drift_path):
                        with patch.object(publish_gold_v3, "DEFAULT_MONITORING_REPORT_PATH", monitoring_path):
                            with patch.object(
                                sys,
                                "argv",
                                [
                                    "publish_gold_v3.py",
                                    "--flags",
                                    str(flags_path),
                                    "--require-clean-preview",
                                ],
                            ):
                                publish_gold_v3.main()

    def test_publish_gold_v3_cli_writes_only_with_explicit_publish_flag(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "activity_gold_v3_preview.json"
            dual_run_path = root / "v3_dual_run_report.json"
            drift_path = root / "source_drift_report.json"
            monitoring_path = root / "source_trust_monitoring_report.json"
            preview_path.write_text(json.dumps(clean_publish_v3_preview()))
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            dual_run_path.write_text(json.dumps(clean_dual_run_coverage_report(json.loads(preview_path.read_text()))))
            drift_path.write_text(json.dumps(clean_source_drift_report()))
            monitoring_path.write_text(
                json.dumps(
                    {
                        "generated_at": "2026-06-28T12:01:00+00:00",
                        "status": "pass",
                        "changed_sources": [],
                        "affected_rows": [],
                        "recommended_action": "none",
                    }
                )
            )
            db = object()
            publish_calls: list[tuple[Any, dict[str, Any]]] = []

            def publish_spy(db_arg: Any, preview_arg: dict[str, Any], **_kwargs: Any) -> dict[str, int]:
                publish_calls.append((db_arg, preview_arg))
                return {"activity_catalog": 1, "public_activity_gold": 1}

            with patch.object(publish_gold_v3, "DEFAULT_PREVIEW_PATH", preview_path):
                with patch.object(publish_gold_v3, "DEFAULT_DUAL_RUN_REPORT_PATH", dual_run_path):
                    with patch.object(publish_gold_v3, "DEFAULT_SOURCE_DRIFT_REPORT_PATH", drift_path):
                        with patch.object(publish_gold_v3, "DEFAULT_MONITORING_REPORT_PATH", monitoring_path):
                            with patch.object(publish_gold_v3, "SupabaseClient", return_value=db, create=True):
                                with patch.object(publish_gold_v3, "publish_gold_v3_preview", side_effect=publish_spy):
                                    with patch.object(
                                        sys,
                                        "argv",
                                        [
                                            "publish_gold_v3.py",
                                            "--flags",
                                            str(flags_path),
                                            "--require-clean-preview",
                                            "--publish",
                                        ],
                                    ):
                                        try:
                                            publish_gold_v3.main()
                                        except SystemExit as error:
                                            self.fail(f"publish CLI unexpectedly exited with {error.code}")

            self.assertEqual([(db, json.loads(preview_path.read_text()))], publish_calls)

    def test_publish_gold_v3_cli_publish_requires_clean_preview_gate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            flags_path = root / "publish_flags.yaml"
            preview_path = root / "activity_gold_v3_preview.json"
            dual_run_path = root / "v3_dual_run_report.json"
            drift_path = root / "source_drift_report.json"
            monitoring_path = root / "source_trust_monitoring_report.json"
            preview_path.write_text(json.dumps(clean_publish_v3_preview()))
            flags_path.write_text("public_gold_source: v3\nv3_publish_enabled: true\n")
            dual_run_path.write_text(json.dumps(clean_dual_run_coverage_report(json.loads(preview_path.read_text()))))
            drift_path.write_text(json.dumps(clean_source_drift_report()))
            monitoring_path.write_text(
                json.dumps(
                    {
                        "generated_at": "2026-06-28T12:01:00+00:00",
                        "status": "pass",
                        "changed_sources": [],
                        "affected_rows": [],
                        "recommended_action": "none",
                    }
                )
            )
            publish_calls: list[dict[str, Any]] = []

            def publish_spy(*_args: Any, **_kwargs: Any) -> dict[str, int]:
                publish_calls.append({"called": True})
                return {"activity_catalog": 1, "public_activity_gold": 1}

            with patch.object(publish_gold_v3, "DEFAULT_PREVIEW_PATH", preview_path):
                with patch.object(publish_gold_v3, "DEFAULT_DUAL_RUN_REPORT_PATH", dual_run_path):
                    with patch.object(publish_gold_v3, "DEFAULT_SOURCE_DRIFT_REPORT_PATH", drift_path):
                        with patch.object(publish_gold_v3, "DEFAULT_MONITORING_REPORT_PATH", monitoring_path):
                            with patch.object(publish_gold_v3, "SupabaseClient", return_value=object(), create=True):
                                with patch.object(publish_gold_v3, "publish_gold_v3_preview", side_effect=publish_spy):
                                    with patch.object(
                                        sys,
                                        "argv",
                                        [
                                            "publish_gold_v3.py",
                                            "--flags",
                                            str(flags_path),
                                            "--publish",
                                        ],
                                    ):
                                        with self.assertRaises(SystemExit) as raised:
                                            publish_gold_v3.main()

            self.assertEqual(1, raised.exception.code)
            self.assertEqual([], publish_calls)

    def test_publish_gold_v3_maps_ready_preview_rows_to_public_gold_contract(self) -> None:
        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
            }
        )

        self.assertTrue(
            hasattr(publish_gold_v3, "build_public_gold_rows_from_preview"),
            "publish_gold_v3 must expose public-row mapping before DB publication",
        )
        [public_row] = publish_gold_v3.build_public_gold_rows_from_preview(
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )

        self.assertEqual("boardwalk", public_row["calendar_group_key"])
        self.assertEqual("poolside-activities", public_row["canonical_slug"])
        self.assertEqual("Poolside Activities", public_row["title"])
        self.assertEqual(["boardwalk-inn"], public_row["resort_slugs"])
        self.assertEqual("source-doc-1", public_row["source_document_id"])
        self.assertEqual("https://example.com/calendar.pdf", public_row["source_url"])
        self.assertEqual("sourcehash", public_row["source_sha256"])
        self.assertEqual("fy26-q3-0526", public_row["source_pdf_edition"])
        self.assertEqual("source_backed", public_row["trust_state"])
        self.assertEqual("cand-poolside", public_row["promoted_from_candidate_id"])
        self.assertEqual("2026-06-28T12:05:00+00:00", public_row["promoted_at"])
        self.assertEqual(preview["rows"][0]["schedule"], public_row["schedule"])
        self.assertEqual(preview["rows"][0]["source_spans"], public_row["field_provenance"])
        self.assertEqual(preview["rows"][0]["field_evidence"], public_row["source"]["fieldEvidence"])
        self.assertEqual(preview["rows"][0]["runtime_lineage"], public_row["source"]["runtimeLineage"])
        self.assertEqual("aframe_recreation", public_row["source"]["documentFamily"])
        self.assertEqual(
            preview["rows"][0]["canonical_page_image_sha256s"],
            public_row["source"]["canonicalPageImageSha256s"],
        )
        self.assertEqual(preview["rows"][0]["source_pages"], public_row["source"]["sourcePages"])

    def test_publish_gold_v3_preview_upserts_activity_catalog_and_public_gold_rows(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [{**row, "id": f"db-source-{row['content_sha256']}"} for row in payload]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
            }
        )
        db = RecordingDb()

        self.assertTrue(
            hasattr(publish_gold_v3, "publish_gold_v3_preview"),
            "publish_gold_v3 must expose a guarded DB write helper",
        )
        result = publish_gold_v3.publish_gold_v3_preview(
            db,
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )

        self.assertEqual(
            [
                "source_documents",
                "activity_extraction_candidates",
                "activity_field_provenance",
                "activity_catalog",
                "public_activity_gold",
            ],
            [table for table, _rows, _conflict in db.upserts],
        )
        self.assertEqual("content_sha256", db.upserts[0][2])
        self.assertEqual("candidate_id", db.upserts[1][2])
        self.assertEqual("candidate_id,field_name", db.upserts[2][2])
        self.assertEqual("id", db.upserts[3][2])
        self.assertEqual("id", db.upserts[4][2])
        candidate_row = db.upserts[1][1][0]
        self.assertEqual("cand-poolside", candidate_row["candidate_id"])
        self.assertEqual("db-source-sourcehash", candidate_row["source_document_id"])
        self.assertEqual("sourcehash", candidate_row["content_sha256"])
        self.assertEqual("poolside-activities", candidate_row["activity_slug"])
        self.assertEqual("vision_v3_001", candidate_row["parser_version"])
        self.assertEqual("promoted", candidate_row["status"])
        field_rows = db.upserts[2][1]
        self.assertEqual(["fee", "location", "schedule", "title"], sorted(row["field_name"] for row in field_rows))
        schedule_field = next(row for row in field_rows if row["field_name"] == "schedule")
        self.assertEqual("cand-poolside", schedule_field["candidate_id"])
        self.assertEqual("Daily at 1:30pm", schedule_field["field_value"])
        self.assertEqual("vision_layout_v3", schedule_field["source_type"])
        self.assertEqual("exact_after_normalization", schedule_field["transformation"])
        self.assertEqual("Poolside Activities", db.upserts[3][1][0]["canonical_name"])
        self.assertEqual("poolside-activities", db.upserts[3][1][0]["normalized_name"])
        self.assertEqual("db-source-sourcehash", db.upserts[4][1][0]["source_document_id"])
        self.assertEqual("sourcehash", db.upserts[4][1][0]["source_sha256"])
        self.assertEqual(["source_currentness_checks", "field_audit_observations"], [table for table, _rows in db.inserts])
        audit_rows = db.inserts[1][1]
        self.assertEqual(["fee", "location", "schedule", "title"], sorted(row["field_name"] for row in audit_rows))
        schedule_audit = next(row for row in audit_rows if row["field_name"] == "schedule")
        self.assertEqual("gold_activity", schedule_audit["row_kind"])
        self.assertEqual("boardwalk:poolside-activities", schedule_audit["row_key"])
        self.assertEqual("Daily at 1:30pm", schedule_audit["observed_value"])
        self.assertEqual("deterministic_parser", schedule_audit["method"])
        self.assertEqual("high", schedule_audit["confidence"])
        self.assertEqual("db-source-sourcehash", schedule_audit["source_document_id"])
        self.assertEqual("sourcehash", schedule_audit["evidence"]["field_evidence"]["source"]["content_sha256"])
        self.assertEqual(
            {
                "source_documents": 1,
                "source_currentness_checks": 1,
                "source_relationships": 0,
                "activity_extraction_candidates": 1,
                "activity_field_provenance": 4,
                "activity_catalog": 1,
                "public_activity_gold": 1,
                "field_audit_observations": 4,
            },
            result,
        )
        self.assertEqual([("check_activity_pipeline_v3_health", {})], db.rpc_calls)

    def test_publish_gold_v3_preview_fails_when_post_publish_health_fails(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [{**row, "id": f"db-source-{row['content_sha256']}"} for row in payload]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return [{"check_name": "gold_v3_missing_field_provenance", "detail": "boardwalk:poolside"}]

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside",
                "title": "Poolside",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
            }
        )
        db = RecordingDb()

        with self.assertRaisesRegex(
            RuntimeError,
            "activity_pipeline_v3_health_failed:gold_v3_missing_field_provenance:boardwalk:poolside",
        ):
            publish_gold_v3.publish_gold_v3_preview(db, preview)

        self.assertEqual([("check_activity_pipeline_v3_health", {})], db.rpc_calls)

    def test_publish_gold_v3_preview_upserts_source_documents_before_dependent_rows(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [
                        {
                            **row,
                            "id": f"db-source-{row['content_sha256']}",
                        }
                        for row in payload
                    ]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
                "mime_type": "application/pdf",
                "storage_path": "data/raw/source_documents/boardwalk/fy26-q3-0526/sourcehash.pdf",
            }
        )
        db = RecordingDb()

        result = publish_gold_v3.publish_gold_v3_preview(
            db,
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )

        self.assertEqual("source_documents", db.upserts[0][0])
        self.assertEqual("content_sha256", db.upserts[0][2])
        source_row = db.upserts[0][1][0]
        self.assertEqual("pdf", source_row["source_type"])
        self.assertEqual("https://example.com/calendar.pdf", source_row["canonical_url"])
        self.assertEqual("sourcehash", source_row["content_sha256"])
        self.assertEqual("application/pdf", source_row["mime_type"])
        self.assertEqual("data/raw/source_documents/boardwalk/fy26-q3-0526/sourcehash.pdf", source_row["storage_path"])
        self.assertEqual("db-source-sourcehash", db.upserts[1][1][0]["source_document_id"])
        self.assertEqual("db-source-sourcehash", db.upserts[4][1][0]["source_document_id"])
        self.assertEqual("db-source-sourcehash", db.inserts[0][1][0]["source_document_id"])
        self.assertEqual(1, result["source_documents"])

    def test_publish_gold_v3_preview_records_source_currentness_checks(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [{**row, "id": f"db-source-{row['content_sha256']}"} for row in payload]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
                "fetched_url": "https://cdn.example.com/calendar.pdf",
            }
        )
        db = RecordingDb()

        result = publish_gold_v3.publish_gold_v3_preview(
            db,
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )

        self.assertEqual("source_currentness_checks", db.inserts[0][0])
        currentness_row = db.inserts[0][1][0]
        self.assertEqual("db-source-sourcehash", currentness_row["source_document_id"])
        self.assertEqual("https://example.com/calendar.pdf", currentness_row["canonical_url"])
        self.assertEqual("https://cdn.example.com/calendar.pdf", currentness_row["fetched_url"])
        self.assertEqual("sourcehash", currentness_row["live_content_sha256"])
        self.assertEqual("sourcehash", currentness_row["stored_content_sha256"])
        self.assertEqual(200, currentness_row["http_status"])
        self.assertEqual("current", currentness_row["currentness"])
        self.assertEqual("vision_v3_publish", currentness_row["detail"]["method"])
        self.assertEqual("boardwalk", currentness_row["detail"]["calendar_group_key"])
        self.assertEqual("poolside-activities", currentness_row["detail"]["canonical_slug"])
        self.assertEqual(1, result["source_currentness_checks"])

    def test_publish_gold_v3_preview_links_qr_derived_source_documents(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [{**row, "id": f"db-source-{row['content_sha256']}"} for row in payload]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "category": "poolside",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-poolside",
                "derived_source_links": [
                    {
                        "source_role": "derived_source_link",
                        "source_type": "html",
                        "target_url": "https://disneyworld.disney.go.com/recreation/boardwalk-activities/",
                        "fetched_url": "https://disneyworld.disney.go.com/recreation/boardwalk-activities/",
                        "content_sha256": "derivedhash",
                        "http_status": 200,
                        "currentness": "current",
                        "is_official_source": True,
                        "source_authority": "official_disney",
                        "source_crop_sha256": "qrcrop",
                        "parent_content_sha256": "sourcehash",
                    }
                ],
            }
        )
        db = RecordingDb()

        result = publish_gold_v3.publish_gold_v3_preview(
            db,
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )

        source_rows = db.upserts[0][1]
        self.assertEqual(["derivedhash", "sourcehash"], sorted(row["content_sha256"] for row in source_rows))
        relationship_upsert = next(upsert for upsert in db.upserts if upsert[0] == "source_relationships")
        self.assertEqual("parent_source_document_id,child_source_document_id,relationship_type", relationship_upsert[2])
        [relationship] = relationship_upsert[1]
        self.assertEqual("db-source-sourcehash", relationship["parent_source_document_id"])
        self.assertEqual("db-source-derivedhash", relationship["child_source_document_id"])
        self.assertEqual("qr_links_derived_source", relationship["relationship_type"])
        self.assertEqual("qrcrop", relationship["relationship_evidence"]["source_crop_sha256"])
        self.assertEqual(
            "https://disneyworld.disney.go.com/recreation/boardwalk-activities/",
            relationship["relationship_evidence"]["target_url"],
        )
        public_gold = next(upsert for upsert in db.upserts if upsert[0] == "public_activity_gold")[1][0]
        self.assertEqual("db-source-sourcehash", public_gold["source_document_id"])
        self.assertEqual(2, result["source_documents"])
        self.assertEqual(1, result["source_relationships"])

    def test_publish_gold_v3_preview_inserts_movie_title_audit_observation_for_movies(self) -> None:
        class RecordingDb:
            def __init__(self) -> None:
                self.upserts: list[tuple[str, Any, str]] = []
                self.inserts: list[tuple[str, Any]] = []
                self.rpc_calls: list[tuple[str, dict[str, Any]]] = []

            def upsert(self, table: str, rows: Any, on_conflict: str) -> list[dict[str, Any]]:
                self.upserts.append((table, rows, on_conflict))
                payload = rows if isinstance(rows, list) else [rows]
                if table == "source_documents":
                    return [{**row, "id": f"db-source-{row['content_sha256']}"} for row in payload]
                return payload

            def insert(self, table: str, rows: Any) -> list[dict[str, Any]]:
                self.inserts.append((table, rows))
                payload = rows if isinstance(rows, list) else [rows]
                return payload

            def rpc(self, fn: str, args=None) -> list[dict[str, Any]]:
                self.rpc_calls.append((fn, args or {}))
                return []

        preview = clean_publish_v3_preview()
        preview["rows"][0].update(
            {
                "canonical_slug": "movie-under-the-stars",
                "title": "Movies Under the Stars",
                "category": "movie",
                "candidate_type": "movie",
                "movie_title": "Moana",
                "normalized_movie_title": "moana",
                "resort_slug": "boardwalk-inn",
                "edition": "fy26-q3-0526",
                "candidate_id": "cand-movie",
            }
        )
        preview["rows"][0]["source_spans"]["movie_title"] = [{"page": 1, "text": "Moana"}]
        preview["rows"][0]["field_evidence"]["movie_title"] = {
            "source": {
                "content_sha256": "sourcehash",
                "page_number": 1,
                "page_image_sha256": "pagehash",
                "bbox_px": [20, 40, 180, 70],
                "crop_sha256": "moviecrop",
                "crop_storage_path": "movie.png",
            },
            "agreement": "exact_after_normalization",
        }

        db = RecordingDb()
        result = publish_gold_v3.publish_gold_v3_preview(
            db,
            preview,
            promoted_at="2026-06-28T12:05:00+00:00",
        )
        inserted_rows = db.inserts[1][1]
        self.assertEqual(
            ["fee", "location", "movie_title", "schedule", "title"],
            sorted(row["field_name"] for row in inserted_rows),
        )
        movie_audit = next(row for row in inserted_rows if row["field_name"] == "movie_title")
        self.assertEqual("Moana", movie_audit["observed_value"])
        self.assertEqual("high", movie_audit["confidence"])
        self.assertEqual("moviecrop", movie_audit["evidence"]["field_evidence"]["source"]["crop_sha256"])
        self.assertEqual(
            {
                "source_documents": 1,
                "source_currentness_checks": 1,
                "source_relationships": 0,
                "activity_extraction_candidates": 1,
                "activity_field_provenance": 5,
                "activity_catalog": 1,
                "public_activity_gold": 1,
                "field_audit_observations": 5,
            },
            result,
        )

    def test_source_drift_report_flags_changed_fields_for_review(self) -> None:
        old_rows = [
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 1:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            },
            {
                "canonical_slug": "arcade-tournament",
                "title": "Arcade Tournament",
                "schedule": {"text": "Saturday at 4:00pm"},
                "location": {"label": "Side Show Games Arcade"},
                "price": {"state": "free"},
                "field_evidence": {
                    "title": {
                        "raw_value": "Arcade Tournament",
                        "source": {
                            "page_number": 1,
                            "page_image_sha256": "removedpagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-old/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-old/title.png",
                            "crop_sha256": "removedcrophash",
                            "bbox_px": [24, 80, 220, 108],
                        },
                    }
                },
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
                "field_evidence": {
                    "title": {
                        "raw_value": "Campfire",
                        "source": {
                            "page_number": 1,
                            "page_image_sha256": "titlepagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-a/title.png",
                            "crop_sha256": "titlecrophash",
                            "bbox_px": [20, 40, 180, 70],
                        },
                    }
                },
            },
        ]

        report = build_source_drift_report(
            old_source_hash="oldhash",
            new_source_hash="newhash",
            old_rows=old_rows,
            new_rows=new_rows,
        )

        self.assertEqual("review_required", report["status"])
        self.assertRegex(report.get("generated_at", ""), r"^\d{4}-\d{2}-\d{2}T")
        self.assertEqual("oldhash", report["old_hash"])
        self.assertEqual("newhash", report["new_hash"])
        self.assertEqual(2, report["old_activity_count"])
        self.assertEqual(2, report["new_activity_count"])
        self.assertEqual(["Campfire"], report["new_titles"])
        self.assertEqual(["Arcade Tournament"], report["removed_titles"])
        self.assertEqual(
            [
                {
                    "title": "Campfire",
                    "canonical_slug": "campfire",
                    "page_number": 1,
                    "page_image_sha256": "titlepagehash",
                    "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                    "crop_storage_path": "data/processed/region_crops/source-doc-a/title.png",
                    "crop_sha256": "titlecrophash",
                    "bbox_px": [20, 40, 180, 70],
                    "text": "Campfire",
                }
            ],
            report["new_title_details"],
        )
        self.assertEqual(
            [
                {
                    "title": "Arcade Tournament",
                    "canonical_slug": "arcade-tournament",
                    "page_number": 1,
                    "page_image_sha256": "removedpagehash",
                    "page_image_path": "data/processed/source_pages/source-doc-old/page-001.png",
                    "crop_storage_path": "data/processed/region_crops/source-doc-old/title.png",
                    "crop_sha256": "removedcrophash",
                    "bbox_px": [24, 80, 220, 108],
                    "text": "Arcade Tournament",
                }
            ],
            report["removed_title_details"],
        )
        self.assertEqual(["poolside-activities"], [item["canonical_slug"] for item in report["changed_schedules"]])
        self.assertTrue(report["manual_review_required"])
        self.assertTrue(
            review_approval_is_current(
                {"content_sha256": "sourcehash", "page_image_sha256": "pagehash"},
                current_content_sha256="sourcehash",
                current_page_image_sha256="pagehash",
            )
        )

    def test_source_drift_report_carries_changed_field_visual_evidence(self) -> None:
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
                "field_evidence": {
                    "schedule": {
                        "raw_value": "Poolside Activities Daily at 2:30pm",
                        "source": {
                            "page_number": 1,
                            "page_image_sha256": "pagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-a/schedule.png",
                            "crop_sha256": "crophash",
                            "bbox_px": [16, 32, 320, 72],
                        },
                    }
                },
            }
        ]

        report = build_source_drift_report(
            old_source_hash="oldhash",
            new_source_hash="newhash",
            old_rows=old_rows,
            new_rows=new_rows,
        )

        [change] = report["changed_schedules"]
        self.assertEqual(1, change["page_number"])
        self.assertEqual("pagehash", change["page_image_sha256"])
        self.assertEqual("data/processed/source_pages/source-doc-a/page-001.png", change["page_image_path"])
        self.assertEqual("data/processed/region_crops/source-doc-a/schedule.png", change["crop_storage_path"])
        self.assertEqual("crophash", change["crop_sha256"])
        self.assertEqual([16, 32, 320, 72], change["bbox_px"])
        self.assertEqual("Poolside Activities Daily at 2:30pm", change["text"])

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
                "field_evidence": {
                    "schedule": {
                        "raw_value": "Poolside Activities",
                        "source": {
                            "page_number": 1,
                            "page_image_sha256": "pagehash",
                            "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                            "crop_storage_path": "data/processed/region_crops/source-doc-a/schedule.png",
                            "crop_sha256": "crophash",
                            "bbox_px": [16, 32, 320, 72],
                        },
                    }
                },
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
                "page_image_sha256": "unknownpagehash",
                "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                "crop_storage_path": "data/processed/region_crops/source-doc-a/unknown.png",
                "crop_sha256": "unknowncrophash",
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
                    "page_number": 1,
                    "page_image_sha256": "pagehash",
                    "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                    "crop_storage_path": "data/processed/region_crops/source-doc-a/schedule.png",
                    "crop_sha256": "crophash",
                    "bbox_px": [16, 32, 320, 72],
                    "text": "Poolside Activities",
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
                    "page_image_sha256": "unknownpagehash",
                    "page_image_path": "data/processed/source_pages/source-doc-a/page-001.png",
                    "crop_storage_path": "data/processed/region_crops/source-doc-a/unknown.png",
                    "crop_sha256": "unknowncrophash",
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
                            "source_document_id": "source-doc-boardwalk",
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
                            "source_document_id": "source-doc-boardwalk",
                            "content_sha256": "newhash",
                            "document_family": "aframe_recreation",
                            "edition": "fy26-q4-0826",
                            "source_kind": "official_pdf",
                            "source_role": "resort_pdf",
                            "canonical_url": "https://example.com/boardwalk.pdf",
                            "fetched_url": "https://cdn.example.com/boardwalk.pdf",
                            "http_status": 200,
                            "currentness": "current",
                            "captured_at": "2026-06-29T12:00:00+00:00",
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
        self.assertRegex(report.get("generated_at", ""), r"^\d{4}-\d{2}-\d{2}T")
        self.assertEqual("review_required", report["status"])
        self.assertEqual(1, report["summary"]["source_count"])
        self.assertEqual(["source_hash_changed"], report["publish_blockers"])
        source_report = report["source_reports"][0]
        self.assertEqual("source-doc-boardwalk", source_report["source_document_id"])
        self.assertEqual("boardwalk", source_report["calendar_group_key"])
        self.assertEqual("official_pdf", source_report["source_kind"])
        self.assertEqual("resort_pdf", source_report["source_role"])
        self.assertEqual("https://example.com/boardwalk.pdf", source_report["canonical_url"])
        self.assertEqual("https://cdn.example.com/boardwalk.pdf", source_report["fetched_url"])
        self.assertEqual(200, source_report["http_status"])
        self.assertEqual("current", source_report["currentness"])
        self.assertEqual("2026-06-29T12:00:00+00:00", source_report["captured_at"])
        self.assertEqual("oldhash", source_report["old_hash"])
        self.assertEqual("newhash", source_report["new_hash"])
        self.assertEqual(["poolside-activities"], [item["canonical_slug"] for item in source_report["changed_schedules"]])

    def test_source_drift_report_treats_no_old_rows_as_first_v3_baseline(self) -> None:
        report = source_drift_report.build_quarter_source_drift_report(
            quarter="fy26-q3",
            old_rows=[],
            new_rows=[
                {
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-boardwalk",
                    "content_sha256": "newhash",
                    "document_family": "aframe_recreation",
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                }
            ],
        )

        self.assertEqual("clean", report["status"])
        self.assertEqual("first_v3_baseline", report["baseline_mode"])
        self.assertEqual([], report["publish_blockers"])
        self.assertEqual("clean", report["source_reports"][0]["status"])
        self.assertEqual("first_v3_baseline", report["source_reports"][0]["baseline_mode"])

    def test_source_drift_report_first_v3_baseline_still_blocks_validation_failures(self) -> None:
        report = source_drift_report.build_quarter_source_drift_report(
            quarter="fy26-q3",
            old_rows=[],
            new_rows=[
                {
                    "candidate_id": "candidate-1",
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-boardwalk",
                    "content_sha256": "newhash",
                    "document_family": "aframe_recreation",
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "validation_findings": ["engine_disagreement:location"],
                }
            ],
        )

        self.assertEqual("review_required", report["status"])
        self.assertEqual(["validation_failures"], report["publish_blockers"])
        self.assertEqual("review_required", report["source_reports"][0]["status"])
        self.assertEqual(["validation_failures"], report["source_reports"][0]["publish_blockers"])

    def test_source_drift_report_quarter_batch_compares_multiple_sources_per_calendar_group(self) -> None:
        report = source_drift_report.build_quarter_source_drift_report(
            quarter="fy26-q4",
            old_rows=[
                {
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-a",
                    "content_sha256": "hash-a",
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                },
                {
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-b",
                    "content_sha256": "hash-b",
                    "canonical_slug": "lawn-games",
                    "title": "Lawn Games",
                },
            ],
            new_rows=[
                {
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-a",
                    "content_sha256": "hash-a",
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                },
                {
                    "candidate_type": "activity",
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-b",
                    "content_sha256": "hash-c",
                    "canonical_slug": "lawn-games",
                    "title": "Lawn Games",
                },
            ],
        )

        self.assertEqual("review_required", report["status"])
        self.assertEqual(2, report["summary"]["source_count"])
        self.assertEqual(["source_hash_changed"], report["publish_blockers"])
        by_source = {row["source_document_id"]: row for row in report["source_reports"]}
        self.assertEqual("clean", by_source["source-doc-a"]["status"])
        self.assertEqual("review_required", by_source["source-doc-b"]["status"])
        self.assertEqual("hash-b", by_source["source-doc-b"]["old_hash"])
        self.assertEqual("hash-c", by_source["source-doc-b"]["new_hash"])

    def test_schedule_normalization_handles_recurring_point_time_and_phrase_schedules(self) -> None:
        daily = normalize_schedule_text("Daily from 8:00am–11:00pm")
        weekly = normalize_schedule_text("Monday, Wednesday and Friday from 4:00pm-5:00pm")
        point_time = normalize_schedule_text("Tuesday and Thursday at 8:30pm")
        ocr_zero_repair = normalize_schedule_text("Sunday at 8:3OPM")
        double_ocr_zero_repair = normalize_schedule_text("Monday, Wednesday and Saturday from 1:O0pm-3:OOpm")
        dot_separator_ocr_repair = normalize_schedule_text("Thursday at =ro6.30pm-7.30pm")
        phrase = normalize_schedule_text("Dawn to Dusk")
        daily_phrase = normalize_schedule_text("Daily from Dawn to Dusk")

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
        self.assertEqual(["Sunday"], ocr_zero_repair["days_of_week"])
        self.assertEqual("20:30", ocr_zero_repair["start_time"])
        self.assertEqual(["Monday", "Wednesday", "Saturday"], double_ocr_zero_repair["days_of_week"])
        self.assertEqual("13:00", double_ocr_zero_repair["start_time"])
        self.assertEqual("15:00", double_ocr_zero_repair["end_time"])
        self.assertEqual(["Thursday"], dot_separator_ocr_repair["days_of_week"])
        self.assertEqual("18:30", dot_separator_ocr_repair["start_time"])
        self.assertEqual("19:30", dot_separator_ocr_repair["end_time"])
        self.assertEqual("phrase", phrase["schedule_type"])
        self.assertEqual("dawn_to_dusk", phrase["phrase"])
        self.assertEqual("phrase", daily_phrase["schedule_type"])
        self.assertEqual("dawn_to_dusk", daily_phrase["phrase"])

    def test_prd_named_validator_modules_expose_v3_contracts(self) -> None:
        try:
            schedule_parser = importlib.import_module("scripts.ingest.schedule_parser_v3")
            location_dictionary = importlib.import_module("scripts.ingest.location_dictionary")
            engine_agreement = importlib.import_module("scripts.ingest.engine_agreement")
        except ModuleNotFoundError as error:
            self.fail(f"missing PRD validator module: {error.name}")

        schedule = schedule_parser.parse_schedule_text("Daily from 8:00am-11:00pm")
        location = location_dictionary.lookup_location("Village Green Lawn")
        agreement = engine_agreement.evaluate_engine_agreement(
            "schedule",
            primary_text="Daily from 8:00am-11:00pm",
            secondary_text="Daily 8:00 AM - 11:00 PM",
        )

        self.assertEqual("recurring", schedule["schedule_type"])
        self.assertEqual("schedule_parser_v3", schedule["parser"])
        self.assertEqual("village_green_lawn", location["location_id"])
        self.assertFalse(location["manual_review_required"])
        self.assertEqual("exact_after_normalization", agreement["agreement"])
        self.assertEqual("08:00", agreement["normalized_value"]["start_time"])

    def test_engine_agreement_is_field_specific_after_deterministic_normalization(self) -> None:
        schedule = evaluate_field_agreement(
            "schedule",
            primary_text="Daily from 8:00am-11:00pm",
            secondary_text="Daily 8:00 AM - 11:00 PM",
        )
        repaired_schedule = evaluate_field_agreement(
            "schedule",
            primary_text="Thursday at From 6:30pm-7:30pm",
            secondary_text="Thursday at =ro6.30pm-7.30pm",
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
        movie_header = evaluate_field_agreement(
            "title",
            primary_text="MOVIEUNDER THE STARS",
            secondary_text="UNDER THE STARS",
        )
        movie_header_tail = evaluate_field_agreement(
            "title",
            primary_text="MOVIEUNDER THE STARS",
            secondary_text="THE STARS",
        )
        wrong_movie_header = evaluate_field_agreement(
            "title",
            primary_text="MOVIE UNDER THE STARS",
            secondary_text="MOVIE LAWN | 8:30PM",
        )
        movie_rating_suffix = evaluate_field_agreement(
            "title",
            primary_text="Big Hero 6",
            secondary_text="Big Hero 6 [PG)",
        )
        movie_year_rating_suffix = evaluate_field_agreement(
            "title",
            primary_text="The Lion King (1994)",
            secondary_text="The Lion King (1994)G",
        )
        movie_trailing_ampersand = evaluate_field_agreement(
            "title",
            primary_text="High School Musical 2",
            secondary_text="High School Musical 2 &",
        )
        wrong_movie_title = evaluate_field_agreement(
            "title",
            primary_text="Beauty and the Beast (1991)",
            secondary_text="Cars",
        )
        compact_trivia = evaluate_field_agreement(
            "title",
            primary_text="NIGHTTIMETRIVIA",
            secondary_text="NIGHTTIME TRIVIA",
        )
        fee_marker_spacing = evaluate_field_agreement(
            "title",
            primary_text="WIN, PAINT, SHOW! ($)",
            secondary_text="WIN, PAINT, SHOW!($)",
        )

        self.assertEqual("exact_after_normalization", schedule["agreement"])
        self.assertEqual("08:00", schedule["normalized_value"]["start_time"])
        self.assertEqual("exact_after_normalization", repaired_schedule["agreement"])
        self.assertEqual("18:30", repaired_schedule["normalized_value"]["start_time"])
        self.assertEqual("exact_after_normalization", title["agreement"])
        self.assertEqual("poolside activities ($)", title["normalized_value"])
        self.assertEqual("luna_park_pool_deck", location["normalized_value"])
        self.assertEqual("exact_after_normalization", fee["agreement"])
        self.assertTrue(fee["normalized_value"])
        self.assertEqual("disagreement", bad_location["agreement"])
        self.assertEqual("exact_after_normalization", movie_header["agreement"])
        self.assertEqual("movie under the stars", movie_header["normalized_value"])
        self.assertEqual("exact_after_normalization", movie_header_tail["agreement"])
        self.assertEqual("movie under the stars", movie_header_tail["normalized_value"])
        self.assertEqual("disagreement", wrong_movie_header["agreement"])
        self.assertEqual("exact_after_normalization", movie_rating_suffix["agreement"])
        self.assertEqual("big hero 6", movie_rating_suffix["normalized_value"])
        self.assertEqual("exact_after_normalization", movie_year_rating_suffix["agreement"])
        self.assertEqual("the lion king (1994)", movie_year_rating_suffix["normalized_value"])
        self.assertEqual("exact_after_normalization", movie_trailing_ampersand["agreement"])
        self.assertEqual("high school musical 2", movie_trailing_ampersand["normalized_value"])
        self.assertEqual("disagreement", wrong_movie_title["agreement"])
        self.assertEqual("exact_after_normalization", compact_trivia["agreement"])
        self.assertEqual("nighttime trivia", compact_trivia["normalized_value"])
        self.assertEqual("exact_after_normalization", fee_marker_spacing["agreement"])
        self.assertEqual("win, paint, show! ($)", fee_marker_spacing["normalized_value"])

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
        self.assertEqual(3, report["summary"]["candidate_count"])
        self.assertEqual(1 / 3, report["summary"]["auto_publish_rate"])
        self.assertEqual(1 / 3, report["summary"]["manual_review_rate"])
        self.assertEqual(1 / 3, report["summary"]["rejected_rate"])
        self.assertEqual(0.5, report["summary"]["parser_error_source_rate"])
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

    def test_source_metrics_v3_filters_snapshots_and_candidates_by_quarter(self) -> None:
        snapshots = [
            {"source_sha256": "hash-q3", "edition": "fy26-q3", "source_pages": [{"page_number": 1}]},
            {"source_sha256": "hash-q4", "edition": "fy26-q4", "source_pages": [{"page_number": 1}]},
        ]
        candidates = [
            {
                "content_sha256": "hash-q3",
                "edition": "fy26-q3",
                "candidate_type": "activity",
                "validation_status": "auto_publishable",
            },
            {
                "content_sha256": "hash-q4",
                "edition": "fy26-q4",
                "candidate_type": "activity",
                "validation_status": "needs_review",
            },
        ]

        report = build_source_metrics_report(
            snapshots=snapshots,
            candidates=candidates,
            quarter="fy26-q4",
        )

        self.assertEqual("fy26-q4", report["quarter"])
        self.assertEqual(1, report["summary"]["source_count"])
        self.assertEqual(["hash-q4"], [row["source_sha256"] for row in report["sources"]])
        self.assertEqual(0, report["summary"]["auto_publishable_count"])
        self.assertEqual(1, report["summary"]["needs_review_count"])

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
            "field": "schedule",
            "candidate": {
                "candidate_id": "cand-1",
                "calendar_group_key": "boardwalk",
                "candidate_type": "activity",
                "normalized_title": "Poolside Activities",
            },
        }

        missing_approval_evidence_cases = [
            ("page_image", "missing_page_image_sha256"),
            ("field_crop", "missing_field_crop"),
            ("field_crop_sha256", "missing_field_crop_sha256"),
        ]
        for field_name, error_code in missing_approval_evidence_cases:
            with self.subTest(field_name=field_name):
                incomplete_task = {**task, field_name: ""}
                with self.assertRaisesRegex(ValueError, error_code):
                    build_review_decision(
                        incomplete_task,
                        reviewer="josh",
                        decision="approve",
                        approved_fields={"schedule": {"raw_value": "Daily at 1:30pm", "normalized_value": {}}},
                        reason="Visible in crop.",
                        decided_at="2026-06-28T12:00:00Z",
                    )

        with self.assertRaisesRegex(ValueError, "missing_approved_field_normalized_value:schedule"):
            build_review_decision(
                task,
                reviewer="josh",
                decision="approve",
                approved_fields={"schedule": {"raw_value": "Daily at 1:30pm"}},
                reason="Visible in crop.",
                decided_at="2026-06-28T12:00:00Z",
            )

        with self.assertRaisesRegex(ValueError, "unknown_approved_field:scheduel"):
            build_review_decision(
                task,
                reviewer="josh",
                decision="approve",
                approved_fields={"scheduel": {"raw_value": "Daily at 1:30pm", "normalized_value": "13:30"}},
                reason="Visible in crop.",
                decided_at="2026-06-28T12:00:00Z",
            )

        with self.assertRaisesRegex(ValueError, "approved_fields_do_not_match_task_field:schedule"):
            build_review_decision(
                task,
                reviewer="josh",
                decision="approve",
                approved_fields={
                    "schedule": {"raw_value": "Daily at 1:30pm", "normalized_value": "13:30"},
                    "location": {"raw_value": "Village Green Lawn", "normalized_value": "village_green_lawn"},
                },
                reason="Visible in crop.",
                decided_at="2026-06-28T12:00:00Z",
            )

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

    def test_review_schema_accepts_canonical_page_image_sha256_task_field(self) -> None:
        task = {
            "task_id": "cand-canonical-page-hash",
            "task_type": "unparsed_schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image_sha256": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "crophash",
            "field": "schedule",
            "candidate": {
                "candidate_id": "cand-canonical-page-hash",
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

        self.assertEqual("pagehash", decision["page_image_sha256"])

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
        rejected = build_review_decision(
            {**task, "task_id": "cand-2", "candidate": {"candidate_id": "cand-2"}},
            reviewer="josh",
            decision="reject",
            reason="Not enough evidence.",
            decided_at="2026-06-28T12:01:00Z",
        )
        malformed_approval = {
            **approved,
            "task_id": "cand-3",
            "candidate_id": "cand-3",
            "approved_fields": {
                "schedule": {
                    "raw_value": "Daily at 7:30pm",
                }
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "fixture_candidates.json"
            decisions_path.write_text(json.dumps([approved, rejected, malformed_approval]))

            report = review_schema_v3.export_review_fixture_candidates(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(3, report["summary"]["decision_count"])
        self.assertEqual(1, report["summary"]["fixture_candidate_count"])
        self.assertEqual(1, report["summary"]["skipped_non_approval_count"])
        self.assertEqual(1, report["summary"]["skipped_invalid_review_decision_count"])
        self.assertEqual("review_fixture_candidates_v3", payload["fixture_kind"])
        self.assertEqual("cand-1", payload["candidates"][0]["candidate_id"])
        self.assertEqual("sourcehash", payload["candidates"][0]["content_sha256"])

    def test_review_schema_exports_parser_rule_update_requests_from_review_decisions(self) -> None:
        task = {
            "task_id": "cand-parser-rule",
            "task_type": "ocr_disagreement",
            "field": "schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "schedulecrop",
            "validation_findings": ["engine_disagreement:schedule"],
            "existing_gold_comparison": {
                "matched": True,
                "match_key": "boardwalk:poolside-activities",
                "fields": {
                    "schedule": {
                        "candidate": "Daily at 1:30pm",
                        "existing": "Daily at 7:30pm",
                        "changed": True,
                    }
                },
            },
            "candidate": {
                "candidate_id": "cand-parser-rule",
                "calendar_group_key": "boardwalk",
                "candidate_type": "activity",
                "normalized_title": "Poolside Activities",
            },
        }
        edited = build_review_decision(
            task,
            reviewer="josh",
            decision="edit",
            approved_fields={
                "schedule": {
                    "raw_value": "Daily at 7:30pm",
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "19:30",
                        "timezone": "America/New_York",
                    },
                }
            },
            reason="RapidOCR matched the visible crop; primary OCR read 1:30pm.",
            decided_at="2026-06-28T12:00:00Z",
        )
        rejected = build_review_decision(
            {
                **task,
                "task_id": "cand-reject-rule",
                "field_crop": "",
                "field_crop_sha256": "",
                "candidate": {"candidate_id": "cand-reject-rule", "calendar_group_key": "boardwalk"},
            },
            reviewer="josh",
            decision="reject",
            reason="The field crop does not contain enough evidence for an auto-publish rule.",
            decided_at="2026-06-28T12:01:00Z",
        )
        source_parser_reject = build_review_decision(
            {
                "task_id": "source-parser-error-source-doc-parser",
                "task_type": "parser_error",
                "field": None,
                "source_document_id": "source-doc-parser",
                "content_sha256": "sourcehash-parser",
                "calendar_group_key": "boardwalk",
                "candidate_type": "source",
                "validation_findings": ["region_segmentation_failed"],
                "snapshot_path": "snapshots/sourcehash-parser.vision.json",
                "source_metadata": {
                    "source_kind": "official_pdf",
                    "source_role": "resort_pdf",
                    "canonical_url": "https://example.com/official-calendar.pdf",
                    "fetched_url": "https://cdn.example.com/official-calendar.pdf",
                    "http_status": 200,
                    "currentness": "current",
                    "captured_at": "2026-06-28T12:00:00+00:00",
                },
                "source_status": {
                    "source_document_id": "source-doc-parser",
                    "content_sha256": "sourcehash-parser",
                    "status": "parser_error",
                    "message": "region_segmentation_failed",
                },
            },
            reviewer="josh",
            decision="reject",
            reason="Parser failed before producing reviewable regions.",
            decided_at="2026-06-28T12:02:00Z",
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "parser_rule_update_requests.json"
            decisions_path.write_text(json.dumps([edited, rejected, source_parser_reject, {"decision": "edit"}]))

            report = review_schema_v3.export_parser_rule_update_requests(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(4, report["summary"]["decision_count"])
        self.assertEqual(3, report["summary"]["parser_rule_update_request_count"])
        self.assertEqual(1, report["summary"]["skipped_invalid_review_decision_count"])
        self.assertEqual("parser_rule_update_requests_v3", payload["request_kind"])
        self.assertEqual("cand-parser-rule", payload["requests"][0]["candidate_id"])
        self.assertEqual("ocr_disagreement", payload["requests"][0]["task_type"])
        self.assertEqual("schedule", payload["requests"][0]["field"])
        self.assertEqual(["engine_disagreement:schedule"], payload["requests"][0]["validation_findings"])
        self.assertEqual("schedulecrop", payload["requests"][0]["field_crop_sha256"])
        self.assertEqual("Daily at 7:30pm", payload["requests"][0]["approved_fields"]["schedule"]["raw_value"])
        self.assertEqual(
            "boardwalk:poolside-activities",
            payload["requests"][0]["existing_gold_comparison"]["match_key"],
        )
        self.assertEqual("reject", payload["requests"][1]["decision"])
        self.assertEqual("source-parser-error-source-doc-parser", payload["requests"][2]["task_id"])
        self.assertEqual("parser_error", payload["requests"][2]["task_type"])
        self.assertEqual("snapshots/sourcehash-parser.vision.json", payload["requests"][2]["snapshot_path"])
        self.assertEqual(
            "https://example.com/official-calendar.pdf",
            payload["requests"][2]["source_metadata"]["canonical_url"],
        )
        self.assertEqual("parser_error", payload["requests"][2]["source_status"]["status"])

    def test_review_schema_exports_dual_run_review_keys_from_review_decisions(self) -> None:
        diff_task = {
            "task_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
            "task_type": "gold_conflict",
            "field": "schedule",
            "source_document_id": "source-doc-1",
            "content_sha256": "sourcehash",
            "page_image": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "schedulecrop",
            "candidate_type": "dual_run_diff",
            "calendar_group_key": "boardwalk",
            "dual_run_diff": {
                "diff_key": "boardwalk:poolside-activities:schedule",
                "field": "schedule",
            },
        }
        approved_diff = build_review_decision(
            diff_task,
            reviewer="josh",
            decision="approve",
            approved_fields={
                "schedule": {
                    "raw_value": "Daily at 2:30pm",
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "14:30",
                        "timezone": "America/New_York",
                    },
                }
            },
            reason="Visible in the v3 crop.",
            decided_at="2026-06-28T12:00:00Z",
        )
        approved_status_transition = {
            "schema_version": "review_decision_v3_001",
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "candidate_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "candidate_type": "dual_run_status_transition",
            "calendar_group_key": "boardwalk",
            "content_sha256": "sourcehash",
            "reviewer": "josh",
            "decision": "approve",
            "approved_fields": {},
            "reason": "Reviewed the transition and confirmed evidence changed outside the parser output.",
            "decided_at": "2026-06-28T12:01:00Z",
            "original_task": {
                "content_sha256": "sourcehash",
                "task_type": "manual_review_required",
                "field": "status_transition",
                "dual_run_status_transition": {
                    "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable"
                },
            },
        }
        rejected_diff = {
            **approved_diff,
            "task_id": "dual-run-diff-rejected",
            "decision": "reject",
        }

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "dual_run_review_keys.json"
            decisions_path.write_text(json.dumps([approved_diff, approved_status_transition, rejected_diff, {}]))

            report = review_schema_v3.export_dual_run_review_keys(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(4, report["summary"]["decision_count"])
        self.assertEqual(1, report["summary"]["reviewed_diff_key_count"])
        self.assertEqual(1, report["summary"]["reviewed_status_transition_key_count"])
        self.assertEqual(1, report["summary"]["skipped_non_approval_count"])
        self.assertEqual(1, report["summary"]["skipped_invalid_review_decision_count"])
        self.assertEqual(["boardwalk:poolside-activities:schedule"], payload["reviewed_diff_keys"])
        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            payload["reviewed_status_transition_keys"],
        )
        self.assertEqual(
            {
                "key": "boardwalk:poolside-activities:schedule",
                "task_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
                "content_sha256": "sourcehash",
                "reviewer": "josh",
                "decided_at": "2026-06-28T12:00:00Z",
                "decision": "approve",
                "reason": "Visible in the v3 crop.",
            },
            payload["reviewed_diff_reviews"][0],
        )
        self.assertEqual(
            {
                "key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
                "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
                "content_sha256": "sourcehash",
                "reviewer": "josh",
                "decided_at": "2026-06-28T12:01:00Z",
                "decision": "approve",
                "reason": "Reviewed the transition and confirmed evidence changed outside the parser output.",
            },
            payload["reviewed_status_transition_reviews"][0],
        )

    def test_review_schema_rejects_stale_dual_run_review_key_decisions(self) -> None:
        stale_diff_decision = {
            "schema_version": "review_decision_v3_001",
            "task_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
            "task_type": "gold_conflict",
            "candidate_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
            "candidate_type": "dual_run_diff",
            "calendar_group_key": "boardwalk",
            "content_sha256": "oldhash",
            "page_image_sha256": "pagehash",
            "field_crop": "schedule.png",
            "field_crop_sha256": "schedulecrop",
            "reviewer": "josh",
            "decision": "approve",
            "approved_fields": {
                "schedule": {
                    "normalized_value": {
                        "schedule_type": "recurring",
                        "days_of_week": ALL_DAYS,
                        "start_time": "14:30",
                    }
                }
            },
            "reason": "Reviewed against stale source hash.",
            "decided_at": "2026-06-28T12:00:00Z",
            "original_task": {
                "content_sha256": "newhash",
                "dual_run_diff": {
                    "diff_key": "boardwalk:poolside-activities:schedule",
                    "field": "schedule",
                },
            },
        }
        stale_status_transition_decision = {
            "schema_version": "review_decision_v3_001",
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "candidate_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "candidate_type": "dual_run_status_transition",
            "calendar_group_key": "boardwalk",
            "content_sha256": "oldhash",
            "reviewer": "josh",
            "decision": "approve",
            "approved_fields": {},
            "reason": "Reviewed stale transition.",
            "decided_at": "2026-06-28T12:01:00Z",
            "original_task": {
                "content_sha256": "newhash",
                "task_type": "manual_review_required",
                "field": "status_transition",
                "dual_run_status_transition": {
                    "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable"
                },
            },
        }

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "dual_run_review_keys.json"
            decisions_path.write_text(json.dumps([stale_diff_decision, stale_status_transition_decision]))

            report = review_schema_v3.export_dual_run_review_keys(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(2, report["summary"]["decision_count"])
        self.assertEqual(0, report["summary"]["reviewed_diff_key_count"])
        self.assertEqual(0, report["summary"]["reviewed_status_transition_key_count"])
        self.assertEqual(2, report["summary"]["skipped_stale_review_decision_count"])
        self.assertEqual([], payload["reviewed_diff_keys"])
        self.assertEqual([], payload["reviewed_status_transition_keys"])

    def test_review_schema_rejects_dual_run_review_keys_without_task_hash(self) -> None:
        missing_task_hash_decision = {
            "schema_version": "review_decision_v3_001",
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "candidate_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "candidate_type": "dual_run_status_transition",
            "calendar_group_key": "boardwalk",
            "content_sha256": "sourcehash",
            "reviewer": "josh",
            "decision": "approve",
            "approved_fields": {},
            "reason": "Reviewed transition without original task hash.",
            "decided_at": "2026-06-28T12:00:00Z",
            "original_task": {
                "task_type": "manual_review_required",
                "field": "status_transition",
                "dual_run_status_transition": {
                    "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable"
                },
            },
        }

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "dual_run_review_keys.json"
            decisions_path.write_text(json.dumps([missing_task_hash_decision]))

            report = review_schema_v3.export_dual_run_review_keys(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(1, report["summary"]["decision_count"])
        self.assertEqual(0, report["summary"]["reviewed_status_transition_key_count"])
        self.assertEqual(1, report["summary"]["skipped_missing_review_hash_count"])
        self.assertEqual([], payload["reviewed_status_transition_keys"])

    def test_review_schema_builds_hash_bound_status_transition_approval(self) -> None:
        task = {
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "field": "status_transition",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "dual_run_status_transition",
            "dual_run_status_transition": {
                "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
                "from_status": "needs_review",
                "to_status": "auto_publishable",
            },
        }

        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the status transition against the source hash and accepted it.",
            decided_at="2026-06-28T12:00:00Z",
        )

        review_schema_v3.validate_review_decision(decision)
        self.assertEqual("approve", decision["decision"])
        self.assertEqual("sourcehash", decision["content_sha256"])
        self.assertEqual({}, decision["approved_fields"])
        self.assertEqual(task["dual_run_status_transition"], decision["original_task"]["dual_run_status_transition"])

    def test_review_schema_exports_hash_bound_new_record_approval(self) -> None:
        task = {
            "task_id": "dual-run-new-boardwalk-poolside-activities-new-record",
            "task_type": "manual_review_required",
            "field": "new_record",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "dual_run_new_record",
            "dual_run_new_record": {
                "review_key": "boardwalk:poolside-activities:new_record",
                "row_key": "boardwalk:poolside-activities",
                "canonical_slug": "poolside-activities",
                "calendar_group_key": "boardwalk",
                "content_sha256": "sourcehash",
            },
        }

        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the new V3 row against the source hash and accepted it.",
            decided_at="2026-06-28T12:00:00Z",
        )

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "dual_run_review_keys.json"
            decisions_path.write_text(json.dumps([decision]))

            report = review_schema_v3.export_dual_run_review_keys(
                decisions_path=decisions_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual("approve", decision["decision"])
        self.assertEqual("sourcehash", decision["content_sha256"])
        self.assertEqual({}, decision["approved_fields"])
        self.assertEqual(1, report["summary"]["reviewed_new_record_key_count"])
        self.assertEqual(["boardwalk:poolside-activities:new_record"], payload["reviewed_new_record_keys"])
        self.assertEqual(
            [
                {
                    "key": "boardwalk:poolside-activities:new_record",
                    "task_id": "dual-run-new-boardwalk-poolside-activities-new-record",
                    "content_sha256": "sourcehash",
                    "reviewer": "josh",
                    "decided_at": "2026-06-28T12:00:00Z",
                    "decision": "approve",
                    "reason": "Reviewed the new V3 row against the source hash and accepted it.",
                }
            ],
            payload["reviewed_new_record_reviews"],
        )

    def test_review_schema_excludes_non_field_gate_approvals_from_fixture_and_parser_exports(self) -> None:
        status_transition_task = {
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "field": "status_transition",
            "content_sha256": "sourcehash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "dual_run_status_transition",
            "dual_run_status_transition": {
                "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
            },
        }
        source_drift_task = {
            "task_id": "source-drift-boardwalk-blocker-activity-count-drift",
            "task_type": "source_changed",
            "field": None,
            "content_sha256": "newhash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "source_drift",
            "source_drift": {"publish_blocker": "activity_count_drift"},
            "source_drift_report": {"status": "review_required", "new_hash": "newhash"},
        }
        status_transition_decision = build_review_decision(
            status_transition_task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the status transition.",
            decided_at="2026-06-28T12:00:00Z",
        )
        source_drift_decision = build_review_decision(
            source_drift_task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the source drift.",
            decided_at="2026-06-28T12:01:00Z",
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            fixture_output_path = root / "fixture_candidates.json"
            parser_output_path = root / "parser_rule_requests.json"
            decisions_path.write_text(json.dumps([status_transition_decision, source_drift_decision]))

            fixture_report = review_schema_v3.export_review_fixture_candidates(
                decisions_path=decisions_path,
                output_path=fixture_output_path,
            )
            parser_report = review_schema_v3.export_parser_rule_update_requests(
                decisions_path=decisions_path,
                output_path=parser_output_path,
            )
            fixture_payload = json.loads(fixture_output_path.read_text())
            parser_payload = json.loads(parser_output_path.read_text())

        self.assertEqual(0, fixture_report["summary"]["fixture_candidate_count"])
        self.assertEqual(2, fixture_report["summary"]["skipped_non_fixture_approval_count"])
        self.assertEqual([], fixture_payload["candidates"])
        self.assertEqual(0, parser_report["summary"]["parser_rule_update_request_count"])
        self.assertEqual(2, parser_report["summary"]["skipped_non_parser_rule_decision_count"])
        self.assertEqual([], parser_payload["requests"])

    def test_review_schema_builds_hash_bound_source_drift_approval(self) -> None:
        task = {
            "task_id": "source-drift-boardwalk-blocker-activity-count-drift",
            "task_type": "source_changed",
            "field": None,
            "content_sha256": "newhash",
            "calendar_group_key": "boardwalk",
            "candidate_type": "source_drift",
            "validation_findings": ["source_changed:activity_count_drift"],
            "source_drift": {"publish_blocker": "activity_count_drift"},
            "source_drift_report": {
                "status": "review_required",
                "old_hash": "oldhash",
                "new_hash": "newhash",
                "publish_blockers": ["activity_count_drift"],
            },
        }

        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the quarterly source drift and accepted the count change.",
            decided_at="2026-06-28T12:00:00Z",
        )

        review_schema_v3.validate_review_decision(decision)
        self.assertEqual("approve", decision["decision"])
        self.assertEqual("newhash", decision["content_sha256"])
        self.assertEqual({}, decision["approved_fields"])
        self.assertEqual(task["source_drift"], decision["original_task"]["source_drift"])

    def test_review_schema_exports_reviewed_source_drift_report_from_approved_decisions(self) -> None:
        source_drift_report = {
            "report_kind": "v3_quarter_source_drift",
            "quarter": "fy26-q4",
            "status": "review_required",
            "publish_blockers": ["activity_count_drift"],
            "source_reports": [
                {
                    "calendar_group_key": "boardwalk",
                    "status": "review_required",
                    "old_hash": "oldhash",
                    "new_hash": "newhash",
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 1:30pm",
                            "new": "Daily at 2:30pm",
                        }
                    ],
                    "publish_blockers": ["activity_count_drift"],
                }
            ],
        }
        source_drift_tasks = build_review_tasks([], source_drift_report=source_drift_report)
        decisions = [
            build_review_decision(
                task,
                reviewer="josh",
                decision="approve",
                reason=f"Reviewed {task['task_id']}.",
                decided_at=f"2026-06-28T12:0{index}:00Z",
            )
            for index, task in enumerate(source_drift_tasks)
        ]

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            source_drift_path = root / "source_drift_report.json"
            output_path = root / "reviewed_source_drift_report.json"
            decisions_path.write_text(json.dumps(decisions))
            source_drift_path.write_text(json.dumps(source_drift_report))

            report = review_schema_v3.export_reviewed_source_drift_report(
                decisions_path=decisions_path,
                source_drift_report_path=source_drift_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(2, report["summary"]["required_source_drift_task_count"])
        self.assertEqual(2, report["summary"]["reviewed_source_drift_task_count"])
        self.assertEqual(0, report["summary"]["missing_source_drift_task_count"])
        self.assertEqual("reviewed", payload["status"])
        self.assertEqual("manual_review_approved", payload["review_status"])
        self.assertEqual("approve", payload["review_decision"]["decision"])
        self.assertEqual("josh", payload["review_decision"]["reviewer"])
        self.assertEqual(
            [task["task_id"] for task in source_drift_tasks],
            payload["reviewed_source_drift_task_ids"],
        )
        self.assertEqual([], payload["missing_source_drift_task_ids"])

    def test_review_schema_rejects_stale_source_drift_review_decisions(self) -> None:
        source_drift_report = {
            "status": "review_required",
            "calendar_group_key": "boardwalk",
            "new_hash": "newhash",
            "publish_blockers": ["source_hash_changed"],
        }
        [task] = build_review_tasks([], source_drift_report=source_drift_report)
        stale_decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed old source drift task.",
            decided_at="2026-06-28T12:00:00Z",
        )
        stale_decision["content_sha256"] = "oldhash"

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            source_drift_path = root / "source_drift_report.json"
            output_path = root / "reviewed_source_drift_report.json"
            decisions_path.write_text(json.dumps([stale_decision]))
            source_drift_path.write_text(json.dumps(source_drift_report))

            report = review_schema_v3.export_reviewed_source_drift_report(
                decisions_path=decisions_path,
                source_drift_report_path=source_drift_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(1, report["summary"]["required_source_drift_task_count"])
        self.assertEqual(0, report["summary"]["reviewed_source_drift_task_count"])
        self.assertEqual(1, report["summary"]["missing_source_drift_task_count"])
        self.assertEqual(1, report["summary"]["skipped_stale_review_decision_count"])
        self.assertEqual("review_required", payload["status"])
        self.assertEqual([], payload["reviewed_source_drift_task_ids"])
        self.assertEqual([task["task_id"]], payload["missing_source_drift_task_ids"])

    def test_review_schema_rejects_source_drift_review_bound_to_wrong_source_document(self) -> None:
        source_drift_report = {
            "report_kind": "v3_quarter_source_drift",
            "quarter": "fy26-q4",
            "status": "review_required",
            "publish_blockers": ["source_hash_changed"],
            "source_reports": [
                {
                    "calendar_group_key": "boardwalk",
                    "source_document_id": "source-doc-a",
                    "status": "review_required",
                    "old_hash": "oldhash",
                    "new_hash": "newhash",
                    "changed_schedules": [
                        {
                            "canonical_slug": "poolside-activities",
                            "title": "Poolside Activities",
                            "old": "Daily at 1:30pm",
                            "new": "Daily at 2:30pm",
                        }
                    ],
                    "publish_blockers": [],
                }
            ],
        }
        [task] = build_review_tasks([], source_drift_report=source_drift_report)
        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed the source drift task.",
            decided_at="2026-06-28T12:00:00Z",
        )
        decision["source_document_id"] = "source-doc-b"
        decision["original_task"] = {
            **decision["original_task"],
            "source_document_id": "source-doc-b",
        }

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            source_drift_path = root / "source_drift_report.json"
            output_path = root / "reviewed_source_drift_report.json"
            decisions_path.write_text(json.dumps([decision]))
            source_drift_path.write_text(json.dumps(source_drift_report))

            report = review_schema_v3.export_reviewed_source_drift_report(
                decisions_path=decisions_path,
                source_drift_report_path=source_drift_path,
                output_path=output_path,
            )

            payload = json.loads(output_path.read_text())

        self.assertEqual(1, report["summary"]["required_source_drift_task_count"])
        self.assertEqual(0, report["summary"]["reviewed_source_drift_task_count"])
        self.assertEqual(1, report["summary"]["missing_source_drift_task_count"])
        self.assertEqual(1, report["summary"]["skipped_stale_review_decision_count"])
        self.assertEqual("review_required", payload["status"])
        self.assertEqual([], payload["reviewed_source_drift_task_ids"])
        self.assertEqual([task["task_id"]], payload["missing_source_drift_task_ids"])

    def test_review_schema_cli_can_export_dual_run_review_keys(self) -> None:
        decision = {
            "schema_version": "review_decision_v3_001",
            "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "task_type": "manual_review_required",
            "candidate_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
            "candidate_type": "dual_run_status_transition",
            "calendar_group_key": "boardwalk",
            "content_sha256": "sourcehash",
            "reviewer": "josh",
            "decision": "approve",
            "approved_fields": {},
            "reason": "Reviewed transition.",
            "decided_at": "2026-06-28T12:01:00Z",
            "original_task": {
                "content_sha256": "sourcehash",
                "dual_run_status_transition": {
                    "transition_key": "boardwalk:poolside-activities:needs_review_to_auto_publishable"
                }
            },
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            output_path = root / "dual_run_review_keys.json"
            decisions_path.write_text(json.dumps([decision]))

            with patch.object(
                sys,
                "argv",
                [
                    "review_schema_v3.py",
                    str(decisions_path),
                    "--export",
                    "dual-run-review-keys",
                    "--output",
                    str(output_path),
                ],
            ):
                review_schema_v3.main()

            payload = json.loads(output_path.read_text())

        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            payload["reviewed_status_transition_keys"],
        )

    def test_review_schema_cli_can_export_reviewed_source_drift_report(self) -> None:
        source_drift_report = {
            "status": "review_required",
            "calendar_group_key": "boardwalk",
            "new_hash": "newhash",
            "publish_blockers": ["activity_count_drift"],
        }
        [task] = build_review_tasks([], source_drift_report=source_drift_report)
        decision = build_review_decision(
            task,
            reviewer="josh",
            decision="approve",
            reason="Reviewed source drift.",
            decided_at="2026-06-28T12:00:00Z",
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            decisions_path = root / "review_decisions.json"
            source_drift_path = root / "source_drift_report.json"
            output_path = root / "reviewed_source_drift_report.json"
            decisions_path.write_text(json.dumps([decision]))
            source_drift_path.write_text(json.dumps(source_drift_report))

            with patch.object(
                sys,
                "argv",
                [
                    "review_schema_v3.py",
                    str(decisions_path),
                    "--export",
                    "reviewed-source-drift-report",
                    "--source-drift-report",
                    str(source_drift_path),
                    "--output",
                    str(output_path),
                ],
            ):
                review_schema_v3.main()

            payload = json.loads(output_path.read_text())

        self.assertEqual("reviewed", payload["status"])
        self.assertEqual([task["task_id"]], payload["reviewed_source_drift_task_ids"])

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
                    "field_evidence": {
                        "schedule": {
                            "source": {
                                "content_sha256": "sourcehash",
                                "crop_sha256": "schedulecrop",
                            }
                        }
                    },
                    "validation_status": "auto_publishable",
                },
                {
                    "canonical_slug": "movie-under-the-stars",
                    "title": "Movie Under the Stars",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Tuesday at 8:30pm"},
                    "location": {"label": "Village Green Lawn"},
                    "price": {"state": "free"},
                    "field_evidence": {
                        "schedule": {
                            "source": {
                                "content_sha256": "moviehash",
                                "crop_sha256": "moviecrop",
                            }
                        }
                    },
                    "validation_status": "needs_review",
                },
            ],
            "summary": {"skipped_not_publishable": 1},
        }

        report = build_dual_run_report(v2_rows=v2_rows, v3_preview=v3_preview, reviewed_diff_keys=[])

        self.assertEqual("blocked", report["status"])
        self.assertRegex(report.get("generated_at", ""), r"^\d{4}-\d{2}-\d{2}T")
        self.assertEqual(2, report["v2_count"])
        self.assertEqual(2, report["v3_count"])
        self.assertEqual(["moviehash", "sourcehash"], report["v3_source_hashes"])
        self.assertRegex(report.get("v3_preview_fingerprint", ""), r"^[0-9a-f]{64}$")
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
                    "field_evidence": {
                        "schedule": {
                            "source": {"content_sha256": "sourcehash", "crop_sha256": "schedulecrop"}
                        }
                    },
                    "validation_status": "auto_publishable",
                }
            ],
            "summary": {"skipped_not_publishable": 0},
        }

        blocked = build_dual_run_report(v2_rows=[], v3_preview=v3_preview, reviewed_diff_keys=[])
        reviewed = build_dual_run_report(
            v2_rows=[],
            v3_preview=v3_preview,
            reviewed_new_record_reviews=[
                {
                    "key": "boardwalk:poolside-activities:new_record",
                    "content_sha256": "sourcehash",
                    "task_id": "dual-run-new-boardwalk-poolside-activities-new-record",
                    "reviewer": "josh",
                    "decided_at": "2026-06-28T12:00:00Z",
                    "decision": "approve",
                    "reason": "Reviewed new V3 row.",
                }
            ],
        )
        bare_key = build_dual_run_report(
            v2_rows=[],
            v3_preview=v3_preview,
            reviewed_diff_keys=["boardwalk:poolside-activities:new_record"],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["boardwalk:poolside-activities"], blocked["unreviewed_new_keys"])
        self.assertIn("unreviewed_new_v3_rows", blocked["publish_blockers"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual([], reviewed["unreviewed_new_keys"])
        self.assertEqual(["boardwalk:poolside-activities:new_record"], reviewed["reviewed_new_record_keys"])
        self.assertEqual("blocked", bare_key["status"])
        self.assertEqual(["boardwalk:poolside-activities"], bare_key["unreviewed_new_keys"])
        self.assertEqual([], bare_key["reviewed_new_record_keys"])

    def test_dual_run_report_requires_hash_bound_review_for_field_diff(self) -> None:
        v2_rows = [
            {
                "canonical_slug": "poolside-activities",
                "title": "Poolside Activities",
                "calendar_group_key": "boardwalk",
                "schedule": {"text": "Daily at 1:30pm"},
            }
        ]
        v3_preview = {
            "rows": [
                {
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Daily at 2:30pm"},
                    "validation_status": "auto_publishable",
                    "field_evidence": {"schedule": {"source": {"content_sha256": "sourcehash"}}},
                }
            ]
        }

        bare_key = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=v3_preview,
            reviewed_diff_keys=["boardwalk:poolside-activities:schedule"],
        )
        reviewed = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=v3_preview,
            reviewed_diff_reviews=[
                {
                    "key": "boardwalk:poolside-activities:schedule",
                    "content_sha256": "sourcehash",
                    "task_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
                    "reviewer": "josh",
                    "decided_at": "2026-06-28T12:00:00Z",
                    "decision": "approve",
                    "reason": "Reviewed schedule diff.",
                }
            ],
        )

        self.assertEqual("blocked", bare_key["status"])
        self.assertEqual(["boardwalk:poolside-activities:schedule"], bare_key["unreviewed_diff_keys"])
        self.assertEqual([], bare_key["reviewed_diff_keys"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual(["boardwalk:poolside-activities:schedule"], reviewed["reviewed_diff_keys"])

    def test_dual_run_report_blocks_needs_review_to_auto_publishable_without_new_evidence(self) -> None:
        previous_rows = [
            {
                "canonical_slug": "poolside-activities",
                "calendar_group_key": "boardwalk",
                "validation_status": "needs_review",
                "field_evidence": {
                    "schedule": {
                        "source": {
                            "content_sha256": "sourcehash",
                            "page_image_sha256": "pagehash",
                            "crop_sha256": "schedulecrop",
                            "bbox_px": [10, 20, 100, 40],
                        }
                    }
                },
            }
        ]
        current_preview = {
            "rows": [
                {
                    "canonical_slug": "poolside-activities",
                    "title": "Poolside Activities",
                    "calendar_group_key": "boardwalk",
                    "schedule": {"text": "Daily at 1:30pm"},
                    "location": {"label": "Luna Park Pool Deck"},
                    "price": {"state": "free"},
                    "validation_status": "auto_publishable",
                    "field_evidence": {
                        "schedule": {
                            "source": {
                                "content_sha256": "sourcehash",
                                "page_image_sha256": "pagehash",
                                "crop_sha256": "schedulecrop",
                                "bbox_px": [10, 20, 100, 40],
                            }
                        }
                    },
                }
            ]
        }
        changed_evidence_preview = {
            "rows": [
                {
                    **current_preview["rows"][0],
                    "field_evidence": {
                        "schedule": {
                            "source": {
                                "content_sha256": "sourcehash",
                                "page_image_sha256": "pagehash",
                                "crop_sha256": "new-schedulecrop",
                                "bbox_px": [10, 20, 100, 40],
                            }
                        }
                    },
                }
            ]
        }
        v2_rows = [
            {
                "canonical_slug": "poolside-activities",
                "calendar_group_key": "boardwalk",
                "title": "Poolside Activities",
                "schedule": {"text": "Daily at 1:30pm"},
                "location": {"label": "Luna Park Pool Deck"},
                "price": {"state": "free"},
            }
        ]

        blocked = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=current_preview,
            previous_v3_rows=previous_rows,
            reviewed_status_transition_keys=["boardwalk:poolside-activities:new_record"],
        )
        evidence_changed = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=changed_evidence_preview,
            previous_v3_rows=previous_rows,
            reviewed_status_transition_keys=["boardwalk:poolside-activities:new_record"],
        )
        reviewed = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=current_preview,
            previous_v3_rows=previous_rows,
            reviewed_status_transition_reviews=[
                {
                    "key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
                    "content_sha256": "sourcehash",
                    "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
                    "reviewer": "josh",
                    "decided_at": "2026-06-28T12:00:00Z",
                    "decision": "approve",
                    "reason": "Reviewed status transition.",
                }
            ],
        )
        bare_key = build_dual_run_report(
            v2_rows=v2_rows,
            v3_preview=current_preview,
            previous_v3_rows=previous_rows,
            reviewed_status_transition_keys=["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            blocked["unreviewed_status_transition_keys"],
        )
        self.assertIn("unreviewed_v3_status_transitions", blocked["publish_blockers"])
        self.assertEqual("clean", evidence_changed["status"])
        self.assertEqual([], evidence_changed["unreviewed_status_transition_keys"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual("blocked", bare_key["status"])
        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            bare_key["unreviewed_status_transition_keys"],
        )
        self.assertEqual([], bare_key["reviewed_status_transition_keys"])

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
                                "field_evidence": {
                                    "schedule": {
                                        "source": {
                                            "content_sha256": "sourcehash",
                                            "page_image_sha256": "pagehash",
                                            "crop_sha256": "schedulecrop",
                                        }
                                    }
                                },
                            }
                        ]
                    }
                )
            )
            reviewed_path.write_text(
                json.dumps(
                    {
                        "reviewed_diff_reviews": [
                            {
                                "key": "boardwalk:poolside-activities:schedule",
                                "content_sha256": "sourcehash",
                                "task_id": "dual-run-diff-boardwalk-poolside-activities-schedule",
                                "reviewer": "josh",
                                "decided_at": "2026-06-28T12:00:00Z",
                                "decision": "approve",
                                "reason": "Reviewed schedule diff.",
                            }
                        ]
                    }
                )
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

    def test_dual_run_report_cli_rejects_bare_reviewed_diff_keys_file(self) -> None:
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
                                "validation_status": "auto_publishable",
                                "field_evidence": {
                                    "schedule": {"source": {"content_sha256": "sourcehash"}}
                                },
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

        self.assertEqual("blocked", report["status"])
        self.assertEqual([], report["reviewed_diff_keys"])
        self.assertEqual(["boardwalk:poolside-activities:schedule"], report["unreviewed_diff_keys"])

    def test_dual_run_report_cli_loads_previous_v3_and_reviewed_status_transitions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            v2_path = root / "v2.json"
            v3_path = root / "v3.json"
            previous_v3_path = root / "previous_v3.json"
            reviewed_transitions_path = root / "reviewed_transitions.json"
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
            previous_v3_path.write_text(
                json.dumps(
                    [
                        {
                            "canonical_slug": "poolside-activities",
                            "calendar_group_key": "boardwalk",
                            "validation_status": "needs_review",
                            "field_evidence": {
                                "schedule": {
                                    "source": {
                                        "content_sha256": "sourcehash",
                                        "page_image_sha256": "pagehash",
                                        "crop_sha256": "schedulecrop",
                                    }
                                }
                            },
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
                                "schedule": {"text": "Daily at 1:30pm"},
                                "location": {"label": "Luna Park Pool Deck"},
                                "price": {"state": "free"},
                                "validation_status": "auto_publishable",
                                "field_evidence": {
                                    "schedule": {
                                        "source": {
                                            "content_sha256": "sourcehash",
                                            "page_image_sha256": "pagehash",
                                            "crop_sha256": "schedulecrop",
                                        }
                                    }
                                },
                            }
                        ]
                    }
                )
            )
            reviewed_transitions_path.write_text(
                json.dumps(
                    {
                        "reviewed_status_transition_reviews": [
                            {
                                "key": "boardwalk:poolside-activities:needs_review_to_auto_publishable",
                                "content_sha256": "sourcehash",
                                "task_id": "dual-run-status-boardwalk-poolside-activities-needs-review-to-auto-publishable",
                                "reviewer": "josh",
                                "decided_at": "2026-06-28T12:00:00Z",
                                "decision": "approve",
                                "reason": "Reviewed status transition.",
                            }
                        ]
                    }
                )
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
                    "--previous-v3",
                    str(previous_v3_path),
                    "--reviewed-status-transition-keys-file",
                    str(reviewed_transitions_path),
                    "--output",
                    str(output_path),
                ],
            ):
                v3_dual_run_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("clean", report["status"])
        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            report["reviewed_status_transition_keys"],
        )
        self.assertEqual([], report["unreviewed_status_transition_keys"])

    def test_dual_run_report_cli_rejects_bare_reviewed_status_transition_keys_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            v2_path = root / "v2.json"
            v3_path = root / "v3.json"
            previous_v3_path = root / "previous_v3.json"
            reviewed_transitions_path = root / "reviewed_transitions.json"
            output_path = root / "dual_run.json"
            v2_path.write_text(json.dumps([]))
            previous_v3_path.write_text(
                json.dumps(
                    [
                        {
                            "canonical_slug": "poolside-activities",
                            "calendar_group_key": "boardwalk",
                            "validation_status": "needs_review",
                            "field_evidence": {
                                "schedule": {
                                    "source": {
                                        "content_sha256": "sourcehash",
                                        "page_image_sha256": "pagehash",
                                        "crop_sha256": "schedulecrop",
                                    }
                                }
                            },
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
                                "calendar_group_key": "boardwalk",
                                "validation_status": "auto_publishable",
                                "field_evidence": {
                                    "schedule": {
                                        "source": {
                                            "content_sha256": "sourcehash",
                                            "page_image_sha256": "pagehash",
                                            "crop_sha256": "schedulecrop",
                                        }
                                    }
                                },
                            }
                        ]
                    }
                )
            )
            reviewed_transitions_path.write_text(
                json.dumps(
                    {
                        "reviewed_status_transition_keys": [
                            "boardwalk:poolside-activities:needs_review_to_auto_publishable"
                        ]
                    }
                )
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
                    "--previous-v3",
                    str(previous_v3_path),
                    "--reviewed-status-transition-keys-file",
                    str(reviewed_transitions_path),
                    "--output",
                    str(output_path),
                ],
            ):
                v3_dual_run_report.main()

            report = json.loads(output_path.read_text())

        self.assertEqual("blocked", report["status"])
        self.assertEqual([], report["reviewed_status_transition_keys"])
        self.assertEqual(
            ["boardwalk:poolside-activities:needs_review_to_auto_publishable"],
            report["unreviewed_status_transition_keys"],
        )

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
            review_tasks=[
                {"source_document_id": "source-doc-3", "task_type": "source_error"},
            ],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["source-doc-2"], blocked["source_coverage"]["unprocessed_source_ids"])
        self.assertEqual(["source-doc-3"], blocked["source_coverage"]["source_error_ids"])
        self.assertIn("v3_unprocessed_sources", blocked["publish_blockers"])
        self.assertEqual("clean", clean["status"])
        self.assertEqual([], clean["source_coverage"]["unprocessed_source_ids"])

    def test_dual_run_report_ignores_deterministic_field_normalization_diffs(self) -> None:
        report = build_dual_run_report(
            v2_rows=[
                {
                    "calendar_group_key": "all-star-music",
                    "canonical_slug": "mickey-tie-dye",
                    "title": "Mickey Tie-Dye",
                    "schedule": {"text": "Friday at 9:00am"},
                    "location": {"label": "Note’able Games Arcade"},
                    "price": {"state": "fee"},
                }
            ],
            v3_preview={
                "rows": [
                    {
                        "calendar_group_key": "all-star-music",
                        "canonical_slug": "mickey-tie-dye",
                        "title": "mickey tie-dye ($)",
                        "schedule": {"text": "Friday at 9:O0am"},
                        "location": {"label": "Note'able Games Arcade"},
                        "price": {"state": "fee"},
                        "field_evidence": {
                            field: {"source": {"content_sha256": "sourcehash"}}
                            for field in ("title", "schedule", "location", "price")
                        },
                    }
                ]
            },
        )

        self.assertEqual([], report["field_diffs"])
        self.assertNotIn("unreviewed_v2_v3_field_diffs", report["publish_blockers"])

    def test_dual_run_report_counts_source_inventory_ids_as_expected_sources(self) -> None:
        report = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=[
                {
                    "source_id": "source-doc-1",
                    "content_sha256": "source-hash",
                    "calendar_group_key": "boardwalk",
                }
            ],
            v3_source_statuses=[
                {
                    "source_document_id": "source-doc-1",
                    "content_sha256": "source-hash",
                    "status": "processed",
                }
            ],
        )

        self.assertEqual("clean", report["status"])
        self.assertEqual(1, report["source_coverage"]["expected_source_count"])
        self.assertEqual(1, report["source_coverage"]["processed_source_count"])
        self.assertEqual([], report["source_coverage"]["unprocessed_source_ids"])

    def test_dual_run_report_filters_expected_sources_to_quarter_visual_resort_documents(self) -> None:
        report = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=[
                {
                    "source_document_id": "source-doc-q3",
                    "content_sha256": "hash-q3",
                    "currentness": "current",
                    "source_kind": "official_pdf",
                    "source_role": "resort_pdf",
                    "source_type": "pdf",
                    "source_pdf_edition": "fy26-q3-0526",
                },
                {
                    "source_document_id": "source-doc-html",
                    "content_sha256": "hash-html",
                    "currentness": "current",
                    "source_kind": "official_html",
                    "source_role": "parent_activity_detail",
                },
                {
                    "source_document_id": "source-doc-q4",
                    "content_sha256": "hash-q4",
                    "currentness": "current",
                    "source_kind": "official_pdf",
                    "source_role": "resort_pdf",
                    "source_type": "pdf",
                    "source_pdf_edition": "fy26-q4-0826",
                },
            ],
            v3_source_statuses=[
                {
                    "source_document_id": "source-doc-q3",
                    "content_sha256": "hash-q3",
                    "status": "processed",
                }
            ],
            quarter="fy26-q3",
        )

        self.assertEqual("clean", report["status"])
        self.assertEqual(1, report["source_coverage"]["expected_source_count"])
        self.assertEqual(1, report["source_coverage"]["processed_source_count"])
        self.assertEqual([], report["source_coverage"]["unprocessed_source_ids"])

    def test_dual_run_report_blocks_stale_source_status_hashes(self) -> None:
        report = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=[
                {
                    "source_document_id": "source-doc-1",
                    "content_sha256": "new-source-hash",
                    "calendar_group_key": "boardwalk",
                }
            ],
            v3_source_statuses=[
                {
                    "source_document_id": "source-doc-1",
                    "content_sha256": "old-source-hash",
                    "status": "processed",
                }
            ],
        )

        self.assertEqual("blocked", report["status"])
        self.assertEqual(["source-doc-1"], report["source_coverage"]["stale_source_status_ids"])
        self.assertEqual(["source-doc-1"], report["source_coverage"]["unprocessed_source_ids"])
        self.assertIn("v3_stale_source_status_hash", report["publish_blockers"])
        self.assertIn("v3_unprocessed_sources", report["publish_blockers"])

    def test_dual_run_report_surfaces_stale_source_status_config_hashes(self) -> None:
        report = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=[
                {
                    "source_document_id": "source-doc-config",
                    "content_sha256": "source-hash",
                    "config_hash": "config-current",
                    "calendar_group_key": "boardwalk",
                }
            ],
            v3_source_statuses=[
                {
                    "source_document_id": "source-doc-config",
                    "content_sha256": "source-hash",
                    "config_hash": "config-current",
                    "snapshot_config_hash": "config-old",
                    "status": "unprocessed",
                    "message": "stale_v3_snapshot_config_hash",
                }
            ],
        )

        self.assertEqual("blocked", report["status"])
        self.assertEqual(["source-doc-config"], report["source_coverage"]["stale_source_status_config_ids"])
        self.assertEqual(["source-doc-config"], report["source_coverage"]["unprocessed_source_ids"])
        self.assertIn("v3_stale_source_status_config_hash", report["publish_blockers"])
        self.assertIn("v3_unprocessed_sources", report["publish_blockers"])

    def test_dual_run_report_surfaces_stale_source_status_pipeline_versions(self) -> None:
        report = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=[
                {
                    "source_document_id": "source-doc-pipeline",
                    "content_sha256": "source-hash",
                    "config_hash": "config-current",
                    "pipeline_version": "vision_v3_002",
                    "calendar_group_key": "boardwalk",
                }
            ],
            v3_source_statuses=[
                {
                    "source_document_id": "source-doc-pipeline",
                    "content_sha256": "source-hash",
                    "config_hash": "config-current",
                    "pipeline_version": "vision_v3_002",
                    "snapshot_pipeline_version": "vision_v3_001",
                    "status": "unprocessed",
                    "message": "stale_v3_snapshot_pipeline_version",
                }
            ],
        )

        self.assertEqual("blocked", report["status"])
        self.assertEqual(["source-doc-pipeline"], report["source_coverage"]["stale_source_status_pipeline_ids"])
        self.assertEqual(["source-doc-pipeline"], report["source_coverage"]["unprocessed_source_ids"])
        self.assertIn("v3_stale_source_status_pipeline_version", report["publish_blockers"])
        self.assertIn("v3_unprocessed_sources", report["publish_blockers"])

    def test_source_status_v3_maps_expected_sources_to_processed_error_or_unprocessed(self) -> None:
        expected_sources = [
            {
                "source_id": "source-doc-1",
                "content_sha256": "hash-1",
                "calendar_group_key": "boardwalk",
                "source_type": "image",
                "mime_type": "image/jpeg",
                "detected_content_type": "image/jpeg",
                "file_extension": ".jpg",
                "raw_page_count": 1,
                "raw_width": 1200,
                "raw_height": 800,
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
        self.assertEqual("image", statuses[0]["source_type"])
        self.assertEqual("image/jpeg", statuses[0]["mime_type"])
        self.assertEqual("image/jpeg", statuses[0]["detected_content_type"])
        self.assertEqual(".jpg", statuses[0]["file_extension"])
        self.assertEqual(1, statuses[0]["raw_page_count"])
        self.assertEqual(1200, statuses[0]["raw_width"])
        self.assertEqual(800, statuses[0]["raw_height"])
        self.assertEqual("download failed", statuses[1]["message"])
        self.assertEqual("missing_v3_snapshot", statuses[2]["message"])

    def test_source_status_v3_directory_loader_records_snapshot_file_path(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            expected_path = root / "source_inventory.json"
            snapshots_dir = root / "vision_snapshots"
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
            snapshot_path = snapshots_dir / "hash-1.vision.json"
            snapshot_path.write_text(
                json.dumps(
                    {
                        "source_sha256": "hash-1",
                        "status": "ocr_complete",
                        "quality": {"ocr_success": True},
                    }
                )
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

        self.assertEqual(str(snapshot_path), statuses[0]["snapshot_path"])

    def test_source_status_v3_filters_expected_sources_and_snapshots_by_quarter(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-q3",
                    "content_sha256": "hash-q3",
                    "calendar_group_key": "boardwalk",
                    "edition": "fy26-q3",
                },
                {
                    "source_document_id": "source-doc-q4",
                    "content_sha256": "hash-q4",
                    "calendar_group_key": "boardwalk",
                    "edition": "fy26-q4",
                },
            ],
            snapshots=[
                {
                    "source_sha256": "hash-q3",
                    "edition": "fy26-q3",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/hash-q3.vision.json",
                },
                {
                    "source_sha256": "hash-q4",
                    "edition": "fy26-q4",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/hash-q4.vision.json",
                },
            ],
            quarter="fy26-q4",
        )

        self.assertEqual(1, len(statuses))
        self.assertEqual("source-doc-q4", statuses[0]["source_document_id"])
        self.assertEqual("processed", statuses[0]["status"])

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

    def test_source_status_v3_treats_failed_ocr_snapshot_as_parser_error(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-ocr",
                    "content_sha256": "hash-ocr",
                    "calendar_group_key": "boardwalk",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-ocr",
                    "status": "ocr_complete",
                    "quality": {"ocr_success": False, "findings": ["missing_ocr_tokens"]},
                    "snapshot_path": "snapshots/hash-ocr.vision.json",
                }
            ],
        )

        self.assertEqual("parser_error", statuses[0]["status"])
        self.assertEqual("ocr_complete", statuses[0]["snapshot_status"])
        self.assertEqual("missing_ocr_tokens", statuses[0]["message"])

    def test_source_status_v3_preserves_source_error_snapshots(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-source-error",
                    "content_sha256": "hash-source-error",
                    "calendar_group_key": "boardwalk",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-source-error",
                    "status": "source_error",
                    "errors": ["unsupported_source_type"],
                    "snapshot_path": "snapshots/hash-source-error.vision.json",
                }
            ],
        )

        self.assertEqual("source_error", statuses[0]["status"])
        self.assertEqual("source_error", statuses[0]["snapshot_status"])
        self.assertEqual("unsupported_source_type", statuses[0]["message"])

    def test_source_status_v3_requires_matching_config_hash_when_expected(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-config",
                    "content_sha256": "hash-config",
                    "calendar_group_key": "boardwalk",
                    "config_hash": "config-current",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-config",
                    "config_hash": "config-old",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/hash-config.vision.json",
                }
            ],
        )

        self.assertEqual("unprocessed", statuses[0]["status"])
        self.assertEqual("stale_v3_snapshot_config_hash", statuses[0]["message"])
        self.assertEqual("config-current", statuses[0]["config_hash"])
        self.assertEqual("config-old", statuses[0]["snapshot_config_hash"])

    def test_source_status_v3_prefers_matching_config_snapshot_for_same_source_hash(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-config",
                    "content_sha256": "hash-config",
                    "calendar_group_key": "boardwalk",
                    "config_hash": "config-current",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-config",
                    "config_hash": "config-current",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/current.vision.json",
                },
                {
                    "source_sha256": "hash-config",
                    "config_hash": "config-old",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/old.vision.json",
                },
            ],
        )

        self.assertEqual("processed", statuses[0]["status"])
        self.assertEqual("snapshots/current.vision.json", statuses[0]["snapshot_path"])
        self.assertEqual("config-current", statuses[0]["snapshot_config_hash"])

    def test_source_status_v3_requires_matching_pipeline_version_when_expected(self) -> None:
        statuses = build_v3_source_statuses(
            expected_sources=[
                {
                    "source_document_id": "source-doc-pipeline",
                    "content_sha256": "hash-pipeline",
                    "calendar_group_key": "boardwalk",
                    "config_hash": "config-current",
                    "pipeline_version": "vision_v3_002",
                }
            ],
            snapshots=[
                {
                    "source_sha256": "hash-pipeline",
                    "config_hash": "config-current",
                    "pipeline_version": "vision_v3_001",
                    "status": "ocr_complete",
                    "snapshot_path": "snapshots/hash-pipeline.vision.json",
                }
            ],
        )

        self.assertEqual("unprocessed", statuses[0]["status"])
        self.assertEqual("stale_v3_snapshot_pipeline_version", statuses[0]["message"])
        self.assertEqual("vision_v3_002", statuses[0]["pipeline_version"])
        self.assertEqual("vision_v3_001", statuses[0]["snapshot_pipeline_version"])

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
            expected_sources_path.write_text(
                json.dumps([{"source_document_id": "source-doc-1", "content_sha256": "hash-1"}])
            )
            source_statuses_path.write_text(
                json.dumps([{"source_document_id": "source-doc-1", "content_sha256": "hash-1", "status": "parser_error"}])
            )
            review_tasks_path.write_text(
                json.dumps([{"source_document_id": "source-doc-1", "content_sha256": "hash-1", "task_type": "parser_error"}])
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
        expected_sources = [{"source_document_id": "source-doc-parser", "content_sha256": "hash-parser"}]
        source_statuses = [
            {"source_document_id": "source-doc-parser", "content_sha256": "hash-parser", "status": "parser_error"}
        ]

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
            review_tasks=[
                {"source_document_id": "source-doc-parser", "content_sha256": "hash-parser", "task_type": "parser_error"}
            ],
        )
        stale_review_task = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=source_statuses,
            review_tasks=[
                {"source_document_id": "source-doc-parser", "content_sha256": "oldhash", "task_type": "parser_error"}
            ],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["source-doc-parser"], blocked["source_coverage"]["parser_error_ids"])
        self.assertEqual(["source-doc-parser"], blocked["source_coverage"]["parser_error_without_review_task_ids"])
        self.assertIn("parser_error_without_review_task", blocked["publish_blockers"])
        self.assertEqual("blocked", stale_review_task["status"])
        self.assertEqual(
            ["source-doc-parser"],
            stale_review_task["source_coverage"]["parser_error_without_review_task_ids"],
        )
        self.assertIn("parser_error_without_review_task", stale_review_task["publish_blockers"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual([], reviewed["source_coverage"]["parser_error_without_review_task_ids"])

    def test_dual_run_report_blocks_source_error_sources_without_review_tasks(self) -> None:
        expected_sources = [{"source_document_id": "source-doc-error", "content_sha256": "hash-error"}]
        source_statuses = [
            {"source_document_id": "source-doc-error", "content_sha256": "hash-error", "status": "source_error"}
        ]

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
            review_tasks=[
                {"source_document_id": "source-doc-error", "content_sha256": "hash-error", "task_type": "source_error"}
            ],
        )
        stale_review_task = build_dual_run_report(
            v2_rows=[],
            v3_preview={"rows": []},
            expected_sources=expected_sources,
            v3_source_statuses=source_statuses,
            review_tasks=[
                {"source_document_id": "source-doc-error", "content_sha256": "oldhash", "task_type": "source_error"}
            ],
        )

        self.assertEqual("blocked", blocked["status"])
        self.assertEqual(["source-doc-error"], blocked["source_coverage"]["source_error_ids"])
        self.assertEqual(["source-doc-error"], blocked["source_coverage"]["source_error_without_review_task_ids"])
        self.assertEqual(1, blocked["manual_review_backlog"])
        self.assertIn("source_error_without_review_task", blocked["publish_blockers"])
        self.assertEqual("blocked", stale_review_task["status"])
        self.assertEqual(
            ["source-doc-error"],
            stale_review_task["source_coverage"]["source_error_without_review_task_ids"],
        )
        self.assertIn("source_error_without_review_task", stale_review_task["publish_blockers"])
        self.assertEqual("clean", reviewed["status"])
        self.assertEqual([], reviewed["source_coverage"]["source_error_without_review_task_ids"])


if __name__ == "__main__":
    unittest.main()
