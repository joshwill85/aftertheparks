import { buildSearchDocuments } from "@/lib/search/documents";
import { TYPESENSE_SYNONYMS } from "@/lib/search/domainAliases";
import { createTypesenseClient } from "@/lib/search/typesense/client";
import {
  SEARCH_COLLECTION_ALIAS,
  SEARCH_COLLECTION_SCHEMA,
  SEARCH_COLLECTION_VERSION,
  SEARCH_SYNONYM_SET,
} from "@/lib/search/typesense/schema";
import type { SearchDocument } from "@/lib/search/schema";

interface ImportResult {
  success?: boolean;
  id?: string;
  error?: string;
}

async function recreateCollection() {
  const client = createTypesenseClient();
  const documents = await buildSearchDocuments();

  if (documents.length === 0) {
    throw new Error("Refusing to sync an empty search index.");
  }

  const collection = client.collections<SearchDocument>(SEARCH_COLLECTION_VERSION);
  const exists = await collection.exists();
  if (exists) {
    await collection.delete();
  }

  await client.synonymSets(SEARCH_SYNONYM_SET).upsert({
    items: TYPESENSE_SYNONYMS.map((synonym) => ({
      id: synonym.id,
      root: synonym.root,
      synonyms: [...synonym.synonyms],
    })),
  });

  await client.collections().create(SEARCH_COLLECTION_SCHEMA as any);

  const syncedCollection = client.collections<SearchDocument>(
    SEARCH_COLLECTION_VERSION
  );

  const results = (await syncedCollection
    .documents()
    .import(documents, {
      action: "upsert",
      dirty_values: "coerce_or_reject",
      throwOnFail: false,
    })) as ImportResult[];

  const failures = results.filter((result) => result.success === false);
  if (failures.length > 0) {
    const sample = failures
      .slice(0, 5)
      .map((failure) => `${failure.id ?? "unknown"}: ${failure.error ?? "failed"}`)
      .join("\n");
    throw new Error(`Typesense import failed for ${failures.length} documents:\n${sample}`);
  }

  await client.aliases().upsert(SEARCH_COLLECTION_ALIAS, {
    collection_name: SEARCH_COLLECTION_VERSION,
  });

  console.log(
    `Synced ${documents.length} search documents to ${SEARCH_COLLECTION_VERSION} and updated alias ${SEARCH_COLLECTION_ALIAS}.`
  );
}

recreateCollection().catch((error) => {
  console.error(error);
  process.exit(1);
});
