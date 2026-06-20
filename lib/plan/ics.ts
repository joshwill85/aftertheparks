import type { PlanItem } from "@/lib/types/occurrence";

function formatIcsDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function generateIcs(items: PlanItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//After the Parks//Resort Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:After the Parks Plan",
  ];

  for (const item of items) {
    const uid = `${item.id}@aftertheparks.com`;
    const start = formatIcsDate(item.startDateTime);
    const end = formatIcsDate(
      item.endDateTime ??
        (item.startDateTime
          ? new Date(
              new Date(item.startDateTime).getTime() + 60 * 60 * 1000
            ).toISOString()
          : undefined)
    );

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeIcs(item.title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(item.notes ?? `At ${item.resortName}`)}`);
    lines.push(`LOCATION:${escapeIcs(item.resortName)}`);
    if (start) lines.push(`DTSTART:${start}`);
    if (end) lines.push(`DTEND:${end}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function downloadIcs(items: PlanItem[], filename = "after-the-parks-plan.ics") {
  const blob = new Blob([generateIcs(items)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
