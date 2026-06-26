import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "@/lib/daypart";
import type { PlanItem } from "@/lib/types/occurrence";

function formatIcsLocal(iso?: string): string {
  if (!iso) return "";
  // Floating local time in Orlando — correct for Apple/Google calendar import
  return formatInTimeZone(new Date(iso), TIMEZONE, "yyyyMMdd'T'HHmmss");
}

export function generateIcs(items: PlanItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//After the Parks//Resort Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:After the Parks Plan",
    "X-WR-TIMEZONE:America/New_York",
  ];

  for (const item of items) {
    if (!item.startDateTime) continue;

    const uid = `${item.id}@aftertheparks.com`;
    const start = formatIcsLocal(item.startDateTime);
    const end = formatIcsLocal(item.endDateTime);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeIcs(item.title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(item.notes ?? `At ${item.resortName}`)}`);
    lines.push(`LOCATION:${escapeIcs(item.resortName)}`);
    if (start) lines.push(`DTSTART;TZID=America/New_York:${start}`);
    if (end) lines.push(`DTEND;TZID=America/New_York:${end}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function hasCalendarExportableItems(items: PlanItem[]): boolean {
  return items.some((item) => Boolean(item.startDateTime));
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function downloadIcs(
  items: PlanItem[],
  filename = "after-the-parks-plan.ics"
) {
  const blob = new Blob([generateIcs(items)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
