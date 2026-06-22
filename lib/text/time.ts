/** Parse schedule strings like "8:30PM" or "Daily from 2:30pm-3:30pm" to 24-hour parts. */
export function parseScheduleTime24h(
  value: string | null | undefined,
  options: { eveningDefault?: boolean } = {}
): { hour: number; minute: number } | null {
  if (!value?.trim()) return null;

  const match = value.match(
    /(\d{1,2})\s*:\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i
  );
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const meridiem = (match[3] ?? "").replace(/\./g, "").toLowerCase();

  if (meridiem === "pm" && hour < 12) hour += 12;
  else if (meridiem === "am" && hour === 12) hour = 0;
  else if (!meridiem && options.eveningDefault && hour >= 1 && hour <= 11) {
    hour += 12;
  }

  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseScheduleTimeRange24h(
  value: string | null | undefined,
  options: { eveningDefault?: boolean } = {}
): {
  start: { hour: number; minute: number };
  end?: { hour: number; minute: number };
} | null {
  if (!value?.trim()) return null;

  const matches = [
    ...value.matchAll(
      /(\d{1,2})\s*:\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/gi
    ),
  ];
  if (matches.length === 0) return null;

  const parseMatch = (
    match: RegExpMatchArray,
    fallbackMeridiem?: string
  ): { hour: number; minute: number } | null => {
    let hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    const meridiem = (match[3] ?? fallbackMeridiem ?? "")
      .replace(/\./g, "")
      .toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    else if (meridiem === "am" && hour === 12) hour = 0;
    else if (!meridiem && options.eveningDefault && hour >= 1 && hour <= 11) {
      hour += 12;
    }

    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  };

  const secondMeridiem = matches[1]?.[3];
  const first = parseMatch(matches[0], secondMeridiem);
  if (!first) return null;

  const second = matches[1] ? parseMatch(matches[1]) : undefined;
  return { start: first, end: second ?? undefined };
}

export function formatTime12Hour(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/** Best display label from schedule notes (prefers explicit meridiem in PDF text). */
export function formatScheduleTimeLabel(
  scheduleText: string | null | undefined,
  options: { eveningDefault?: boolean } = {}
): string | null {
  const range = parseScheduleTimeRange24h(scheduleText, options);
  if (!range) return null;
  const start = formatTime12Hour(range.start.hour, range.start.minute);
  if (!range.end) return start;
  const end = formatTime12Hour(range.end.hour, range.end.minute);
  return start === end ? start : `${start} – ${end}`;
}

export function toTimeSql(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}
