import { readFileSync } from "node:fs";
import path from "node:path";

type GateRow = Record<string, any>;

interface GateIssue {
  rowId: string;
  title: string;
  resort: string;
  source: string;
  field: string;
  message: string;
  disposition: "corrected" | "quarantined" | "publishable";
}

const ROOT = process.cwd();
const PUBLIC_POOL_CAVEAT_AVAILABLE = (() => {
  try {
    const detail = readFileSync(
      path.join(ROOT, "components/atlas/ActivityDetailClient.tsx"),
      "utf8"
    );
    const offering = readFileSync(
      path.join(ROOT, "components/activity/ActivityOfferingCard.tsx"),
      "utf8"
    );
    return (
      /category === "poolside"[\s\S]+pool area/i.test(detail) &&
      /category === "poolside"[\s\S]+Pool area access may be limited/i.test(offering)
    );
  } catch {
    return false;
  }
})();

const KNOWN_OCR_ARTIFACTS = [
  /WI!\s*LD\s*Ww\s*ILDERNESS/i,
  /Wellnessscav\s*Engerhunt/i,
  /\bages\s+I2\b/i,
  /\bis a activity activity\b/i,
  /\bOther activity activities\b/i,
  /\b\w+\s*;\s*00\s*(?:am|pm)\b/i,
  /\b407-WWDW-PLAY\b/i,
];

const PUBLIC_BANNED_COPY = [
  /\bbackend\b/i,
  /\bdatabase\b/i,
  /\binternal(?:\s+only)?\b/i,
  /\bstaging\b/i,
  /\bdraft\b/i,
  /\bcurrently tracked\b/i,
  /\bsoft planning only\b/i,
  /\bis a activity activity\b/i,
  /\bOther activity activities\b/i,
];

const POOL_ACCESS_CAVEAT =
  /resort guests only|gated pool|visitors will not be permitted|pool access|limited to resort guests/i;
const PHONE_PATTERN =
  /\b(?:\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]?[A-Z0-9]{3,4}[-.\s]?[A-Z0-9]{4})\b/i;

function readRows(file: string): GateRow[] {
  const payload = JSON.parse(readFileSync(path.join(ROOT, file), "utf8"));
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.activities)) return payload.activities;
  return [];
}

function rowId(row: GateRow): string {
  return String(
    row.candidate_id ??
      row.id ??
      row.activity_catalog_id ??
      row.normalized_name ??
      row.canonical_slug ??
      "unknown-row"
  );
}

function rowTitle(row: GateRow): string {
  return String(row.title ?? row.name ?? "Untitled activity");
}

function rowResort(row: GateRow): string {
  const slugs = row.resort_slugs;
  if (Array.isArray(slugs) && slugs.length > 0) return slugs.join(",");
  return String(row.resort_slug ?? row.calendar_group_key ?? "unknown-resort");
}

function rowSource(row: GateRow): string {
  return String(
    row.source_url ??
      row.pdf_url ??
      row.source?.url ??
      row.source?.documentId ??
      row.source_sha256 ??
      "unknown-source"
  );
}

