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
  const parsed = parseScheduleTime24h(scheduleText, options);
  if (!parsed) return null;
  return formatTime12Hour(parsed.hour, parsed.minute);
}

export function toTimeSql(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}
