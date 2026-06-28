# Search Operations

The app launches with local in-process search by default. Local search uses the normalized `SearchDocument` records generated from the app data pipeline and does not require a hosted Typesense service, API key, or sync job.

Typesense remains available as a future upgrade path. Enable it only when search traffic, revenue, or relevance needs justify operating a separate search service.

## Provider Modes

### Local Search, Launch Default

No search environment variables are required for local search:

```bash
unset SEARCH_PROVIDER
```

or explicitly:

```bash
SEARCH_PROVIDER=local
```

Local search supports global results, aliases, facets, autocomplete suggestions, and lightweight typo tolerance in the Next.js process.

### Typesense, Future Upgrade

Set these variables only when a hosted Typesense service is available:

```bash
SEARCH_PROVIDER=typesense
TYPESENSE_HOST=your-typesense-host
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-typesense-api-key
TYPESENSE_SEARCH_COLLECTION=search_documents
```

When `SEARCH_PROVIDER=typesense`, missing Typesense configuration is a deploy/runtime error by design.

## Local Typesense

Local Typesense is optional and only needed when testing the future Typesense provider. Run Typesense locally with Docker:

```bash
docker run \
  -p 8108:8108 \
  -v ./typesense-data:/data \
  typesense/typesense:30.2 \
  --data-dir /data \
  --api-key=dev-api-key \
  --enable-cors
```

Set local environment:

```bash
export TYPESENSE_HOST=localhost
export TYPESENSE_PORT=8108
export TYPESENSE_PROTOCOL=http
export TYPESENSE_API_KEY=dev-api-key
export TYPESENSE_SEARCH_COLLECTION=search_documents
export SEARCH_PROVIDER=typesense
```

Health check:

```bash
curl http://localhost:8108/health
```

If Docker Desktop is not running on macOS, install and run the Homebrew server:

```bash
brew tap typesense/tap
brew install typesense/tap/typesense-server@30.2
mkdir -p /tmp/orlando-typesense-data
/opt/homebrew/opt/typesense-server@30.2/bin/typesense-server \
  --data-dir /tmp/orlando-typesense-data \
  --api-key=dev-api-key \
  --api-port=8108 \
  --enable-cors
```

## Sync

Build and sync the index:

```bash
npm run search:sync
```

The sync script:

1. Builds normalized `SearchDocument` records.
2. Recreates `search_documents_v1`.
3. Bulk imports documents.
4. Points the `search_documents` alias at `search_documents_v1`.

Do not write to Typesense during user queries. Re-sync before testing or deploying the Typesense provider, after content ingestion, or after search document/alias changes.

## Relevance Review

Run the search verification suite:

```bash
npm run test:search
```

By default this validates local search with no `TYPESENSE_*` environment variables. To validate Typesense relevance manually, start Typesense, run `npm run search:sync`, then run the relevant search scripts with `SEARCH_PROVIDER=typesense`.

When a golden query fails, prefer fixes in this order:

1. Correct the source title, category, location, or schedule data.
2. Add a specific document alias in `lib/search/domainAliases.ts`.
3. Adjust which document field receives an existing value.
4. Reconsider local scoring or Typesense parameters only after the first three options fail.

For Typesense mode, full search should remain `_text_match:desc,titleSort:asc`. For local mode, keep ranking deterministic and covered by `scripts/test-search-relevance.ts`.

## Zero-Result Review

Review zero-result searches weekly. Before adding an alias, confirm it represents guest language rather than a one-off typo. Add tests for any recurring query that should produce a result.

## Rollback

If a sync produces bad results, repoint the `search_documents` alias to the previous versioned collection in Typesense. Keep old versioned collections until the new index has been verified in preview and production.
