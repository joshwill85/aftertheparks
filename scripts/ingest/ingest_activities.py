"""One-time ingest of official Disney resort recreation activities.

Delegates to the v2 extract pipeline. Kept for backward compatibility.
"""

from __future__ import annotations

from extract import extract_all


def main() -> None:
    extract_all(persist_db=False)


if __name__ == "__main__":
    main()
