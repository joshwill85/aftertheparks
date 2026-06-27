"""Render cached Disney PDFs to images for visual audit."""

from __future__ import annotations

import argparse
import hashlib
import shutil
import subprocess
from pathlib import Path

try:
    from config import RAW_DIR, PROCESSED_DIR
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import RAW_DIR, PROCESSED_DIR


DEFAULT_OUTPUT_DIR = PROCESSED_DIR / "pdf_page_images"


def pdf_sha256(pdf_path: Path) -> str:
    return hashlib.sha256(pdf_path.read_bytes()).hexdigest()


def rendered_page_path(
    pdf_path: Path,
    source_sha256: str,
    *,
    page_number: int,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
) -> Path:
    return output_dir / f"{source_sha256}-page-{page_number:03d}.png"


def _pdftoppm_executable() -> str:
    executable = shutil.which("pdftoppm")
    if not executable:
        raise RuntimeError("pdftoppm_missing")
    return executable


def render_pdf_pages(
    pdf_path: Path,
    *,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    dpi: int = 180,
    first_page: int | None = None,
    last_page: int | None = None,
) -> list[Path]:
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    source_hash = pdf_sha256(pdf_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = output_dir / source_hash
    command = [_pdftoppm_executable(), "-png", "-r", str(dpi)]
    if first_page is not None:
        command.extend(["-f", str(first_page)])
    if last_page is not None:
        command.extend(["-l", str(last_page)])
    command.extend([str(pdf_path), str(prefix)])
    subprocess.run(command, check=True)

    rendered = sorted(output_dir.glob(f"{source_hash}-*.png"))
    normalized: list[Path] = []
    for index, path in enumerate(rendered, start=first_page or 1):
        target = rendered_page_path(pdf_path, source_hash, page_number=index, output_dir=output_dir)
        if path != target:
            path.replace(target)
        normalized.append(target)
    return normalized


def render_all_pdf_pages(
    *,
    pdf_dir: Path = RAW_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    dpi: int = 180,
) -> list[Path]:
    paths: list[Path] = []
    for pdf_path in sorted(pdf_dir.glob("*.pdf")):
        paths.extend(render_pdf_pages(pdf_path, output_dir=output_dir, dpi=dpi))
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description="Render PDFs for visual audit")
    parser.add_argument("--pdf-dir", type=Path, default=RAW_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--dpi", type=int, default=180)
    parser.add_argument("--first-page", type=int)
    parser.add_argument("--last-page", type=int)
    parser.add_argument("--single-pdf", type=Path)
    args = parser.parse_args()

    if args.single_pdf:
        paths = render_pdf_pages(
            args.single_pdf,
            output_dir=args.output_dir,
            dpi=args.dpi,
            first_page=args.first_page,
            last_page=args.last_page,
        )
    else:
        paths = render_all_pdf_pages(pdf_dir=args.pdf_dir, output_dir=args.output_dir, dpi=args.dpi)
    print("\n".join(str(path) for path in paths))


if __name__ == "__main__":
    main()
