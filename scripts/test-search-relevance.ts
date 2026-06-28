import assert from "node:assert/strict";
import { runSearch, runSearchSuggest } from "@/lib/search/runSearch";

function titles(hits: Array<{ title: string }>): string[] {
  return hits.map((hit) => hit.title);
}

function assertTopFiveIncludes(
  query: string,
  hits: Array<{ title: string }>,
  expectedPattern: RegExp
) {
  const topFive = titles(hits.slice(0, 5));
  assert.ok(
    topFive.some((title) => expectedPattern.test(title)),
    `${query} expected top five to include ${expectedPattern}, got ${topFive.join(", ")}`
  );
}

async function assertQuery(query: string, expectedPattern: RegExp) {
  const result = await runSearch(query, { limit: 50 });
  assert.ok(Array.isArray(result.hits), `${query} should return a global hits array`);
  assert.ok(result.hits.length > 0, `${query} should return at least one hit`);
  assertTopFiveIncludes(query, result.hits, expectedPattern);
}

async function main() {
  await assertQuery("horse", /horse|pony|carriage|wagon|sleigh|tri-circle-d/i);
  await assertQuery("hores", /horse|pony|carriage|wagon|sleigh|tri-circle-d/i);
  await assertQuery("carage", /carriage/i);
  await assertQuery("free horse", /pony|horse|carriage|wagon|sleigh|tri-circle-d/i);
  await assertQuery("poly", /polynesian/i);
  await assertQuery("polynesain", /polynesian/i);
  await assertQuery("pool games", /pool|games/i);
  await assertQuery("schedule", /calendar|today|tonight|schedule/i);
  await assertQuery("tonight movie", /movie|tonight|stars/i);
  await assertQuery("pofq crafts", /craft|port orleans|french quarter/i);
  await assertQuery("sleigh", /sleigh/i);
  await assertQuery("tri circle d", /tri-circle-d|horse|ranch/i);
  await assertQuery("fort wilderness carriage", /carriage/i);

  const horse = await runSearch("horse", { limit: 50 });
  const firstHorseTitles = titles(horse.hits ?? []).filter((title) =>
    /carriage|horseback|pony|tri-circle-d|wagon/i.test(title)
  );
  assert.ok(firstHorseTitles.length >= 3, "horse should return multiple horse-family results");
  const sortedHorseTitles = [...firstHorseTitles].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  assert.deepEqual(
    firstHorseTitles,
    sortedHorseTitles,
    "horse-family ties should sort alphabetically by titleSort"
  );

  const free = await runSearch("free", { limit: 50 });
  const freeKinds = new Set((free.hits ?? []).map((hit) => hit.kind));
  assert.ok(freeKinds.size > 1, "broad free query should not collapse to one content family");

  const shortSuggest = await runSearchSuggest("ho");
  assert.ok(
    (shortSuggest.hits ?? []).some((hit) => /horse|pony|carriage|wagon/i.test(hit.title)),
    "ho should return horse-related prefix suggestions"
  );

  const typoSuggest = await runSearchSuggest("hores");
  assert.ok(
    (typoSuggest.hits ?? []).some((hit) => /horse|pony|carriage|wagon/i.test(hit.title)),
    "hores should recover horse-related suggestions"
  );

  const poSuggest = await runSearchSuggest("po");
  assert.ok(
    (poSuggest.hits ?? []).some((hit) => /polynesian|port orleans/i.test(hit.title)),
    "po should suggest Polynesian or Port Orleans candidates"
  );

  const emptySuggest = await runSearchSuggest("");
  assert.equal(emptySuggest.hits?.length ?? 0, 0, "empty suggest should not call provider hits");
  assert.ok(
    (emptySuggest.suggestedQueries ?? []).length > 0,
    "empty suggest should return local popular suggestions"
  );

  console.log("Search relevance tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
