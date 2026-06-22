"""Capture deterministic line snapshots for official Disney web sources."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

try:
    from config import DISNEY_USER_AGENT
    from web_snapshot import web_snapshot_content_hash
except ImportError:  # pragma: no cover - supports package-style imports in tests
    from .config import DISNEY_USER_AGENT
    from .web_snapshot import web_snapshot_content_hash


BLOCK_TAGS = {
    "article",
    "aside",
    "br",
    "dd",
    "div",
    "dl",
    "dt",
    "figcaption",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
}
SKIP_TAGS = {"script", "style", "svg", "noscript"}


class TextLineParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if not self.skip_depth and tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
            return
        if not self.skip_depth and tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        if data.strip():
            self.parts.append(data)

    def lines(self) -> list[str]:
        text = html.unescape("".join(self.parts))
        lines: list[str] = []
        for raw_line in text.splitlines():
            line = re.sub(r"\s+", " ", raw_line).strip()
            if line:
                lines.append(line)
        return lines


def fetch_html(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": DISNEY_USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def build_web_snapshot(url: str, *, source_kind: str) -> dict[str, object]:
    raw_html = fetch_html(url)
    parser = TextLineParser()
    parser.feed(raw_html.decode("utf-8", "replace"))
    snapshot = {
        "source_kind": source_kind,
        "source_url": url,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "raw_html_sha256": hashlib.sha256(raw_html).hexdigest(),
        "lines": [
            {"line": index, "text": line}
            for index, line in enumerate(parser.lines(), start=1)
        ],
    }
    snapshot["content_sha256"] = web_snapshot_content_hash(snapshot)
    return snapshot


def write_web_snapshot(url: str, output_path: Path, *, source_kind: str) -> Path:
    snapshot = build_web_snapshot(url, source_kind=source_kind)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Capture an official web line snapshot")
    parser.add_argument("url")
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-kind", default="official_web_detail")
    args = parser.parse_args()

    output = write_web_snapshot(args.url, args.output, source_kind=args.source_kind)
    digest = web_snapshot_content_hash(json.loads(output.read_text()))
    print(json.dumps({"output": str(output), "sha256": digest}, indent=2))


if __name__ == "__main__":
    main()
