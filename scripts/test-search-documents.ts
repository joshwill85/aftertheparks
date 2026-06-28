import assert from "node:assert/strict";
import { buildSearchDocuments, normalizeTitleSort } from "@/lib/search/documents";

function assertString(value: unknown, field: string) {
  assert.equal(typeof value, "string", `${field} should be a string`);
  assert.ok((value as string).trim().length > 0, `${field} should not be empty`);
}

async function main() {
const documents = await buildSearchDocuments();

assert.ok(documents.length > 0, "search documents should be generated");

for (const doc of documents) {
  assertString(doc.id, "id");
  assertString(doc.objectID, "objectID");
  assertString(doc.kind, "kind");
  assertString(doc.title, "title");
  assertString(doc.titleSort, "titleSort");
  assertString(doc.href, "href");
  assertString(doc.sourceId, "sourceId");
  assert.ok(Array.isArray(doc.aliases), `${doc.id} aliases should be an array`);
  assert.ok(Array.isArray(doc.keywords), `${doc.id} keywords should be an array`);
  assert.equal(
    doc.titleSort,
    normalizeTitleSort(doc.title),
    `${doc.id} titleSort should be normalized from title`
  );
}

const resorts = documents.filter((doc) => doc.kind === "resort");
assert.ok(resorts.length > 0, "resort documents should be indexed");
for (const resort of resorts) {
  assertString(resort.resortArea, `${resort.id} resortArea`);
  assertString(resort.resortTier, `${resort.id} resortTier`);
}

const polynesian = resorts.find((doc) =>
  doc.title.toLowerCase().includes("polynesian")
);
assert.ok(polynesian, "Polynesian resort should be indexed");
assert.ok(
  polynesian.aliases.includes("poly"),
  "Polynesian resort should include the poly nickname"
);

const activityOrOfferings = documents.filter(
  (doc) => doc.kind === "activity" || doc.kind === "offering"
);
assert.ok(activityOrOfferings.length > 0, "activity/offering documents should be indexed");
for (const doc of activityOrOfferings) {
  assertString(doc.priceState, `${doc.id} priceState`);
  assertString(doc.reservationState, `${doc.id} reservationState`);
  assertString(doc.category, `${doc.id} category`);
  assertString(doc.resortSlug, `${doc.id} resortSlug`);
  assertString(doc.resortName, `${doc.id} resortName`);
}

const horseFamily = documents.filter((doc) => {
  const haystack = [doc.title, doc.description, doc.aliases.join(" "), doc.keywords.join(" ")]
    .join(" ")
    .toLowerCase();
  return /horse|pony|carriage|wagon|sleigh|tri circle d|ranch/.test(haystack);
});
assert.ok(horseFamily.length > 0, "horse-family documents should be indexed");
assert.ok(
  horseFamily.some((doc) => doc.aliases.includes("horse")),
  "at least one horse-family document should include the horse alias"
);
assert.equal(
  documents.some(
    (doc) =>
      doc.title === "Pools at Disney's Coronado Springs Resort" &&
      doc.aliases.includes("horse")
  ),
  false,
  "Ranchos-area pool text should not trigger horse aliases"
);

assert.equal(
  documents.filter((doc) => doc.sourceId.includes(":paused")).length,
  0,
  "paused activities or offerings should not be indexed"
);

console.log(`Search document tests passed for ${documents.length} documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
