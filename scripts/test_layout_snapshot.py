import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.ingest.layout_snapshot import build_layout_snapshot, write_layout_snapshot


class LayoutSnapshotTest(unittest.TestCase):
    def test_all_star_movies_snapshot_keeps_words_lines_and_hash(self) -> None:
        pdf_path = Path("data/raw/pdfs/All-Star-Movies_Aframe_Recreation_1125.pdf")

        snapshot = build_layout_snapshot(pdf_path)

        self.assertEqual(snapshot["source_path"], str(pdf_path))
        self.assertRegex(snapshot["content_sha256"], r"^[a-f0-9]{64}$")
        self.assertGreater(snapshot["page_count"], 0)

        first_page = snapshot["pages"][0]
        self.assertGreater(first_page["width"], 0)
        self.assertGreater(first_page["height"], 0)
        self.assertGreater(len(first_page["words"]), 250)
        self.assertGreater(len(first_page["lines"]), 50)

        first_word = first_page["words"][0]
        self.assertEqual(
            {"text", "bbox", "block_no", "line_no", "word_no"},
            set(first_word.keys()),
        )
        self.assertEqual(4, len(first_word["bbox"]))

        line_text = "\n".join(line["text"] for line in first_page["lines"])
        self.assertIn("Daily from 7:00am–11:00pm", line_text)
        self.assertIn("Find hidden wellness challenges and partake", line_text)

    def test_image_only_pdf_uses_ocr_layout_fallback(self) -> None:
        pdf_path = Path("data/raw/pdfs/POP_Aframe_Recreation-0326.pdf")

        snapshot = build_layout_snapshot(pdf_path)

        first_page = snapshot["pages"][0]
        self.assertEqual("ocr", first_page["text_source"])
        self.assertGreater(len(first_page["words"]), 100)
        self.assertGreater(len(first_page["lines"]), 30)

        line_text = "\n".join(line["text"] for line in first_page["lines"])
        self.assertIn("FAST FORWARD ARCADE", line_text)
        self.assertIn("Daily from 8:00am", line_text)
        self.assertIn("POOLSIDE ACTIVITIES", line_text)

    def test_boardwalk_snapshot_splits_same_baseline_column_text(self) -> None:
        pdf_path = Path("data/raw/pdfs/BW_Aframe_Recreation-0326.pdf")

        snapshot = build_layout_snapshot(pdf_path)

        line_texts = [line["text"] for line in snapshot["pages"][0]["lines"]]
        self.assertIn("SIDE SHOW GAMES ARCADE ($)", line_texts)
        self.assertIn("ACTIVITIES SCHEDULE TO VIEW", line_texts)
        self.assertNotIn(
            "ACTIVITIES SCHEDULE TO VIEW SIDE SHOW GAMES ARCADE ($)",
            line_texts,
        )
        self.assertIn("Enjoy a friendly game of croquet on our lush lawn.", line_texts)
        self.assertIn("POOLSIDE ACTIVITIES", line_texts)

    def test_ocr_snapshot_splits_near_threshold_column_text(self) -> None:
        riviera = build_layout_snapshot(Path("data/raw/pdfs/DRR_Aframe_Recreation-0326.pdf"))
        wilderness = build_layout_snapshot(Path("data/raw/pdfs/WL_Aframe_Recreation-0326.pdf"))

        riviera_lines = [line["text"] for line in riviera["pages"][0]["lines"]]
        wilderness_lines = [line["text"] for line in wilderness["pages"][0]["lines"]]

        self.assertIn(
            "Get in touch with your inner artist in this unique instructor-led",
            riviera_lines,
        )
        self.assertIn("STARLIGHT SOIREE", riviera_lines)
        self.assertNotIn(
            "Get in touch with your inner artist in this unique instructor-led STARLIGHT SOIREE",
            riviera_lines,
        )
        self.assertIn("LAWN OUTSIDE REUNION STATION | 8:30PM", wilderness_lines)
        self.assertIn("Join us for family-friendly seasonal activities.", wilderness_lines)
        self.assertNotIn(
            "LAWN OUTSIDE REUNION STATION | 8:30PM Join us for family-friendly seasonal activities.",
            wilderness_lines,
        )

    def test_low_contrast_heading_ocr_recovers_caribbean_beach_titles(self) -> None:
        snapshot = build_layout_snapshot(Path("data/raw/pdfs/CBR_Aframe_Recreation-0326.pdf"))

        line_text = "\n".join(line["text"] for line in snapshot["pages"][0]["lines"])

        self.assertIn("FIND A FRIEND", line_text)
        self.assertIn("NATURE WALK", line_text)
        self.assertIn("POOLSIDE ACTIVITIES", line_text)
        self.assertIn("UNDER THE", line_text)
        self.assertIn("SEASHELL PAINTING", line_text)
        self.assertIn("($) There is a fee associated", line_text)
        self.assertIn("CARIBBEAN GLOW FESTIVAL", line_text)
        self.assertIn("crafts favorite.", line_text)
        self.assertNotIn("Alice in Wonderland (1951) [6] crafts favorite.", line_text)
        self.assertIn("Nightly from 6:30pm-7:30pm", line_text)
        self.assertNotIn(
            "Little Mermaid (1989) [6] Nightly from 6:30pm-7:30pm",
            line_text,
        )

    def test_write_layout_snapshot_uses_content_hash_filename(self) -> None:
        pdf_path = Path("data/raw/pdfs/All-Star-Movies_Aframe_Recreation_1125.pdf")
        out_dir = Path("data/processed/test-layout-snapshots")

        out_path = write_layout_snapshot(pdf_path, out_dir)

        try:
            self.assertTrue(out_path.exists())
            self.assertRegex(out_path.name, r"^[a-f0-9]{64}\.layout\.json$")
            self.assertEqual(out_path.parent, out_dir)
        finally:
            if out_path.exists():
                out_path.unlink()
            if out_dir.exists():
                out_dir.rmdir()


if __name__ == "__main__":
    unittest.main()
