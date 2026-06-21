/** Fix OCR-spaced titles like "R E E L F U N A R C A D E" → "Reel Fun Arcade". */
export function normalizeActivityTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) return title;

  const tokens = title.split(/\s+/);
  const shortTokens = tokens.filter((t) => t.length <= 2).length;
  const looksSpaced =
    tokens.length >= 4 && shortTokens / tokens.length >= 0.65;

  if (looksSpaced || /^(?:[A-Za-z]\s+){4,}[A-Za-z]$/.test(title)) {
    return titleCaseWords(splitWords(title.replace(/\s+/g, "")));
  }

  if (title.includes(" - ") || title.includes(" – ")) {
    const sep = title.includes(" – ") ? " – " : " - ";
    return title
      .split(sep)
      .map((part) => normalizeActivityTitle(part))
      .join(sep);
  }

  return title;
}

function splitWords(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function titleCaseWords(words: string[]): string {
  return words
    .map((w) => {
      if (/^\d+$/.test(w)) return w;
      if (w.length <= 2 && w === w.toUpperCase()) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Human-readable schedule line for cards. */
export function formatActivityWindow(
  startIso: string,
  endIso?: string,
  scheduleText?: string
): string {
  if (scheduleText && !isPdfGarbageText(scheduleText)) {
    return scheduleText.length > 80
      ? scheduleText.slice(0, 77) + "…"
      : scheduleText;
  }
  return "";
}

const PDF_GARBAGE_PATTERNS = [
  "this information digitally",
  "activities schedule to view",
  "scan this qr",
  "scan the qr",
  "view the full schedule",
  "for the most current",
  "subject to change",
  "recreation activities guide",
  "parks media",
  "wdprapps",
];

/** PDF boilerplate, QR prompts, and schedule-page fragments. */
export function isPdfGarbageText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return true;
  if (/\.{4,}/.test(lower)) return true;
  return PDF_GARBAGE_PATTERNS.some((p) => lower.includes(p));
}

function looksLikeGarbage(text: string): boolean {
  return isPdfGarbageText(text);
}

export function isUncertainSchedule(scheduleText?: string): boolean {
  if (!scheduleText?.trim()) return true;
  return looksLikeGarbage(scheduleText);
}
