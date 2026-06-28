import assert from "node:assert/strict";
import { createSearchProvider, getSearchProviderName } from "@/lib/search/providers";

const originalProvider = process.env.SEARCH_PROVIDER;
const originalApiKey = process.env.TYPESENSE_API_KEY;

async function main() {
  delete process.env.SEARCH_PROVIDER;
  delete process.env.TYPESENSE_API_KEY;

  assert.equal(
    getSearchProviderName(),
    "local",
    "missing SEARCH_PROVIDER should default to local search"
  );

  const defaultProvider = createSearchProvider();
  const defaultResult = await defaultProvider.search({
    query: "horse",
    limit: 8,
  });
  assert.ok(
    defaultResult.hits.length > 0,
    "default local provider should return results without Typesense env vars"
  );

  process.env.SEARCH_PROVIDER = "local";
  assert.equal(
    getSearchProviderName(),
    "local",
    "explicit local provider should use local search"
  );

  process.env.SEARCH_PROVIDER = "typesense";
  assert.equal(
    getSearchProviderName(),
    "typesense",
    "explicit typesense provider should be selected"
  );

  await assert.rejects(
    () => createSearchProvider().search({ query: "horse", limit: 1 }),
    /TYPESENSE_API_KEY is required/,
    "typesense provider should still require Typesense configuration"
  );
}

main()
  .finally(() => {
    if (originalProvider === undefined) delete process.env.SEARCH_PROVIDER;
    else process.env.SEARCH_PROVIDER = originalProvider;

    if (originalApiKey === undefined) delete process.env.TYPESENSE_API_KEY;
    else process.env.TYPESENSE_API_KEY = originalApiKey;
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