function publicTextBlob(row: GateRow): string {
  return [
    rowTitle(row),
    row.description,
    row.summary,
    row.section,
    row.category,
    row.schedule_text,
    row.schedule?.text,
    row.location?.label,
    row.location?.value,
    typeof row.location === "string" ? row.location : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}

function evidenceBlob(row: GateRow): string {
  return `${publicTextBlob(row)} ${JSON.stringify(row.claims ?? "")} ${JSON.stringify(
    row.field_provenance ?? ""
  )} ${JSON.stringify(row.external_facts ?? "")} ${JSON.stringify(row.enrichment ?? "")}`;
}

function issue(row: GateRow, field: string, message: string): GateIssue {
  const trustState = String(row.trust_state ?? "");
  return {
    rowId: rowId(row),
    title: rowTitle(row),
    resort: rowResort(row),
    source: rowSource(row),
    field,
    message,
    disposition:
      trustState === "needs_review" || trustState === "source_unclear"
        ? "quarantined"
        : "publishable",
  };
}

function parseTimeMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.replace(/\./g, "");
  if (hour > 24 || minute > 59) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function hasClaimEvidence(row: GateRow, kindPattern: RegExp): boolean {
  const claims = Array.isArray(row.claims)
    ? row.claims
    : Object.values(row.claims ?? {});
  return claims.some((claim: any) => {
    const kind = String(claim?.kind ?? claim?.value ?? "");
    const evidence = claim?.evidence;
    return kindPattern.test(kind) && Array.isArray(evidence) && evidence.length > 0;
  });
}

function hasReservationEvidence(row: GateRow): boolean {
  if (row.enrichment?.reservation_phone || row.enrichment?.reservation_method) return true;
  if (row.eligibility?.reservation?.url) return true;
  if (/"reservation"/i.test(evidenceBlob(row))) return true;
  return hasClaimEvidence(row, /reservation|booking|call|reserve/i);
}

function normalizedLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasConcatenatedLocationLabel(row: GateRow, location: string): boolean {
  const normalized = normalizedLabel(location);
  if (!normalized) return false;
  const title = normalizedLabel(rowTitle(row));
  const resort = normalizedLabel(row.resort?.name ?? row.resort_name ?? "");
  if (title && normalized === `${title} ${title}`) return true;
  if (resort && normalized === `${resort} ${resort}`) return true;
  return /(.{12,})\s+\1\b/i.test(normalized);
}

function isOutdoorCategory(row: GateRow): boolean {
  return /campfire|movies_under_stars|poolside|nature|sports|marina|boat|fishing/i.test(
    String(row.category)
  );
}

function validateRows(rows: GateRow[]): GateIssue[] {
  const issues: GateIssue[] = [];

  for (const row of rows) {
    const title = rowTitle(row);
    const publicBlob = publicTextBlob(row);
    const evidence = evidenceBlob(row);
    const location = String(
      row.location?.label ?? row.location?.value ?? row.location ?? ""
    );

    if (KNOWN_OCR_ARTIFACTS.some((pattern) => pattern.test(publicBlob))) {
      issues.push(issue(row, "title", "Known OCR/title artifact is present."));
    }

    if (PUBLIC_BANNED_COPY.some((pattern) => pattern.test(publicBlob))) {
      issues.push(issue(row, "public_copy", "Public-facing text contains banned internal or low-trust copy."));
    }

    const start = parseTimeMinutes(row.schedule?.start_time ?? row.start_time);
    const end = parseTimeMinutes(row.schedule?.end_time ?? row.end_time);
    if (start != null && end != null && end < start) {
      const overnight = start >= 18 * 60 && end <= 3 * 60;
      if (!overnight) {
        issues.push(issue(row, "schedule", "End time is before start time."));
      }
    }

    if (row.price?.state === "fee" && !hasClaimEvidence(row, /fee|price|paid/i)) {
      issues.push(issue(row, "price", "Fee claim is missing source evidence."));
    }
    if (row.price?.state === "free" && !hasClaimEvidence(row, /fee|price|free/i)) {
      issues.push(issue(row, "price", "Free claim is missing source evidence."));
    }

    if (
      /\b(?:call|reserve|reservation|required|book)\b/i.test(publicBlob) &&
      !PHONE_PATTERN.test(publicBlob) &&
      !hasReservationEvidence(row)
    ) {
      issues.push(issue(row, "booking", "Call-to-book copy is missing a phone number."));
    }

    if (
      (row.enrichment?.reservation_required === true ||
        row.enrichment?.reservationRequired === true ||
        row.eligibility?.reservation?.required === true) &&
      !hasReservationEvidence(row)
    ) {
      issues.push(issue(row, "reservation", "Reservation-required claim is missing source evidence."));
    }
    if (
      (row.enrichment?.reservation_required === true ||
        row.enrichment?.reservationRequired === true ||
        row.eligibility?.reservation?.required === true) &&
      /no reservations?\s+(?:are\s+)?required/i.test(evidence)
    ) {
      issues.push(issue(row, "reservation", "Reservation-required claim contradicts source evidence."));
    }

    if (
      String(row.category) === "poolside" &&
      !POOL_ACCESS_CAVEAT.test(evidence) &&
      !PUBLIC_POOL_CAVEAT_AVAILABLE
    ) {
      issues.push(issue(row, "access", "Pool-gated activity is missing an access caveat."));
    }

    const weatherDependency = String(
      row.enrichment?.weather_dependency ?? row.enrichment?.weatherDependency ?? row.weather_dependency ?? ""
    ).toLowerCase();
    if (weatherDependency === "indoor" && isOutdoorCategory(row)) {
      issues.push(issue(row, "weather", "Outdoor/weather-sensitive activity is marked indoor."));
    }

    if (location && hasConcatenatedLocationLabel(row, location)) {
      issues.push(
        issue(row, "location", "Location label appears concatenated and should be deduplicated in public display.")
      );
    }
  }

  return issues;
}

const rows = readRows("data/processed/activity_gold_v2_preview.json");
const issues = validateRows(rows);
const blocking = issues.filter((entry) => entry.disposition === "publishable");

if (blocking.length > 0) {
  console.error(`Public data-quality gate failed with ${blocking.length} publishable issue(s):`);
  for (const entry of blocking.slice(0, 50)) {
    console.error(
      `- ${entry.field}: ${entry.message} | row=${entry.rowId} | title=${entry.title} | resort=${entry.resort} | source=${entry.source}`
    );
  }
  if (blocking.length > 50) {
    console.error(`...and ${blocking.length - 50} more.`);
  }
  process.exit(1);
}

console.log(
  `Public data-quality gate passed for ${rows.length} rows (${issues.length} quarantined/corrected issue(s), 0 publishable blockers).`
);
