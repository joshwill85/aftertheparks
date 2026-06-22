import { isPdfGarbageText } from "@/lib/text/normalize";
import { looksCorruptedTitle } from "@/lib/activityDisplay";

const BAD_LOCATION_PATTERNS = [
  /^(?:in a|pick up|enjoy the|located|check with|see the|visit the|from the)\b/i,
  /^(?:r\s*){3,}/i,
  /resort\s*activit/i,
  /\.{4,}/,
];

/** Public-safe location label; returns Resort when text is garbage. */
export function sanitizeLocationLabel(
  value: string | null | undefined
): string {
  const label = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!label) return "Resort";
  if (label.length > 120) return "Resort";
  if (looksCorruptedTitle(label) && !/^throughout\b/i.test(label)) return "Resort";
  if (isPdfGarbageText(label)) return "Resort";
  if (BAD_LOCATION_PATTERNS.some((p) => p.test(label))) return "Resort";
  if (/^[a-z]/.test(label) && label.length > 40) return "Resort";
  return label;
}
