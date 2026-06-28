import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type ProcessedOffering = {
  offering_key: string;
  description?: string;
  location?: { label?: string };
  amenities?: string[];
  field_provenance?: Record<string, Array<{ text?: string }>>;
};

const processed = JSON.parse(
  readFileSync("data/processed/official_recreation_offerings.json", "utf8")
) as { offerings: ProcessedOffering[] };

function offering(key: string): ProcessedOffering {
  const match = processed.offerings.find((row) => row.offering_key === key);
  assert.ok(match, `${key} should exist in processed official offerings`);
  return match;
}

function textBag(row: ProcessedOffering): string {
  return [
    row.description,
    row.location?.label,
    ...(row.amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function assertSourceBackedAmenities(row: ProcessedOffering, key: string) {
  assert.ok(
    (row.amenities ?? []).length >= 3,
    `${key} should expose source-backed pool names, features, and activities`
  );
  assert.ok(
    row.field_provenance?.amenities?.length,
    `${key} pool amenities require source provenance`
  );
}

const allStarSportsKey =
  "pools:all-star-sports-resort:all-star-sports-resort";
const allStarSports = offering(allStarSportsKey);
assertSourceBackedAmenities(allStarSports, allStarSportsKey);
assert.match(textBag(allStarSports), /Surfboard Bay Pool/);
assert.match(textBag(allStarSports), /Grand Slam Pool/);
assert.match(textBag(allStarSports), /Poolside Activities|poolside activities/i);
assert.doesNotMatch(
  allStarSports.location?.label ?? "",
  /^Pools at /,
  "Pool card location should list actual pool areas, not repeat the page title"
);

const animalKingdomKey = "pools:animal-kingdom-lodge:animal-kingdom-lodge";
const animalKingdom = offering(animalKingdomKey);
assertSourceBackedAmenities(animalKingdom, animalKingdomKey);
assert.match(textBag(animalKingdom), /Uzima Springs Pool/);
assert.match(textBag(animalKingdom), /Samawati Springs Pool/);
assert.match(textBag(animalKingdom), /Uwanja Camp/);
assert.match(textBag(animalKingdom), /waterslide/i);
assert.match(textBag(animalKingdom), /67-foot-long waterslide/);
assert.doesNotMatch(
  textBag(animalKingdom),
  /67-foot-lo\b/,
  "Pool highlights should not cut feature phrases mid-word"
);
assert.equal(
  animalKingdom.location?.label,
  "Uzima Springs Pool; Samawati Springs Pool; Uwanja Camp",
  "Pool locations should prefer primary Disney pool areas over extracted sub-zones"
);
assert.doesNotMatch(
  animalKingdom.location?.label ?? "",
  /Locatedin|atDisney/,
  "Pool card location should not leak collapsed source formatting"
);

const offeringCard = readFileSync(
  "components/activity/ActivityOfferingCard.tsx",
  "utf8"
);
assert.match(
  offeringCard,
  /offering\.amenities/,
  "Official offering cards should render source-backed amenities/highlights"
);
assert.doesNotMatch(
  offeringCard,
  /DecisionSignals|offeringDecisionProfile|Source\\s*<\/dt>|Effort\\s*<\/dt>/,
  "Pool cards should keep the cleaned public card treatment without QA/source blocks"
);

console.log("Pool offering enrichment coverage passed.");
