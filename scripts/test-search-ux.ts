import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runSearch, runSearchSuggest } from "@/lib/search/runSearch";

const searchPage = readFileSync("app/search/page.tsx", "utf8");
const searchClient = readFileSync("components/atlas/SearchClient.tsx", "utf8");
const searchSynonyms = readFileSync("lib/search/synonyms.ts", "utf8");

function assertIncludes(source: string, expected: string, context: string) {
  assert.ok(source.includes(expected), `${context} should include "${expected}"`);
}

async function main() {
  assertIncludes(searchPage, "Search After the Parks", "search page heading");
  assertIncludes(
    searchPage,
    "Search activities, resorts, movies, categories, and planning pages.",
    "search page description"
  );

  for (const example of [
    "campfire tonight",
    "Polynesian movie",
    "pool games",
    "arcade",
    "rainy day",
    "free activities",
  ]) {
    assertIncludes(searchPage, example, "search examples");
    assertIncludes(searchClient, example, "search client examples");
  }

  assertIncludes(searchClient, 'id="search-empty-heading"', "empty search state");
  assertIncludes(searchClient, "Search by what you need", "empty search state");

  for (const label of ["Activities", "Resorts", "Movies", "Categories", "Pages"]) {
    assertIncludes(searchClient, `label: "${label}"`, "grouped search result config");
  }

  assertIncludes(searchClient, "Browse activities", "no-result recovery");
  assertIncludes(searchClient, "Browse resorts", "no-result recovery");
  assertIncludes(searchClient, 'href="/tonight"', "no-result recovery");
  assertIncludes(searchClient, "See tonight's options", "no-result recovery");
  assertIncludes(searchClient, "Try shorter search", "no-result recovery");

  assert.equal(
    /concierge|Q&A|question[- ]answer/i.test(searchClient + searchPage + searchSynonyms),
    false,
    "search labels and comments should not imply concierge or Q&A search"
  );

  const result = await runSearch("free", { limit: 50 });
  const responseHrefs = [
    ...(result.hits ?? []).map((hit) => hit.href),
    ...result.topHits.map((hit) => hit.href),
    ...result.categories.map((hit) => hit.href),
    ...result.pages.map((hit) => hit.href),
  ];
  assert.equal(
    responseHrefs.some((href) => href.startsWith("/guides")),
    false,
    "search responses should not expose removed guide routes"
  );

  const suggestions = await runSearchSuggest("");
  assert.ok(
    (suggestions.suggestedQueries ?? []).some(
      (suggestion) => suggestion.query === "campfire tonight"
    ),
    "empty suggestions should include actual searchable concepts"
  );

  console.log("Search UX tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
