/**
 * Format movie show times for display.
 * DB stores 24-hour time (e.g. 20:30:00 for 8:30 PM).
 */
export function formatMovieShowTime(time: string | null | undefined): string {
  if (!time) return "Evening";

  const [hStr, mStr] = time.split(":");
  let hour24 = Number(hStr);
  const minute = Number(mStr ?? 0);

  if (Number.isNaN(hour24) || Number.isNaN(minute)) return "Evening";

  // Legacy ingest stored "8:30PM" as 08:30 — outdoor movies are evening.
  if (hour24 >= 1 && hour24 < 12) {
    hour24 += 12;
  }

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatMovieDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
