import assert from "node:assert/strict";
import { NO_TICKET_COLLECTIONS } from "@/lib/magic/collections";

const expectedCategoryById = new Map([
  ["tonight-movies", "movies_under_stars"],
  ["resort-calendar", "resort_activity"],
  ["campfires", "campfire"],
  ["little-crafters", "arts_crafts"],
  ["pool-break", "poolside"],
  ["games-and-crafts", "arcade"],
]);

assert.equal(
  NO_TICKET_COLLECTIONS.length,
  expectedCategoryById.size,
  "Every no-ticket block should be represented in the filter contract"
);

for (const collection of NO_TICKET_COLLECTIONS) {
  const expectedCategory = expectedCategoryById.get(collection.id);
  assert.ok(expectedCategory, `Unexpected no-ticket collection: ${collection.id}`);

  const href = new URL(collection.href, "https://aftertheparks.test");
  assert.equal(
    href.searchParams.get("category"),
    expectedCategory,
    `${collection.title} should open its destination filtered to ${expectedCategory}`
  );
}

console.log("No-ticket collection link contract passed.");
