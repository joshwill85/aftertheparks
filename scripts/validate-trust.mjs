#!/usr/bin/env node
/**
 * Trust + UI validation against local or production API.
 * Usage: node scripts/validate-trust.mjs [baseUrl]
 * Default: http://localhost:3000
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

const LETTER_SPACED = /\b[A-Z](?:\s[A-Z]){3,}\b/;
const KNOWN_TITLE_BREAKS = /Wellnessscav|Engerhunt/i;
const SUSPICIOUS_BLOCK = /9:00\s*AM\s*[–-]\s*9:00\s*PM/i;
const REQUIRED_PROVENANCE_FIELDS = ["title", "schedule", "location"];
const OFFICIAL_OFFERING_PROVENANCE_FIELDS = ["title", "resortJoin"];
const OFFICIAL_OFFERING_SAMPLE_PATHS = [
  "/api/activities?limit=300",
  "/api/activities?resort=campsites-at-fort-wilderness-resort&limit=300",
  "/api/activities?q=fireworks%20cruises&limit=50",
  "/api/search?q=fireworks%20cruises",
  "/api/resorts/contemporary-resort",
];

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.text();
}

function fail(check, detail) {
  return { check, pass: false, detail };
}

function pass(check, detail = "ok") {
  return { check, pass: true, detail };
}

function isCamelCaseSmash(title) {
  return title
    .split(/\s+/)
    .some((token) => token.length >= 8 && (/[a-z][A-Z]/.test(token) || /^[A-Z][a-z]+[A-Z]/.test(token)));
}

function comparableText(value) {
  return String(value ?? "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sourceTitleSupportsTitle(item) {
  const title = comparableText(item.title);
  if (!title) return false;
  return (item.fieldProvenance?.title ?? []).some((span) =>
    comparableText(span.text).includes(title)
  );
}

function hasEvidence(claim) {
  return Array.isArray(claim?.evidence) && claim.evidence.length > 0;
}

function isUnknownClaim(claim) {
  const value = String(claim?.value ?? "").trim().toLowerCase();
  return !value || value === "unknown" || value === "not_applicable";
}

function missingProvenanceFields(activity) {
  const provenance = activity.fieldProvenance ?? {};
  const missing = REQUIRED_PROVENANCE_FIELDS.filter((field) => {
    const spans = provenance[field];
    return !Array.isArray(spans) || spans.length === 0;
  });

  if ((activity.summary ?? "").trim()) {
    const spans = provenance.description;
    if (!Array.isArray(spans) || spans.length === 0) missing.push("description");
  }

  return missing;
}

function missingOfficialOfferingProvenanceFields(offering) {
  const provenance = offering.fieldProvenance ?? {};
  const missing = OFFICIAL_OFFERING_PROVENANCE_FIELDS.filter((field) => {
    const spans = provenance[field];
    return !Array.isArray(spans) || spans.length === 0;
  });

  if ((offering.summary ?? "").trim()) {
    const spans = provenance.description;
    if (!Array.isArray(spans) || spans.length === 0) missing.push("description");
  }

  return missing;
}

function unsupportedClaims(activity) {
  return Object.entries(activity.claims ?? {})
    .filter(([, claim]) => !isUnknownClaim(claim) && !hasEvidence(claim))
    .map(([kind]) => kind);
}

function unsupportedPriceState(activity) {
  const state = String(activity.price?.state ?? "unknown").trim().toLowerCase();
  if (state !== "free" && state !== "fee") return false;
  const feeClaim = activity.claims?.fee;
  return feeClaim?.value !== state || !hasEvidence(feeClaim);
}

function activityEvidenceFields(activity) {
  const fields = new Set();
  for (const fact of activity.externalFacts ?? []) {
    for (const evidence of fact.evidence ?? []) {
      if (typeof evidence.field === "string" && evidence.field.trim()) {
        fields.add(evidence.field);
      }
    }
  }
  for (const claim of Object.values(activity.claims ?? {})) {
    if (claim?.kind === "external_schedule_validity") {
      fields.add("schedule_validity");
    }
    for (const evidence of claim?.evidence ?? []) {
      for (const field of evidence.fields ?? []) {
        if (typeof field === "string" && field.trim()) fields.add(field);
      }
    }
  }
  return fields;
}

function hasAnyEvidenceField(fields, required) {
  return required.some((field) => fields.has(field));
}

const ENRICHMENT_EVIDENCE_FIELDS = {
  exactVenue: ["schedule_location"],
  hostAreaOrWing: ["schedule_location"],
  ageMinimum: ["age_access", "age", "access_rules"],
  adultRequired: ["age_access", "access_rules"],
  durationMinutes: ["duration", "check_in", "reservation"],
  checkInOffsetMinutes: ["check_in", "reservation"],
  reservationRequired: ["reservation"],
  reservationRecommended: ["reservation"],
  reservationMethod: ["reservation"],
  reservationPhone: ["reservation"],
  walkUpsAllowed: ["reservation"],
  sameDayAvailable: ["reservation"],
  programFamily: ["schedule_location"],
  activityVariant: ["schedule_location"],
  weatherDependency: ["schedule_location"],
  scheduleValidFrom: ["schedule_validity", "valid_from"],
  scheduleValidUntil: ["schedule_validity", "valid_until"],
  nextScheduleExpectedDate: ["schedule_validity", "next_expected_schedule_date"],
  hiddenCharacterName: ["schedule_location", "description"],
  redemptionLocation: ["schedule_location", "description"],
  prizeOrCompletionRule: ["description", "access_rules"],
  resortGuestOnly: ["access_rules"],
  poolGated: ["pool_gated"],
  openToNonResortGuests: ["open_to_non_resort_guests"],
  sisterResortAccess: ["sister_resort_access"],
};

function unsupportedEnrichmentFields(activity) {
  const enrichment = activity.enrichment ?? {};
  const fields = activityEvidenceFields(activity);
  return Object.entries(ENRICHMENT_EVIDENCE_FIELDS)
    .filter(([field, required]) => {
      if (enrichment[field] == null) return false;
      return !hasAnyEvidenceField(fields, required);
    })
    .map(([field]) => field);
}

function unsupportedPriceDetails(activity) {
  const price = activity.price ?? {};
  const hasDetails = Boolean(
    price.notes ||
      price.amountCents != null ||
      price.minAmountCents != null ||
      price.maxAmountCents != null ||
      (Array.isArray(price.options) && price.options.length > 0)
  );
  if (!hasDetails) return false;
  return !(
    hasEvidence(activity.claims?.fee) ||
    hasAnyEvidenceField(activityEvidenceFields(activity), ["price"])
  );
}

function unsupportedOfferingAvailability(offering) {
  const label = String(offering.availability?.label ?? "").trim();
  if (!label) return false;
  if (
    label === "Hours not specified by Disney" ||
    label === "Check Disney source for current availability"
  ) {
    return false;
  }
  return !(
    Array.isArray(offering.fieldProvenance?.availability) &&
    offering.fieldProvenance.availability.length > 0
  );
}

function unsupportedOfferingBooking(offering) {
  const booking = offering.booking ?? {};
  const hasBooking = Boolean(
    booking.reservationRequired ||
      booking.reservationRecommended ||
      booking.cancellationNoticeHours ||
      booking.method ||
      booking.phone ||
      booking.url
  );
  if (!hasBooking) return false;
  return !(
    Array.isArray(offering.fieldProvenance?.booking) &&
    offering.fieldProvenance.booking.length > 0
  );
}

function unsupportedOfferingEligibility(offering) {
  if (!offering.eligibility?.resortGuestOnly) return false;
  return !(
    Array.isArray(offering.fieldProvenance?.eligibility) &&
    offering.fieldProvenance.eligibility.length > 0
  );
}

function unsupportedOfferingLocation(offering) {
  const label = String(offering.location?.label ?? "").trim();
  if (!label) return false;
  if (label === String(offering.resort?.name ?? "").trim()) return false;
  return !(
    Array.isArray(offering.fieldProvenance?.location) &&
    offering.fieldProvenance.location.length > 0
  );
}

function unsupportedOfferingAmenities(offering) {
  if (!Array.isArray(offering.amenities) || offering.amenities.length === 0) {
    return false;
  }
  return !(
    Array.isArray(offering.fieldProvenance?.amenities) &&
    offering.fieldProvenance.amenities.length > 0
  );
}

async function collectOfficialOfferingSamples() {
  const samples = [];
  for (const path of OFFICIAL_OFFERING_SAMPLE_PATHS) {
    const data = await fetchJson(path);
    for (const offering of data.officialOfferings ?? []) {
      samples.push({ path, offering });
    }
  }
  return samples;
}

async function validateTonight() {
  const data = await fetchJson("/api/tonight");
  const activities = data.activities ?? [];
  const ids = activities.map((a) => a.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) {
    return fail("Tonight duplicate IDs", `${dupes.length} duplicates`);
  }
  return pass("Tonight duplicate IDs", `${activities.length} activities, 0 dupes`);
}

async function validateExplore() {
  const data = await fetchJson("/api/activities?limit=150");
  const activities = data.activities ?? [];
  if (activities.length === 0) {
    return fail("Explore activities", "empty response");
  }
  let ocrTitles = 0;
  let brokenTitles = 0;
  let camelCaseTitles = 0;
  let fakeVerified = 0;
  let suspiciousWithoutBadge = 0;
  let missingSource = 0;
  let missingProvenance = 0;
  let unsupportedClaimCount = 0;
  let unsupportedPriceCount = 0;

  for (const a of activities) {
    const title = a.title ?? a.activity_name ?? "";
    if (LETTER_SPACED.test(title)) ocrTitles++;
    if (KNOWN_TITLE_BREAKS.test(title)) brokenTitles++;
    if (isCamelCaseSmash(title)) camelCaseTitles++;
    if (a.freshness?.badge === "verified" && a.displayQuality?.tier) {
      if (a.displayQuality.tier !== "high") fakeVerified++;
    }
    const timeLabel = a.scheduleText ?? a.startDateTime ?? "";
    if (SUSPICIOUS_BLOCK.test(timeLabel) && !a.timeUncertain) {
      suspiciousWithoutBadge++;
    }
    if (!a.source?.url || !a.source?.documentHash) {
      missingSource++;
    }
    if (missingProvenanceFields(a).length) {
      missingProvenance++;
    }
    if (unsupportedClaims(a).length) {
      unsupportedClaimCount++;
    }
    if (unsupportedPriceState(a)) {
      unsupportedPriceCount++;
    }
  }

  if (ocrTitles) return fail("Explore OCR titles", `${ocrTitles} found`);
  if (brokenTitles) return fail("Known broken title fragments", `${brokenTitles} found`);
  if (camelCaseTitles) return fail("Camel-case smashed titles", `${camelCaseTitles} found`);
  if (fakeVerified) return fail("Unearned verified badges", `${fakeVerified} found`);
  if (suspiciousWithoutBadge) {
    return fail("Suspicious 9-9 time blocks", `${suspiciousWithoutBadge} without uncertainty`);
  }
  if (missingSource) return fail("Source evidence", `${missingSource} missing source URL/hash`);
  if (missingProvenance) {
    return fail("Field provenance", `${missingProvenance} missing source spans`);
  }
  if (unsupportedClaimCount) {
    return fail("Unsupported claims", `${unsupportedClaimCount} activities have claims without evidence`);
  }
  if (unsupportedPriceCount) {
    return fail("Unsupported price labels", `${unsupportedPriceCount} activities expose free/fee without evidence`);
  }
  return pass("Explore trust scan", `${activities.length} activities clean`);
}

async function validateActivityEnrichmentEvidence() {
  const explore = await fetchJson("/api/activities?limit=300");
  const wellness = await fetchJson("/api/activities/wellness-scavenger-hunt");
  const crescent = await fetchJson("/api/activities/crescent-lake-wellness-challenge");
  const activities = [
    ...(explore.activities ?? []),
    wellness.activity,
    crescent.activity,
  ].filter(Boolean);

  let unsupportedEnrichmentCount = 0;
  let unsupportedPriceDetailCount = 0;
  const examples = [];

  for (const activity of activities) {
    const unsupported = unsupportedEnrichmentFields(activity);
    if (unsupported.length) {
      unsupportedEnrichmentCount++;
      if (examples.length < 5) {
        examples.push(
          `${activity.activitySlug ?? activity.id}: enrichment ${unsupported.join(", ")}`
        );
      }
    }
    if (unsupportedPriceDetails(activity)) {
      unsupportedPriceDetailCount++;
      if (examples.length < 5) {
        examples.push(`${activity.activitySlug ?? activity.id}: price details`);
      }
    }
  }

  if (unsupportedEnrichmentCount) {
    return fail(
      "Activity enrichment evidence",
      `${unsupportedEnrichmentCount} activities; ${examples.join(" | ")}`
    );
  }
  if (unsupportedPriceDetailCount) {
    return fail(
      "Activity price detail evidence",
      `${unsupportedPriceDetailCount} activities; ${examples.join(" | ")}`
    );
  }
  return pass(
    "Activity enrichment evidence",
    `${activities.length} public activities have sourced enrichment details`
  );
}

async function validateOfficialOfferings() {
  const samples = await collectOfficialOfferingSamples();
  if (samples.length === 0) {
    return fail("Official recreation offerings", "no offerings found on public routes");
  }

  let ocrTitles = 0;
  let brokenTitles = 0;
  let camelCaseTitles = 0;
  let coercedDates = 0;
  let missingAvailability = 0;
  let missingSource = 0;
  let missingProvenance = 0;
  let unsupportedClaimCount = 0;
  let unsupportedTransitClaims = 0;
  let unsupportedPriceCount = 0;
  let unsupportedAvailabilityCount = 0;
  let unsupportedBookingCount = 0;
  let unsupportedEligibilityCount = 0;
  let unsupportedLocationCount = 0;
  let unsupportedAmenityCount = 0;
  const uniqueOfferings = new Set();
  const examples = [];

  function note(path, offering, reason) {
    if (examples.length >= 5) return;
    const key = offering.offeringKey ?? offering.id ?? "<missing key>";
    examples.push(`${key} from ${path}: ${reason}`);
  }

  for (const { path, offering } of samples) {
    const title = offering.title ?? "";
    uniqueOfferings.add(offering.offeringKey ?? offering.id ?? `${path}:${title}`);

    if (LETTER_SPACED.test(title)) {
      ocrTitles++;
      note(path, offering, "letter-spaced title");
    }
    if (KNOWN_TITLE_BREAKS.test(title)) {
      brokenTitles++;
      note(path, offering, "known broken title fragment");
    }
    if (isCamelCaseSmash(title) && !sourceTitleSupportsTitle(offering)) {
      camelCaseTitles++;
      note(path, offering, "camel-case smashed title");
    }
    if (offering.startDateTime || offering.endDateTime || offering.scheduleText) {
      coercedDates++;
      note(path, offering, "contains startDateTime/endDateTime/scheduleText");
    }
    if (!offering.availability?.kind || !offering.availability?.label) {
      missingAvailability++;
      note(path, offering, "missing availability kind/label");
    }
    if (unsupportedOfferingAvailability(offering)) {
      unsupportedAvailabilityCount++;
      note(path, offering, `unsupported availability label ${offering.availability.label}`);
    }
    if (unsupportedOfferingBooking(offering)) {
      unsupportedBookingCount++;
      note(path, offering, "unsupported booking note");
    }
    if (unsupportedOfferingEligibility(offering)) {
      unsupportedEligibilityCount++;
      note(path, offering, "unsupported eligibility note");
    }
    if (unsupportedOfferingLocation(offering)) {
      unsupportedLocationCount++;
      note(path, offering, `unsupported location ${offering.location.label}`);
    }
    if (unsupportedOfferingAmenities(offering)) {
      unsupportedAmenityCount++;
      note(path, offering, "unsupported amenity list");
    }
    if (!offering.source?.url || !offering.source?.documentHash) {
      missingSource++;
      note(path, offering, "missing source URL/hash");
    }
    const provenance = missingOfficialOfferingProvenanceFields(offering);
    if (provenance.length) {
      missingProvenance++;
      note(path, offering, `missing provenance for ${provenance.join(", ")}`);
    }
    const unsupported = unsupportedClaims(offering);
    if (unsupported.length) {
      unsupportedClaimCount++;
      note(path, offering, `unsupported claims ${unsupported.join(", ")}`);
    }
    const priceState = String(offering.price?.state ?? "unknown").trim().toLowerCase();
    if (
      (priceState === "free" || priceState === "fee") &&
      !(
        Array.isArray(offering.fieldProvenance?.price) &&
        offering.fieldProvenance.price.length > 0
      )
    ) {
      unsupportedPriceCount++;
      note(path, offering, `unsupported price state ${priceState}`);
    }

    for (const kind of ["walkability", "transportation"]) {
      const claim = offering.claims?.[kind];
      if (claim && !isUnknownClaim(claim)) {
        unsupportedTransitClaims++;
        note(path, offering, `${kind} claim must stay unknown unless directly sourced`);
      }
    }
  }

  if (ocrTitles) return fail("Official offering OCR titles", `${ocrTitles} found; ${examples.join(" | ")}`);
  if (brokenTitles) return fail("Official offering broken title fragments", `${brokenTitles} found; ${examples.join(" | ")}`);
  if (camelCaseTitles) return fail("Official offering camel-case smashed titles", `${camelCaseTitles} found; ${examples.join(" | ")}`);
  if (coercedDates) return fail("Official offering event coercion", `${coercedDates} dated/scheduled; ${examples.join(" | ")}`);
  if (missingAvailability) return fail("Official offering availability", `${missingAvailability} missing kind/label; ${examples.join(" | ")}`);
  if (missingSource) return fail("Official offering source evidence", `${missingSource} missing source URL/hash; ${examples.join(" | ")}`);
  if (missingProvenance) return fail("Official offering field provenance", `${missingProvenance} missing spans; ${examples.join(" | ")}`);
  if (unsupportedClaimCount) return fail("Official offering unsupported claims", `${unsupportedClaimCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedPriceCount) return fail("Official offering unsupported price labels", `${unsupportedPriceCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedAvailabilityCount) return fail("Official offering unsupported availability labels", `${unsupportedAvailabilityCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedBookingCount) return fail("Official offering unsupported booking notes", `${unsupportedBookingCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedEligibilityCount) return fail("Official offering unsupported eligibility notes", `${unsupportedEligibilityCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedLocationCount) return fail("Official offering unsupported locations", `${unsupportedLocationCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedAmenityCount) return fail("Official offering unsupported amenities", `${unsupportedAmenityCount} offerings; ${examples.join(" | ")}`);
  if (unsupportedTransitClaims) return fail("Official offering inferred transportation", `${unsupportedTransitClaims} offerings; ${examples.join(" | ")}`);

  return pass(
    "Official recreation offerings",
    `${uniqueOfferings.size} unique offerings clean across ${samples.length} public-route samples`
  );
}

async function validateMovies() {
  const data = await fetchJson("/api/tonight");
  const movies = data.movieNights ?? [];
  let doubled = 0;
  for (const m of movies) {
    const title = (m.title ?? m.movieTitle ?? "").trim();
    const words = title.split(/\s+/);
    if (words.length >= 2 && words[0] === words[1]) doubled++;
  }
  if (doubled) return fail("Doubled movie titles", `${doubled} found`);
  return pass("Movie title dedupe", `${movies.length} checked`);
}

async function validateWellnessDetail() {
  const data = await fetchJson("/api/activities/wellness-scavenger-hunt");
  const activity = data.activity ?? {};
  const summary = activity.summary ?? "";
  const schedule = activity.scheduleText ?? "";

  if (activity.activitySlug !== "wellness-scavenger-hunt") {
    return fail("Wellness canonical slug", activity.activitySlug || "<missing>");
  }
  if (activity.title !== "Wellness Scavenger Hunt") {
    return fail("Wellness title", activity.title || "<missing>");
  }
  if (!activity.endDateTime || activity.endDateTime === activity.startDateTime) {
    return fail("Wellness end time", "missing or collapsed endDateTime");
  }
  if (!/11:00\s*pm/i.test(schedule)) {
    return fail("Wellness schedule", schedule || "<missing>");
  }
  if (!/Pick up a map/i.test(summary) || !/any merchandise location/i.test(summary)) {
    return fail("Wellness source description", summary.slice(0, 160) || "<missing>");
  }
  if (KNOWN_TITLE_BREAKS.test(`${activity.title} ${activity.activitySlug} ${summary}`)) {
    return fail("Wellness broken fragments", "legacy title fragments still present");
  }
  if (!activity.source?.url || !activity.source?.documentHash) {
    return fail("Wellness source evidence", "missing source URL/hash");
  }
  const missingProvenance = missingProvenanceFields(activity);
  if (missingProvenance.length) {
    return fail("Wellness field provenance", missingProvenance.join(", "));
  }
  const claims = unsupportedClaims(activity);
  if (claims.length) {
    return fail("Wellness unsupported claims", claims.join(", "));
  }
  return pass("Wellness detail fidelity", "title, slug, range, description, and provenance clean");
}

async function validateUntimedDetailNoTimeField() {
  const data = await fetchJson("/api/activities/crescent-lake-wellness-challenge");
  const activity = data.activity ?? {};
  if (activity.startDateTime || activity.endDateTime) {
    return fail("Untimed detail omits time field", "fixture is no longer untimed");
  }

  const html = await fetchText("/activities/crescent-lake-wellness-challenge");
  const factsStart = html.indexOf('event-detail-facts"');
  if (factsStart === -1) {
    return fail("Untimed detail omits time field", "detail facts section not found");
  }
  const factsEnd = html.indexOf("</section>", factsStart);
  const factsHtml = html.slice(
    factsStart,
    factsEnd === -1 ? factsStart + 2000 : factsEnd
  );
  if (/event-detail-fact__label">When</.test(factsHtml)) {
    return fail(
      "Untimed detail omits time field",
      "visible When fact rendered for untimed activity"
    );
  }
  if (/Time needs confirmation|Confirm with resort/.test(factsHtml)) {
    return fail(
      "Untimed detail omits time field",
      "placeholder time label rendered for untimed activity"
    );
  }
  return pass(
    "Untimed detail omits time field",
    "no visible When fact for untimed source-backed activity"
  );
}

async function validateLegacyWellnessRedirect() {
  const res = await fetch(`${BASE}/activities/wellnessscav-engerhunt`, {
    redirect: "manual",
  });
  const location = res.headers.get("location") ?? "";
  if (![307, 308].includes(res.status)) {
    return fail("Legacy Wellness URL redirect", `expected 307/308, got ${res.status}`);
  }
  if (!location.includes("/activities/wellness-scavenger-hunt")) {
    return fail("Legacy Wellness URL redirect", location || "<missing location>");
  }
  return pass("Legacy Wellness URL redirect", location);
}

async function main() {
  console.log(`Validating ${BASE}\n`);
  const checks = [];

  for (const fn of [
    validateTonight,
    validateExplore,
    validateActivityEnrichmentEvidence,
    validateOfficialOfferings,
    validateMovies,
    validateWellnessDetail,
    validateUntimedDetailNoTimeField,
    validateLegacyWellnessRedirect,
  ]) {
    try {
      checks.push(await fn());
    } catch (err) {
      checks.push({
        check: fn.name,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let failed = 0;
  for (const result of checks) {
    const icon = result.pass ? "✓" : "✗";
    console.log(`${icon} ${result.check}: ${result.detail}`);
    if (!result.pass) failed++;
  }

  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
