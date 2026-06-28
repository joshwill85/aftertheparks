function dedupeRepeatedTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  const words = trimmed.split(" ");
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const left = words.slice(0, half).join(" ");
    const right = words.slice(half).join(" ");
    if (left.toLowerCase() === right.toLowerCase()) return left;
  }
  const match = trimmed.match(/^(.+?)\s+\1$/i);
  if (match) return match[1].trim();
  return trimmed;
}

const MOVIE_TITLE_REPAIRS: Array<[RegExp, string]> = [
  [/^PINGING Dory$/i, "Finding Dory"],
  [/^and the Beast \(1991\)$/i, "Beauty and the Beast (1991)"],
];

function repairKnownMovieTitle(title: string): string {
  for (const [pattern, replacement] of MOVIE_TITLE_REPAIRS) {
    if (pattern.test(title)) return replacement;
  }
  return title;
}

/** Strip OCR border noise and trailing parse artifacts from movie titles. */
export function sanitizeMovieTitle(raw: string): string {
  let title = raw.trim().replace(/\s+/g, " ");

  title = title.replace(/\s*\[[A-Za-z]{0,4}$/, "");
  title = title.replace(/\s*\([¢$Pe]{0,4}$/, "");
  title = title.replace(/\s+PG\)?\s*$/i, "");

  const directRepair = repairKnownMovieTitle(title);
  if (directRepair !== title) return directRepair;

  const quoted = title.match(/"([^"]+)"/);
  if (quoted) {
    return repairKnownMovieTitle(dedupeRepeatedTitle(cleanTitleTail(quoted[1])));
  }

  const orTitle = title.match(/\bor\s+([A-Z][\w\s'':,-]+(?:\s+PG)?)\s*$/i);
  if (orTitle) {
    const left = title.slice(0, orTitle.index).trim();
    const leftClean = extractTitleSegment(left);
    const rightClean = cleanTitleTail(orTitle[1]);
    if (leftClean && rightClean && leftClean !== rightClean) {
      return repairKnownMovieTitle(
        dedupeRepeatedTitle(`${leftClean} or ${rightClean}`)
      );
    }
    return repairKnownMovieTitle(dedupeRepeatedTitle(rightClean || leftClean || title));
  }

  const extracted = extractTitleSegment(title);
  const result = extracted || cleanTitleTail(title);
  return repairKnownMovieTitle(dedupeRepeatedTitle(result));
}

function extractTitleSegment(title: string): string | null {
  const capital = title.match(
    /(?:^|[.\s])([A-Z][\w\s'':,&-]+(?:\(\d{4}\))?(?:\s+PG)?)\s*$/
  );
  if (capital) return cleanTitleTail(capital[1]);

  const segments = title.match(/[A-Z][a-zA-Z0-9\s'':,&-]+(?:\(\d{4}\))?/g);
  if (segments?.length) return cleanTitleTail(segments[segments.length - 1]);

  return null;
}

function cleanTitleTail(title: string): string {
  return title
    .replace(/^["'\s.|]+/, "")
    .replace(/["'\s.|]+$/, "")
    .replace(/\s+PG\)?$/i, "")
    .replace(/\s+['’]?(?:P|PS|PE|S)\s*$/i, "")
    .replace(/\s*\(\d{4}\)\s*\([^)]*$/, (m) => m.match(/\(\d{4}\)/)?.[0] ?? "")
    .trim();
}

export function isUsableMovieTitle(title: string): boolean {
  const cleaned = sanitizeMovieTitle(title);
  if (cleaned.length < 2 || cleaned.length > 90) return false;
  if (/\d{1,2}:\d{2}|\b(?:am|pm)\b/i.test(cleaned)) return false;
  const titleForRatio = cleaned.replace(/\(\d{4}\)/g, "").trim();
  const letters = [...titleForRatio].filter((c) => /[a-zA-Z]/.test(c)).length;
  if (letters / titleForRatio.length < 0.45) return false;
  if (/^[a-z.\s]+$/.test(titleForRatio)) return false;
  return true;
}

export function normalizeMovieTitleKey(title: string): string {
  return sanitizeMovieTitle(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
