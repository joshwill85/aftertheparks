"""Parse schedule strings into 24-hour PostgreSQL time values."""

from __future__ import annotations

import re

_TIME_RE = re.compile(
    r"(\d{1,2})\s*:\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?",
    re.IGNORECASE,
)


def parse_time_24h(value: str | None, *, evening_default: bool = False) -> str | None:
    """
    Parse a time like '8:30PM', '8:30 PM', or '20:30' to 'HH:MM:SS'.

    When evening_default is True (movie under the stars), bare times like
  '8:30' without meridiem are treated as PM — Disney outdoor movies are evening.
    """
    if not value:
        return None

    match = _TIME_RE.search(value.strip())
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2))
    meridiem = (match.group(3) or "").replace(".", "").lower()

    if meridiem in ("pm",):
        if hour < 12:
            hour += 12
    elif meridiem in ("am",):
        if hour == 12:
            hour = 0
    elif evening_default and 1 <= hour <= 11:
        hour += 12

    if hour > 23 or minute > 59:
        return None

    return f"{hour:02d}:{minute:02d}:00"
